# Prompt 02 — Schema de Prisma

**Módulo:** Base de datos — schema.prisma
**Fase:** 3.2
**Tipo de prompt:** Básico (sin restricciones explícitas)
**Iteraciones:** 1

---

## Prompt enviado

```
[CONTEXT]
Node.js REST API for an inventory management system.
Stack: Node.js, Express, Prisma ORM, PostgreSQL.
All IDs are UUIDs. Timestamps use timezone-aware types.

[TASK]
Generate a complete Prisma schema (schema.prisma) for the following entities:

- Category: id, name (unique), description, createdAt, updatedAt
- Supplier: id, name, contactName (optional), email (unique, optional), phone (optional), createdAt, updatedAt
- Product: id, name, description (optional), reference (unique, optional), purchasePrice (decimal), salePrice (decimal), currentStock (int, default 0), minStock (int, default 0), categoryId, supplierId, createdAt, updatedAt
- User: id, name, email (unique), passwordHash, role (enum: admin/operator, default operator), createdAt, updatedAt
- StockMovement: id, productId, type (enum: IN/OUT/ADJUSTMENT), quantity (int), notes (optional), userId, createdAt (no updatedAt — immutable)

Relations:
- Category → Product: one-to-many. Cannot delete Category if it has Products.
- Supplier → Product: one-to-many. Cannot delete Supplier if it has Products.
- Product → StockMovement: one-to-many. Cannot delete Product if it has StockMovements.
- User → StockMovement: one-to-many. Cannot delete User if it has StockMovements.

Add indexes on foreign keys and on StockMovement.createdAt.

[OUTPUT]
Only code. No explanations.
```

---

## Respuesta del LLM

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-node-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  OPERATOR
}

enum MovementType {
  IN
  OUT
  ADJUSTMENT
}

model Category {
  id          String    @id @default(uuid()) @db.Uuid
  name        String    @unique
  description String?
  products    Product[]
  createdAt   DateTime  @default(now()) @db.Timestamptz
  updatedAt   DateTime  @updatedAt @db.Timestamptz
}

model Supplier {
  id          String    @id @default(uuid()) @db.Uuid
  name        String
  contactName String?
  email       String?   @unique
  phone       String?
  products    Product[]
  createdAt   DateTime  @default(now()) @db.Timestamptz
  updatedAt   DateTime  @updatedAt @db.Timestamptz
}

model Product {
  id             String          @id @default(uuid()) @db.Uuid
  name           String
  description    String?
  reference      String?         @unique
  purchasePrice  Decimal         @db.Decimal(12, 2)
  salePrice      Decimal         @db.Decimal(12, 2)
  currentStock   Int             @default(0)
  minStock       Int             @default(0)

  category       Category        @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  categoryId     String          @db.Uuid

  supplier       Supplier        @relation(fields: [supplierId], references: [id], onDelete: Restrict)
  supplierId     String          @db.Uuid

  stockMovements StockMovement[]

  createdAt      DateTime        @default(now()) @db.Timestamptz
  updatedAt      DateTime        @updatedAt @db.Timestamptz

  @@index([categoryId])
  @@index([supplierId])
}

model User {
  id             String          @id @default(uuid()) @db.Uuid
  name           String
  email          String          @unique
  passwordHash   String
  role           Role            @default(OPERATOR)
  stockMovements StockMovement[]
  createdAt      DateTime        @default(now()) @db.Timestamptz
  updatedAt      DateTime        @updatedAt @db.Timestamptz
}

model StockMovement {
  id        String       @id @default(uuid()) @db.Uuid
  quantity  Int
  type      MovementType
  notes     String?

  product   Product      @relation(fields: [productId], references: [id], onDelete: Restrict)
  productId String       @db.Uuid

  user      User         @relation(fields: [userId], references: [id], onDelete: Restrict)
  userId    String       @db.Uuid

  createdAt DateTime     @default(now()) @db.Timestamptz

  @@index([productId])
  @@index([userId])
  @@index([createdAt])
}
```

---

## Análisis

### Problemas detectados

#### Bug crítico

| ID | Severidad | Problema | Línea |
|----|-----------|----------|-------|
| B1 | Alta | `provider = "prisma-client-node-js"` — el valor correcto es `"prisma-client-js"`. Con este valor, `prisma generate` falla y la app no arranca. | línea de `provider = "prisma-client-node-js"` |

#### Diferencias respecto al diseño

| ID | Severidad | Problema | Impacto |
|----|-----------|----------|---------|
| D1 | Baja | Enums en mayúsculas (`ADMIN`, `OPERATOR`) en lugar de minúsculas (`admin`, `operator`) como en el diseño original | Inconsistencia menor; requiere actualizar referencias en el código |
| D2 | Baja | Faltan `@map` para nombres de columna en snake_case — `passwordHash` se almacena como `passwordHash` en BD en lugar de `password_hash` | Las columnas en BD usan camelCase en lugar de la convención snake_case de PostgreSQL |
| D3 | Baja | Faltan `@@map` para nombres de tabla — `Category` genera tabla `Category` en lugar de `categories` | Las tablas usan PascalCase singular en lugar de snake_case plural |
| D4 | Baja | Faltan constraints `@db.VarChar(n)` en campos de texto — `name`, `email`, `passwordHash`, `reference`, `phone` sin límite de longitud | Sin límite de longitud en BD; puede almacenar strings arbitrariamente largos |
| D5 | Mínima | `Decimal(12,2)` en lugar de `Decimal(10,2)` para precios | Diferencia no crítica; amplía el rango de valores permitidos |
