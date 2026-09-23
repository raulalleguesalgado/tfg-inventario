# Prompt — Middleware global de errores

**Módulo:** Global error handler (Express)
**Fase:** 3.4
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

### Lo que el LLM generó correctamente

| Requisito | Estado | Detalle |
|-----------|--------|---------|
| Prisma P2002 → 409 CONFLICT | ✅ | Mensaje genérico al cliente — no expone el campo con conflicto |
| Prisma P2025 → 404 NOT_FOUND | ✅ | Mensaje genérico — no expone detalles de BD |
| `err.status` → HTTP dinámico | ✅ | Cubre los errores tipados de auth.service.js (`error.status = 401`) y los futuros |
| Fallback 500 INTERNAL_ERROR | ✅ | Default seguro para cualquier error no clasificado |
| `console.error(err)` antes de responder | ✅ | Log completo interno (con stack trace) sin exponer nada al cliente |
| Stack trace nunca expuesto | ✅ | La respuesta solo contiene `{ success, data, error, message }` |
| Formato de respuesta estándar | ✅ | Idéntico al resto de la app |
| Import correcto de Prisma | ✅ | `@prisma/client/runtime/library` — la ruta correcta en Prisma v5 |

### Puntos a documentar

| ID | Severidad | Observación | Fichero |
|----|-----------|-------------|---------|
| N1 | Info | Cuando `err.status` está definido, `message` se genera transformando `err.message` (`'PRODUCT_NOT_FOUND'` → `'PRODUCT NOT FOUND'`). El campo `error` y el campo `message` acaban siendo la misma información en distinto formato. Funcional pero redundante — en una versión de producción se añadirían mensajes amigables independientes por código de error. | error.middleware.js |
| N2 | Info | Solo cubre P2002 y P2025 de Prisma. Otros códigos frecuentes (P2003 — foreign key constraint, P2014 — relación inválida) caerán en el fallback 500. Suficiente para el alcance del proyecto. | error.middleware.js |

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
de la memoria): el guard `NODE_ENV` del código es correcto, la fuga ocurre solo porque el
entorno de pruebas corre en modo desarrollo, no por ausencia de protección en el código.
Este documento no corrige ni sustituye eso — documenta cómo habría respondido el LLM a un
prompt específico para ese middleware, dentro del experimento de la rama refinada.
