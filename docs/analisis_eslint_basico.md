# Análisis ESLint — Prompts básicos (Fase 4A.2)

**Fecha:** 2026-04-07
**Herramienta:** ESLint v10.2.0 + eslint-plugin-security v4.0.0 + eslint-plugin-n v17.24.0
**Código analizado:** Output prompts básicos 01-08 (sin corregir)
**Ficheros analizados:** 26 (todos los ficheros en `src/`)

---

## Corrección mínima aplicada antes del análisis

**Problema:** El código de prompts básicos mezcla CommonJS (setup, suppliers — Patrón 1) y ES Modules
(resto de módulos). ESLint requiere un `sourceType` uniforme para analizar sin errores de parseo.

**Corrección aplicada:** Añadido `"type": "module"` a `package.json`.

**Documentación metodológica:** Esta corrección no altera la lógica del código analizado — solo
declara el sistema de módulos dominante (ES Modules, usado en 6/8 módulos) para que el analizador
pueda procesar todos los ficheros. La inconsistencia del Patrón 1 está ya documentada en
`prompts/00_analisis_patrones_basicos.md` y no es objeto de este análisis.

---

## Resultados

### Resumen

| Métrica | Valor |
|---------|-------|
| Ficheros analizados | 26 |
| Ficheros con issues | 2 |
| Ficheros limpios | 24 |
| Errors | 0 |
| Warnings | 2 |
| Reglas de seguridad disparadas | 0 |

### Issues encontrados

| ID | Fichero | Línea | Regla | Tipo | Descripción |
|----|---------|-------|-------|------|-------------|
| E1 | `src/config/env.js` | 17 | `n/no-process-exit` | Warning | `process.exit()` — se recomienda lanzar un error en su lugar |
| E2 | `src/server.js` | 18 | `n/no-process-exit` | Warning | `process.exit()` — mismo patrón en el arranque del servidor |

Ambos son el mismo patrón: el LLM usa `process.exit(1)` para terminar el proceso cuando falla
la conexión a BD o la validación de variables de entorno. ESLint recomienda lanzar un Error
en su lugar para preservar el stack trace y permitir manejo de errores en tests.

---

## Reglas de seguridad ejecutadas sin hallazgos

Las siguientes reglas de `eslint-plugin-security` se ejecutaron sobre los 26 ficheros
y no dispararon ninguna alerta:

| Regla | Qué detecta |
|-------|-------------|
| `security/detect-eval-with-expression` | Uso de `eval()` con expresión dinámica |
| `security/detect-non-literal-regexp` | RegExp construidas con variables |
| `security/detect-non-literal-fs-filename` | Rutas de fichero construidas dinámicamente |
| `security/detect-object-injection` | Acceso a propiedades de objeto con variable no sanitizada |
| `security/detect-possible-timing-attacks` | Comparaciones de strings susceptibles a timing attacks |
| `security/detect-unsafe-regex` | Expresiones regulares vulnerables a ReDoS |
| `security/detect-buffer-noassert` | Uso de Buffer sin validación |
| `security/detect-child-process` | Uso de `child_process` |
| `security/detect-disable-mustache-escape` | Desactivación de escape en templates |
| `security/detect-new-buffer` | Constructor `new Buffer()` deprecado |
| `security/detect-no-csrf-before-method-override` | CSRF sin protección |
| `security/detect-pseudoRandomBytes` | `Math.random()` en contexto criptográfico |

---

## Análisis crítico: vulnerabilidades NO detectadas

| Vulnerabilidad real | Severidad | OWASP | Detectada por ESLint security |
|--------------------|-----------|-------|-------------------------------|
| Escalada de privilegios — `role: userData.role` | Alta | A01 | **No** |
| JWT secret con fallback `\|\| 'supersecret'` | Alta | A02 | **No** |
| Race condition TOCTOU en movements | Media | A04 | **No** |
| CORS abierto `cors()` sin config | Media | A05 | **No** |
| Rutas sin middleware de autenticación | Alta | A01 | **No** |

**Ratio de detección de vulnerabilidades críticas:** 0/5 (0%)

---

## Cuadro comparativo acumulado — Análisis estático

| Herramienta | Hallazgos de seguridad | Vulnerabilidades críticas detectadas |
|-------------|------------------------|--------------------------------------|
| SonarCloud | 1 Security Hotspot (CORS) | 1/6 (16.7%) |
| ESLint security plugin | 0 | 0/5 (0%) |
| **Análisis manual** | **6 vulnerabilidades** | **6/6 (100%)** |

---

## Conclusión para la memoria

ESLint con `eslint-plugin-security` no detectó ninguna vulnerabilidad de seguridad en el código
LLM-generado. Las reglas del plugin están diseñadas para detectar patrones sintácticos peligrosos
conocidos (`eval`, RegExp dinámicas, rutas de fichero sin sanitizar, etc.), pero las vulnerabilidades
introducidas por el LLM son de naturaleza semántica:

- La escalada de privilegios (`role: userData.role`) es sintácticamente correcta — es la
  lógica de negocio la que es insegura, no el patrón de código.
- El JWT secret con fallback es un patrón JS válido — el problema es el valor del literal,
  no la construcción `||`.
- La ausencia de middleware de autenticación es una omisión, no una presencia de código inseguro.

**Conclusión consolidada del análisis estático (SonarCloud + ESLint):**
Las herramientas de análisis estático son eficaces para detectar vulnerabilidades sintácticas
y configuraciones evidentes, pero son ciegas ante las vulnerabilidades de lógica de negocio
que caracterizan el código LLM-generado sin restricciones de seguridad explícitas en el prompt.
Esto valida empíricamente la necesidad del análisis manual y del pentesting como etapas
complementarias e imprescindibles en la auditoría de código generado por LLMs.

---

## Reflexión: la paradoja del LLM como auditor

El resultado del análisis estático plantea una paradoja relevante para las conclusiones del TFG:
**el mismo modelo que introduce las vulnerabilidades tiene más capacidad para detectarlas que
las herramientas diseñadas específicamente para ese fin.**

SonarCloud y ESLint no pueden razonar sobre por qué `role: userData.role` es peligroso — no
tienen acceso al contexto del dominio (que `role` controla privilegios de acceso, que `userData`
viene de una petición HTTP no confiable). El LLM sí tiene ese contexto y, si se le pregunta
directamente, identifica la vulnerabilidad de inmediato.

Esto abre una pregunta de investigación que va más allá del scope de este TFG pero que merece
mención en las conclusiones: **¿debería el propio LLM formar parte del pipeline de auditoría
de seguridad del código que genera?** He & Vechev (2023) [C3] exploran precisamente esta
dirección — el uso de LLMs para hardening de seguridad y adversarial testing de código —
y sus resultados sugieren que los modelos son más eficaces detectando vulnerabilidades cuando
se les da contexto explícito de seguridad que cuando generan código sin restricciones.

Esto es coherente con el Patrón 4 de este análisis (seguridad reactiva al contexto) y refuerza
la hipótesis central del TFG: **la ingeniería de prompts con restricciones de seguridad explícitas
es la variable de control clave**, tanto en la generación como en la auditoría de código LLM-generado.
