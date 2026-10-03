# Correcciones mínimas para habilitar pruebas (Fase 3.8)

**Fecha:** 2026-04-07 a 2026-07-12
**Objetivo:** Hacer funcionar la app generada por prompts básicos para pruebas funcionales y pentesting.
**Criterio:** Solo se corrige lo estrictamente necesario para arrancar. Las vulnerabilidades documentadas se preservan.

---

## Naturaleza de las correcciones

Solo una corrección cambia qué rutas quedan protegidas, y de rebote: C6 añade `authenticate` a
las rutas de movimientos para que el módulo funcione (el controller usa `req.user.id`). Con eso
deja de ser público también `GET /movements/product/:id`, que sin C6 sí respondía sin
token. Por eso S5 cubre solo categories, suppliers y products. C3 también es de control de
acceso: crea a mano el middleware (`authenticate` y `authorize`) que el módulo de usuarios ya
importaba y el LLM no generó. Pero no cambia qué rutas se protegen: pone la pieza que faltaba,
y C6 la reutiliza en movimientos. Salvo C6, ninguna corrección elimina ni mitiga una
vulnerabilidad de seguridad.

---

## Identificadores

Los IDs de cada `prompts/*.md` (S1, B1, A1, R1...) son locales de ese prompt: el S1 de
`03_auth.md` no es el S1 de la auditoría. En la columna "Problema origen", "Bug Bn (prompt X)"
usa siempre el ID local del fichero del prompt. Los IDs globales son:

- **S1-S9:** vulnerabilidades confirmadas (`docs/vulnerabilidades_pentesting.md`; tabla 7.3 de
  la memoria). En `03_auth.md`, el S1 local (fallback del secreto) y el S2 local (rol desde el
  body) son S2 y S1 globales; el S3 local (contraseña de 6 caracteres) no tiene ID global.
- **B1-B5 de la memoria (tabla 6.3):** B1 = B1 de `02_prisma_schema.md`; B2 = B1 de
  `03_auth.md`; B3 = nota sobre `prisma.product.fields.minStock` de `06_products.md`;
  B4 = B1 de `07_movements.md`; B5 = B2 de `08_users.md`.
- **C1-C17 y Q1-Q5:** este documento.

---

## Correcciones aplicadas

| ID | Fichero | Problema origen | Corrección |
|----|---------|----------------|------------|
| C1 | `prisma/schema.prisma` | Bug B1 (prompt 02) — `provider = "prisma-client-node-js"` | Cambiado a `"prisma-client-js"` |
| C2 | `src/routes/auth.routes.js` | Bug B1 (prompt 03) — `z.zod.object()` | Cambiado a `z.object()` |
| C3 | `src/middlewares/auth.middleware.js` | Bug B2 (prompt 08) / Patrón 8 — fichero no generado por el LLM | Creado manualmente con `authenticate` y `authorize`. Replica el mismo fallback `\|\| 'supersecret'` de `auth.service.js`, para que la verificación use el mismo secreto que la firma y S2 se conserve tal cual |
| C4 | `src/app.js` | Patrón 8 — rutas no registradas en app.js | Añadidos imports y `app.use()` para las 6 rutas |
| C5 | `src/app.js`, `src/server.js`, `src/config/env.js`, `src/routes/supplier.routes.js`, `src/services/supplier.service.js`, `src/controllers/supplier.controller.js`, `src/repositories/supplier.repository.js` | Patrón 1 — módulo suppliers en CommonJS incompatible con el resto | Convertidos a ES Modules. Solo afecta al código desplegado en `src/`: el de los prompts refinados (`prompts/*_refinado.md`) está en CommonJS, como pedía su `[CONTEXT]`, y no se integró en la app |
| C6 | `src/routes/movement.routes.js` | Patrón 8 — el controller usa `req.user.id`, pero el prompt no mencionaba la autenticación y las rutas no aplican `authenticate` | Añadido `router.use(authenticate)` — sin esto el módulo falla siempre (no es corrección de seguridad: el controller cuenta con un usuario autenticado, pero las piezas no llegaron a conectarse) |

---

## Correcciones surgidas al integrar el frontend (Fase 3.5)

Errores de integración entre conversaciones independientes del frontend. Misma naturaleza
que C1-C6: bugs de contexto, no de lógica de seguridad. C9 y C10 modifican ficheros del
backend, aunque se detectaron al integrar el frontend.

