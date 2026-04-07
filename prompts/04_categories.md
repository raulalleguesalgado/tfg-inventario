# Prompt 04 — Módulo de categorías

**Módulo:** Categories (CRUD completo)
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

model Category {
  id          String    @id @default(uuid()) @db.Uuid
  name        String    @unique
  description String?
  createdAt   DateTime  @default(now()) @db.Timestamptz
  updatedAt   DateTime  @updatedAt @db.Timestamptz
}

[TASK]
Generate the categories module:
- src/repositories/category.repository.js: findAll, findById, create, update, delete
- src/services/category.service.js: getAll, getById, create, update, delete (throw error if category has products on delete)
- src/controllers/category.controller.js: handlers for all operations
- src/routes/category.routes.js: full CRUD routes with Zod validation

[OUTPUT]
Only code. No explanations.
```

---

## Respuesta del LLM

### src/repositories/category.repository.js

```javascript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const categoryRepository = {
  findAll: async () => {
    return await prisma.category.findMany({
      include: { _count: { select: { products: true } } }
    });
  },

  findById: async (id) => {
    return await prisma.category.findUnique({
      where: { id },
      include: { products: true }
    });
  },

  create: async (data) => {
    return await prisma.category.create({ data });
  },

  update: async (id, data) => {
    return await prisma.category.update({
      where: { id },
      data
    });
  },

  delete: async (id) => {
    return await prisma.category.delete({
      where: { id }
    });
  }
};
```

### src/services/category.service.js

```javascript
import { categoryRepository } from '../repositories/category.repository.js';

export const categoryService = {
  getAll: async () => {
    return await categoryRepository.findAll();
  },

  getById: async (id) => {
    const category = await categoryRepository.findById(id);
    if (!category) throw new Error('Category not found');
    return category;
  },

  create: async (data) => {
    return await categoryRepository.create(data);
  },

  update: async (id, data) => {
    await categoryService.getById(id);
    return await categoryRepository.update(id, data);
  },

  delete: async (id) => {
    const category = await categoryRepository.findById(id);
    if (!category) throw new Error('Category not found');

    if (category.products && category.products.length > 0) {
      throw new Error('Cannot delete category with associated products');
    }

    return await categoryRepository.delete(id);
  }
};
```

### src/controllers/category.controller.js

```javascript
import { categoryService } from '../services/category.service.js';

export const categoryController = {
  getAll: async (req, res, next) => {
    try {
      const categories = await categoryService.getAll();
      res.json({ success: true, data: categories, error: null, message: 'Categories retrieved' });
    } catch (error) {
      next(error);
    }
  },

  getById: async (req, res, next) => {
    try {
      const category = await categoryService.getById(req.params.id);
      res.json({ success: true, data: category, error: null, message: 'Category retrieved' });
    } catch (error) {
      res.status(404).json({ success: false, data: null, error: error.message, message: 'Failed to retrieve' });
    }
  },

  create: async (req, res, next) => {
    try {
      const category = await categoryService.create(req.body);
      res.status(201).json({ success: true, data: category, error: null, message: 'Category created' });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const category = await categoryService.update(req.params.id, req.body);
      res.json({ success: true, data: category, error: null, message: 'Category updated' });
    } catch (error) {
      next(error);
    }
  },

  delete: async (req, res, next) => {
    try {
      await categoryService.delete(req.params.id);
      res.json({ success: true, data: null, error: null, message: 'Category deleted' });
    } catch (error) {
      res.status(400).json({ success: false, data: null, error: error.message, message: 'Deletion failed' });
    }
  }
};
```

### src/routes/category.routes.js

```javascript
import { Router } from 'express';
import { z } from 'zod';
import { categoryController } from '../controllers/category.controller.js';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable()
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
      message: 'Validation failed'
    });
  }
};

const validateId = z.string().uuid();

const validateParams = (req, res, next) => {
  try {
    validateId.parse(req.params.id);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'Invalid UUID format',
      message: 'Validation failed'
    });
  }
};

router.get('/', categoryController.getAll);
router.get('/:id', validateParams, categoryController.getById);
router.post('/', validate(categorySchema), categoryController.create);
router.put('/:id', validateParams, validate(categorySchema), categoryController.update);
router.delete('/:id', validateParams, categoryController.delete);

export default router;
```

---

## Análisis

### Lo que el LLM generó correctamente sin instrucciones explícitas

- **Formato de respuesta estándar `{ success, data, error, message }` respetado** en todos los controllers — consecuencia directa de incluirlo en el `[CONTEXT]`. Primera evidencia cuantificable de que el contexto del prompt mejora directamente la calidad del output.
- `z.object()` con sintaxis correcta — no repite el bug B1 del módulo de auth.
- Validación de UUID en params con `validateParams` — añadido por iniciativa propia, no estaba en el prompt.
- Comprobación de productos asociados antes de borrar en la capa de servicio — respeta la restricción de integridad referencial.
- Usa `next(error)` en la mayoría de los controllers — delegación correcta al middleware global.
- `_count` en `findAll` para contar productos por categoría — decisión de diseño sensata no solicitada.

### Problemas detectados

#### Bugs

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| B1 | Alta | ES Modules (`import`/`export`) — patrón consistente con el módulo de auth pero incompatible con el setup que usa CommonJS. Se confirma como patrón sistemático del LLM. | todos |
| B2 | Baja | `new PrismaClient()` instanciado en el repository — cuarta instancia separada, sin singleton. | category.repository.js |

#### Problemas de arquitectura y calidad

| ID | Problema | Fichero |
|----|----------|---------|
| A1 | Manejo de errores inconsistente dentro del mismo controller: `getById` y `delete` responden directamente con status hardcodeado; `getAll`, `create` y `update` usan `next(error)`. | category.controller.js |
| A2 | La lógica de borrado en el service depende de que `findById` incluya `products` en el resultado. Si el repository cambia, el check de integridad falla silenciosamente sin error. | category.service.js |
| A3 | Rutas sin middleware de autenticación — todas las operaciones CRUD son públicas. Esperado en prompt básico sin `[RULES]`, pero relevante para la auditoría posterior. | category.routes.js |

### Observación metodológica

La inclusión de `Standard API response format: { success, data, error, message }` en el `[CONTEXT]` fue suficiente para que el LLM lo aplicara en todos los controllers, corrigiendo el problema A2 del módulo de auth sin necesidad de un `[RULES]` explícito. Esto demuestra que ciertos aspectos de calidad se pueden controlar desde el contexto, mientras que las restricciones de seguridad (autenticación, autorización) requieren instrucciones explícitas.

El bug B1 (ES Modules) se confirma como patrón sistemático: el LLM elige ES Modules por defecto en todos los módulos generados en conversaciones independientes, independientemente del stack del módulo anterior. Esto es material relevante para el análisis de patrones de la Fase 4.

---

## Correcciones aplicadas

**Ninguna en esta iteración.**

---

## Número de iteraciones

1 — output aceptado para análisis sin re-prompting.
