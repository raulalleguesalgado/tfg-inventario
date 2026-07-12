# Revisión manual de patrones inseguros — conjunto completo (Fase 4A.4)

**Fecha:** 2026-07-12
**Código revisado:** `src/` (backend) y `frontend/src/` (frontend)
**Método:** revisión de código dirigida por patrón (grep + lectura manual), no automatizada — complementa SonarCloud/ESLint/npm audit (4A.1-4A.3), que ya cubren detección basada en reglas

---

## 1. `eval()`, `exec()`, concatenación de SQL sin parametrizar

```bash
grep -rn "eval\(|exec\(|child_process" src/ frontend/src/
```

**Resultado: ninguna coincidencia en todo el proyecto.** Todo el acceso a base de datos
pasa por Prisma Client, que usa prepared statements internamente — el hallazgo "Alto: SQL
Injection en PUT /categories/{id}" del escaneo ZAP (`docs/pentesting_zap_basico.md`) ya se
había confirmado como falso positivo por este mismo motivo. Sin cambios respecto al
análisis básico.

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

**Confirmado que sigue activo:** el `.env` real del proyecto tiene `NODE_ENV=development`,
por lo que esta condición se cumple en el entorno de desarrollo/pruebas actual. El guard en
sí es correcto (no expondría el stack en producción con `NODE_ENV=production`), pero es la
app tal y como se ejecuta la que sí filtra esta información — coherente con el hallazgo ya
documentado, sin necesidad de re-explotarlo.

---

## 3. Cabeceras HTTP (Helmet)

```js
app.use(helmet());
```

Helmet está presente y se aplica antes de las rutas, con configuración por defecto (sin
opciones deshabilitadas manualmente). La configuración por defecto de `helmet` v7 incluye
`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`,
`Strict-Transport-Security`, etc. — no se detectó ninguna cabecera de seguridad desactivada
explícitamente ni configuración insegura. Sin hallazgos nuevos.

---

## 4. Política CORS

```js
app.use(cors());
```

`cors()` sin argumentos — refleja el header `Origin` de cualquier petición entrante en
`Access-Control-Allow-Origin`, permitiendo requests desde cualquier origen. Ya documentado
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
`register` y `login`, aunque SonarCloud lo marque como falso positivo de variable no usada
— CS2/S1481, ya documentado). **Sin hallazgos** — este es el único de los cinco puntos de
la checklist 4A.4 en el que el código generado por el LLM no introduce ningún riesgo.

---

## Hallazgos de calidad nuevos (no bloqueantes, no vulnerabilidades)

Durante esta revisión se detectaron dos configuraciones muertas, añadidas a
`docs/correcciones_minimas.md`:

- **Q2**: `JWT_EXPIRES_IN="1h"` declarado en `.env`/`.env.example` pero nunca leído —
  `auth.service.js` hardcodea `{ expiresIn: '1d' }`. Cambiar la variable de entorno no
  tiene ningún efecto real.
- **Q3**: `frontend/src/api/client.js` hardcodea `baseURL: 'http://localhost:3000'` en vez
  de leerlo de una variable de entorno de Vite — no bloquea nada en desarrollo, pero
  impide desplegar el frontend contra otro backend sin tocar el código fuente.

Ninguno de los dos es una vulnerabilidad ni bloquea el flujo funcional, así que no se
corrigen (mismo criterio que Q1, ver cabecera de `docs/correcciones_minimas.md`).

---

## Conclusión — Fase 4A.4 completa

De los cinco patrones de la checklist (`plan.md` 4A.4), solo la exposición de información
sensible en errores y la política CORS constituyen hallazgos reales — y ambos ya estaban
documentados de sesiones anteriores (ZAP-03 y S4 respectivamente). La revisión manual sobre
el conjunto completo (backend + frontend) no encontró **ninguna vulnerabilidad nueva** más
allá de la ya detectada por SonarCloud (S6, JWT en `localStorage`, ver
`docs/analisis_estatico_completo.md`). Sí aportó dos hallazgos de calidad menores (Q2, Q3).

**Con esto, la Fase 4A (Análisis estático) queda completa: SonarCloud (4A.1), ESLint
(4A.2), npm audit (4A.3) y revisión manual (4A.4), las cuatro sobre el conjunto completo
backend + frontend.**
