# Prompt 01 — Setup base del proyecto

**Módulo:** Configuración inicial (package.json, Express, middlewares globales, config de entorno)
**Fase:** 3.1
**Tipo de prompt:** Básico (sin restricciones de seguridad explícitas)
**Iteraciones:** 1

---

## Prompt enviado

```
[CONTEXT]
Node.js REST API for an inventory management system.
Stack: Node.js, Express, Prisma ORM, PostgreSQL, JWT authentication, Zod validation.
Architecture: routes → controllers → services → repositories → DB (layered).

[TASK]
Generate the base project setup:
- package.json with all required dependencies
- src/app.js: Express app with global middlewares
- src/server.js: server entry point (listens on PORT from env)
- src/config/env.js: loads and exports environment variables

[OUTPUT]
Only code. No explanations.
```

---

## Respuesta del LLM

### package.json

```json
{
  "name": "inventory-management-api",
  "version": "1.0.0",
  "description": "Inventory management system with Node.js, Express, and Prisma",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "helmet": "^7.0.0",
    "jsonwebtoken": "^9.0.1",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "prisma": "^5.0.0"
  }
}
```

### src/config/env.js

```javascript
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(8),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

const envVars = envSchema.safeParse(process.env);

if (!envVars.success) {
  console.error('❌ Invalid environment variables:', envVars.error.format());
  process.exit(1);
}

module.exports = envVars.data;
```

### src/app.js

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Global Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
```

### src/server.js

```javascript
const app = require('./app');
const env = require('./config/env');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Database connection established');

    app.listen(env.PORT, () => {
      console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
```

---

## Análisis

### Problemas de seguridad

| ID | Severidad | Problema | Fichero | Categoría OWASP |
|----|-----------|----------|---------|-----------------|
| S1 | Media | `cors()` sin configuración — abre la API a cualquier origen (`Access-Control-Allow-Origin: *`) | app.js:9 | A05 — Security Misconfiguration |
| S2 | Media | `JWT_SECRET` con mínimo de 8 caracteres — insuficiente para un secreto criptográfico; permite secretos débiles como `password` | env.js:9 | A02 — Cryptographic Failures |

### Problemas de arquitectura y calidad

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| A1 | Baja | `PrismaClient` instanciado en `server.js` — debería ser un singleton en `src/config/prisma.js` para evitar múltiples instancias en distintos módulos | server.js:3,5 |
| A2 | Baja | No incluye registro de peticiones HTTP (p. ej., `morgan`); el prompt no lo pedía | app.js |
| A3 | Baja | Formato de error distinto del estándar del diseño `{ success, data, error, message }` — usa `{ status, message }`; el prompt no lo mencionaba | app.js:20-25 |