| ID | Fichero | Problema origen | Corrección |
|----|---------|----------------|------------|
| C7 | `frontend/src/context/AuthContext.jsx` | B1 (prompt 09B) — `useAuth` importado en Navbar pero no exportado | Añadir `export const useAuth = () => useContext(AuthContext)` |
| C8 | `frontend/src/App.jsx` | B2 (prompt 09B) — reescritura eliminó `AuthProvider`, `ProtectedRoute` y rutas de login/register | Restaurar estructura de `09_frontend_setup.md` integrando Navbar y nuevas rutas |
| C9 | `src/services/auth.service.js` | B3 (prompt 09B) — `name` no incluido en payload JWT, `user?.name` en Navbar siempre undefined | Añadir `name` al `jwt.sign({ id, role, name }, ...)` |
| C10 | `src/controllers/auth.controller.js`, `src/services/auth.service.js` | Hallazgo A2 (prompt 03_auth.md, ya documentado en el básico) — register/login no siguen el envelope `{success, data, error, message}` que sí usa `product.controller.js`; `login` solo devolvía `{ token }`, sin `user`. Bloqueaba el login real del frontend (`data.data.token` / `data.data.user` quedaban `undefined`). Detectado al materializar y probar el frontend en navegador (2026-07-10) | Envolver respuestas de register/login en el formato estándar; `login` ahora devuelve `{ token, user }` |
| C11 | `frontend/src/components/ProductForm.jsx` | B2 (prompt 09C) — `purchasePrice`/`salePrice` se leen de `initialData` sin convertir a `Number`; la API serializa los campos `Decimal` de Prisma como string en el JSON, pero el backend exige `z.number()` en `PUT /products/:id`. Editar un producto sin tocar el precio habría fallado la validación | Envolver ambos campos en `Number(initialData.purchasePrice)` / `Number(initialData.salePrice)` al inicializar el formulario |
| C12 | `frontend/src/App.jsx` | B1 (prompt 09C) — tercera reescritura consecutiva de `App.jsx` desde cero (Patrón 8), esta vez dejando solo la ruta `/products` y eliminando `AuthProvider`, `ProtectedRoute`, `Navbar`, `Login`, `Register`, `Dashboard` y el resto de placeholders | Conservar la estructura existente y sustituir únicamente el placeholder de `/products` por el componente real |
| C13 | `frontend/src/App.jsx` | B1 (prompt 09D) — cuarta reescritura consecutiva de `App.jsx` desde cero (Patrón 8, n=4/4), dejando solo la ruta `/movements` | Conservar la estructura existente y sustituir únicamente el placeholder de `/movements` por el componente real |
| C14 | `frontend/src/App.jsx` | B1 (prompt 09E) — quinta reescritura consecutiva de `App.jsx` desde cero (Patrón 8, n=5/5), dejando solo la ruta `/categories` | Conservar la estructura existente y sustituir únicamente el placeholder de `/categories` por el componente real |
| C15 | `frontend/src/pages/Suppliers.jsx` | B1 (prompt 09F) — el input de email no es `required`, así que puede quedar `''`; el backend valida `email: z.string().email().optional().nullable()`, y `.optional()` solo exime de *omitir* la clave, no valida `''` como email válido. Crear/editar un proveedor sin email fallaba siempre con 400 "Invalid email" | Antes de enviar, `email: formData.email \|\| undefined` para omitir la clave en vez de mandar `''` |
| C16 | `frontend/src/App.jsx` | B2 (prompt 09F) — sexta reescritura consecutiva de `App.jsx` desde cero (Patrón 8, n=6/6), dejando solo la ruta `/suppliers` | Conservar la estructura existente y sustituir únicamente el placeholder de `/suppliers` por el componente real. Se elimina además el componente `Placeholder`, ya sin uso al estar todos los módulos materializados |
| C17 | `src/repositories/user.repository.js` | B3 (prompt 08_users.md) — el módulo de auth ya había generado `findByEmail`/`create` en este fichero (prompt 03_auth.md); el prompt de usuarios generó por separado `findAll`/`findById`/`update` para el mismo fichero, con `select` para excluir `passwordHash`, tal como el propio prompt predijo ("al integrar los módulos habrá conflicto en el mismo fichero") | Fusionadas las cinco funciones en un único fichero antes de commitear — sin corrección de comportamiento, solo consolidación de dos generaciones independientes sobre el mismo fichero |

---

## Vulnerabilidades deliberadamente NO corregidas

Las siguientes vulnerabilidades se conservan para el análisis de pentesting (Fase 4B):

