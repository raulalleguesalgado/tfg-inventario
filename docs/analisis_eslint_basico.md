# Análisis ESLint — Prompts básicos (Fase 4A.2)

**Fecha:** 2026-04-07
**Herramienta:** ESLint v10.2.0 + eslint-plugin-security v4.0.0 + eslint-plugin-n v17.24.0
**Código analizado:** Output prompts básicos 01-08 (sin corregir)
**Ficheros analizados:** 26 (todos los ficheros en `src/`)

---

## Comando ejecutado

Ejecutado desde la raíz del repo, sin script `npm run lint` a nivel de raíz:

```
npx eslint . --no-error-on-unmatched-pattern
```

**Salida real** (reproducida sobre las mismas versiones ancladas del `package-lock.json`
de la época — ESLint v10.2.0, `eslint-plugin-security` v4.0.0, `eslint-plugin-n`
v17.24.0):

```
src/config/env.js
  18:3  warning  Don't use process.exit(); throw an error instead  n/no-process-exit

src/server.js
  19:5  warning  Don't use process.exit(); throw an error instead  n/no-process-exit

✖ 2 problems (0 errors, 2 warnings)
```

---

## Corrección mínima aplicada antes del análisis

**Problema:** El código de prompts básicos mezcla CommonJS (setup, suppliers — Patrón 1) y ES Modules
(resto de módulos). Node.js no siempre puede cargar esa mezcla en un mismo proyecto: si se declara como ES
Modules, un `.js` escrito en CommonJS ya no se carga como tal (corrección C5). ESLint, en
cambio, no exige un único `sourceType`: la configuración puede fijar uno distinto por grupo de ficheros.

**Corrección aplicada** (commit `74c7d31`): además de añadir `"type": "module"` a `package.json`
(declara el sistema de módulos dominante, ES Modules en 6/8 módulos), el mismo commit convirtió
`src/config/env.js` y `src/server.js` de `require`/`module.exports` a `import`/`export` (dos de los
tres ficheros del setup en CommonJS; `app.js` y el módulo suppliers se convirtieron después, en el
resto de la corrección C5) y añadió `eslint`, `eslint-plugin-security` y
`eslint-plugin-n` como devDependencies necesarias para poder ejecutar este mismo análisis, además
de `pg`.
Ninguno de estos cambios altera la lógica del código analizado ni introduce ni corrige ningún bug
o vulnerabilidad de los prompts básicos — es infraestructura mínima para que el proyecto se pueda
cargar y analizar. La conversión no cambia el orden de carga: en las dos versiones `server.js`
carga `app.js` antes que `env.js`. El resultado de ESLint es el mismo con `app.js` y suppliers
todavía en CommonJS.

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
| E1 | `src/config/env.js` | 18 | `n/no-process-exit` | Warning | `process.exit()` — se recomienda lanzar un error en su lugar |
| E2 | `src/server.js` | 19 | `n/no-process-exit` | Warning | `process.exit()` — mismo patrón en el arranque del servidor |

**Veredicto:** ninguno de los dos es de seguridad, y los dos son intencionados. `n/no-process-exit`
es una regla de estilo. E1 para el proceso si las variables de entorno no pasan la validación
de zod, y es lo que impide arrancar sin `JWT_SECRET`. E2 lo para si no se puede conectar a la
base de datos al arrancar, después de desconectar Prisma.

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
| `security/detect-no-csrf-before-method-override` | Middleware `csrf` de Express registrado antes de `methodOverride` |
| `security/detect-pseudoRandomBytes` | Uso de `crypto.pseudoRandomBytes()`, que no genera números criptográficamente seguros |
| `security/detect-non-literal-require` | `require()` con argumento dinámico |
| `security/detect-bidi-characters` | Caracteres Unicode bidireccionales ocultos en el código |

Además de las de seguridad, la configuración activa dos reglas de `eslint-plugin-n` en el backend:
`n/no-process-exit` (E1 y E2) y `n/no-sync`, que no saltó: el backend no llama a ninguna función
síncrona de Node (`*Sync()`).

---
