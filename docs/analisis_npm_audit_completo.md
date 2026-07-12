# Análisis npm audit — Conjunto completo backend + frontend (Fase 4A.3)

**Fecha:** 2026-07-12
**Herramienta:** npm audit (npm v10.9.3)
**Comparativa con:** `docs/analisis_npm_audit_basico.md` (2026-04-07: 0 vulnerabilidades, solo backend)

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

## Hallazgo metodológico: el mismo `package.json`, dos resultados distintos en el tiempo

Este es el dato más relevante de este re-análisis para la memoria: **el `package.json` del
backend no ha cambiado** desde el análisis básico (`^4.18.2` para `express` sigue igual),
y sin embargo el resultado pasó de **0 vulnerabilidades (2026-04-07)** a **4 moderadas
(2026-07-12)**. La causa no es el código ni las decisiones del LLM, sino que:

1. Las advisories de `qs` y `brace-expansion` se publicaron/incorporaron a la base de datos
   de `npm audit` **después** del análisis básico.
2. Al no existir un `package-lock.json` congelado y comprometido en el repo desde el
   principio (o al reinstalarse `node_modules` en esta sesión), npm resolvió las versiones
   más recientes dentro del rango semver permitido — versiones que no existían o no estaban
   marcadas como vulnerables en abril.

**Implicación para la memoria:** un resultado de "0 vulnerabilidades" de `npm audit` es una
foto fija, no una garantía persistente. La superficie de riesgo de las dependencias de un
proyecto generado por LLM (o de cualquier proyecto) cambia con el tiempo sin que se toque
una sola línea de código propio — la auditoría de dependencias debe repetirse periódicamente,
no darse por completada tras una única ejecución.

---

## Cuadro comparativo

| | Básico (2026-04-07) | Completo (2026-07-12) |
|---|---|---|
| Backend | 0 vulnerabilidades | 4 moderadas (todas transitivas: `qs`, `brace-expansion`) |
| Frontend | *(no existía)* | 0 vulnerabilidades |

## Conclusión

Igual que en el análisis básico, las vulnerabilidades relevantes de este proyecto siguen
siendo las de lógica de negocio introducidas por el LLM (S1-S5), no las de la cadena de
dependencias. Las 4 vulnerabilidades moderadas encontradas ahora son de severidad baja en la
práctica (DoS en casos límite, no ejecución remota de código ni fuga de datos) y transitivas,
no elegidas directamente. El frontend, generado con solo 4 dependencias de producción, no
introduce ningún riesgo adicional en este eje.
