# Análisis estático — SonarCloud, conjunto completo backend + frontend (Fase 4A.1)

**Fecha:** 2026-07-12
**Herramienta:** SonarCloud (SonarQube Cloud), commit `0b63e89`
**Código analizado:** `src/` (backend, prompts básicos 01-08 + correcciones C1-C16) y
`frontend/src/` (prompts 09A-09F)
**Comparativa con:** `docs/analisis_estatico_basico.md` (2026-04-07, solo backend)

---

## Incidencia de infraestructura antes del análisis

El pipeline de GitHub Actions llevaba fallando desde el 2026-07-10 (3 pushes sin análisis
efectivo: 09B dashboard, correcciones C11-C13, y el primer intento de este mismo cambio)
con `HTTP 403` contra `api.sonarcloud.io` — el `SONAR_TOKEN` configurado el 2026-03-25
había expirado. Se regeneró el token dos veces (el primer reemplazo seguía fallando con
"Not authorized or project not found", causa no confirmada — probablemente un error al
pegar el valor en `gh secret set SONAR_TOKEN` de forma interactiva) y se verificó con la
API antes de fijarlo definitivamente:

```powershell
curl.exe -u TU_TOKEN: https://sonarcloud.io/api/authentication/validate
curl.exe -u TU_TOKEN: "https://sonarcloud.io/api/projects/search?organization=raulalleguesalgado"
```

Una vez confirmado `"valid":true` y que el proyecto aparecía en la lista, se fijó con
`gh secret set SONAR_TOKEN --body "..."` (evita el modo interactivo, menos propenso a
error de pegado) y se disparó el análisis con un commit vacío.

---

## Comandos / consultas usadas para extraer los resultados

El proyecto es privado, así que la API pública no autenticada no sirve. Se generó un
token de solo consulta (distinto del usado en el secreto de CI, revocado tras esta
sesión) y se consultó directamente:

