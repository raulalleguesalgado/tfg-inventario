# Prompt 03R — Módulo de autenticación (refinado)

**Módulo:** Autenticación (register, login, JWT, roles, middlewares)
**Fase:** 3.3
**Tipo de prompt:** Refinado (con componente [RULES] de seguridad explícita)
**Iteraciones:** 1
**Prompt básico de referencia:** `03_auth.md`

---

## Prompt enviado

```
[CONTEXT]
Node.js REST API for an inventory management system.
Stack: Node.js, Express, Prisma ORM, PostgreSQL, JWT (jsonwebtoken), bcryptjs, Zod.
Architecture: routes → controllers → services → repositories → DB (layered).
Module system: CommonJS (require/module.exports) — do NOT use ES Modules (import/export).
All API responses must follow this exact format:
  Success: { "success": true, "data": {...}, "error": null, "message": "OK" }
  Error:   { "success": false, "data": null, "error": "ERROR_CODE", "message": "Human readable" }

Prisma schema (relevant models):

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
Generate the full authentication module:
- src/repositories/user.repository.js: findByEmail(email), findById(id), create(data)
- src/services/auth.service.js: register(data), login(email, password)
- src/controllers/auth.controller.js: register and login handlers
- src/routes/auth.routes.js: POST /auth/register, POST /auth/login with Zod validation
- src/middlewares/auth.middleware.js: authenticate (verify JWT and attach user to req.user),
  authorize(...roles) (check req.user.role is in allowed roles)

[RULES]
- JWT_SECRET: read from process.env.JWT_SECRET only. If not set, throw an Error at startup —
  never use a hardcoded fallback or default value.
- Role assignment: during register, ALWAYS assign role OPERATOR regardless of what the
  request body contains. Never read role from the request body.
- Password validation: minimum 8 characters.
- Passwords must be hashed with bcrypt (10 rounds) before storing. Never store plaintext.
- Never expose passwordHash in any response.
- Login error messages must be identical whether email is not found or password is wrong
  (prevent user enumeration).
- All controllers must call next(error) on errors — never respond directly with res.json()
  in catch blocks.
- Use z.object() from Zod (NOT z.zod.object()).
- Use a shared PrismaClient singleton (export one instance from src/config/prisma.js and
  import it — do not call new PrismaClient() in each module).
- JWT token expiry: 8 hours.

[OUTPUT]
Only code. No explanations.
```

---

## Respuesta del LLM

### src/config/prisma.js

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
module.exports = prisma;
```

### src/repositories/user.repository.js

```javascript
const prisma = require('../config/prisma');

module.exports = {
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  findById: (id) => prisma.user.findUnique({ where: { id } }),
  create: (data) => prisma.user.create({ data })
};
```

### src/services/auth.service.js

```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be defined');

module.exports = {
  register: async (data) => {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await userRepository.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: 'OPERATOR'
    });
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  login: async (email, password) => {
    const error = new Error('INVALID_CREDENTIALS');
    error.status = 401;

    const user = await userRepository.findByEmail(email);
    if (!user) throw error;

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw error;

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }
};
```

### src/controllers/auth.controller.js

```javascript
const authService = require('../services/auth.service');

module.exports = {
  register: async (req, res, next) => {
    try {
      const data = await authService.register(req.body);
      res.status(201).json({ success: true, data, error: null, message: "OK" });
    } catch (err) {
      next(err);
    }
  },

  login: async (req, res, next) => {
    try {
      const data = await authService.login(req.body.email, req.body.password);
      res.status(200).json({ success: true, data, error: null, message: "OK" });
    } catch (err) {
      next(err);
    }
  }
};
```

### src/routes/auth.routes.js

```javascript
const express = require('express');
const { z } = require('zod');
const authController = require('../controllers/auth.controller');
const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

router.post('/register', (req, res, next) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, data: null, error: "VALIDATION_ERROR", message: result.error.format() });
  authController.register(req, res, next);
});

router.post('/login', (req, res, next) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, data: null, error: "VALIDATION_ERROR", message: result.error.format() });
  authController.login(req, res, next);
});

module.exports = router;
```

### src/middlewares/auth.middleware.js

```javascript
const jwt = require('jsonwebtoken');

