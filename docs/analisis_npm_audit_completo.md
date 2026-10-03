# Análisis npm audit — Conjunto completo backend + frontend (Fase 4A.3)

**Fecha:** 2026-07-12
**Herramienta:** npm audit (npm v10.9.3)
**Comparativa con:** `docs/analisis_npm_audit_basico.md` (2026-04-07: 0 vulnerabilidades, solo backend)

---

## Comandos ejecutados

Se ejecutó `npm audit` por separado en la raíz del repo (backend) y en `tfg-inventario/frontend/`
(frontend), y se comprobó con `npm ls` qué versión concreta había resuelto cada paquete
señalado por `npm audit` (`brace-expansion`, `qs`, `body-parser`, `express`).

---

## Backend (raíz del repo)

```
4 moderate severity vulnerabilities
```

| Paquete | Rango afectado | Severidad | Vía | Advisory |
|---------|---------------|-----------|-----|----------|
| `brace-expansion` | 5.0.2 - 5.0.5 | Moderate | `eslint` → `minimatch` (devDependency) | GHSA-jxxr-4gwj-5jf2 — DoS: rango numérico grande evade la protección `max` documentada |
| `qs` | 6.11.1 - 6.15.1 | Moderate | `express` → `body-parser` (dependencia directa) | GHSA-q8mj-m7cp-5q26 — `qs.stringify` puede lanzar TypeError no controlado con entradas null/undefined en arrays formato "comma" |
| `body-parser` | (depende de `qs` vulnerable) | Moderate | `express` | — |
| `express` | 4.21.0 - 4.22.1 | Moderate | dependencia directa | (depende de `qs` vulnerable) |

Ninguna es una dependencia elegida directamente por el LLM con una versión insegura a
propósito: `express` se pidió como `^4.18.2` en el `package.json` original (prompt 01,
documentado en `docs/analisis_npm_audit_basico.md`) y npm resolvió `4.22.1` — la versión
más reciente compatible con ese rango semver en el momento de esta sesión, que resulta
tener una vulnerabilidad moderada por su dependencia transitiva de `qs`. `brace-expansion`
llega vía `eslint` (herramienta de desarrollo, no runtime de producción).

## Frontend

```
found 0 vulnerabilities
```

0 vulnerabilidades en `axios`, `react`, `react-dom`, `react-router-dom` (dependencias) ni en
`vite`, `@vitejs/plugin-react`, `oxlint` (devDependencies).

---

## Cuadro comparativo

| | Básico (2026-04-07) | Completo (2026-07-12) |
|---|---|---|
| Backend | 0 vulnerabilidades | 4 moderadas (todas transitivas: `qs`, `brace-expansion`) |
| Frontend | *(no existía)* | 0 vulnerabilidades |

**Severidad práctica:** baja. Pueden dejar el servidor sin responder en casos muy concretos,
pero no permiten ejecutar código ni robar datos.

**Ver también:** `docs/tercera_ronda_comprobacion.md`, sección 1. Con el mismo código, los
avisos pasaron de 2 a 14 en septiembre. Allí se analiza cuáles llegan a producción (`qs`,
`body-parser`, `react-router`) y por qué el de `react-router` no es explotable aquí.
