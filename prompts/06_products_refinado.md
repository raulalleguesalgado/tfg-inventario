# Prompt 06R — Módulo de productos (refinado)

**Módulo:** Products (CRUD completo + alertas de stock)
**Fase:** 3.3
**Tipo de prompt:** Refinado (con componente [RULES] de seguridad y arquitectura explícitas)
**LLM usado:** Gemini Pro
**Iteraciones:** 1
**Fecha:** 2026-07-09
**Prompt básico de referencia:** `06_products.md`

---

## Prompt enviado

```
[CONTEXT]
Node.js REST API for an inventory management system.
Stack: Node.js, Express, Prisma ORM, PostgreSQL, Zod.
Architecture: routes → controllers → services → repositories → DB (layered).
Module system: CommonJS (require/module.exports) — do NOT use ES Modules (import/export).
Do NOT use classes — use plain functions and module.exports objects.
All API responses must follow this exact format:
  Success: { "success": true, "data": {...}, "error": null, "message": "OK" }
  Error:   { "success": false, "data": null, "error": "ERROR_CODE", "message": "Human readable" }

Auth middleware already exists at src/middlewares/auth.middleware.js and exports:
  - authenticate: verifies JWT and attaches decoded payload to req.user
  - authorize(...roles): checks req.user.role is in the allowed roles list
  Roles available: 'ADMIN', 'OPERATOR'

Prisma schema (relevant models):

model Product {
  id            String   @id @default(uuid()) @db.Uuid
  name          String
  description   String?
  reference     String?  @unique
  purchasePrice Decimal  @db.Decimal(12, 2)
  salePrice     Decimal  @db.Decimal(12, 2)
  currentStock  Int      @default(0)
  minStock      Int      @default(0)
  categoryId    String   @db.Uuid
  supplierId    String   @db.Uuid
  createdAt     DateTime @default(now()) @db.Timestamptz
  updatedAt     DateTime @updatedAt @db.Timestamptz
  category      Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  supplier      Supplier @relation(fields: [supplierId], references: [id], onDelete: Restrict)
}

[TASK]
Generate the products module:
- src/repositories/product.repository.js: findAll, findById, findLowStock, create, update, remove
- src/services/product.service.js: getAll, getById, getLowStock, create, update, remove
- src/controllers/product.controller.js: handlers for all operations
- src/routes/product.routes.js: full CRUD routes + GET /alerts, with Zod validation

Route-level authorization:
  GET  /products          → authenticate (any logged-in user)
  GET  /products/alerts   → authenticate (any logged-in user)
  GET  /products/:id      → authenticate (any logged-in user)
  POST /products          → authenticate + authorize('ADMIN')
  PUT  /products/:id      → authenticate + authorize('ADMIN')
  DELETE /products/:id    → authenticate + authorize('ADMIN')

[RULES]
- Import PrismaClient singleton from src/config/prisma.js — do not call new PrismaClient().
- All routes must apply the authenticate middleware. Write operations (POST, PUT, DELETE)
  must also apply authorize('ADMIN').
- Validate route params: :id must be a valid UUID — reject with 400 if not.
- All controllers must use next(err) in catch blocks — never respond directly in catch.
- GET /alerts must be defined before GET /:id in the router to avoid Express matching
  'alerts' as an ID parameter.
- Use z.object() from Zod for validation schemas.

[OUTPUT]
Only code. No explanations.
```

---

## Respuesta del LLM

### src/repositories/product.repository.js

```javascript
const prisma = require('../config/prisma');

const productRepository = {
  findAll: async () => await prisma.product.findMany(),
  findById: async (id) => await prisma.product.findUnique({ where: { id } }),
  findLowStock: async () => await prisma.product.findMany({
    where: { currentStock: { lte: prisma.product.fields.minStock } }
  }),
  create: async (data) => await prisma.product.create({ data }),
  update: async (id, data) => await prisma.product.update({ where: { id }, data }),
  remove: async (id) => await prisma.product.delete({ where: { id } })
};

module.exports = productRepository;
```

