# Análisis ESLint — Prompts básicos

**Herramienta:** ESLint v10.2.0 + eslint-plugin-security v4.0.0 + eslint-plugin-n v17.24.0
**Código analizado:** Output prompts básicos 01-08, commit `a6c2138` (sin corregir, salvo el cambio a ES Modules descrito abajo)
**Ficheros analizados:** 26 (todos los ficheros en `src/`)

---

## Cambio previo al análisis

Para poder cargar el proyecto, el commit `a6c2138` añadió `"type": "module"` a `package.json`,
pasó `src/config/env.js` y `src/server.js` a ES Modules y añadió ESLint y sus plugins como
dependencias de desarrollo (además de `pg`). No cambia la lógica del código generado. El
resultado de ESLint es el mismo con `app.js` y el módulo de proveedores todavía en CommonJS.

---

## Resultado

```
npx eslint . --no-error-on-unmatched-pattern
```

Salida (reproducida con las mismas versiones del `package-lock.json`):

```
src/config/env.js
  18:3  warning  Don't use process.exit(); throw an error instead  n/no-process-exit

src/server.js
  19:5  warning  Don't use process.exit(); throw an error instead  n/no-process-exit

✖ 2 problems (0 errors, 2 warnings)
```

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
