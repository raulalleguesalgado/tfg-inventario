# Correcciones mínimas para habilitar pruebas

**Objetivo:** Hacer funcionar la app generada por prompts básicos para pruebas funcionales y pentesting.
**Criterio:** Solo se corrige lo estrictamente necesario para arrancar. Las vulnerabilidades documentadas se preservan.

---

## Naturaleza de las correcciones

Solo C6 afecta a la seguridad, y de rebote: añade `authenticate` a las rutas de movimientos
para que el módulo funcione (el controller usa `req.user.id`), y con ello
`GET /movements/product/:id` deja de ser público. Por eso S5 cubre solo categories, suppliers y
products. C3 crea a mano el middleware que el módulo de usuarios importaba y el LLM no generó,
pero no cambia qué rutas se protegen.

---

## Identificadores

Son los mismos en la memoria y en el repositorio:

- **S1-S9:** vulnerabilidades confirmadas (`docs/vulnerabilidades_pentesting.md`).
- **B1-B5:** bugs de los prompts básicos del backend, marcados con ese ID en el análisis de
  cada `prompts/*.md`.
- **C1-C17 y Q1-Q5:** este documento.

En el análisis de cada prompt, los problemas sin uno de estos IDs aparecen con "—", y en la
columna "Problema origen" se citan por el prompt en el que aparecen.

---

## Correcciones aplicadas

| ID | Fichero | Problema origen | Corrección |
|----|---------|----------------|------------|
| C1 | `prisma/schema.prisma` | Bug B1 (prompt 02) — `provider = "prisma-client-node-js"` | Cambiado a `"prisma-client-js"` |
| C2 | `src/routes/auth.routes.js` | Bug B2 (prompt 03) — `z.zod.object()` | Cambiado a `z.object()` |
| C3 | `src/middlewares/auth.middleware.js` | Bug B5 (prompt 08) / Patrón 8 — fichero no generado por el LLM | Creado manualmente con `authenticate` y `authorize`. Replica el mismo fallback `\|\| 'supersecret'` de `auth.service.js`, para que la verificación use el mismo secreto que la firma y S2 se conserve tal cual |
| C4 | `src/app.js` | Patrón 8 — rutas no registradas en app.js | Añadidos imports y `app.use()` para las 6 rutas |
| C5 | `src/app.js`, `src/server.js`, `src/config/env.js`, `src/routes/supplier.routes.js`, `src/services/supplier.service.js`, `src/controllers/supplier.controller.js`, `src/repositories/supplier.repository.js` | Patrón 1 — módulo suppliers en CommonJS, incompatible con el resto | Convertidos a ES Modules (solo en `src/`: el código de los prompts refinados sigue en CommonJS, como pedía su `[CONTEXT]`) |
| C6 | `src/routes/movement.routes.js` | Patrón 8 — el controller usa `req.user.id`, pero el prompt no mencionaba la autenticación y las rutas no aplican `authenticate` | Añadido `router.use(authenticate)`, sin esto el módulo falla siempre |

---

## Correcciones surgidas al integrar el frontend

Errores de integración entre conversaciones independientes del frontend. Misma naturaleza
que C1-C6: bugs de contexto, no de lógica de seguridad. C9 y C10 modifican ficheros del
backend, aunque se detectaron al integrar el frontend.

| ID | Fichero | Problema origen | Corrección |
|----|---------|----------------|------------|
| C7 | `frontend/src/context/AuthContext.jsx` | Prompt 09B — `useAuth` importado en Navbar pero no exportado | Añadir `export const useAuth = () => useContext(AuthContext)` |
| C8 | `frontend/src/App.jsx` | Prompt 09B — reescritura eliminó `AuthProvider`, `ProtectedRoute` y rutas de login/register | Restaurar estructura de `09_frontend_setup.md` integrando Navbar y nuevas rutas |
| C9 | `src/services/auth.service.js` | Prompt 09B — `name` no incluido en payload JWT, `user?.name` en Navbar siempre undefined | Añadir `name` al `jwt.sign({ id, role, name }, ...)` |
| C10 | `src/controllers/auth.controller.js`, `src/services/auth.service.js` | Prompt 03 — register/login no usan el formato estándar `{success, data, error, message}` y `login` solo devolvía `{ token }`. El login del frontend no funcionaba | Respuestas de register/login en el formato estándar, y `login` devuelve `{ token, user }` |
| C11 | `frontend/src/components/ProductForm.jsx` | Prompt 09C — los precios llegan como texto (Prisma serializa `Decimal` así) y el backend exige número: editar un producto sin tocar el precio fallaba | Convertir los dos precios con `Number()` al cargar el formulario |
| C12 | `frontend/src/App.jsx` | Prompt 09C — reescribe `App.jsx` desde cero y deja solo la ruta `/products` (Patrón 8) | Conservar la estructura y sustituir solo el placeholder de `/products` |
| C13 | `frontend/src/App.jsx` | Prompt 09D — reescribe `App.jsx` desde cero y deja solo la ruta `/movements` | Conservar la estructura y sustituir solo el placeholder de `/movements` |
| C14 | `frontend/src/App.jsx` | Prompt 09E — reescribe `App.jsx` desde cero y deja solo la ruta `/categories` | Conservar la estructura y sustituir solo el placeholder de `/categories` |
| C15 | `frontend/src/pages/Suppliers.jsx` | Prompt 09F — el email vacío se envía como `''` y el backend lo rechaza con un 400: no se podía guardar un proveedor sin email | Enviar `email: formData.email \|\| undefined` |
| C16 | `frontend/src/App.jsx` | Prompt 09F — reescribe `App.jsx` desde cero y deja solo la ruta `/suppliers` | Conservar la estructura y sustituir solo el placeholder de `/suppliers`. Se quita el componente `Placeholder`, ya sin uso |
| C17 | `src/repositories/user.repository.js` | Prompt 08 — el prompt 03 ya había generado `findByEmail`/`create` en este fichero, y el 08 generó por separado `findAll`/`findById`/`update` para el mismo fichero | Fusionadas las cinco funciones en un único fichero, sin cambiar su comportamiento |

