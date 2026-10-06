# Prompt 08 — Módulo de usuarios

**Módulo:** Users (GET /users, GET /users/:id, PUT /users/:id — solo admin)
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
Authorization: admin role can do everything, operator role has read-only access.

Prisma schema (relevant model):

model User {
  id           String   @id @default(uuid()) @db.Uuid
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(OPERATOR)
  createdAt    DateTime @default(now()) @db.Timestamptz
  updatedAt    DateTime @updatedAt @db.Timestamptz
}

enum Role {
  ADMIN
  OPERATOR
}

[TASK]
Generate the users module:
- src/repositories/user.repository.js: findAll, findById (already has findByEmail and create from auth module)
- src/services/user.service.js: getAll, getById, update (no delete, no create)
- src/controllers/user.controller.js: handlers for getAll, getById, update
- src/routes/user.routes.js: GET /users, GET /users/:id, PUT /users/:id (admin only) with Zod validation

[OUTPUT]
Only code. No explanations.
```

---

## Respuesta del LLM

### src/repositories/user.repository.js

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const findAll = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const findById = async (id) => {
  return await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const update = async (id, data) => {
  return await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};
```

### src/services/user.service.js

```javascript
import * as userRepository from '../repositories/user.repository.js';

export const getAll = async () => {
  return await userRepository.findAll();
};

export const getById = async (id) => {
  const user = await userRepository.findById(id);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user;
};

export const update = async (id, updateData) => {
  await getById(id);
  return await userRepository.update(id, updateData);
};
```

### src/controllers/user.controller.js

```javascript
import * as userService from '../services/user.service.js';

export const getAll = async (req, res, next) => {
  try {
    const users = await userService.getAll();
    res.status(200).json({
      success: true,
      data: users,
      message: 'Users retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id);
    res.status(200).json({
      success: true,
      data: user,
      message: 'User retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const updatedUser = await userService.update(req.params.id, req.body);
    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
```

### src/routes/user.routes.js

```javascript
import { Router } from 'express';
import { z } from 'zod';
import * as userController from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'OPERATOR']).optional(),
});

const validateUpdate = (req, res, next) => {
  try {
    updateUserSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.errors,
      message: 'Validation failed',
    });
  }
};

router.use(authenticate);

router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.put('/:id', authorize('ADMIN'), validateUpdate, userController.update);

export default router;
```

---

## Análisis

### Problemas detectados

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| — | Alta | ES Modules — mismo patrón recurrente. | todos |
| B5 | Alta | Importa `authenticate` y `authorize` de `../middlewares/auth.middleware.js` — ese fichero no existe en el proyecto, ningún módulo anterior lo generó. La app fallará al arrancar. | user.routes.js |
| — | Media | Genera un nuevo `user.repository.js` con `findAll`, `findById`, `update` — pero el módulo de auth ya generó otro con `findByEmail`, `findById`, `create`. Al integrar los módulos habrá conflicto en el mismo fichero. | user.repository.js |
| — | Baja | `new PrismaClient()` instanciado de nuevo — sin singleton. | user.repository.js |
| A1 | Baja | Respuestas de éxito omiten `error: null` — inconsistencia menor con el formato estándar `{ success, data, error, message }`. | user.controller.js |
