# Análisis estático — SonarCloud, conjunto completo backend + frontend

**Herramienta:** SonarCloud (SonarQube Cloud)
**Código analizado:** `src/` (backend, prompts básicos 01-08 + correcciones C1-C17) y
`frontend/src/`, commit `a97799a`
**Comparativa con:** `docs/analisis_estatico_basico.md` (solo backend)

---

## Cómo se obtuvieron los resultados

Con la API REST de SonarCloud (`measures/component`, `issues/search`, `hotspots/search`,
`qualitygates/project_status`). La exportación completa de la API está en `docs/sonarcloud/`
(descargada el 2026-09-24 sobre `8017d64`, con el mismo resultado que esta ronda).

---

## Métricas globales

| Métrica | Valor | Básico (solo backend) |
|---------|-------|-------------------------------------|
| Quality Gate | **Failed** | Failed |
| Bugs | 0 | 0 |
| Vulnerabilities | **1** | 0 |
| Code Smells | **12** | 2 |
| Security Hotspots | 1 | 1 |
| Security Rating | **2.0 (B)** | A (implícito, 0 vulnerabilities) |
| Reliability Rating | 1.0 (A) | A |
| Maintainability Rating | 1.0 (A) | A |
| Coverage | 0.0% | 0.0% |
| Duplications | 0.0% | 0.0% |
| Complejidad ciclomática | 263 | 107 |
| Líneas de código (ncloc) | 1607 | 793 |
| Deuda técnica (sqale_index) | 222 min | 65 min |

La complejidad, las líneas de código y la deuda técnica del básico se sacaron del historial de
SonarCloud (`measures/search_history`). Las 793 líneas son `ncloc` (solo código); las 967 del
informe básico son `lines`, que cuenta también comentarios y líneas en blanco.

---

## Vulnerability — hallazgo nuevo real

| Regla | Fichero | Línea | Severidad | Descripción |
|-------|---------|-------|-----------|-------------|
| `jssecurity:S8475` | `frontend/src/api/auth.js` | 5 | Minor | "Ensure that tainted data is sanitized before being written to browser storage" |

```js
export const login = async (email, password) => {
  const { data } = await client.post('/auth/login', { email, password });
  localStorage.setItem('token', data.data.token);   // ← línea señalada
  return data.data.user;
};
```

Es la vulnerabilidad **S6** (ver `docs/vulnerabilidades_pentesting.md`).

---

## Code Smells (12 — detalle completo)

| Fichero | Línea | Severidad | Regla | Descripción |
|---------|-------|-----------|-------|-------------|
| `frontend/src/pages/Categories.jsx` | 69 | Major | S6853 | Label de formulario no asociado a un control |
| `frontend/src/pages/Categories.jsx` | 73 | Major | S6853 | Ídem |
| `frontend/src/context/AuthContext.jsx` | 35 | Major | S6481 | El value del Context Provider cambia en cada render — falta `useMemo` |
| `src/server.js` | 23 | Major | S7785 | Preferir top-level `await` en vez de una función async `startServer` |
| `frontend/src/pages/Movements.jsx` | 59 | Minor | S7773 | Preferir `Number.parseInt` sobre `parseInt` global |
| `frontend/src/components/ProductForm.jsx` | 24 | Minor | S7776 | `numericFields` debería ser un `Set` con `.has()` en vez de array + `.includes()` |
| `frontend/src/pages/Dashboard.jsx` | 22 | Minor | S2486 | `catch` que no maneja ni relanza la excepción |
| `frontend/src/api/auth.js` | 23 | Minor | S2486 | Ídem (en `getCurrentUser`) |
| `src/services/auth.service.js` | 22 | Minor | S1481 | Variable `_` declarada sin usar |
| `src/services/auth.service.js` | 47 | Minor | S1481 | Ídem, segunda ocurrencia |
| `src/middlewares/auth.middleware.js` | 12 | Minor | S6582 | Preferir optional chaining (`?.`) |
| `src/routes/category.routes.js` | 32 | Minor | S2486 | `catch` que no maneja ni relanza la excepción |

**S1481 (x2):** el mismo falso positivo del análisis básico (CS2), el destructuring que excluye `passwordHash` de la respuesta.

**S2486 (x3):** el `catch` que no gestiona la excepción del análisis básico (CS1) aparece ahora
también dos veces en el frontend (`Dashboard.jsx`, `auth.js`).

---

## Security Hotspots

| Regla | Fichero | Línea | Categoría | Prioridad |
|-------|---------|-------|-----------|-----------|
| `S5122` | `src/app.js` | 20 | Insecure Configuration | Low |

Idéntico al ya documentado como SH1 en el análisis básico (`cors()` sin configuración) —
sin cambios, no revisado ("`new_security_hotspots_reviewed`: 0%" en el Quality Gate).

---

## Quality Gate — por qué falla

| Condición | Umbral | Valor actual | Estado |
|-----------|--------|--------------|--------|
| `new_security_rating` | > 1 (A) | 2 (B) | **Failed** — por la vulnerability S8475 |
| `new_coverage` | < 80% | 0.0% | **Failed** — sigue sin haber tests |
| `new_security_hotspots_reviewed` | < 100% | 0.0% | **Failed** — el hotspot de CORS nunca se marcó como revisado |
| `new_reliability_rating` | > 1 (A) | 1 (A) | OK |
| `new_maintainability_rating` | > 1 (A) | 1 (A) | OK |
| `new_duplicated_lines_density` | > 3% | 0.0% | OK |
