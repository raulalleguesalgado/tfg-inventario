# Análisis npm audit — Prompts básicos

**Herramienta:** npm audit (npm v10.9.3)
**Dependencias analizadas:** `package.json` del prompt 01, con las dependencias de desarrollo
añadidas a mano en el commit `a6c2138` (`eslint`, sus dos plugins y `pg`)

---

## Resultado

`npm audit` en la raíz del repo (solo backend, el frontend aún no existía):

```
found 0 vulnerabilities
```

---

## Dependencias auditadas

| Paquete | Versión especificada | Tipo |
|---------|---------------------|------|
| @prisma/client | ^5.0.0 | production |
| bcryptjs | ^2.4.3 | production |
| cors | ^2.8.5 | production |
| dotenv | ^16.3.1 | production |
| express | ^4.18.2 | production |
| helmet | ^7.0.0 | production |
| jsonwebtoken | ^9.0.1 | production |
| zod | ^3.22.0 | production |
| eslint | ^10.2.0 | dev |
| eslint-plugin-n | ^17.24.0 | dev |
| eslint-plugin-security | ^4.0.0 | dev |
| nodemon | ^3.0.1 | dev |
| pg | ^8.20.0 | dev |
| prisma | ^5.0.0 | dev |

