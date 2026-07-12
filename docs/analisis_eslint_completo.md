# Análisis ESLint — Conjunto completo backend + frontend (Fase 4A.2)

**Fecha:** 2026-07-12
**Herramienta:** ESLint v10.2.0 + eslint-plugin-security v4.0.0 + eslint-plugin-n v17.24.0
**Código analizado:** `src/` (backend, prompts básicos 01-08 + correcciones mínimas C1-C16) y
`frontend/src/` (prompts 09A-09F)
**Comparativa con:** `docs/analisis_eslint_basico.md` (2026-04-07, solo backend, sin correcciones)

---

## Cambio de configuración

`eslint.config.js` solo cubría `src/**/*.js` — el frontend nunca fue analizado. Se añadió un
segundo bloque de configuración para `frontend/src/**/*.jsx` y `frontend/src/**/*.js`:

- Mismo plugin `eslint-plugin-security` (aplicable a cualquier JS/JSX).
- **Sin** `eslint-plugin-n` en el bloque de frontend — sus reglas (`n/no-process-exit`,
  `n/no-sync`) son específicas de Node.js y no aplican a código de navegador.
- `parserOptions.ecmaFeatures.jsx: true` para parsear JSX.
- Globals de navegador añadidos (`window`, `document`, `localStorage`, `fetch`) — el backend
  solo declaraba `process`/`console`.

---

## Comandos ejecutados

Desde la raíz del repo (`tfg-inventario/`):

```bash
# Análisis completo (backend + frontend), tal y como corre en local
npx eslint . --no-error-on-unmatched-pattern

# Verificación aislada de que frontend/src realmente se estaba procesando
# (el comando anterior no imprime nada para ficheros sin issues, así que
# se repitió apuntando solo al frontend para confirmar 0 issues, no "no analizado")
npx eslint "frontend/src/**/*.jsx" "frontend/src/**/*.js"
```

No se ejecutó como parte de un script de `package.json` (no existe `npm run lint` a nivel
de raíz) — invocación directa de `npx eslint`.

---

## Resultados

### Resumen

| Métrica | Backend (`src/`) | Frontend (`frontend/src/`) | Total |
|---------|-------------------|------------------------------|-------|
| Ficheros analizados | 27 | 15 | 42 |
| Errors | 0 | 0 | 0 |
| Warnings | 2 | 0 | 2 |
| Reglas de seguridad disparadas | 0 | 0 | 0 |

### Issues encontrados

Idénticos a los ya documentados en `docs/analisis_eslint_basico.md` — ambos en el backend,
sin cambios:

| ID | Fichero | Línea | Regla | Tipo | Descripción |
|----|---------|-------|-------|------|-------------|
| E1 | `src/config/env.js` | 17 | `n/no-process-exit` | Warning | `process.exit()` en vez de lanzar un error |
| E2 | `src/server.js` | 18 | `n/no-process-exit` | Warning | Mismo patrón en el arranque del servidor |

**El frontend no generó ningún warning ni error.** `eslint-plugin-security` no disparó
ninguna regla en los 15 ficheros de `frontend/src/` (mismas 12 reglas ejecutadas que en el
análisis básico del backend — `detect-eval-with-expression`, `detect-object-injection`,
`detect-unsafe-regex`, etc.).

---

## Análisis crítico: vulnerabilidades NO detectadas en el frontend

El frontend contiene un patrón de riesgo conocido (documentado en las sesiones de
pentesting básico, `docs/pentesting_manual_basico.md`): los campos de texto libre
(`name` de producto/proveedor) no se sanitizan ni en el backend ni en el frontend antes de
renderizarse. Sin embargo:

- **React escapa automáticamente el contenido de texto en JSX** (`{producto.nombre}`), por
  lo que un XSS reflejado clásico no es explotable a través del renderizado normal de estas
  vistas — confirmado visualmente en la sesión de verificación de Suppliers (2026-07-12),
  donde un payload de inyección residual de pentesting se mostró como texto plano, no se
  ejecutó.
- ESLint no tiene ninguna regla que evalúe esto — ni falta le hace, porque el patrón es
  seguro por diseño de React, no por sanitización explícita del código generado. Es un
  ejemplo de que la ausencia de warnings no equivale a "sin riesgo": aquí la ausencia de
  detección coincide con ausencia real de vulnerabilidad, pero por una propiedad del
  framework, no por análisis del LLM ni de la herramienta.

No se han identificado vulnerabilidades reales sin detectar en el frontend — a diferencia
del backend, donde el análisis básico ya documentó una tasa de detección del 0% sobre 5
vulnerabilidades críticas de lógica de negocio.

---

## Conclusión para la memoria

Extender el análisis a `frontend/src/` no cambia la conclusión del análisis básico: ESLint
con `eslint-plugin-security` sigue sin generar ningún error ni disparar ninguna regla de
seguridad en ninguna de las dos capas. La diferencia es que en el backend esa ausencia de
hallazgos convive con 5 vulnerabilidades reales de lógica de negocio (S1-S5, ya documentadas),
mientras que en el frontend generado por Gemini Pro no se identificó ningún patrón
igualmente peligroso — el código de las 7 vistas es, en este sentido, más simple: no maneja
secretos, no toma decisiones de autorización (delegadas explícitamente al backend por
`[RULES]` en los prompts) y no construye queries ni ejecuta comandos.

**Cuadro comparativo acumulado — Análisis estático (actualizado)**

| Herramienta | Backend | Frontend | Vulnerabilidades críticas detectadas |
|-------------|---------|----------|----------------------------------------|
| SonarCloud | 1 Security Hotspot (CORS) | *(pendiente — CI bloqueado, ver nota)* | 1/6 backend (16.7%) |
| ESLint security plugin | 0 hallazgos de seguridad | 0 hallazgos de seguridad | 0/5 backend (0%) |
| **Análisis manual** | **6 vulnerabilidades** | **0 vulnerabilidades nuevas identificadas** | **6/6 backend (100%)** |

> **Nota:** El análisis SonarCloud sobre el conjunto completo no se pudo ejecutar en esta
> sesión (2026-07-12) — el pipeline de GitHub Actions lleva fallando desde el 2026-07-10 con
> `HTTP 403` al autenticar contra la API de SonarCloud (`SONAR_TOKEN` probablemente expirado,
> configurado originalmente el 2026-03-25). Pendiente de regenerar el token y volver a
> lanzar el análisis. Ver `diario.md` 2026-07-12 para el detalle del diagnóstico.
