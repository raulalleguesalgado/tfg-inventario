# tfg-inventario

Aplicación web de gestión de inventario generada mediante ingeniería de prompts con un LLM (Gemini 3.1 Pro), desarrollada como Trabajo de Fin de Grado. El foco del proyecto es la auditoría de seguridad (OWASP) y de calidad del código resultante, no la aplicación en sí.

## Stack

- **Backend:** Node.js + Express, ORM Prisma, PostgreSQL, autenticación JWT (`jsonwebtoken` + `bcryptjs`), validación con `zod`
- **Frontend:** React + Vite, sin librería de UI. Los prompts del frontend pedían React 18 y React Router v6; al
  crear el proyecto (Vite + `npm install`) se instalaron las versiones del momento, React 19 y
  React Router 7 (`frontend/package-lock.json`), y el código
  generado funciona con ellas sin cambios.
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
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev              # http://localhost:5173
   ```
4. Usuarios de prueba (con el backend arrancado). La base de datos arranca vacía:
   ```bash
   curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" \
     -d '{"name":"Admin","email":"admin@test.com","password":"admin1234"}'
   curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" \
     -d '{"name":"Operador","email":"operador@test.com","password":"operador1234"}'
   docker exec tfg-postgres psql -U tfguser -d tfg_inventario \
     -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'admin@test.com';"
   ```
   Quedan `admin@test.com` / `admin1234` (administrador) y `operador@test.com` / `operador1234` (operador).
