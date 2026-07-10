# Prompt — Middleware global de errores

**Módulo:** Global error handler (Express)
**Fase:** 3.4
**Tipo de prompt:** Único (gap no generado en prompts básicos — no aplica comparativa básico/refinado)
**LLM usado:** Gemini Pro
**Iteraciones:** 1
**Fecha:** 2026-07-09

**Contexto:** Este middleware fue identificado como gap en el análisis de patrones básicos
(Patrón 8 de `00_analisis_patrones_basicos.md`): el prompt de setup no lo generó porque
los módulos de rutas no existían todavía. Es el receptor final de todos los `next(err)`
que generan los controllers refinados de auth, products y movements.

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

**Observación importante:** los errores de `movement.service.js` (`INSUFFICIENT_STOCK`, `PRODUCT_NOT_FOUND`) se lanzan como `new Error('...')` sin `.status`. El middleware no los reconoce como `PrismaClientKnownRequestError` ni tienen `.status`, por lo que caen en el fallback 500. Funcionalmente devuelven el mensaje correcto en `error`, pero el código HTTP es incorrecto (debería ser 422 para stock insuficiente, 404 para producto no encontrado). Es una inconsistencia entre cómo el service lanza los errores (R2 de `07_movements_refinado.md`) y cómo el middleware los clasifica. Documentado para el análisis de resultados.

---

## Número de iteraciones

1 — output aceptado sin re-prompting.
