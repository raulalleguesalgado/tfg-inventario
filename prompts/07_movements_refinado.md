# Prompt 07R — Módulo de movimientos de stock (refinado)

**Módulo:** Stock Movements (registro + historial)
**Fase:** 3.3
**Tipo de prompt:** Refinado (con componente [RULES] de seguridad y arquitectura explícitas)
**Iteraciones:** 1
**Prompt básico de referencia:** `07_movements.md`

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

model StockMovement {
  id        String       @id @default(uuid()) @db.Uuid
  quantity  Int
  type      MovementType
  notes     String?
  productId String       @db.Uuid
  userId    String       @db.Uuid
  createdAt DateTime     @default(now()) @db.Timestamptz
  product   Product      @relation(fields: [productId], references: [id], onDelete: Restrict)
  user      User         @relation(fields: [userId], references: [id], onDelete: Restrict)
}

enum MovementType {
  IN
  OUT
  ADJUSTMENT
}

model Product {
  id           String @id @default(uuid()) @db.Uuid
  currentStock Int    @default(0)
}

[TASK]
Generate the stock movements module:
- src/repositories/movement.repository.js: create(data, prismaClient), findByProduct(productId)
- src/services/movement.service.js: register(data), getByProduct(productId)
- src/controllers/movement.controller.js: register and getByProduct handlers
- src/routes/movement.routes.js: POST /movements, GET /movements/product/:id with Zod validation

Stock update logic per movement type:
  IN:         currentStock += quantity
  OUT:        currentStock -= quantity  (reject if insufficient stock)
  ADJUSTMENT: currentStock = quantity   (set stock to the exact value provided)

Route-level authorization:
  POST /movements              → authenticate (any logged-in user)
  GET  /movements/product/:id  → authenticate (any logged-in user)

[RULES]
- Import PrismaClient singleton from src/config/prisma.js — do not call new PrismaClient().
- The service must NOT query the database directly. All DB access must go through repositories.
- Race condition prevention: the stock check for OUT movements and the stock update must both
  happen inside a single prisma.$transaction. Do not read stock before the transaction starts.
  Pass the transaction client (tx) into the repository create function.
- All routes must apply the authenticate middleware. Use req.user.id (set by authenticate)
  as the userId when registering a movement — never accept userId from the request body.
- Validate route params: productId in GET must be a valid UUID.
- All controllers must use next(err) in catch blocks — never respond directly in catch.
- Use z.object() from Zod. quantity must be z.number().int().positive() for all movement types.

[OUTPUT]
Only code. No explanations.
```

---

## Respuesta del LLM

### src/repositories/movement.repository.js

```javascript
const movementRepository = {
  create: async (data, tx) => {
    return await tx.stockMovement.create({ data });
  },

  findByProduct: async (productId, prisma) => {
    return await prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }
};
module.exports = movementRepository;
```

### src/services/movement.service.js

```javascript
const prisma = require('../config/prisma');
const movementRepository = require('../repositories/movement.repository');

const movementService = {
  register: async (data, userId) => {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: data.productId }
      });
      if (!product) throw new Error('PRODUCT_NOT_FOUND');

      let newStock = product.currentStock;
      if (data.type === 'IN') {
        newStock += data.quantity;
      } else if (data.type === 'OUT') {
        if (product.currentStock < data.quantity) throw new Error('INSUFFICIENT_STOCK');
        newStock -= data.quantity;
      } else if (data.type === 'ADJUSTMENT') {
        newStock = data.quantity;
      }

      await tx.product.update({
        where: { id: data.productId },
        data: { currentStock: newStock }
      });
      return await movementRepository.create({ ...data, userId }, tx);
    });
  },

  getByProduct: async (productId) => {
    return await movementRepository.findByProduct(productId, prisma);
  }
};
module.exports = movementService;
```

### src/controllers/movement.controller.js

```javascript
const movementService = require('../services/movement.service');

const movementController = {
  register: async (req, res, next) => {
    try {
      const movement = await movementService.register(req.body, req.user.id);
      res.status(201).json({ success: true, data: movement, error: null, message: 'OK' });
    } catch (err) {
      next(err);
    }
  },

  getByProduct: async (req, res, next) => {
    try {
      const movements = await movementService.getByProduct(req.params.id);
      res.json({ success: true, data: movements, error: null, message: 'OK' });
    } catch (err) {
      next(err);
    }
  }
};
module.exports = movementController;
```

### src/routes/movement.routes.js

```javascript
const express = require('express');
const { z } = require('zod');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const movementController = require('../controllers/movement.controller');

const registerSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  notes: z.string().optional()
});

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, data: null, error: 'VALIDATION_ERROR', message: result.error.errors });
  req.body = result.data;
  next();
};

router.post('/', authenticate, validate(registerSchema), movementController.register);

router.get('/product/:id', authenticate, (req, res, next) => {
  const result = z.string().uuid().safeParse(req.params.id);
  if (!result.success) return res.status(400).json({ success: false, data: null, error: 'INVALID_UUID', message: 'Invalid product ID' });
  next();
}, movementController.getByProduct);

module.exports = router;
```

---

## Análisis

### Problemas del prompt básico — estado en el refinado

| ID | Descripción (básico) | Estado en refinado | Detalle |
|----|---------------------|-------------------|---------|
| S1 | Race condition TOCTOU — comprobación de stock fuera de la transacción | ❌ No corregido (prueba del 2026-09-28) | La lectura, la validación y la actualización están dentro de `prisma.$transaction`, tal como pedía la regla del prompt, pero eso no basta: con el aislamiento por defecto de PostgreSQL (READ COMMITTED), `findUnique` no bloquea la fila y dos transacciones concurrentes leen el mismo stock. En la prueba de concurrencia (stock 10, 8 × OUT de 3, 10 repeticiones) se aceptan las 8 salidas y el stock queda en 7 (en una repetición, en 4): actualizaciones perdidas. Ver `docs/prueba_concurrencia_refinado.md`. |
| S2 | Rutas sin autenticación con `req.user.id` referenciado sin middleware | ✅ Corregido | Ambas rutas aplican `authenticate`. `userId` nunca se acepta del body — se extrae de `req.user.id` como segundo argumento de `register`. |
| B1 | ADJUSTMENT siempre tratado como incremento positivo | ✅ Corregido | Lógica de tres ramas: IN suma, OUT resta (con validación), ADJUSTMENT establece el valor absoluto (`newStock = data.quantity`). |
| B2 | ES Modules | ✅ Corregido | 100% CommonJS en todos los ficheros. |
| B3 | Service importa PrismaClient directamente violando la arquitectura de capas | ⚠️ Parcialmente corregido | El service importa el singleton de `config/prisma` para iniciar la transacción (`prisma.$transaction`) y pasa el cliente de transacción `tx` al repository. Es una violación pragmática de la regla de capas: dentro de la transacción, el service lee y actualiza el stock directamente (`tx.product.findUnique` y `tx.product.update`) en lugar de hacerlo a través del product repository; al repository solo le delega la creación del movimiento (precisado el 2026-09-29). Este patrón es habitual en aplicaciones reales (evita dependencias circulares entre repositorios) pero técnicamente incumple la separación estricta de capas. |
| B4 | Controllers sin `next(err)` | ✅ Corregido | Ambos controllers usan `next(err)` en los catch. |

### Nuevos problemas detectados en el refinado

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| R1 | Baja | `findByProduct` no incluye datos del usuario (`include: { user: { select: { id, name } } }`). El básico sí los incluía. El historial de movimientos devuelve solo el `userId` sin el nombre del usuario. Regresión funcional. | movement.repository.js |
| R2 | Info | Los errores lanzados desde el service (`'PRODUCT_NOT_FOUND'`, `'INSUFFICIENT_STOCK'`) son strings en el mensaje de Error genérico. El middleware global de errores necesita interpretar `err.message` para devolver el código HTTP correcto (404 vs 422). Sin errores tipados con `.status`, el middleware no puede distinguirlos automáticamente. | movement.service.js |

---

## Comparativa cuantitativa básico → refinado


| Categoría | Prompt básico | Prompt refinado | Mejora |
|-----------|--------------|-----------------|--------|
| Race condition TOCTOU | Presente (stock check fuera de tx) | Presente (actualizaciones perdidas, todo dentro de tx) | ❌ |
| Rutas sin autenticación | 2/2 (100%) | 0/2 (0%) | −2 (−100%) |
| Lógica ADJUSTMENT incorrecta | Sí (siempre positivo) | No (valor absoluto) | ✅ |
| ES Modules | Sí | No | ✅ |
| Violación de arquitectura de capas | Completa (PrismaClient directo) | Parcial (solo dentro de tx) | Mejorado |
| Controllers sin next(err) | 2/2 | 0/2 | −2 (−100%) |
| Regresiones funcionales | — | 1 (R1: sin include user) | +1 menor |
