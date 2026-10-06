# Tercera ronda de auditoría — comprobación de alcance reducido

**Commit auditado:** `8017d647e844936def490bfe10d293fb50af2124` (`main`)
**Comparativa con:** la ronda completa (análisis estático y pentesting)
**Objetivo:** comprobar si los resultados de la auditoría cambian con el paso del tiempo
sin tocar el código. No es una auditoría nueva: se repiten las herramientas automáticas y
se vuelven a comprobar a mano las nueve vulnerabilidades confirmadas (S1-S9), sin explorar
superficie nueva.

---

## Condiciones de la comparación

- **Código ejecutable idéntico al de la ronda completa.** Desde el cierre de la ronda completa
  hasta `8017d64`, fuera de `docs/`, `prompts/` y los `*.md`, solo cambian 3 ficheros, y
  en los 3 el cambio es un comentario (`eslint.config.js:4`, `prisma/schema.prisma:4`,
  `src/middlewares/auth.middleware.js:3`). En `frontend/` solo cambia `README.md`.
- **Mismas versiones de dependencias.** `package-lock.json` y `frontend/package-lock.json`
  no cambian entre las dos rondas. Instalación con `npm ci`, que respeta el lock exacto:
  `express@4.22.1`, `body-parser@1.20.4`, `qs@6.14.2`, `eslint@10.2.0`,
  `brace-expansion@5.0.5`, `react-router-dom@7.18.1`, `vite@8.1.4`, `postcss@8.5.16`,
  `nanoid@3.3.15`.
- **Entorno:** Node.js v22.20.0, npm 10.9.3 (los mismos que en la ronda completa). BD: contenedor
  Docker `tfg-postgres` (postgres:16). Backend `npm start` (puerto 3000,
  `NODE_ENV=development`), frontend `npm run dev` (Vite 8.1.4, puerto 5173). Mismo `.env`
  que en las rondas anteriores.

---

## 1. npm audit — cambia

`npm audit` y `npm audit --json` en la raíz (backend) y en `frontend/`; `npm audit
--omit=dev` y `npm ls` para ver qué llega a producción. La fecha de publicación de cada
advisory se consultó en la API de GitHub (`gh api advisories/<GHSA>`).

| | Básica | Completa | Tercera |
|---|---|---|---|
| Backend, advisories distintos | 0 | 2 | **9** |
| Frontend, advisories distintos | (no existía) | 0 | **5** |
| Recuento de npm (paquetes) | 0 | backend 4 moderadas | backend 4 (1 alta, 2 moderadas, 1 baja); frontend 4 altas |

npm cuenta **paquetes**, no advisories: en la ronda completa contaba `express` y `body-parser` porque
arrastraban `qs`, y ahora no los cuenta igual. Por eso se compara por advisory (GHSA).

| GHSA | Paquete | Severidad | Publicado | Producción o desarrollo |
|---|---|---|---|---|
| jxxr-4gwj-5jf2 | brace-expansion | moderada | 2026-05-18 | desarrollo (eslint) |
| q8mj-m7cp-5q26 | qs | moderada | 2026-05-22 | **producción** (express) |
| 3jxr-9vmj-r5cp | brace-expansion | alta | 2026-07-20 | desarrollo |
| v422-hmwv-36x6 | body-parser | baja | 2026-07-20 | **producción** |
| mh99-v99m-4gvg | brace-expansion | alta | 2026-07-24 | desarrollo |
| r28c-9q8g-f849 | postcss | alta | 2026-07-24 | desarrollo (vite) |
| qwww-vcr4-c8h2 | react-router | alta | 2026-07-24 | **producción** (frontend) |
| 28wg-ghj8-5hjv | nanoid | alta | 2026-07-29 | desarrollo (vite → postcss) |
| 2v37-7h3g-55p8 | nanoid | alta | 2026-07-29 | desarrollo |
| rgw5-rvv9-x895 | brace-expansion | alta | 2026-08-03 | desarrollo |
| fxqj-rqcc-2cmp | postcss | moderada | 2026-08-03 | desarrollo |
| p498-v437-472g | @humanfs/node | moderada | 2026-09-02 | desarrollo (eslint) |
| 4mjr-xmp4-gh2g | qs | moderada | 2026-09-02 | **producción** |
| x5fp-wj9c-mxmx | qs | moderada | 2026-09-02 | **producción** |

- Los 2 advisories de la ronda completa se publicaron en mayo, entre la ronda básica y la
  completa: explica el 0 → 4 ya documentado en `analisis_npm_audit_completo.md`.
- Los 12 nuevos se publicaron **todos después de la ronda completa**. Mismo código y mismas
  versiones: el cambio viene solo de la base de datos de advisories.
