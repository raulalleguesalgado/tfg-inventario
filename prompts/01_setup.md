# Prompt 01 — Setup base del proyecto

**Módulo:** Configuración inicial (package.json, Express, middlewares globales, config de entorno)
**Fase:** 3.1
**Tipo de prompt:** Básico (sin restricciones de seguridad explícitas)
**LLM usado:** Gemini Pro
**Iteraciones:** 1
**Fecha:** 2026-04-05

---

## Prompt enviado

```
[CONTEXT]
Node.js REST API for an inventory management system.
Stack: Node.js, Express, Prisma ORM, PostgreSQL, JWT authentication, Zod validation.
Express, Prisma ORM, PostgreSQL, JWT authentication, Zod validation.
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

### Lo que el LLM generó correctamente sin instrucciones explícitas

- **`helmet`** incluido por defecto — establece cabeceras de seguridad HTTP (X-Frame-Options, CSP, HSTS, etc.). Comportamiento positivo destacable: el LLM conoce y aplica esta buena práctica sin que se le pida.
- **Validación de variables de entorno con Zod** antes de arrancar el servidor — patrón robusto que evita errores silenciosos en producción por variables mal configuradas.
- **Fallo rápido en arranque**: si la BD no conecta, el proceso termina limpiamente con `process.exit(1)` en lugar de arrancar en estado inconsistente.
- **Stack trace condicional**: solo se expone en `NODE_ENV=development`, no en producción.
- **Health check endpoint** — añadido por iniciativa propia, útil para monitorización.
- **Scripts de Prisma** en `package.json` — incluye `prisma:generate` y `prisma:migrate` sin que se le pida.

### Problemas de seguridad

| ID | Severidad | Problema | Fichero | Categoría OWASP |
|----|-----------|----------|---------|-----------------|
| S1 | Media | `cors()` sin configuración — abre la API a cualquier origen (`Access-Control-Allow-Origin: *`) | app.js:10 | A05 — Security Misconfiguration |
| S2 | Media | `JWT_SECRET` con mínimo de 8 caracteres — insuficiente para un secreto criptográfico; permite secretos débiles como `password` | env.js:12 | A02 — Cryptographic Failures |

**Detalle S1:** `cors()` sin opciones equivale a `{ origin: '*' }`, lo que permite peticiones desde cualquier dominio. En una API con autenticación JWT esto supone un riesgo real: cualquier web maliciosa puede hacer peticiones autenticadas en nombre de un usuario. La configuración correcta es restringir `origin` al dominio del frontend.

**Detalle S2:** Un mínimo de 8 caracteres para `JWT_SECRET` permite secretos débiles que pueden ser objeto de ataques de fuerza bruta o diccionario contra los tokens JWT. El estándar recomendado es al menos 32 caracteres aleatorios (256 bits de entropía).

### Problemas de arquitectura y calidad

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| A1 | Baja | `PrismaClient` instanciado en `server.js` — debería ser un singleton en `src/config/prisma.js` para evitar múltiples instancias en distintos módulos | server.js:3-4 |
| A2 | Baja | Falta `morgan` para logging de peticiones HTTP — estaba en los requisitos del sistema | app.js |
| A3 | Baja | Formato de error no respeta el estándar acordado `{ success, data, error, message }` — usa `{ status, message }` | app.js:20-25 |

**Detalle A1:** Instanciar `PrismaClient` en `server.js` es un problema porque otros módulos (repositories) necesitarán su propia instancia o importarla desde aquí, rompiendo la arquitectura de capas. El patrón correcto en Node.js con Prisma es exportar una única instancia desde `src/config/prisma.js` e importarla donde se necesite.

### Observación metodológica

El LLM demuestra conocimiento de buenas prácticas de seguridad básicas (`helmet`, validación de env vars, stack trace condicional) pero no las aplica de forma consistente: incluye `helmet` pero deja CORS abierto, valida el secreto JWT pero con un umbral insuficiente. Esto sugiere que el modelo tiene el conocimiento pero no lo activa sin instrucciones explícitas, lo que refuerza la hipótesis que motiva la comparativa prompt básico → prompt refinado.

---

## Correcciones aplicadas

**Ninguna en esta iteración.** El código se conserva en su estado original generado para mantener la trazabilidad del análisis. Las correcciones se aplicarán en la fase de prompt refinado o en la corrección mínima final para hacer funcionar la app.

---

## Número de iteraciones

1 — output aceptado para análisis sin re-prompting.
