# Análisis estático — SonarCloud, conjunto completo backend + frontend (Fase 4A.1)

**Fecha:** 2026-07-12
**Herramienta:** SonarCloud (SonarQube Cloud)
**Código analizado:** `src/` (backend, prompts básicos 01-08 + correcciones C1-C17) y
`frontend/src/`
**Comparativa con:** `docs/analisis_estatico_basico.md` (2026-04-07, solo backend)

---

## Comandos / consultas usadas para extraer los resultados

El proyecto es privado, así que la API pública no autenticada no sirve. Se generó un
token de solo consulta (distinto del usado en el secreto de CI, revocado tras esta
sesión) y se consultó directamente vía la API REST de SonarCloud: métricas globales
(`measures/component`, con las claves de bugs, vulnerabilities, code smells, hotspots,
cobertura, duplicación, ncloc, complejidad y ratings), issues (`issues/search`, filtrado
por `BUG,VULNERABILITY,CODE_SMELL`), Security Hotspots (`hotspots/search`) y el estado del
Quality Gate con sus condiciones (`qualitygates/project_status`).

**Salida real de `qualitygates/project_status`** (respalda directamente la tabla "Quality
Gate — por qué falla" más abajo):

```json
{
  "projectStatus": {
    "status": "ERROR",
    "conditions": [
      {"status":"OK","metricKey":"new_reliability_rating","comparator":"GT","errorThreshold":"1","actualValue":"1"},
      {"status":"ERROR","metricKey":"new_security_rating","comparator":"GT","errorThreshold":"1","actualValue":"2"},
      {"status":"OK","metricKey":"new_maintainability_rating","comparator":"GT","errorThreshold":"1","actualValue":"1"},
      {"status":"ERROR","metricKey":"new_coverage","comparator":"LT","errorThreshold":"80","actualValue":"0.0"},
      {"status":"OK","metricKey":"new_duplicated_lines_density","comparator":"GT","errorThreshold":"3","actualValue":"0.0"},
      {"status":"ERROR","metricKey":"new_security_hotspots_reviewed","comparator":"LT","errorThreshold":"100","actualValue":"0.0"}
    ]
  }
}
```

---

## Métricas globales

| Métrica | Valor | Básico (2026-04-07, solo backend) |
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
| Complejidad ciclomática | 263 | 107 ¹ |
| Líneas de código (ncloc) | 1607 | 793 ¹ (solo backend) |
| Deuda técnica (sqale_index) | 222 min | 65 min ¹ |

¹ No se anotaron en `analisis_estatico_basico.md`. Sacadas el 2026-09-24 del historial de
SonarCloud (`measures/search_history`, análisis del 2026-04-07). Antes esta tabla ponía
"~967 líneas" para el básico: 967 es la métrica `lines` (cuenta comentarios y líneas en
blanco), no `ncloc`. La comparable con las 1607 de la ronda completa es 793.

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

El JWT recibido de la API (dato de red, "tainted" para SonarCloud) se guarda directamente
en `localStorage` sin ninguna capa adicional — patrón pedido explícitamente en el
`[CONTEXT]` de los prompts de frontend (*"Auth: JWT token in localStorage"*), no una
elección espontánea del LLM. Se mantiene sin corregir deliberadamente, documentado como
**S6** en `docs/correcciones_minimas.md`.

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

**Nota sobre S1481 (auth.service.js, x2):** mismo falso positivo ya documentado en el
análisis básico (CS2) — es el patrón `{ passwordHash: _, ...rest }` para excluir el hash
de la respuesta, SonarCloud no reconoce la semántica de destructuring-para-descartar.

**Nota sobre S2486 (catch vacíos, x3 ahora — antes x1):** el mismo patrón de calidad ya
señalado en el análisis básico (CS1) aparece ahora también dos veces en el frontend
(`Dashboard.jsx`, `auth.js`) — consistente con el hallazgo de que el manejo de errores es
un punto débil recurrente del código generado en este proyecto, tanto en backend como frontend.

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