```bash
# Métricas globales
curl -s -u "TOKEN:" "https://sonarcloud.io/api/measures/component?component=raulalleguesalgado_tfg-inventario&metricKeys=bugs,vulnerabilities,code_smells,security_hotspots,coverage,duplicated_lines_density,ncloc,complexity,sqale_index,alert_status,reliability_rating,security_rating,sqale_rating"

# Issues (bugs, vulnerabilidades, code smells)
curl -s -u "TOKEN:" "https://sonarcloud.io/api/issues/search?componentKeys=raulalleguesalgado_tfg-inventario&types=BUG,VULNERABILITY,CODE_SMELL&ps=100"

# Security Hotspots
curl -s -u "TOKEN:" "https://sonarcloud.io/api/hotspots/search?projectKey=raulalleguesalgado_tfg-inventario&ps=100"

# Quality Gate y condiciones que fallan
curl -s -u "TOKEN:" "https://sonarcloud.io/api/qualitygates/project_status?projectKey=raulalleguesalgado_tfg-inventario"
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
| Complejidad ciclomática | 263 | *(no registrada en el básico)* |
| Líneas de código (ncloc) | 1607 | *(solo backend, ~967 líneas)* |
| Deuda técnica (sqale_index) | 222 min | *(no registrada en el básico)* |

El salto de 2 a 12 code smells y de 0 a 1 vulnerabilities se explica enteramente por la
incorporación del frontend al análisis — el backend no ha cambiado en cuanto a lógica
desde abril (solo correcciones de integración C11-C16, ver `docs/correcciones_minimas.md`).

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
en `localStorage` sin ninguna capa adicional. Esto **no es un bug de un módulo aislado**:
es la arquitectura de autenticación que se pidió explícitamente en el `[CONTEXT]` de
*todos* los prompts de frontend (`09_frontend_setup.md` en adelante): *"Auth: JWT token
in localStorage"*. Es una decisión de diseño tomada en la Fase 3.5 al redactar los
prompts, no una elección espontánea del LLM.

**Por qué se mantiene sin corregir:** `localStorage` es accesible desde cualquier script
que se ejecute en el origen (a diferencia de una cookie `httpOnly`), por lo que un XSS
exitoso permitiría robar el token de sesión. Es un patrón de riesgo real y bien conocido
(OWASP A02:2021 – Cryptographic Failures / A05 según el mapeo), pero **no se corrige**
porque:

1. Corregirlo (mover a cookie `httpOnly` + `SameSite`) cambiaría la arquitectura de auth
   de forma sustancial, más allá del criterio de "corrección mínima que no toca decisiones
   de diseño" ya aplicado en todo el proyecto (ver cabecera de
   `docs/correcciones_minimas.md`).
2. Es exactamente el tipo de vulnerabilidad que interesa preservar para la Fase 4B
   (pentesting) — mide si un ataque XSS práctico permite exfiltrar el token.

Se añade como **S6** a la tabla de vulnerabilidades deliberadamente no corregidas en
`docs/correcciones_minimas.md`.

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
un punto débil recurrente en el código generado por LLM, tanto en backend como frontend.

Los 5 code smells restantes (`S6853` x2, `S6481`, `S7773`, `S7776`, `S7785`) son hallazgos
exclusivos del frontend — reglas de buenas prácticas de React/JS moderno (accesibilidad
de formularios, memoización, sintaxis preferida) sin relación con seguridad.

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

A diferencia del análisis básico (que fallaba solo por cobertura), esta vez el Quality
Gate también falla por el **Security Rating**, precisamente por el hallazgo real que
aporta el frontend (S8475). Es la primera vez en todo el proyecto que SonarCloud
correlaciona directamente un fallo de Quality Gate con una vulnerabilidad de seguridad
real, no solo con la ausencia de tests.

---

## Ratio de detección — actualizado

| Vulnerabilidad | Capa | Severidad | OWASP | Detectada por SonarCloud |
|----------------|------|-----------|-------|---------------------------|
| S1 Escalada de privilegios (`role: userData.role`) | Backend | Alta | A01 | No |
| S2 JWT secret con fallback hardcoded | Backend | Alta | A02 | No |
| S3 Race condition TOCTOU en movements | Backend | Media | A04 | No |
| S4 CORS abierto sin configuración | Backend | Media | A05 | **Sí** (hotspot) |
| S5 Rutas sin middleware de autenticación | Backend | Alta | A01 | No |
| **S6 JWT en `localStorage` sin protección adicional** | **Frontend** | **Baja-Media** | **A02** | **Sí** (vulnerability S8475) |

**Ratio de detección global:** 2/6 (33.3%) — sube respecto al 16.7% del análisis básico
gracias exclusivamente al hallazgo del frontend.

---

## Conclusión para la memoria

El patrón se sostiene con un matiz nuevo: SonarCloud sigue sin detectar ninguna de las
vulnerabilidades de **lógica de negocio** del backend (S1, S2, S3, S5) — todas requieren
comprensión semántica del dominio que el análisis estático no modela. Pero en el frontend
sí detectó un patrón de riesgo real (S6, JWT en `localStorage`) porque esta vez el patrón
**es sintácticamente reconocible**: "escribir un valor que viene de una respuesta HTTP en
`localStorage`" es una regla de flujo de datos (tainted data → sink sensible) que SonarCloud
sí puede modelar, a diferencia de "este booleano de autorización viene de donde no debería".

**Implicación metodológica reforzada:** el análisis estático es eficaz cuando la
vulnerabilidad se puede expresar como un patrón de flujo de datos sintáctico (taint
analysis: fuente insegura → sumidero sensible), y ciego cuando depende de conocimiento del
dominio de negocio (a quién pertenece un recurso, si una operación debería requerir un rol).
El frontend de este proyecto, al ser más simple y no contener lógica de autorización
(delegada explícitamente al backend), tiene menos superficie para vulnerabilidades de
negocio pero sí expone el patrón clásico de manejo de tokens client-side — y ese sí se
detectó.
