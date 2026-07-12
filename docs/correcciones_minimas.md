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
| C11 | `frontend/src/components/ProductForm.jsx` | B2 (prompt 09C) — `purchasePrice`/`salePrice` se leen de `initialData` sin convertir a `Number`; la API serializa los campos `Decimal` de Prisma como string en el JSON, pero el backend exige `z.number()` en `PUT /products/:id`. Editar un producto sin tocar el precio habría fallado la validación | Envolver ambos campos en `Number(initialData.purchasePrice)` / `Number(initialData.salePrice)` al inicializar el formulario |
| C12 | `frontend/src/App.jsx` | B1 (prompt 09C) — tercera reescritura consecutiva de `App.jsx` desde cero (Patrón 8), esta vez dejando solo la ruta `/products` y eliminando `AuthProvider`, `ProtectedRoute`, `Navbar`, `Login`, `Register`, `Dashboard` y el resto de placeholders | Conservar la estructura existente y sustituir únicamente el placeholder de `/products` por el componente real |
| C13 | `frontend/src/App.jsx` | B1 (prompt 09D) — cuarta reescritura consecutiva de `App.jsx` desde cero (Patrón 8, n=4/4), dejando solo la ruta `/movements` | Conservar la estructura existente y sustituir únicamente el placeholder de `/movements` por el componente real |
| C14 | `frontend/src/App.jsx` | B1 (prompt 09E) — quinta reescritura consecutiva de `App.jsx` desde cero (Patrón 8, n=5/5), dejando solo la ruta `/categories` | Conservar la estructura existente y sustituir únicamente el placeholder de `/categories` por el componente real |
| C15 | `frontend/src/pages/Suppliers.jsx` | B1 (prompt 09F) — el input de email no es `required`, así que puede quedar `''`; el backend valida `email: z.string().email().optional().nullable()`, y `.optional()` solo exime de *omitir* la clave, no valida `''` como email válido. Crear/editar un proveedor sin email fallaba siempre con 400 "Invalid email" | Antes de enviar, `email: formData.email \|\| undefined` para omitir la clave en vez de mandar `''` |
| C16 | `frontend/src/App.jsx` | B2 (prompt 09F) — sexta reescritura consecutiva de `App.jsx` desde cero (Patrón 8, n=6/6), dejando solo la ruta `/suppliers` | Conservar la estructura existente y sustituir únicamente el placeholder de `/suppliers` por el componente real. Se elimina además el componente `Placeholder`, ya sin uso al estar todos los módulos materializados |

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
| S6 | JWT guardado en `localStorage` sin protección adicional (accesible desde cualquier script del origen; robable vía XSS) — decisión de arquitectura pedida explícitamente en `[CONTEXT]` de todos los prompts de frontend, no elección espontánea del LLM. Detectada por SonarCloud (`jssecurity:S8475`) el 2026-07-12, ver `docs/analisis_estatico_completo.md` | `frontend/src/api/auth.js:5` | A02 |
| ~~B3~~ | ~~Alucinación de API — `prisma.product.fields.minStock`~~ | ~~`product.repository.js`~~ | Verificado 2026-04-13: sintaxis válida en Prisma v5, endpoint funciona correctamente. No es bug. |

---

## Hallazgos de calidad deliberadamente NO corregidos (Fase 4A)

Bugs reales detectados al verificar en navegador que **no bloquean el flujo funcional**
— se documentan tal cual para el análisis de calidad, no se corrigen junto con las
correcciones mínimas de integración (criterio: solo se corrige lo estrictamente
necesario para que la app arranque y funcione, ver cabecera de este documento).

| ID | Fichero | Problema |
|----|---------|----------|
| Q1 | `movement.controller.js` | El catch de `registerMovement` hardcodea `message: 'Failed to record movement'` y solo pone el motivo real (p. ej. "Insufficient stock for this movement") en el campo `error`. El frontend (correctamente) muestra `message`, así que el usuario nunca ve el motivo real de ningún fallo de movimiento. Inconsistente con `auth.controller.js`/`product.controller.js`, que sí devuelven el motivo real en `message`. Detectado en `prompts/09_frontend_movements.md` al probar un OUT con stock insuficiente. |

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
- Categories y Suppliers materializados y verificados en navegador (Playwright headless, 2026-07-12): crear/editar/borrar categoría, crear/editar/borrar proveedor **con email en blanco** (confirma la corrección C15), sin errores de consola. Con esto la Fase 3.5 (frontend mínimo) queda completa: las 6 vistas (Login, Register, Dashboard, Products, Movements, Categories, Suppliers) están generadas, materializadas y verificadas.