### src/services/product.service.js

```javascript
const productRepository = require('../repositories/product.repository');

const productService = {
  getAll: async () => await productRepository.findAll(),
  getById: async (id) => await productRepository.findById(id),
  getLowStock: async () => await productRepository.findLowStock(),
  create: async (data) => await productRepository.create(data),
  update: async (id, data) => await productRepository.update(id, data),
  remove: async (id) => await productRepository.remove(id)
};

module.exports = productService;
```

### src/controllers/product.controller.js

```javascript
const productService = require('../services/product.service');

const productController = {
  getAll: async (req, res, next) => {
    try {
      const data = await productService.getAll();
      res.json({ success: true, data, error: null, message: "OK" });
    } catch (err) { next(err); }
  },
  getById: async (req, res, next) => {
    try {
      const data = await productService.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, data: null, error: "NOT_FOUND", message: "Product not found" });
      res.json({ success: true, data, error: null, message: "OK" });
    } catch (err) { next(err); }
  },
  getLowStock: async (req, res, next) => {
    try {
      const data = await productService.getLowStock();
      res.json({ success: true, data, error: null, message: "OK" });
    } catch (err) { next(err); }
  },
  create: async (req, res, next) => {
    try {
      const data = await productService.create(req.body);
      res.status(201).json({ success: true, data, error: null, message: "OK" });
    } catch (err) { next(err); }
  },
  update: async (req, res, next) => {
    try {
      const data = await productService.update(req.params.id, req.body);
      res.json({ success: true, data, error: null, message: "OK" });
    } catch (err) { next(err); }
  },
  remove: async (req, res, next) => {
    try {
      await productService.remove(req.params.id);
      res.json({ success: true, data: null, error: null, message: "OK" });
    } catch (err) { next(err); }
  }
};

module.exports = productController;
```

### src/routes/product.routes.js

```javascript
const express = require('express');
const { z } = require('zod');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const productController = require('../controllers/product.controller');

const router = express.Router();
const idSchema = z.object({ id: z.string().uuid() });
const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  reference: z.string().optional(),
  purchasePrice: z.number().positive(),
  salePrice: z.number().positive(),
  currentStock: z.number().int().nonnegative(),
  minStock: z.number().int().nonnegative(),
  categoryId: z.string().uuid(),
  supplierId: z.string().uuid()
});

const validateId = (req, res, next) => {
  if (!idSchema.safeParse(req.params).success) return res.status(400).json({ success: false, data: null, error: "INVALID_ID", message: "Invalid UUID" });
  next();
};

router.use(authenticate);
router.get('/alerts', productController.getLowStock);
router.get('/', productController.getAll);
router.get('/:id', validateId, productController.getById);

router.post('/', authorize('ADMIN'), (req, res, next) => {
  if (!productSchema.safeParse(req.body).success) return res.status(400).json({ success: false, data: null, error: "VALIDATION_ERROR", message: "Invalid input" });
  productController.create(req, res, next);
});

router.put('/:id', authorize('ADMIN'), validateId, (req, res, next) => {
  if (!productSchema.partial().safeParse(req.body).success) return res.status(400).json({ success: false, data: null, error: "VALIDATION_ERROR", message: "Invalid input" });
  productController.update(req, res, next);
});

router.delete('/:id', authorize('ADMIN'), validateId, productController.remove);

module.exports = router;
```

---

## Análisis

### Problemas del prompt básico — estado en el refinado

| ID | Descripción (básico) | Estado en refinado | Detalle |
|----|---------------------|-------------------|---------|
| B2 | ES Modules | ✅ Corregido | 100% CommonJS en todos los ficheros |
| B3 | Exportación con clases | ✅ Corregido | Objetos planos con `module.exports` en todos los módulos |
| B4 | PrismaClient sin singleton | ✅ Corregido | `require('../config/prisma')` — reutiliza la instancia del auth refinado |
| A1 | Sin validación de UUID en params | ✅ Corregido | `validateId` middleware con `idSchema = z.object({ id: z.string().uuid() })` |
| A2 | Rutas sin autenticación | ✅ Corregido | `router.use(authenticate)` aplica autenticación a todas las rutas del router; `authorize('ADMIN')` en POST, PUT y DELETE |

