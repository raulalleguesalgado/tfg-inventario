# Correcciones mínimas para habilitar pruebas

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
| C5 | `src/app.js`, `src/server.js`, `src/config/env.js`, `src/routes/supplier.routes.js`, `src/services/supplier.service.js`, `src/controllers/supplier.controller.js`, `src/repositories/supplier.repository.js` | Patrón 1 — módulo suppliers en CommonJS incompatible con el resto | Convertidos a ES Modules. Solo afecta al código desplegado en `src/`: el de los prompts refinados (`prompts/*_refinado.md`) está en CommonJS, como pedía su `[CONTEXT]`, y no se integró en la app |
| C6 | `src/routes/movement.routes.js` | Patrón 8 — el controller usa `req.user.id`, pero el prompt no mencionaba la autenticación y las rutas no aplican `authenticate` | Añadido `router.use(authenticate)` — sin esto el módulo falla siempre (no es corrección de seguridad: el controller cuenta con un usuario autenticado, pero las piezas no llegaron a conectarse) |

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
| C10 | `src/controllers/auth.controller.js`, `src/services/auth.service.js` | Hallazgo A2 (prompt 03_auth.md, ya documentado en el básico) — register/login no siguen el envelope `{success, data, error, message}` que sí usa `product.controller.js`; `login` solo devolvía `{ token }`, sin `user`. Bloqueaba el login real del frontend (`data.data.token` / `data.data.user` quedaban `undefined`). Detectado al materializar y probar el frontend en navegador | Envolver respuestas de register/login en el formato estándar; `login` ahora devuelve `{ token, user }` |
| C11 | `frontend/src/components/ProductForm.jsx` | Prompt 09C — `purchasePrice`/`salePrice` se leen de `initialData` sin convertir a `Number`; la API serializa los campos `Decimal` de Prisma como string en el JSON, pero el backend exige `z.number()` en `PUT /products/:id`. Editar un producto sin tocar el precio habría fallado la validación | Envolver ambos campos en `Number(initialData.purchasePrice)` / `Number(initialData.salePrice)` al inicializar el formulario |
| C12 | `frontend/src/App.jsx` | Prompt 09C — reescribe `App.jsx` desde cero y deja solo la ruta `/products` (Patrón 8) | Conservar la estructura existente y sustituir únicamente el placeholder de `/products` por el componente real |
| C13 | `frontend/src/App.jsx` | Prompt 09D — reescribe `App.jsx` desde cero y deja solo la ruta `/movements` | Conservar la estructura existente y sustituir únicamente el placeholder de `/movements` por el componente real |
| C14 | `frontend/src/App.jsx` | Prompt 09E — reescribe `App.jsx` desde cero y deja solo la ruta `/categories` | Conservar la estructura existente y sustituir únicamente el placeholder de `/categories` por el componente real |
| C15 | `frontend/src/pages/Suppliers.jsx` | Prompt 09F — el input de email no es `required`, así que puede quedar `''`; el backend valida `email: z.string().email().optional().nullable()`, y `.optional()` solo exime de *omitir* la clave, no valida `''` como email válido. Crear/editar un proveedor sin email fallaba siempre con 400 "Invalid email" | Antes de enviar, `email: formData.email \|\| undefined` para omitir la clave en vez de mandar `''` |
| C16 | `frontend/src/App.jsx` | Prompt 09F — reescribe `App.jsx` desde cero y deja solo la ruta `/suppliers` | Conservar la estructura existente y sustituir únicamente el placeholder de `/suppliers` por el componente real. Se elimina además el componente `Placeholder`, ya sin uso al estar todos los módulos materializados |
| C17 | `src/repositories/user.repository.js` | Prompt 08 — el prompt 03 ya había generado `findByEmail`/`create` en este fichero, y el 08 generó por separado `findAll`/`findById`/`update` para el mismo fichero | Fusionadas las cinco funciones en un único fichero, sin cambiar su comportamiento |

---

## Vulnerabilidades deliberadamente NO corregidas

Se conservan para las pruebas de penetración. El detalle de cada una está en
`docs/vulnerabilidades_pentesting.md`.

| ID | Vulnerabilidad | Fichero | OWASP |
|----|---------------|---------|-------|
| S1 | Escalada de privilegios — `role: userData.role` en registro | `auth.service.js` | A01 |
| S2 | Secreto JWT débil: `env.js` solo exige 8 caracteres y acepta el valor de ejemplo del `.env`; el fallback `\|\| 'supersecret'` queda, pero nunca se usa (ver origen en `docs/vulnerabilidades_pentesting.md`) | `src/config/env.js`, `auth.service.js` | A02 |
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
| Q1 | `movement.controller.js` | El catch de `registerMovement` hardcodea `message: 'Failed to record movement'` y solo pone el motivo real (p. ej. "Insufficient stock for this movement") en el campo `error`. El frontend (correctamente) muestra `message`, así que el usuario nunca ve el motivo real de ningún fallo de movimiento. Inconsistente con `auth.controller.js`/`product.controller.js`, que sí devuelven el motivo real en `message`. Detectado en `prompts/09_frontend_movements.md` al probar un OUT con stock insuficiente. |
| Q2 | `.env`/`.env.example` + `auth.service.js` | `JWT_EXPIRES_IN="1h"` está declarado en el entorno pero nunca se lee en el código — `jwt.sign()` hardcodea `{ expiresIn: '1d' }` directamente. Configuración muerta: cambiar la variable de entorno no tiene ningún efecto sobre la expiración real del token. Detectado en la revisión manual de patrones inseguros. No es una decisión del modelo: `JWT_EXPIRES_IN` solo aparece en el `.env.example` escrito a mano, que ningún prompt mencionaba (`prompts/03_auth.md` no dice nada de la expiración). |
| Q3 | `frontend/src/api/client.js` | `baseURL: 'http://localhost:3000'` hardcodeado en vez de leerse de una variable de entorno (`import.meta.env.VITE_API_URL` o similar) — no bloquea nada en desarrollo, pero impide desplegar el frontend contra otro backend sin editar código fuente. Detectado en la revisión manual de patrones inseguros. No es una decisión del modelo: la `baseURL` fija la pedía literalmente `prompts/09_frontend_setup.md`. |
| Q5 | `product.service.js` y el resto de `*.service.js` | Los servicios lanzan `new Error('mensaje')` genérico sin código de error asociado — única excepción, `user.service.js`, que sí asigna `error.statusCode`. El middleware global de errores solo mapea correctamente los que lo incluyen, así que los fallos de negocio que llegan a él devuelven `500` en vez de un código más preciso: por ejemplo, `GET /products/:id` con un id inexistente (`Product not found`) devuelve `500` en vez de `404`. (Movimientos no llega al middleware global: su controller responde `400` directamente, ver Q1.) Detectado en la revisión manual del código de los services frente al middleware global de errores. |