| ID | Vulnerabilidad | Fichero | OWASP |
|----|---------------|---------|-------|
| S1 | Escalada de privilegios — `role: userData.role` en registro | `auth.service.js` | A01 |
| S2 | Secreto JWT débil: `env.js` solo exige 8 caracteres y acepta el valor de ejemplo del `.env`; el fallback `\|\| 'supersecret'` queda, pero nunca se usa (ver origen en `docs/vulnerabilidades_pentesting.md`) | `src/config/env.js`, `auth.service.js` | A02 |
| S3 | Race condition TOCTOU en movements | `movement.service.js` | A04 |
| S4 | CORS abierto `cors()` sin configuración | `app.js` | A05 |
| S5 | Rutas sin middleware de autenticación (categories, suppliers, products) | routes | A01 |
| S6 | JWT guardado en `localStorage` sin protección adicional (accesible desde cualquier script del origen; robable vía XSS) — decisión de arquitectura pedida explícitamente en `[CONTEXT]` de todos los prompts de frontend, no elección espontánea del LLM. Detectada por SonarCloud (`jssecurity:S8475`) el 2026-07-12, ver `docs/analisis_estatico_completo.md` | `frontend/src/api/auth.js:5` | A01 |
| S7 | `GET /users` (y `GET /users/:id`) solo exige `authenticate`, sin `authorize('ADMIN')` — cualquier usuario autenticado, incluido un OPERATOR recién registrado, enumera todos los usuarios (nombre, email, rol, ID) incluidas las cuentas ADMIN. Detectada en pentesting manual completo (Fase 4B.3, 2026-07-13), ver `docs/pentesting_manual_completo.md` | `src/routes/user.routes.js` | A01 |
| S8 | `PUT /products/:id` permite modificar `currentStock` directamente sin pasar por `/movements`, sin dejar rastro en el historial de auditoría (`StockMovement`) — bypass completo del flujo de negocio de inventario, agravado por la falta de autenticación (S5). Detectada en pentesting manual completo (Fase 4B.3, 2026-07-13) | `src/routes/product.routes.js`, `src/services/product.service.js` | A04 |
| S9 | Sin middleware de rate limiting en ningún endpoint del proyecto (`grep -r "rateLimit" src/` sin resultados) — `/auth/login` acepta fuerza bruta sin límite, retraso ni bloqueo. Detectada en pentesting manual completo (Fase 4B.3, 2026-07-13) | `src/app.js`, `src/routes/auth.routes.js` | A07 |

---

## Hallazgos de calidad deliberadamente NO corregidos (Fase 4A)

Bugs reales detectados al verificar en navegador que **no bloquean el flujo funcional**
— se documentan tal cual para el análisis de calidad, no se corrigen junto con las
correcciones mínimas de integración (criterio: solo se corrige lo estrictamente
necesario para que la app arranque y funcione, ver cabecera de este documento).

No hay Q4: era la alerta de CSP de ZAP, que resultó ser un falso positivo y se descartó
sin renumerar el resto.

| ID | Fichero | Problema |
|----|---------|----------|
| Q1 | `movement.controller.js` | El catch de `registerMovement` hardcodea `message: 'Failed to record movement'` y solo pone el motivo real (p. ej. "Insufficient stock for this movement") en el campo `error`. El frontend (correctamente) muestra `message`, así que el usuario nunca ve el motivo real de ningún fallo de movimiento. Inconsistente con `auth.controller.js`/`product.controller.js`, que sí devuelven el motivo real en `message`. Detectado en `prompts/09_frontend_movements.md` al probar un OUT con stock insuficiente. |
| Q2 | `.env`/`.env.example` + `auth.service.js` | `JWT_EXPIRES_IN="1h"` está declarado en el entorno pero nunca se lee en el código — `jwt.sign()` hardcodea `{ expiresIn: '1d' }` directamente. Configuración muerta: cambiar la variable de entorno no tiene ningún efecto sobre la expiración real del token. Detectado en la revisión manual de patrones inseguros (Fase 4A.4, 2026-07-12). No es una decisión del modelo: `JWT_EXPIRES_IN` solo aparece en el `.env.example` escrito a mano, que ningún prompt mencionaba (`prompts/03_auth.md` no dice nada de la expiración). |
| Q3 | `frontend/src/api/client.js` | `baseURL: 'http://localhost:3000'` hardcodeado en vez de leerse de una variable de entorno (`import.meta.env.VITE_API_URL` o similar) — no bloquea nada en desarrollo, pero impide desplegar el frontend contra otro backend sin editar código fuente. Detectado en la revisión manual de patrones inseguros (Fase 4A.4, 2026-07-12). No es una decisión del modelo: la `baseURL` fija la pedía literalmente `prompts/09_frontend_setup.md`. |
| Q5 | `product.service.js` y el resto de `*.service.js` | Los servicios lanzan `new Error('mensaje')` genérico sin código de error asociado — única excepción, `user.service.js`, que sí asigna `error.statusCode`. El middleware global de errores solo mapea correctamente los que lo incluyen, así que los fallos de negocio que llegan a él devuelven `500` en vez de un código más preciso: por ejemplo, `GET /products/:id` con un id inexistente (`Product not found`) devuelve `500` en vez de `404`. (Movimientos no llega al middleware global: su controller responde `400` directamente, ver Q1.) Detectado en la revisión manual del código de los services frente al middleware global de errores; añadido aquí el 2026-09-23. |

---

## Estado final

- App arrancando: ✅ `node src/server.js`
- BD conectada: ✅ `tfg_inventario` en Docker
- Health check: ✅ `GET /health → {"status":"UP"}`
- Puerto: 3000
- Frontend materializado y verificado en navegador (Playwright headless, 2026-07-10): registro → login → dashboard → navegación → logout → redirección de ruta protegida, todo sin errores de consola. Puerto: 5173
- Categories y Suppliers materializados y verificados en navegador (Playwright headless, 2026-07-12): crear/editar/borrar categoría, crear/editar/borrar proveedor **con email en blanco** (confirma la corrección C15), sin errores de consola. Con esto la Fase 3.5 (frontend mínimo) queda completa: las 7 vistas (Login, Register, Dashboard, Products, Movements, Categories, Suppliers) están generadas, materializadas y verificadas.
