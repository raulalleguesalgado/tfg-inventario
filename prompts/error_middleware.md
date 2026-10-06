# Prompt — Middleware global de errores

**Módulo:** Global error handler (Express)
**Tipo de prompt:** Experimental, ligado a la rama refinada (sin comparativa básico/refinado
propia — el prompt de setup nunca generó ningún middleware de errores dedicado, todo iba
inline en `app.js`)
**Iteraciones:** 1

**Contexto:** Este middleware se diseñó para recibir los `next(err)` que generan los
controllers *refinados* de auth, products y movements (`err.status`/`err.message` como
código) — solo tiene sentido junto a esas tres versiones refinadas. **Nunca se creó ni se
conectó en el repo real**: la app desplegada y auditada sigue usando el handler de errores
original del prompt 01, inline en `app.js`.

---

## Prompt enviado

```
[CONTEXT]
Node.js REST API for an inventory management system.
Stack: Node.js, Express, Prisma ORM, Zod.
Module system: CommonJS (require/module.exports).
All API responses must follow this exact format:
  { "success": false, "data": null, "error": "ERROR_CODE", "message": "Human readable" }

The app uses:
- Prisma ORM — may throw PrismaClientKnownRequestError with codes like P2002 (unique
  constraint), P2025 (record not found)
- Zod — validation errors are caught before reaching controllers, so ZodError will not
  reach this middleware
- Custom errors thrown in services with err.message as an error code string (e.g.
  'PRODUCT_NOT_FOUND', 'INSUFFICIENT_STOCK', 'INVALID_CREDENTIALS') and optionally
  err.status as the HTTP status code

[TASK]
Generate a single file: src/middlewares/error.middleware.js

This is the Express global error handler (4-argument middleware: err, req, res, next).
It must handle:
1. Prisma P2002 (unique constraint violation) → 409 CONFLICT
2. Prisma P2025 (record not found) → 404 NOT_FOUND
3. Errors with err.status set → use err.status as HTTP code, err.message as error code
4. All other errors → 500 INTERNAL_ERROR

[RULES]
- Never expose err.stack, internal error details, or database error messages to the client.
- Always respond with the standard format: { success, data, error, message }.
- Import PrismaClientKnownRequestError from @prisma/client/runtime/library to identify
  Prisma errors.
- Log the full error internally (console.error) before sending the sanitized response.
- The 'error' field in the response must be a short uppercase string code (e.g. "CONFLICT",
  "NOT_FOUND").
- The 'message' field must be a human-readable string safe to show to clients.

[OUTPUT]
Only code. No explanations.
```

---

## Respuesta del LLM

### src/middlewares/error.middleware.js

```javascript
const { PrismaClientKnownRequestError } = require('@prisma/client/runtime/library');

const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred.';

  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      errorCode = 'CONFLICT';
      message = 'A record with this identifier already exists.';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'The requested record was not found.';
    }
  } else if (err.status) {
    statusCode = err.status;
    errorCode = err.message || 'BAD_REQUEST';
    message = err.message.replace(/_/g, ' ').toUpperCase();
  }

  res.status(statusCode).json({
    success: false,
    data: null,
    error: errorCode,
    message: message
  });
};

module.exports = errorMiddleware;
```

---

## Análisis

### Cobertura de errores del proyecto

| Origen del error | Ejemplo | Código HTTP resultante |
|-----------------|---------|----------------------|
| `auth.service.js` — credenciales inválidas | `err.status = 401` | 401 |
| `movement.service.js` — stock insuficiente | `err.message = 'INSUFFICIENT_STOCK'`, sin `err.status` | 500 ⚠️ |
| `movement.service.js` — producto no encontrado | `err.message = 'PRODUCT_NOT_FOUND'`, sin `err.status` | 500 ⚠️ |
| Prisma — email duplicado en register | `PrismaClientKnownRequestError P2002` | 409 |
| Prisma — registro no encontrado | `PrismaClientKnownRequestError P2025` | 404 |
| Error no clasificado | cualquier otro | 500 |

---

## Estado real: experimento, nunca integrado en la app

Este fichero (`src/middlewares/error.middleware.js`) no existe en el repo real — es un
experimento comparativo, igual que `auth`/`products`/`movements` *refinado*, ligado a esas
tres versiones refinadas (nunca integradas tampoco). La app real sigue usando el handler
original generado en el prompt 01 (`res.status(...).json({ status: 'error', message,
...(NODE_ENV === 'development' && { stack: err.stack }) })`), que expone el stack trace
completo cuando `NODE_ENV=development`. Esa exposición está documentada y analizada por
separado (`docs/pentesting_zap_completo.md`, ZAP-C04; capítulo de auditoría de seguridad
de la memoria). El guard `NODE_ENV` quita el stack trace en producción, pero no toda la
fuga: el handler devuelve siempre el mensaje original del error, y los de Prisma llevan
detalles internos (por ejemplo, la dirección de la base de datos si no es accesible), así
que parte del problema sí está en el código, no solo en el entorno de pruebas
(`docs/analisis_manual_patrones_completo.md`, punto 2).
Este documento no corrige ni sustituye eso — documenta cómo habría respondido el LLM a un
prompt específico para ese middleware, dentro del experimento de la rama refinada.
