# Frontend — tfg-inventario

Interfaz React + Vite del sistema de gestión de inventario. Sin librería de UI (CSS mínimo, decisión deliberada del TFG para mantener el foco en prompts/seguridad, no en UI/UX).

## Vistas

Login, Register, Dashboard (resumen de stock + alertas), Productos, Movimientos, Categorías, Proveedores.

## Desarrollo

```bash
npm install
npm run dev       # http://localhost:5173, requiere el backend en :3000
```

Requiere el backend (`../`) y la base de datos PostgreSQL levantados — ver el README de la raíz del repositorio.
