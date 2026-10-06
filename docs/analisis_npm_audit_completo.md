# Análisis npm audit — Conjunto completo backend + frontend

**Herramienta:** npm audit (npm v10.9.3)
**Commit auditado:** `a97799a`
**Comparativa con:** `docs/analisis_npm_audit_basico.md` (0 vulnerabilidades, solo backend)

---

## Comandos ejecutados

`npm audit` en la raíz del repo (backend) y en `frontend/`, y `npm ls` para ver qué versión
se había instalado de cada paquete señalado.

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

Todas son transitivas: el prompt 01 pidió `express` como `^4.18.2`, npm instaló la `4.22.1`
(la más reciente compatible) y esta arrastra `qs`. `brace-expansion` llega con `eslint`, que es
una herramienta de desarrollo y no se despliega.

## Frontend

```
found 0 vulnerabilities
```

0 vulnerabilidades en `axios`, `react`, `react-dom`, `react-router-dom` (dependencias) ni en
`vite`, `@vitejs/plugin-react`, `oxlint` (devDependencies).

---

## Cuadro comparativo

| | Básico | Completo |
|---|---|---|
| Backend | 0 vulnerabilidades | 4 moderadas (todas transitivas: `qs`, `brace-expansion`) |
| Frontend | *(no existía)* | 0 vulnerabilidades |

**Severidad práctica:** baja. Pueden dejar el servidor sin responder en casos muy concretos,
pero no permiten ejecutar código ni robar datos.

**Ver también:** `docs/tercera_ronda_comprobacion.md`, sección 1. Con el mismo código, los
avisos pasaron de 2 a 14 en la tercera ronda. Allí se analiza cuáles llegan a producción (`qs`,
`body-parser`, `react-router`) y por qué el de `react-router` no es explotable aquí.
