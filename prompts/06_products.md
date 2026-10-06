# Prompt 06 — Módulo de productos

**Módulo:** Products (CRUD completo + alertas de stock)
**Tipo de prompt:** Básico (sin restricciones de seguridad explícitas)
**Iteraciones:** 1

---

## Prompt enviado

```
[CONTEXT]
Node.js REST API for an inventory management system.
Stack: Node.js, Express, Prisma ORM, PostgreSQL, Zod.
Architecture: routes → controllers → services → repositories → DB (layered).
Standard API response format: { success, data, error, message }

Prisma schema (relevant models):

model Product {
  id            String    @id @default(uuid()) @db.Uuid
  name          String
  description   String?
  reference     String?   @unique
  purchasePrice Decimal   @db.Decimal(12, 2)
  salePrice     Decimal   @db.Decimal(12, 2)
  currentStock  Int       @default(0)
  minStock      Int       @default(0)
  categoryId    String    @db.Uuid
  supplierId    String    @db.Uuid
  createdAt     DateTime  @default(now()) @db.Timestamptz
  updatedAt     DateTime  @updatedAt @db.Timestamptz
  category      Category  @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  supplier      Supplier  @relation(fields: [supplierId], references: [id], onDelete: Restrict)
}

[TASK]
Generate the products module:
- src/repositories/product.repository.js: findAll, findById, findLowStock, create, update, delete
- src/services/product.service.js: getAll, getById, getLowStock, create, update, delete
- src/controllers/product.controller.js: handlers for all operations including GET /products/alerts
- src/routes/product.routes.js: full CRUD routes + GET /alerts, with Zod validation

[OUTPUT]
Only code. No explanations.
```

---

## Respuesta del LLM

### src/repositories/product.repository.js

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProductRepository {
  async findAll() {
    return prisma.product.findMany({
      include: { category: true, supplier: true }
    });
  }

  async findById(id) {
    return prisma.product.findUnique({
      where: { id },
      include: { category: true, supplier: true }
    });
  }

  async findLowStock() {
    return prisma.product.findMany({
      where: {
        currentStock: {
          lte: prisma.product.fields.minStock
        }
      },
      include: { category: true, supplier: true }
    });
  }

  async create(data) {
    return prisma.product.create({ data });
  }

  async update(id, data) {
    return prisma.product.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    return prisma.product.delete({
      where: { id }
    });
  }
}
```

### src/services/product.service.js

```javascript
import { ProductRepository } from '../repositories/product.repository.js';

const repository = new ProductRepository();

export class ProductService {
  async getAll() {
    return repository.findAll();
  }

  async getById(id) {
    const product = await repository.findById(id);
    if (!product) throw new Error('Product not found');
    return product;
  }

  async getLowStock() {
    return repository.findLowStock();
  }

  async create(data) {
    return repository.create(data);
  }

  async update(id, data) {
    await this.getById(id);
    return repository.update(id, data);
  }

  async delete(id) {
    await this.getById(id);
    return repository.delete(id);
  }
}
```

### src/controllers/product.controller.js

```javascript
import { ProductService } from '../services/product.service.js';

const service = new ProductService();

export class ProductController {
  async getAll(req, res, next) {
    try {
      const data = await service.getAll();
      res.json({ success: true, data, error: null, message: 'Products retrieved' });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const data = await service.getById(req.params.id);
      res.json({ success: true, data, error: null, message: 'Product retrieved' });
    } catch (err) { next(err); }
  }

  async getLowStock(req, res, next) {
    try {
      const data = await service.getLowStock();
      res.json({ success: true, data, error: null, message: 'Low stock alerts retrieved' });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const data = await service.create(req.body);
      res.status(201).json({ success: true, data, error: null, message: 'Product created' });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const data = await service.update(req.params.id, req.body);
      res.json({ success: true, data, error: null, message: 'Product updated' });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await service.delete(req.params.id);
      res.json({ success: true, data: null, error: null, message: 'Product deleted' });
    } catch (err) { next(err); }
  }
}
```

### src/routes/product.routes.js

```javascript
import { Router } from 'express';
import { z } from 'zod';
import { ProductController } from '../controllers/product.controller.js';

const router = Router();
const controller = new ProductController();

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

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err) {
    res.status(400).json({ success: false, data: null, error: err.errors, message: 'Validation failed' });
  }
};

router.get('/', controller.getAll);
router.get('/alerts', controller.getLowStock);
router.get('/:id', controller.getById);
router.post('/', validate(productSchema), controller.create);
router.put('/:id', validate(productSchema.partial()), controller.update);
router.delete('/:id', controller.delete);

export default router;
```

---

## Análisis

### Nota sobre `prisma.product.fields.minStock` (B3)

Clasificado inicialmente como alucinación de API. Verificación en runtime (2026-04-13): es sintaxis válida de Prisma Client v5 (referencia de campo resuelta como comparación de columna en SQL) — `GET /products/alerts` funciona correctamente.

### Otros problemas

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| — | Alta | ES Modules de nuevo — alterna con CommonJS de suppliers sin coherencia. | todos |
| — | Media | Cambia el patrón de exportación a clases — auth y categories usaban funciones/objetos, products usa clases. Inconsistencia estructural entre módulos. | todos |
| — | Baja | `new PrismaClient()` en el repository de nuevo — sin singleton. | product.repository.js |
| A1 | Baja | Sin validación de UUID en params. | product.routes.js |
| A2 | Alta | Rutas sin middleware de autenticación (vulnerabilidad S5). | product.routes.js |
