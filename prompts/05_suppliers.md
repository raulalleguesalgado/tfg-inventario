# Prompt 05 — Módulo de proveedores

**Módulo:** Suppliers (CRUD completo)
**Fase:** 3.3
**Tipo de prompt:** Básico (sin restricciones de seguridad explícitas)
**LLM usado:** Gemini Pro
**Iteraciones:** 1
**Fecha:** 2026-04-05

---

## Prompt enviado

```
[CONTEXT]
Node.js REST API for an inventory management system.
Stack: Node.js, Express, Prisma ORM, PostgreSQL, Zod.
Architecture: routes → controllers → services → repositories → DB (layered).
Standard API response format: { success, data, error, message }

Prisma schema (relevant model):

model Supplier {
  id          String    @id @default(uuid()) @db.Uuid
  name        String
  contactName String?
  email       String?   @unique
  phone       String?
  createdAt   DateTime  @default(now()) @db.Timestamptz
  updatedAt   DateTime  @updatedAt @db.Timestamptz
}

[TASK]
Generate the suppliers module:
- src/repositories/supplier.repository.js: findAll, findById, create, update, delete
- src/services/supplier.service.js: getAll, getById, create, update, delete (throw error if supplier has products on delete)
- src/controllers/supplier.controller.js: handlers for all operations
- src/routes/supplier.routes.js: full CRUD routes with Zod validation

[OUTPUT]
Only code. No explanations.
```

---

## Respuesta del LLM

### src/repositories/supplier.repository.js

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const findAll = async () => {
  return await prisma.supplier.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

const findById = async (id) => {
  return await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } }
  });
};

const create = async (data) => {
  return await prisma.supplier.create({ data });
};

const update = async (id, data) => {
  return await prisma.supplier.update({
    where: { id },
    data
  });
};

const remove = async (id) => {
  return await prisma.supplier.delete({
    where: { id }
  });
};

module.exports = { findAll, findById, create, update, remove };
```

### src/services/supplier.service.js

```javascript
const supplierRepository = require('../repositories/supplier.repository');

const getAll = async () => {
  return await supplierRepository.findAll();
};

const getById = async (id) => {
  const supplier = await supplierRepository.findById(id);
  if (!supplier) throw new Error('Supplier not found');
  return supplier;
};

const create = async (data) => {
  return await supplierRepository.create(data);
};

const update = async (id, data) => {
  await getById(id);
  return await supplierRepository.update(id, data);
};

const remove = async (id) => {
  const supplier = await getById(id);

  if (supplier._count && supplier._count.products > 0) {
    throw new Error('Cannot delete supplier with associated products');
  }

  return await supplierRepository.remove(id);
};

module.exports = { getAll, getById, create, update, remove };
```

### src/controllers/supplier.controller.js

```javascript
const supplierService = require('../services/supplier.service');

const getAllSuppliers = async (req, res, next) => {
  try {
    const suppliers = await supplierService.getAll();
    res.json({ success: true, data: suppliers, error: null, message: 'Suppliers retrieved' });
  } catch (error) {
    next(error);
  }
};

const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await supplierService.getById(req.params.id);
    res.json({ success: true, data: supplier, error: null, message: 'Supplier retrieved' });
  } catch (error) {
    res.status(404).json({ success: false, data: null, error: error.message, message: 'Failed' });
  }
};

const createSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.create(req.body);
    res.status(201).json({ success: true, data: supplier, error: null, message: 'Supplier created' });
  } catch (error) {
    next(error);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.update(req.params.id, req.body);
    res.json({ success: true, data: supplier, error: null, message: 'Supplier updated' });
  } catch (error) {
    next(error);
  }
};

const deleteSupplier = async (req, res, next) => {
  try {
    await supplierService.remove(req.params.id);
    res.json({ success: true, data: null, error: null, message: 'Supplier deleted' });
  } catch (error) {
    res.status(400).json({ success: false, data: null, error: error.message, message: 'Deletion failed' });
  }
};

module.exports = { getAllSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier };
```

### src/routes/supplier.routes.js

```javascript
const express = require('express');
const router = express.Router();
const { z } = require('zod');
const supplierController = require('../controllers/supplier.controller');

const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactName: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable(),
  phone: z.string().optional().nullable(),
});

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      data: null,
      error: error.errors,
      message: 'Validation Error'
    });
  }
};

router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.post('/', validate(supplierSchema), supplierController.createSupplier);
router.put('/:id', validate(supplierSchema.partial()), supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;
```

---

## Análisis

### Lo que el LLM generó correctamente sin instrucciones explícitas

- Formato de respuesta estándar `{ success, data, error, message }` seguido en todos los controllers.
- `supplierSchema.partial()` para PUT — permite actualizaciones parciales correctamente.
- Usa `_count` del repository para verificar productos antes de borrar — más eficiente que categories, que cargaba todos los productos.
- `orderBy: { createdAt: 'desc' }` en findAll — añadido por iniciativa propia.

### Problemas detectados

#### Bugs

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| B1 | Alta | **Inconsistencia de módulos entre conversaciones**: categories usó ES Modules, suppliers usa CommonJS. La app no puede mezclar ambos sin configuración adicional. | todos |
| B2 | Baja | `new PrismaClient()` instanciado en el repository — sin singleton. | supplier.repository.js |

#### Problemas de arquitectura y calidad

| ID | Problema | Fichero |
|----|----------|---------|
| A1 | Sin validación de UUID en params — categories lo implementaba, suppliers no. Inconsistencia entre módulos generados en conversaciones independientes. | supplier.routes.js |
| A2 | Manejo de errores inconsistente: `getSupplierById` y `deleteSupplier` responden directamente con status hardcodeado; el resto usa `next(error)`. | supplier.controller.js |
| A3 | Rutas sin middleware de autenticación. | supplier.routes.js |

### Observación metodológica

El LLM usó CommonJS en este módulo y ES Modules en categories y auth, generados en conversaciones igualmente independientes. Esto confirma que **el LLM no mantiene coherencia de decisiones técnicas entre prompts independientes** — elige el sistema de módulos por defecto según su propio criterio en cada sesión, que varía sin causa aparente. Esta inconsistencia es evidencia directa de la limitación documentada en el diario: sin acceso al contexto del proyecto completo, el modelo no puede garantizar coherencia arquitectónica entre módulos.

---

## Correcciones aplicadas

**Ninguna en esta iteración.**

---

## Número de iteraciones

1 — output aceptado para análisis sin re-prompting.