**Los 5 problemas identificados en el prompt básico fueron eliminados.**

### Lo que el LLM mantuvo bien del básico

- `GET /alerts` definido antes de `GET /:id` — evita que Express interprete 'alerts' como UUID.
- `next(err)` en todos los catch blocks.
- Formato de respuesta estándar en todas las respuestas.
- `productSchema.partial()` para PUT — validación parcial correcta.
- `prisma.product.fields.minStock` en `findLowStock` — sintaxis válida en Prisma v5, confirmada funcional.

### Técnica destacada — `router.use(authenticate)`

El LLM aplicó `router.use(authenticate)` en lugar de añadir el middleware ruta por ruta. Esta solución es más robusta: cualquier ruta añadida en el futuro hereda automáticamente la autenticación, eliminando el riesgo de olvidar el middleware en una ruta nueva. Es una mejora sobre lo pedido en el prompt (que solo especificaba aplicar authenticate por ruta).

### Nuevos problemas detectados en el refinado

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| R1 | Media | `findAll`, `findById` y `findLowStock` no incluyen relaciones (`include: { category, supplier }`). El prompt básico sí las incluía. Las respuestas de la API devolverán solo IDs de categoría y proveedor, no sus datos completos. Pérdida funcional respecto al básico. | product.repository.js |
| R2 | Baja | `getById` en el service devuelve `null` si el producto no existe; el controller gestiona el 404 directamente fuera del catch. Es un patrón válido, pero inconsistente con auth (que lanzaba error tipado desde el service). | product.service.js / controller.js |
| R3 | Info | Mensajes de error de validación genéricos (`"Invalid input"`) sin detalle de qué campo falló. El auth refinado devolvía `result.error.format()` con el detalle completo. | product.routes.js |

R1 es el único punto relevante: el refinado pierde la capacidad de devolver datos de categoría y proveedor en las respuestas. No es un problema de seguridad, pero sí una regresión funcional no causada por las restricciones del `[RULES]` — el prompt no mencionaba explícitamente las relaciones y el LLM las omitió.

---

## Comparativa cuantitativa básico → refinado

| Categoría | Prompt básico | Prompt refinado | Mejora |
|-----------|--------------|-----------------|--------|
| Rutas sin autenticación | 6/6 (100%) | 0/6 (0%) | −6 (−100%) |
| Bugs de sistema de módulos | 1 (ES Modules) | 0 | −1 |
| Patrón de exportación inconsistente | Clases | Objetos planos | ✅ |
| PrismaClient sin singleton | Sí | No | ✅ |
| Validación de UUID en params | No | Sí (`validateId`) | ✅ |
| Regresiones funcionales | — | 1 (R1: sin includes) | +1 menor |

**Eliminación total de problemas de seguridad y arquitectura. Una regresión funcional menor.**

---

## Observación metodológica

El hallazgo más relevante de este módulo es la técnica `router.use(authenticate)`: el LLM no solo cumplió la instrucción de aplicar autenticación en todas las rutas, sino que eligió la implementación más robusta posible para hacerlo. Esto sugiere que cuando el `[RULES]` especifica el *qué* con claridad suficiente, el modelo es capaz de elegir autónomamente el *cómo* óptimo.

La regresión R1 (sin includes en las consultas) es un caso inverso al de auth (R1: sin check de email duplicado): en ambos módulos el refinado omite un comportamiento defensivo que el básico incluía por inercia. Esto refuerza la observación de que el prompt refinado maximiza las propiedades mencionadas en `[RULES]` pero puede perder comportamientos no explicitados. Para un prompt de producción, el `[RULES]` debería ser exhaustivo — incluyendo aspectos funcionales, no solo de seguridad.

---

## Número de iteraciones

1 — output aceptado para análisis sin re-prompting.
