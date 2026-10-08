# Revisión manual de patrones inseguros — conjunto completo

**Código revisado:** `src/` (backend) y `frontend/src/` (frontend), commit `a97799a`
**Método:** revisión de código dirigida por patrón (grep + lectura manual), como complemento de SonarCloud, ESLint y npm audit

---

## 1. `eval()`, `exec()`, concatenación de SQL sin parametrizar

```bash
grep -rnE "eval\(|exec\(|child_process" src/ frontend/src/
grep -rnE '\$queryRaw|\$executeRaw|Unsafe\(' src/
```

**Resultado: ninguna coincidencia en todo el proyecto.** Todo el acceso a base de datos
pasa por Prisma Client, que usa prepared statements internamente — el hallazgo "Alto: SQL
Injection en PUT /categories/{id}" del escaneo ZAP (`docs/pentesting_zap_basico.md`) ya se
había confirmado como falso positivo por este mismo motivo.

---

## 2. Exposición de información sensible en errores

Ya documentado como hallazgo real (ZAP-03, `docs/pentesting_zap_basico.md`): el middleware
global de errores en `src/app.js` expone el stack trace completo cuando
`NODE_ENV === 'development'`:

```js
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

**Sigue activo:** el `.env` del proyecto tiene `NODE_ENV=development`. Pasar a `production`
solo quita el stack trace: el handler devuelve siempre `err.message`, que en los errores de
Prisma lleva detalles internos (en una prueba con Prisma 5.22, la ruta y el código que falló,
o la dirección de la base de datos si no era accesible). Los controllers que responden desde
su propio `catch` (Patrón 5) también devuelven el mensaje de la excepción en cualquier entorno.

---

## 3. Cabeceras HTTP (Helmet)

```js
app.use(helmet());
```

Helmet está presente y se aplica antes de las rutas, con configuración por defecto (sin
opciones deshabilitadas manualmente). La configuración por defecto de `helmet` v7 incluye
`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`,
`Strict-Transport-Security`, etc. — no se detectó ninguna cabecera de seguridad desactivada
explícitamente ni configuración insegura. Sin hallazgos.

---

## 4. Política CORS

```js
app.use(cors());
```

`cors()` sin argumentos envía `Access-Control-Allow-Origin: *` en todas las respuestas, así
que acepta peticiones desde cualquier origen. Ya documentado
como **S4** (Media, A05) y confirmado por SonarCloud como Security Hotspot (SH1) en ambos
análisis, básico y completo. Sin cambios.

---

## 5. Almacenamiento de contraseñas

```js
const passwordHash = await bcrypt.hash(userData.password, 10);
// ...
const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
```

`bcryptjs` con **10 salt rounds** — factor de coste estándar y razonable (el valor por
defecto recomendado en la documentación de la librería está entre 10 y 12). El hash nunca
se devuelve al cliente (destructuring `{ passwordHash: _, ...userWithoutPassword }` en
`register` y `login`). **Sin hallazgos.**

---

## Hallazgos de calidad

Esta revisión encontró Q2 y Q3, dos configuraciones fijadas en el código y no
vulnerabilidades (detalle en `docs/correcciones_minimas.md`).
