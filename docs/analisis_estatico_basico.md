# Análisis estático — Prompts básicos (Fase 4A)

**Fecha:** 2026-04-07
**Herramienta:** SonarCloud (Build #4)
**Código analizado:** Output prompts básicos 01-08 (sin corregir)
**LLM:** Gemini 2.5 Pro

---

## Cómo se ejecutó

SonarCloud no se lanza con un comando manual: está enganchado a un workflow de GitHub
Actions (`.github/workflows/build.yml`) que dispara el análisis automáticamente en cada
`push` a `main`, usando la configuración de `sonar-project.properties` de la raíz del repo.

---

## Resultados SonarCloud

### Security Hotspots

| ID | Regla | Fichero | Línea | Categoría | Prioridad | Descripción |
|----|-------|---------|-------|-----------|-----------|-------------|
| SH1 | S5122 | `src/app.js` | 9 | Insecure Configuration | Low | `cors()` sin configuración — abre la API a cualquier origen (`*`) |

**Total Security Hotspots:** 1

### Issues de mantenibilidad (Code Smells)

| ID | Regla | Fichero | Línea | Esfuerzo | Descripción |
|----|-------|---------|-------|----------|-------------|
| CS1 | S2486 | `src/routes/category.routes.js` | 32 | 1h | `catch(error)` que no usa la variable `error` — captura excepción sin propagarla |
| CS2 | S1481 | `src/services/auth.service.js` | 22 | 5min | Variable `_` declarada como no utilizada (`const { passwordHash: _, ...rest }`) |

**Nota CS2:** Falso positivo. El patrón `{ passwordHash: _, ...userWithoutPassword }` es destructuring para excluir `passwordHash` del objeto de respuesta. SonarCloud no reconoce la semántica del patrón y lo trata como variable no usada.

**Total Code Smells:** 2 (1 real + 1 falso positivo)

---

## Métricas completas SonarCloud — Dashboard

| Métrica | Valor | Rating |
|---------|-------|--------|
| **Quality Gate** | **Failed** (Sonar way — 2 condiciones fallidas en New Code) | — |
| Security (vulnerabilities) | 0 issues abiertos | A |
| Reliability (bugs) | 0 issues abiertos | A |
| Maintainability (code smells) | 2 issues abiertos | A |
| Security Hotspots | 1 | — |
| Accepted Issues | 0 | — |
| Coverage | 0.0% (353 líneas a cubrir) | Sin condición definida |
| Duplications | 0.0% (967 líneas) | Sin condición definida |

### Quality Gate — Por qué falló

El Quality Gate "Sonar way" falló con **2 condiciones fallidas en New Code**:

- Cobertura de nuevo código < 80% → **0.0% (sin tests)**
- Security Hotspots Reviewed en nuevo código < 100% → **0.0%** (SH1 nunca se marcó como revisado)
