# Prompt 02 — Schema de Prisma

**Módulo:** Base de datos — schema.prisma
**Fase:** 3.2
**Tipo de prompt:** Básico (sin restricciones explícitas)
**LLM usado:** Gemini Pro
**Iteraciones:** 1
**Fecha:** 2026-04-05

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

### Lo que el LLM generó correctamente sin instrucciones explícitas

- Todas las entidades presentes y completas con los campos correctos.
- `onDelete: Restrict` en todas las relaciones — respeta la restricción de integridad referencial especificada.
- `StockMovement` sin `updatedAt` — inmutabilidad del historial respetada.
- UUIDs con `@db.Uuid` y timestamps con `@db.Timestamptz` en todas las entidades.
- Índices en todas las FKs y en `StockMovement.createdAt`.
- Añade `@@index([userId])` en `StockMovement` por iniciativa propia — decisión correcta no incluida en el prompt.

### Problemas detectados

#### Bug crítico

| ID | Severidad | Problema | Línea |
|----|-----------|----------|-------|
| B1 | Alta | `provider = "prisma-client-node-js"` — el valor correcto es `"prisma-client-js"`. Con este valor, `prisma generate` falla y la app no arranca. | 3 |

Este es el único bug que impide que el schema funcione. El LLM generó un string literal incorrecto en el único campo obligatorio del bloque `generator`. Resulta llamativo que acierte en toda la lógica relacional pero falle en un valor de configuración concreto.

#### Diferencias respecto al diseño

| ID | Severidad | Problema | Impacto |
|----|-----------|----------|---------|
| D1 | Baja | Enums en mayúsculas (`ADMIN`, `OPERATOR`) en lugar de minúsculas (`admin`, `operator`) como en el diseño original | Inconsistencia menor; requiere actualizar referencias en el código |
| D2 | Baja | Faltan `@map` para nombres de columna en snake_case — `passwordHash` se almacena como `passwordHash` en BD en lugar de `password_hash` | Las columnas en BD usan camelCase en lugar de la convención snake_case de PostgreSQL |
| D3 | Baja | Faltan `@@map` para nombres de tabla — `Category` genera tabla `Category` en lugar de `categories` | Las tablas usan PascalCase singular en lugar de snake_case plural |
| D4 | Baja | Faltan constraints `@db.VarChar(n)` en campos de texto — `name`, `email`, `passwordHash`, `reference`, `phone` sin límite de longitud | Sin límite de longitud en BD; puede almacenar strings arbitrariamente largos |
| D5 | Mínima | `Decimal(12,2)` en lugar de `Decimal(10,2)` para precios | Diferencia no crítica; amplía el rango de valores permitidos |

### Observación metodológica

El LLM demuestra buen conocimiento de las relaciones en Prisma y de las decisiones de integridad referencial, pero falla en detalles de configuración concretos (B1) y en convenciones de nomenclatura de BD (D2, D3). Ninguno de estos problemas fue provocado por ausencia de contexto de seguridad — son errores de precisión en detalles que el prompt no especificaba explícitamente. Esto sugiere que para módulos de configuración los prompts deben ser más prescriptivos en los detalles, no solo en las restricciones de seguridad.

---

## Correcciones aplicadas

**Ninguna en esta iteración.** El código se conserva en su estado original generado para mantener la trazabilidad del análisis.

---

## Número de iteraciones

1 — output aceptado para análisis sin re-prompting.