- En producción (`--omit=dev`) solo quedan afectados `qs` (3 advisories, moderada),
  `body-parser` (baja) y `react-router` (alta). El resto son herramientas de desarrollo
  (ESLint, Vite) que no se despliegan.
- El de `react-router` es un bypass de CSRF en el "RSC Mode" (React Server Components). La
  app usa `BrowserRouter` en modo declarativo (`frontend/src/App.jsx:21`), sin RSC ni
  *actions*: la versión es vulnerable según npm, pero el fallo no es explotable aquí.
- Todos tienen arreglo con `npm audit fix`. No se aplica: la ronda solo mide.

---

## 2. ESLint — igual

Mismo comando que en la ronda completa: `npx eslint . --no-error-on-unmatched-pattern`, y la
comprobación acotada a `frontend/src/**/*.{jsx,js}`. ESLint v10.2.0,
`eslint-plugin-security` v4.0.0, `eslint-plugin-n` v17.24.0.

0 errores, 2 warnings `n/no-process-exit` (`src/config/env.js:18`, `src/server.js:19`,
E1 y E2), 0 reglas de seguridad disparadas, frontend sin issues. Ficheros: 27 de `src/` +
15 de `frontend/src/` = 42, como en la ronda completa (ESLint procesa además `eslint.config.js` y
`frontend/vite.config.js`, sin avisos). Es lo esperable: ESLint no consulta nada externo.

---

## 3. SonarCloud — igual

No hace falta un análisis nuevo: SonarCloud analiza en cada push (`build.yml`), y el último
análisis es sobre `8017d64`, el mismo código, con el perfil de
reglas vigente en la tercera ronda. Resultados consultados con la API REST de SonarCloud.

| Métrica | Completa | Tercera |
|---|---|---|
| Quality Gate | Failed | Failed (mismas 3 condiciones) |
| Bugs / Vulnerabilities / Code Smells / Hotspots | 0 / 1 / 12 / 1 | 0 / 1 / 12 / 1 |
| Security / Reliability / Maintainability | B / A / A | B / A / A |
| Cobertura / Duplicación | 0,0 % / 0,0 % | 0,0 % / 0,0 % |
| Complejidad / ncloc / deuda técnica | 263 / 1607 / 222 min | 263 / 1607 / 222 min |

Los 13 issues y el hotspot son los mismos (misma regla, fichero, línea y severidad). Solo
cambia el texto del mensaje de `jssecurity:S8475` (`frontend/src/api/auth.js:5`): antes
"Ensure that tainted data is sanitized before being written to browser storage", ahora
"Browser Storage Poisoning via unsanitized user input".

**El perfil de reglas sí cambió.** "Sonar way comprehensive" de JavaScript tuvo 47 cambios
después del análisis de la ronda completa (36 reglas activadas, 9 desactivadas, 2
actualizadas), casi todas de librerías de tests y de Vue. Ninguna genera issues en esta app.

---

## 4. OWASP ZAP — igual

**Versión y reglas.** ZAP 2.17.0. Al arrancar actualizó 20 complementos automáticamente,
pero ninguno de reglas de escaneo: `ascanrules` 83.0.0 y `pscanrules` 75.0.0 son los
instalados justo antes del escaneo de la ronda completa.

**Procedimiento.** El de `pentesting_zap_completo.md`: 26 peticiones por el proxy con el ciclo
CRUD de todas las rutas del backend, spider, Active Scan con la política por defecto e informe
HTML.

**Informe:** `docs/2026-09-24-ZAP-Report-tercera-ronda.html`

| Alerta | Riesgo | Completa | Tercera | Estado |
|---|---|---|---|---|
| Inyección SQL (`POST /categories`, `name`) | Alto | 1 | 1 | falso positivo (Prisma) |
| Configuración incorrecta Cross-Domain (CORS) | Medio | 32 | 29 | real (S4) |
| CSP sin directiva de fallback | Medio | 6 | 3 | falso positivo |
| Divulgación de error de aplicación | Bajo | 1 | 1 | real |
| Petición de autenticación identificada | Info | 1 | 1 | — |
| Gestión de sesión identificada | Info | 1 | 1 | — |
| **Total** | | **42** | **36** | |

- Mismos 6 tipos de alerta, mismos riesgos, mismas conclusiones.
- CORS sale una vez por cada petición que devuelve `Access-Control-Allow-Origin: *`; la
  diferencia (32 → 29) es solo que se alimentaron menos peticiones al proxy. CSP sale en
  las respuestas 404 de Helmet (`/`, `robots.txt`, `sitemap.xml`); en la ronda completa también en
  `GET /auth`, `/auth/login` y `/auth/register`.
- El spider, igual que siempre, solo encuentra `/`, `robots.txt` y `sitemap.xml`.
- `DELETE /products/:id` sobre un producto con movimientos sigue devolviendo 500 con el
  stack trace completo (mismo hallazgo colateral que en la ronda completa).
