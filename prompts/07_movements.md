# Prompt 07 — Módulo de movimientos de stock

**Módulo:** Stock Movements (registro + historial)
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
- src/repositories/movement.repository.js: create, findByProduct(productId)
- src/services/movement.service.js: register(data), getByProduct(productId)
  - register must: validate stock is sufficient for OUT movements, update product currentStock atomically
- src/controllers/movement.controller.js: handlers for register and getByProduct
- src/routes/movement.routes.js: POST /movements, GET /movements/product/:id with Zod validation

[OUTPUT]
Only code. No explanations.
```

---

## Respuesta del LLM

### src/repositories/movement.repository.js

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createMovement = async (data) => {
  return await prisma.$transaction(async (tx) => {
    const movement = await tx.stockMovement.create({
      data: {
        quantity: data.quantity,
        type: data.type,
        notes: data.notes,
        productId: data.productId,
        userId: data.userId,
      },
    });

    const stockAdjustment = data.type === 'OUT' ? -data.quantity : data.quantity;

    await tx.product.update({
      where: { id: data.productId },
      data: {
        currentStock: {
          increment: stockAdjustment,
        },
      },
    });

    return movement;
  });
};

export const findByProduct = async (productId) => {
  return await prisma.stockMovement.findMany({
    where: { productId },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};
```

### src/services/movement.service.js

```javascript
import * as movementRepository from '../repositories/movement.repository.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const register = async (data) => {
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
    select: { currentStock: true },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  if (data.type === 'OUT' && product.currentStock < data.quantity) {
    throw new Error('Insufficient stock for this movement');
  }

  return await movementRepository.createMovement(data);
};

export const getByProduct = async (productId) => {
  return await movementRepository.findByProduct(productId);
};
```

### src/controllers/movement.controller.js

```javascript
import * as movementService from '../services/movement.service.js';

export const registerMovement = async (req, res, next) => {
  try {
    const movement = await movementService.register({
      ...req.body,
      userId: req.user.id, // Assuming userId comes from auth middleware
    });

    res.status(201).json({
      success: true,
      data: movement,
      error: null,
      message: 'Stock movement recorded successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      data: null,
      error: error.message,
      message: 'Failed to record movement',
    });
  }
};

export const getByProduct = async (req, res, next) => {
  try {
    const movements = await movementService.getByProduct(req.params.id);

    res.status(200).json({
      success: true,
      data: movements,
      error: null,
      message: 'Movements retrieved successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      data: null,
      error: error.message,
      message: 'Failed to retrieve movements',
    });
  }
};
```

### src/routes/movement.routes.js

```javascript
import { Router } from 'express';
import { z } from 'zod';
import * as movementController from '../controllers/movement.controller.js';

const router = Router();

const createMovementSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
    notes: z.string().optional(),
  }),
});

const getByProductSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      data: null,
      error: error.errors,
      message: 'Validation failed',
    });
  }
};

router.post('/', validate(createMovementSchema), movementController.registerMovement);
router.get('/product/:id', validate(getByProductSchema), movementController.getByProduct);

export default router;
```

---

## Análisis

### Lo que el LLM generó correctamente sin instrucciones explícitas

- **`prisma.$transaction`** — crea el movimiento y actualiza el stock en una sola operación atómica. Decisión técnica correcta y no solicitada explícitamente.
- Valida stock suficiente antes de un movimiento `OUT` en el service.
- `userId: req.user.id` en el controller — asume la existencia de un middleware de autenticación, sugiriendo que el modelo es consciente de que debería aplicarse.
- `select: { id: true, name: true }` en el join con User — no expone `passwordHash` en el historial de movimientos.
- Valida UUID en params a través del schema Zod con estructura `{ body, params, query }` — técnica más robusta que en módulos anteriores.
- `orderBy: { createdAt: 'desc' }` en findByProduct.

### Problemas de seguridad y lógica de negocio

| ID | Severidad | Problema | Fichero | Línea | OWASP |
|----|-----------|----------|---------|-------|-------|
| S1 | Media | **Race condition (TOCTOU — Time of Check to Time of Use)**: el service comprueba el stock disponible en una query separada y luego llama al repository que ejecuta la transacción. Entre ambas operaciones, una petición concurrente puede reducir el stock, permitiendo que `currentStock` llegue a valores negativos. La comprobación debería realizarse **dentro** de la transacción. | movement.service.js | 8-16 | A04 — Insecure Design |
| S2 | Baja | `req.user.id` referenciado en el controller pero sin middleware de autenticación aplicado en las rutas. Si la ruta se registra sin auth middleware, `req.user` es `undefined` y se lanza un error no controlado que expone información interna. | movement.controller.js / movement.routes.js | 6 / — | A01 — Broken Access Control |

### Otros problemas

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| B1 | Media | `ADJUSTMENT` tratado siempre como incremento positivo (`+data.quantity`). Un ajuste que corrija stock a la baja sería imposible con esta lógica. Comportamiento ambiguo no documentado. | movement.repository.js:18 |
| B2 | Alta | ES Modules — consistente con products pero no con suppliers/setup. | todos |
| B3 | Media | El service importa `PrismaClient` directamente para consultar el producto, violando la arquitectura de capas. Debería hacerlo a través del product repository. | movement.service.js:2-4 |
| B4 | Baja | Ambos controllers responden directamente en el `catch` en lugar de usar `next(error)` — bypasea el middleware global de errores. | movement.controller.js |

### Observación metodológica

S1 (race condition TOCTOU) es el hallazgo técnico más sofisticado del proyecto hasta ahora. El LLM usa correctamente una transacción para la escritura pero no incorpora la comprobación de stock dentro de ella, dejando una ventana de tiempo donde el invariante de negocio puede violarse bajo carga concurrente. Esta vulnerabilidad es sutil: pasa cualquier prueba funcional básica pero falla bajo carga o en entornos con múltiples workers. Es precisamente el tipo de problema que los análisis estáticos automatizados (SonarCloud, ESLint) probablemente no detecten, pero que el análisis manual de la Fase 4B debería documentar.

Este módulo es, junto con auth, el candidato más sólido para la comparativa prompt básico → prompt refinado: tiene una vulnerabilidad de seguridad (S1), un bug de lógica de negocio (B1) y una violación de arquitectura (B3) que un prompt con `[RULES]` explícitas podría corregir.

---

## Correcciones aplicadas

**Ninguna en esta iteración.**

---

## Número de iteraciones

1 — output aceptado para análisis sin re-prompting.
