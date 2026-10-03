# Análisis npm audit — Prompts básicos (Fase 4A.3)

**Fecha:** 2026-04-07
**Herramienta:** npm audit (npm v10.9.3)
**Dependencias analizadas:** package.json de prompt 01, tras el commit `74c7d31`, que añadió
`eslint`, `eslint-plugin-security`, `eslint-plugin-n` y `pg` como devDependencies (no generadas
por el LLM)

---

## Comando ejecutado

Ejecutado desde la raíz del repo (solo backend, el frontend aún no existía):

```
npm audit
```

## Resultado

```
found 0 vulnerabilities
```

**0 vulnerabilidades** en el árbol de dependencias.

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

`eslint`, `eslint-plugin-n`, `eslint-plugin-security` y `pg` no fueron generadas por el LLM en el
prompt 01: se añadieron en el commit `74c7d31`. Las tres primeras son las herramientas de la fase
de análisis (4A.2).
