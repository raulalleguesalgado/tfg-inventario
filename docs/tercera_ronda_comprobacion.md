# Tercera ronda de auditoría — comprobación de alcance reducido

**Commit auditado:** `8017d647e844936def490bfe10d293fb50af2124` (`main`)
**Comparativa con:** la ronda completa (análisis estático y pentesting)
**Objetivo:** comprobar si los resultados cambian con el tiempo sin tocar el código: se repiten
las herramientas y se reverifican a mano S1-S9, sin explorar superficie nueva.

---

## Condiciones de la comparación

Mismo código que en la ronda completa (fuera de la documentación, solo cambian 3 comentarios),
mismas versiones de dependencias (`package-lock.json` sin cambios, instalado con `npm ci`) y
mismo entorno (Node.js v22.20.0, npm 10.9.3, postgres:16, mismo `.env`).

---

## 1. npm audit — cambia

`npm audit` en el backend y en `frontend/` (con `--omit=dev` para ver qué llega a producción).
Fechas de publicación consultadas con `gh api advisories/<GHSA>`.

| | Básica | Completa | Tercera |
|---|---|---|---|
| Backend, advisories distintos | 0 | 2 | **9** |
| Frontend, advisories distintos | (no existía) | 0 | **5** |

Se compara por advisory (GHSA) y no por el recuento de npm, que cuenta paquetes.

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

Los 2 primeros son los de la ronda completa. Los 12 nuevos se publicaron **todos después**:
con el mismo código y las mismas versiones, el cambio viene solo de la base de datos de avisos.
En producción solo quedan `qs`, `body-parser` y `react-router`, y el de `react-router` (CSRF en
el modo React Server Components) no es explotable aquí: la app usa `BrowserRouter` sin RSC.

---

## 2. ESLint — igual

Mismo comando que en la ronda completa (`npx eslint . --no-error-on-unmatched-pattern`), con
ESLint v10.2.0, `eslint-plugin-security` v4.0.0 y `eslint-plugin-n` v17.24.0. Mismo resultado: 0
errores, 2 warnings (E1 y E2), 0 reglas de seguridad, 42 ficheros.

---

## 3. SonarCloud — igual

SonarCloud analizaba en cada push, y el último análisis (sobre `8017d64`, consultado con su API y guardado en `docs/sonarcloud/`)
da exactamente los mismos resultados que la ronda completa: mismas métricas y los mismos 13
issues y hotspot.

---

## 4. OWASP ZAP — igual

Mismo procedimiento que `pentesting_zap_completo.md` y mismas reglas de escaneo. Salen los
mismos 6 tipos de alerta con el mismo riesgo. El total baja de 42 a 36 instancias solo porque se
alimentaron menos peticiones al proxy (CORS 32 → 29, CSP 6 → 3). Informe:
`docs/2026-09-24-ZAP-Report-tercera-ronda.html`.

---

## 5. Reverificación manual de S1-S9 — igual

Mismas peticiones que `pentesting_manual_completo.md`, con curl directo. Las nueve
vulnerabilidades y los controles que funcionaban (403, `alg:none`, firma) dan el mismo
resultado. S3 se repitió 13 veces porque una sola puede no mostrar la carrera: el fallo apareció
en 10 de 13, y la primera repetición reprodujo el resultado de la ronda completa (6 de 8
aceptadas, stock −8).

---

## Resumen

Lo que depende de una base de datos externa (npm audit) cambia sin tocar el código. Lo
que sale del propio código (ESLint, SonarCloud, ZAP, pruebas manuales) no cambia mientras
no cambien el código ni las reglas.
