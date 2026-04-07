# Análisis estático — Prompts básicos (Fase 4A)

**Fecha:** 2026-04-07
**Herramienta:** SonarCloud (Build #4, commit 00787cd)
**Código analizado:** Output prompts básicos 01-08 (sin corregir)
**LLM:** Gemini Pro

---

## Resultados SonarCloud

### Security Hotspots

| ID | Regla | Fichero | Línea | Categoría | Prioridad | Descripción |
|----|-------|---------|-------|-----------|-----------|-------------|
| SH1 | S5122 | `src/app.js` | 10 | Insecure Configuration | Low | `cors()` sin configuración — abre la API a cualquier origen (`*`) |

**Total Security Hotspots:** 1

### Issues de mantenibilidad (Code Smells)

| ID | Regla | Fichero | Línea | Esfuerzo | Descripción |
|----|-------|---------|-------|----------|-------------|
| CS1 | S2486 | `src/routes/category.routes.js` | 39 | 1h | `catch(error)` que no usa la variable `error` — captura excepción sin propagarla |
| CS2 | S1481 | `src/services/auth.service.js` | 22 | 5min | Variable `_` declarada como no utilizada (`const { passwordHash: _, ...rest }`) |

**Nota CS2:** Falso positivo. El patrón `{ passwordHash: _, ...userWithoutPassword }` es destructuring para excluir `passwordHash` del objeto de respuesta. SonarCloud no reconoce la semántica del patrón y lo trata como variable no usada.

**Total Code Smells:** 2 (1 real + 1 falso positivo)

---

## Análisis crítico: vulnerabilidades NO detectadas

Este es el hallazgo más relevante del análisis estático para la memoria del TFG.

| ID | Vulnerabilidad introducida por LLM | Severidad | OWASP | Detectado por SonarCloud |
|----|-----------------------------------|-----------|-------|--------------------------|
| S1 | Escalada de privilegios — `role: userData.role` en registro | Alta | A01 | **No** |
| S2 | JWT secret con fallback hardcoded `\|\| 'supersecret'` | Alta | A02 | **No** |
| S3 | Race condition TOCTOU — verificación de stock fuera de transacción | Media | A04 | **No** |
| S4 | CORS abierto a `*` — `cors()` sin configuración | Media | A05 | **Sí** (SH1) |
| S5 | Rutas sin middleware de autenticación (categories, suppliers, products) | Alta | A01 | **No** |
| B3 | Alucinación de API — `prisma.product.fields.minStock` (falla en runtime) | Alta | — | **No** |

**Ratio de detección:** 1/6 vulnerabilidades detectadas (16.7%)

---

## Conclusión para la memoria

El análisis estático con SonarCloud detectó únicamente la misconfiguration de CORS — la vulnerabilidad más visible y superficial del conjunto. Las cinco vulnerabilidades de mayor impacto (escalada de privilegios, JWT secret débil, ausencia de autenticación en rutas, race condition TOCTOU, alucinación de API) fueron completamente invisibles para la herramienta.

Esto es coherente con las limitaciones conocidas del análisis estático:

1. **Las vulnerabilidades de lógica de negocio no son detectables estáticamente.** La escalada de privilegios (S1) y la race condition (S3) requieren comprensión semántica del dominio de la aplicación — algo que las reglas de análisis estático no modelan.

2. **Los secretos con fallback en variables de entorno evaden los detectores de secretos.** `process.env.JWT_SECRET || 'supersecret'` no es un literal hardcoded según las reglas de SonarCloud, aunque el efecto práctico sea idéntico si la variable no está configurada.

3. **La ausencia de controles de acceso no es un patrón detectable.** SonarCloud no puede saber que `router.get('/', controller.getAll)` debería tener un middleware de autenticación — la regla no existe porque requeriría conocimiento del dominio.

**Implicación metodológica:** El análisis estático es necesario pero insuficiente para auditar código LLM-generado. Las vulnerabilidades más peligrosas introducidas por el LLM — precisamente las que el modelo introduce por omisión, no por error sintáctico — requieren análisis manual y pruebas de penetración.

---

## Comparativa esperada con prompts refinados

Tras generar los prompts refinados (auth, products, movements con componente `[RULES]`), se espera que:
- SH1 (CORS) desaparezca si el prompt refinado incluye restricción de origen
- CS1 se mantenga o mejore (problema de calidad no relacionado con seguridad)
- Las vulnerabilidades S1, S2, S3, S5 desaparezcan del código (aunque SonarCloud no las detecte)
- El análisis de pentesting (Fase 4B) confirmará si las correcciones son efectivas

---

## Métricas adicionales SonarCloud

*(Completar con captura de pantalla del dashboard)*

- Bugs: —
- Vulnerabilities: —
- Security Hotspots: 1
- Code Smells: 2
- Coverage: 0% (sin tests)
- Duplications: —
- Technical Debt: —