---

## Vulnerabilidades deliberadamente NO corregidas

Se conservan para las pruebas de penetración. El detalle de cada una está en
`docs/vulnerabilidades_pentesting.md`.

| ID | Vulnerabilidad | Fichero | OWASP |
|----|---------------|---------|-------|
| S1 | Escalada de privilegios — `role: userData.role` en registro | `auth.service.js` | A01 |
| S2 | Secreto JWT débil: `env.js` acepta el valor de ejemplo del `.env` (el fallback `\|\| 'supersecret'` nunca llega a usarse) | `src/config/env.js`, `auth.service.js` | A02 |
| S3 | Race condition TOCTOU en movements | `movement.service.js` | A04 |
| S4 | CORS abierto `cors()` sin configuración | `app.js` | A05 |
| S5 | Rutas sin middleware de autenticación (categories, suppliers, products) | routes | A01 |
| S6 | JWT guardado en `localStorage`, accesible desde cualquier script de la página (lo pedía el `[CONTEXT]` de los prompts de frontend) | `frontend/src/api/auth.js:5` | A01 |
| S7 | `GET /users` y `GET /users/:id` sin `authorize('ADMIN')`: cualquier usuario autenticado lista todas las cuentas | `src/routes/user.routes.js` | A01 |
| S8 | `PUT /products/:id` permite cambiar `currentStock` sin registrar ningún movimiento | `src/routes/product.routes.js`, `src/services/product.service.js` | A04 |
| S9 | Sin límite de intentos en `/auth/login` | `src/app.js`, `src/routes/auth.routes.js` | A07 |

---

## Hallazgos de calidad deliberadamente NO corregidos

Problemas de calidad que no impiden que la aplicación funcione, así que no se corrigen. No hay
Q4: era la alerta de CSP de ZAP, que resultó ser un falso positivo y se descartó sin
renumerar el resto.

| ID | Fichero | Problema |
|----|---------|----------|
| Q1 | `movement.controller.js` | El catch de `registerMovement` devuelve siempre `message: 'Failed to record movement'` y deja el motivo real en `error`, que el frontend no muestra: el usuario nunca ve por qué falla un movimiento. Detectado al probar en el navegador una salida con stock insuficiente (`prompts/09_frontend_movements.md`). |
| Q2 | `.env`/`.env.example` + `auth.service.js` | `JWT_EXPIRES_IN` está en el `.env` pero nunca se lee: `jwt.sign()` fija `expiresIn: '1d'`. Detectado en la revisión manual de patrones inseguros. No es decisión del modelo: la variable solo está en el `.env.example` escrito a mano, que ningún prompt mencionaba. |
| Q3 | `frontend/src/api/client.js` | `baseURL: 'http://localhost:3000'` fija en el código en vez de leerse de una variable de entorno: para usar otro backend hay que editar el código. Detectado en la revisión manual de patrones inseguros. No es decisión del modelo: la pedía `prompts/09_frontend_setup.md`. |
| Q5 | `product.service.js` y el resto de `*.service.js` | Los services lanzan `new Error('mensaje')` sin código HTTP (salvo `user.service.js`), así que el middleware global responde `500` a los errores de negocio: `GET /products/:id` con un id inexistente da `500` en vez de `404`. Detectado al revisar a mano los services frente al middleware global de errores. |