- El informe HTML pone "Systemic" en el campo "Instancia" de CORS y enseña solo 5 URLs de
  ejemplo, mientras la API devuelve 29 (ver la nota en `pentesting_zap_completo.md`).

---

## 5. Reverificación manual de S1-S9 — igual

Mismas peticiones que `pentesting_manual_completo.md`, con curl directo contra el backend.
En la ronda completa pasaban por el proxy de Burp Suite, que solo servía para ver y capturar el
tráfico: no cambia lo que responde el servidor.

| ID | Prueba | Completa | Tercera |
|---|---|---|---|
| S1 | Registro con `"role":"ADMIN"` | 201, cuenta ADMIN | 201; el login devuelve rol ADMIN |
| S2 | Token forjado con el secreto del `.env` → `GET /users` | 200 | 200 |
| S3 | 8 × `OUT` de 3 en paralelo sobre stock 10 | 6/8 aceptadas, stock −8 | Sigue (detalle abajo) |
| S4 | `Access-Control-Allow-Origin` con `Origin: https://evil.example` | `*` | `*` |
| S5 | `GET` sin `Authorization` | 200 | 200 en `/categories`, `/suppliers`, `/products`, `/products/alerts`; `POST` crea categoría y proveedor |
| S6 | `localStorage.setItem('token', ...)` | `frontend/src/api/auth.js:5` | misma línea |
| S7 | `GET /users` con token OPERATOR | 200, lista completa | 200, lista completa, sin hash de contraseña |
| S8 | `PUT /products/:id` `{"currentStock": 999999}` sin auth | 200, sin rastro en movimientos | 200; el historial no refleja el cambio |
| S9 | 10 logins con contraseña incorrecta | 10 × 401 | 10 × 401, ningún 429 (~0,08 s cada uno) |

Controles de contraste, iguales que en la ronda completa: `PUT /users/:id` con OPERATOR intentando
hacerse ADMIN → 403; comilla en `name` (A03) → 201, guardada literal; `/debug`,
`/api-docs`, `/swagger`, `/.env`, `/admin` → 404; cabeceras de Helmet idénticas; token
`alg:none` → 401; payload cambiado a ADMIN sin volver a firmar → 401.

### S3 con repeticiones

Una condición de carrera depende de cómo se repartan las peticiones en el tiempo, así que
una sola repetición puede no mostrarla. En la ronda completa se hizo una; ahora, 13 (cada una sobre un
producto nuevo con stock 10, 8 peticiones `OUT` de 3 unidades en paralelo; sin el fallo
entrarían 3 y el stock quedaría en 1):

| Tanda | Aceptadas (201) por repetición | Stock final |
|---|---|---|
| 1ª (3 repeticiones) | 6, 3, 3 | −8, 1, 1 |
| 2ª (10 repeticiones) | 4, 5, 4, 4, 4, 4, 4, 4, 3, 5 | −2, −5, −2, −2, −2, −2, −2, −2, 1, −5 |

El fallo aparece en **10 de 13** repeticiones. La primera reproduce exactamente el
resultado de la ronda completa (6 de 8, stock −8).

**Conclusión:** las 9 vulnerabilidades siguen presentes y explotables. Era lo esperable: son
fallos del código propio, que no ha cambiado.

---

## Resumen

| Herramienta | ¿Cambia respecto a la ronda completa? | Por qué |
|---|---|---|
| npm audit | **Sí**: backend 2 → 9 advisories, frontend 0 → 5 | 12 advisories nuevos publicados después de la ronda completa; mismas versiones |
| ESLint | No | No consulta nada externo |
| SonarCloud | No | El perfil cambió 47 reglas, ninguna aplicable a este código |
| ZAP | No (mismos 6 tipos de alerta) | Mismas reglas de escaneo |
| Manual S1-S9 | No | Son fallos del código propio |

Lo que depende de una base de datos externa (npm audit) cambia sin tocar el código. Lo
que sale del propio código (ESLint, SonarCloud, ZAP, pruebas manuales) no cambia mientras
no cambien el código ni las reglas.

---

## Correcciones a la documentación anterior encontradas en esta ronda

- `pentesting_zap_completo.md` y `vulnerabilidades_pentesting.md`: las instancias de CORS
  y CSP de la ronda completa vuelven a 32 y 6 (42 alertas, 38 de riesgo Medio). Una
  revisión anterior las había cambiado a 5 y 5 por error.
- `analisis_estatico_completo.md`: las líneas de código de la ronda básica son 793
  (`ncloc`), no ~967 (`lines`); se añaden la complejidad (107) y la deuda técnica (65 min)
  del básico, sacadas del historial de SonarCloud.
- `pentesting_manual_completo.md`: las peticiones aceptadas de S3 devuelven 201, no 200.

