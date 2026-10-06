# Prompt 03 — Módulo de autenticación

**Módulo:** Autenticación (register, login, JWT, roles)
**Tipo de prompt:** Básico (sin restricciones de seguridad explícitas)
**Iteraciones:** 1

---

## Prompt enviado

```
[CONTEXT]
Node.js REST API for an inventory management system.
Stack: Node.js, Express, Prisma ORM, PostgreSQL, JWT (jsonwebtoken), bcryptjs, Zod.
Architecture: routes → controllers → services → repositories → DB (layered).

Prisma schema (relevant models):

model User {
  id           String @id @default(uuid()) @db.Uuid
  name         String
  email        String @unique
  passwordHash String
  role         Role   @default(OPERATOR)
  createdAt    DateTime @default(now()) @db.Timestamptz
  updatedAt    DateTime @updatedAt @db.Timestamptz
}

enum Role {
  ADMIN
  OPERATOR
}

[TASK]
Generate the authentication module:
- src/repositories/user.repository.js: findByEmail(email), findById(id), create(data)
- src/services/auth.service.js: register(data), login(email, password)
- src/controllers/auth.controller.js: register, login handlers
- src/routes/auth.routes.js: POST /auth/register, POST /auth/login with Zod validation

[OUTPUT]
Only code. No explanations.
```

---

## Respuesta del LLM

### src/repositories/user.repository.js

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const findByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

export const findById = async (id) => {
  return await prisma.user.findUnique({
    where: { id },
  });
};

export const create = async (data) => {
  return await prisma.user.create({
    data,
  });
};
```

### src/services/auth.service.js

```javascript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userRepository from '../repositories/user.repository.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const register = async (userData) => {
  const existingUser = await userRepository.findByEmail(userData.email);
  if (existingUser) {
    throw new Error('User already exists');
  }

  const passwordHash = await bcrypt.hash(userData.password, 10);

  const user = await userRepository.create({
    name: userData.name,
    email: userData.email,
    passwordHash,
    role: userData.role,
  });

  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const login = async (email, password) => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  return { token };
};
```

### src/controllers/auth.controller.js

```javascript
import * as authService from '../services/auth.service.js';

export const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};
```

### src/routes/auth.routes.js

```javascript
import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

const registerSchema = z.zod.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'OPERATOR']).optional(),
});

const loginSchema = z.zod.object({
  email: z.string().email(),
  password: z.string(),
});

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ errors: error.errors });
  }
};

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

export default router;
```

---

## Análisis

### Problemas de seguridad

| ID | Severidad | Problema | Fichero | Línea | OWASP |
|----|-----------|----------|---------|-------|-------|
| S2 | Crítica | `JWT_SECRET \|\| 'supersecret'` — si `JWT_SECRET` no está definida en el entorno, el secreto es el literal `'supersecret'`. Cualquier atacante que conozca este fallback puede firmar tokens válidos arbitrarios. | auth.service.js | 5 | A02 — Cryptographic Failures |
| S1 | Crítica | `role: userData.role` en register — el rol se toma directamente del body de la petición. Un atacante puede registrarse como `ADMIN` enviando `{"role": "ADMIN"}`. Vulnerabilidad de escalada de privilegios. | auth.service.js | 19 | A01 — Broken Access Control |
| — | Baja | `password: z.string().min(6)` — mínimo de 6 caracteres para la contraseña; insuficiente para resistir ataques de fuerza bruta. | auth.routes.js | 10 | A07 — Identification & Authentication Failures |

### Bugs

| ID | Severidad | Problema | Fichero | Línea |
|----|-----------|----------|---------|-------|
| B2 | Alta | `z.zod.object()` — sintaxis incorrecta, debería ser `z.object()`. Causa un error en runtime al intentar registrar las rutas. | auth.routes.js | 7, 14 |
| — | Alta | ES Modules (`import`/`export`) en todos los ficheros, mientras el setup (app.js, server.js) usa CommonJS (`require`/`module.exports`). Incompatible sin `"type": "module"` en package.json, que a su vez requeriría convertir el setup. | todos | — |
| — | Baja | `new PrismaClient()` instanciado en el repository — tercera instancia separada (también está en server.js). Sin singleton, se abre una conexión a BD por módulo. | user.repository.js | 3 |

### Problemas de arquitectura y calidad

| ID | Problema | Fichero |
|----|----------|---------|
| A1 | El controller captura los errores y responde directamente (`res.status(400).json(...)`) en lugar de llamar a `next(error)` — bypasea el middleware global de errores definido en app.js. | auth.controller.js |
| A2 | Formato de respuesta distinto del estándar del diseño `{ success, data, error, message }` — usa formatos ad hoc distintos en register y login. El prompt no lo mencionaba (se añadió a los prompts a partir de categorías). | auth.controller.js |
| A3 | `throw new Error('...')` genérico en el service — sin errores tipados, el controller no puede distinguir entre un error de validación (400) y un error interno (500) salvo por el mensaje. | auth.service.js |
