# Análisis ESLint — Conjunto completo backend + frontend

**Herramienta:** ESLint v10.2.0 + eslint-plugin-security v4.0.0 + eslint-plugin-n v17.24.0
**Código analizado:** `src/` (backend, prompts básicos 01-08 + correcciones mínimas C1-C17) y
`frontend/src/`, commit `a97799a`
**Comparativa con:** `docs/analisis_eslint_basico.md` (solo backend, sin correcciones)

---

## Cambio de configuración

`eslint.config.js` solo cubría `src/`. Se añadió un bloque para `frontend/src/` con el mismo
plugin `eslint-plugin-security`, JSX activado y las variables globales del navegador, sin
`eslint-plugin-n` (sus reglas son específicas de Node.js).

---

## Resultado

```
npx eslint . --no-error-on-unmatched-pattern
```

Salida (reproducida con las mismas versiones del `package-lock.json`):

```
src/config/env.js
  18:3  warning  Don't use process.exit(); throw an error instead  n/no-process-exit

src/server.js
  19:5  warning  Don't use process.exit(); throw an error instead  n/no-process-exit

✖ 2 problems (0 errors, 2 warnings)
```

El comando no imprime nada para los ficheros sin avisos. Para comprobar que el frontend se
analiza de verdad, `npx eslint "frontend/src/**/*.{js,jsx}" --format json` lista los 15
ficheros de `frontend/src/`, todos con 0 mensajes.

| Métrica | Backend (`src/`) | Frontend (`frontend/src/`) | Total |
|---------|-------------------|------------------------------|-------|
| Ficheros analizados | 27 | 15 | 42 |
| Errors | 0 | 0 | 0 |
| Warnings | 2 | 0 | 2 |
| Reglas de seguridad disparadas | 0 | 0 | 0 |

Los dos avisos son los mismos del análisis básico (E1 y E2, ver `analisis_eslint_basico.md`),
sin cambios y con el mismo veredicto: no son de seguridad y son intencionados. `n/no-sync`,
activa en el backend, tampoco saltó: no hay llamadas `*Sync()` en `src/`.

**El frontend no generó ningún aviso.** `eslint-plugin-security` no disparó ninguna de sus 14
reglas en los 15 ficheros de `frontend/src/`.
