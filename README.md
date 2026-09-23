# tfg-inventario

Aplicación web de gestión de inventario generada mediante ingeniería de prompts con LLMs (Gemini Pro), desarrollada como Trabajo de Fin de Grado. El foco del proyecto es la auditoría de seguridad (OWASP) y de calidad del código resultante, no la aplicación en sí.

## Stack

- **Backend:** Node.js + Express, ORM Prisma, PostgreSQL, autenticación JWT (`jsonwebtoken` + `bcryptjs`), validación con `zod`
- **Frontend:** React + Vite
- **Análisis estático:** SonarCloud, ESLint (`eslint-plugin-security`), `npm audit`
- **Pentesting:** OWASP ZAP, Burp Suite Community

## Estructura del repositorio

```
src/            backend: routes → controllers → services → repositories → DB
frontend/       frontend React + Vite
prisma/         schema de Prisma
prompts/        prompt exacto, respuesta del LLM y análisis, uno por módulo generado
docs/           informes de análisis estático, pentesting y correcciones aplicadas
```

`prompts/` y `docs/` no son documentación de apoyo: son el material empírico sobre el que se basan los resultados del TFG (comparativa prompt básico/refinado, vulnerabilidades encontradas, hallazgos de calidad).

## Puesta en marcha

1. Base de datos PostgreSQL en Docker:
   ```bash
   docker run --name tfg-postgres \
     -e POSTGRES_USER=tfguser \
     -e POSTGRES_PASSWORD=tfgpass \
     -e POSTGRES_DB=tfg_inventario \
     -p 5432:5432 \
     -d postgres:16
   ```
2. Backend:
   ```bash
   npm install
   cp .env.example .env   # y ajustar JWT_SECRET
   npx prisma generate
   npx prisma db push     # crea las tablas en la BD a partir del schema
   npm start               # http://localhost:3000
   ```
   No hay migraciones ni seed de datos de prueba versionados: el schema se aplica
   directamente con `db push`, y los usuarios de prueba se crean a mano vía `/auth/register`.
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev              # http://localhost:5173
   ```
