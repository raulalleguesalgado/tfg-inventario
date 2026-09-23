# Análisis ESLint — Conjunto completo backend + frontend (Fase 4A.2)

**Fecha:** 2026-07-12
**Herramienta:** ESLint v10.2.0 + eslint-plugin-security v4.0.0 + eslint-plugin-n v17.24.0
**Código analizado:** `src/` (backend, prompts básicos 01-08 + correcciones mínimas C1-C17) y
`frontend/src/`
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

Se ejecutó ESLint desde la raíz del repo (`tfg-inventario/`) sobre el conjunto completo
(`npx eslint . --no-error-on-unmatched-pattern`), invocado directamente con `npx` al no existir
un script `npm run lint` a nivel de raíz. Se repitió la ejecución acotada a `frontend/src/**/*.jsx`
y `frontend/src/**/*.js` para confirmar que ese directorio se estaba procesando realmente y
arrojaba 0 issues, no "no analizado" (el comando sobre el conjunto completo no imprime nada
para ficheros sin issues).

**Salida real** (reproducida sobre las mismas versiones ancladas del `package-lock.json`
de la época — ESLint v10.2.0, `eslint-plugin-security` v4.0.0, `eslint-plugin-n`
v17.24.0):

```
src/config/env.js
  18:3  warning  Don't use process.exit(); throw an error instead  n/no-process-exit

src/server.js
  19:5  warning  Don't use process.exit(); throw an error instead  n/no-process-exit

✖ 2 problems (0 errors, 2 warnings)
```

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
| E1 | `src/config/env.js` | 18 | `n/no-process-exit` | Warning | `process.exit()` en vez de lanzar un error |
| E2 | `src/server.js` | 19 | `n/no-process-exit` | Warning | Mismo patrón en el arranque del servidor |

**El frontend no generó ningún warning ni error.** `eslint-plugin-security` no disparó
ninguna regla en los 15 ficheros de `frontend/src/` (mismas 14 reglas ejecutadas que en el
análisis básico del backend — `detect-eval-with-expression`, `detect-object-injection`,
`detect-unsafe-regex`, etc.).