module.exports = {
  authenticate: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, data: null, error: "UNAUTHORIZED", message: "Token missing" });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ success: false, data: null, error: "UNAUTHORIZED", message: "Invalid token" });
    }
  },

  authorize: (...roles) => {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, data: null, error: "FORBIDDEN", message: "Insufficient permissions" });
      }
      next();
    };
  }
};
```

---

## Análisis

### Vulnerabilidades del prompt básico — estado en el refinado

| ID | Descripción (básico) | Estado en refinado | Detalle |
|----|---------------------|-------------------|---------|
| S1 | JWT secret con fallback hardcoded `\|\| 'supersecret'` | ✅ Corregido | `if (!process.env.JWT_SECRET) throw new Error(...)` en tiempo de carga del módulo — la app no arranca sin la variable de entorno |
| S2 | Rol auto-asignable desde el body de la petición | ✅ Corregido | `role: 'OPERATOR'` hardcoded en el service — el campo `role` del body es ignorado completamente |
| S3 | Password mínimo 6 caracteres | ✅ Corregido | `z.string().min(8)` en ambos schemas |

### Bugs del prompt básico — estado en el refinado

| ID | Descripción (básico) | Estado en refinado | Detalle |
|----|---------------------|-------------------|---------|
| B1 | `z.zod.object()` — sintaxis incorrecta | ✅ Corregido | Usa `z.object()` correctamente |
| B2 | Mezcla CommonJS / ES Modules | ✅ Corregido | 100% CommonJS en todos los ficheros |
| B3 | PrismaClient sin singleton | ✅ Corregido | Singleton exportado desde `src/config/prisma.js` e importado en el repository |

### Problemas de arquitectura del prompt básico — estado en el refinado

| ID | Descripción (básico) | Estado en refinado | Detalle |
|----|---------------------|-------------------|---------|
| A1 | Controller responde directamente en catch, bypaseando middleware de errores | ✅ Corregido | Ambos controllers usan `next(err)` |
| A2 | Formato de respuesta no estándar | ✅ Corregido | Todas las respuestas siguen `{ success, data, error, message }` |
| A3 | Errores genéricos `new Error('...')` sin tipo ni status | ✅ Corregido | El service crea errores con `.status` adjunto (`error.status = 401`) — el middleware global puede usar este campo para determinar el código HTTP |

### Gap cubierto

| Gap | Estado | Detalle |
|-----|--------|---------|
| `src/middlewares/auth.middleware.js` no existía (ningún prompt básico lo generó) | ✅ Generado | Incluye `authenticate` (verifica JWT, adjunta `req.user`) y `authorize(...roles)` (verifica permisos por rol) |

### Nuevos problemas detectados en el refinado

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| R1 | Baja | `register` no comprueba si el email ya existe antes de intentar la inserción. El prompt básico sí lo hacía explícitamente. La constraint `@unique` de Prisma lanzará un error a nivel de BD, pero el mensaje de error podría exponer que el email está registrado (según cómo lo maneje el middleware global de errores). | auth.service.js |
| R2 | Info | `loginSchema` valida `password: z.string().min(8)`. Esto es innecesario en login — si alguien tiene una cuenta con contraseña de 7 caracteres (creada antes de este cambio), no podría iniciar sesión por fallo de validación, no por contraseña incorrecta. En login basta con `z.string().min(1)`. | auth.routes.js |
| R3 | Info | `auth.middleware.js` responde directamente en lugar de llamar a `next(err)`. Es un patrón aceptable para middleware de autenticación (es conveniente responder 401/403 directamente), pero es inconsistente con la regla del prompt que pedía `next(error)` en todos los errores. | auth.middleware.js |

---

## Comparativa cuantitativa básico → refinado

| Categoría | Prompt básico | Prompt refinado | Mejora |
|-----------|--------------|-----------------|--------|
| Vulnerabilidades de seguridad | 3 (S1 Alta, S2 Alta, S3 Baja) | 0 críticas / 0 altas | -3 (−100%) |
| Bugs funcionales | 3 (B1 Alta, B2 Alta, B3 Baja) | 0 | -3 (−100%) |
| Problemas de arquitectura | 3 (A1, A2, A3) | 0 | -3 (−100%) |
| Ficheros generados | 4 | 6 (añade prisma.js y auth.middleware.js) | +2 |
| Sistema de módulos | Mixto (ES Modules) | CommonJS consistente | ✅ |
| Formato de respuesta | Ad hoc | Estándar en todos | ✅ |
| Issues nuevos introducidos | — | 3 (R1 Baja, R2 Info, R3 Info) | +3 menores |
