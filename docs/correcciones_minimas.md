# Correcciones mínimas para habilitar pruebas (Fase 3.8)

**Fecha:** 2026-04-07
**Objetivo:** Hacer funcionar la app generada por prompts básicos para pruebas funcionales y pentesting.
**Criterio:** Solo se corrige lo estrictamente necesario para arrancar. Las vulnerabilidades documentadas se preservan.

---

## Naturaleza de las correcciones

Todas las correcciones aplicadas son consecuencia de **errores del LLM por falta de contexto
global entre conversaciones independientes** (Patrones 1 y 8), no decisiones de diseño inseguras.
La distinción es metodológicamente importante:

- **Error de contexto:** el LLM no sabe qué generó en otras conversaciones, por lo que produce
  código que asume artefactos inexistentes o usa un sistema de módulos inconsistente. Son bugs
  de integración, no de lógica.
- **Decisión insegura:** el LLM elige activamente un patrón de código que introduce riesgo
  (pasar `userData.role` al ORM, usar un secreto hardcoded, omitir auth en rutas). Estas se
  conservan intactas.

Ninguna corrección elimina ni mitiga una vulnerabilidad de seguridad. El perfil de riesgo de la
app es idéntico al del código LLM-generado original.

---

## Correcciones aplicadas

| ID | Fichero | Problema origen | Corrección |
|----|---------|----------------|------------|
| C1 | `prisma/schema.prisma` | Bug B1 (prompt 02) — `provider = "prisma-client-node-js"` | Cambiado a `"prisma-client-js"` |
| C2 | `src/routes/auth.routes.js` | Bug B2 (prompt 03) — `z.zod.object()` | Cambiado a `z.object()` |
| C3 | `src/middlewares/auth.middleware.js` | Bug B5 (prompt 08) / Patrón 8 — fichero no generado por el LLM | Creado manualmente con `authenticate` y `authorize` |
| C4 | `src/app.js` | Patrón 8 — rutas no registradas en app.js | Añadidos imports y `app.use()` para las 6 rutas |
| C5 | `src/app.js`, `src/server.js`, `src/config/env.js`, `src/routes/supplier.routes.js`, `src/services/supplier.service.js`, `src/controllers/supplier.controller.js`, `src/repositories/supplier.repository.js` | Patrón 1 — módulo suppliers en CommonJS incompatible con el resto | Convertidos a ES Modules |
| C6 | `src/routes/movement.routes.js` | Patrón 8 — el controller usa `req.user.id` pero el LLM no añadió `authenticate` en las rutas | Añadido `router.use(authenticate)` — sin esto el módulo falla siempre (no es corrección de seguridad: el LLM diseñó movements para requerir auth pero no conectó las piezas) |

---

## Correcciones frontend (prompts refinados — Fase 3.5)

Errores de integración entre conversaciones independientes del frontend. Misma naturaleza
que C1-C6: bugs de contexto, no de lógica de seguridad.

| ID | Fichero | Problema origen | Corrección |
|----|---------|----------------|------------|
| C7 | `src/context/AuthContext.jsx` | B1 (prompt 09B) — `useAuth` importado en Navbar pero no exportado | Añadir `export const useAuth = () => useContext(AuthContext)` |
| C8 | `src/App.jsx` | B2 (prompt 09B) — reescritura eliminó `AuthProvider`, `ProtectedRoute` y rutas de login/register | Restaurar estructura de `09_frontend_setup.md` integrando Navbar y nuevas rutas |
| C9 | `src/services/auth.service.js` | B3 (prompt 09B) — `name` no incluido en payload JWT, `user?.name` en Navbar siempre undefined | Añadir `name` al `jwt.sign({ id, role, name }, ...)` |
| C10 | `src/controllers/auth.controller.js`, `src/services/auth.service.js` | Hallazgo A2 (prompt 03_auth.md, ya documentado en el básico) — register/login no siguen el envelope `{success, data, error, message}` que sí usa `product.controller.js`; `login` solo devolvía `{ token }`, sin `user`. Bloqueaba el login real del frontend (`data.data.token` / `data.data.user` quedaban `undefined`). Detectado al materializar y probar el frontend en navegador (2026-07-10) | Envolver respuestas de register/login en el formato estándar; `login` ahora devuelve `{ token, user }` |

---

## Vulnerabilidades deliberadamente NO corregidas

Las siguientes vulnerabilidades se conservan para el análisis de pentesting (Fase 4B):

| ID | Vulnerabilidad | Fichero | OWASP |
|----|---------------|---------|-------|
| S1 | Escalada de privilegios — `role: userData.role` en registro | `auth.service.js` | A01 |
| S2 | JWT secret con fallback `\|\| 'supersecret'` | `auth.service.js` | A02 |
| S3 | Race condition TOCTOU en movements | `movement.service.js` | A04 |
| S4 | CORS abierto `cors()` sin configuración | `app.js` | A05 |
| S5 | Rutas sin middleware de autenticación (categories, suppliers, products) | routes | A01 |
| ~~B3~~ | ~~Alucinación de API — `prisma.product.fields.minStock`~~ | ~~`product.repository.js`~~ | Verificado 2026-04-13: sintaxis válida en Prisma v5, endpoint funciona correctamente. No es bug. |

---

## Problema de entorno resuelto

Durante la configuración se detectó un conflicto de puertos: una instalación nativa de
PostgreSQL 12 en Windows (servicio `postgresql-x64-12`) ocupaba el puerto 5432, impidiendo
que Prisma conectara al contenedor Docker. Se paró y deshabilitó el servicio de Windows.
El contenedor Docker `tfg-postgres` (PostgreSQL 16) queda como único servidor en ese puerto.

---

## Estado final

- App arrancando: ✅ `node src/server.js`
- BD conectada: ✅ `tfg_inventario` en Docker
- Health check: ✅ `GET /health → {"status":"UP"}`
- Puerto: 3000
- Frontend materializado y verificado en navegador (Playwright headless, 2026-07-10): registro → login → dashboard → navegación → logout → redirección de ruta protegida, todo sin errores de consola. Puerto: 5173
