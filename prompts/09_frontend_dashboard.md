# Prompt 09B — Frontend: Dashboard + Navbar

**Módulo:** Frontend — Navbar, Dashboard, actualización App.jsx
**Fase:** 3.5
**Tipo de prompt:** Refinado directo
**LLM usado:** Gemini Pro
**Iteraciones:** 1
**Fecha:** 2026-07-09
**Prompt anterior:** `09_frontend_setup.md`

---

## Prompt enviado

```
[CONTEXT]
Frontend for an inventory management REST API.
Stack: React 18, Vite, React Router v6, Axios.
API base URL: http://localhost:3000
Auth: JWT token in localStorage. All API calls use src/api/client.js (axios instance
that automatically attaches Authorization: Bearer <token> header).
All API responses follow: { success, data, error, message }

API endpoints for this prompt:
  GET /products          → { data: [ { id, name, currentStock, minStock, category, supplier } ] }
  GET /products/alerts   → { data: [ { id, name, currentStock, minStock } ] }

The app has a navigation bar with links to: Dashboard (/), Products (/products),
Movements (/movements), Categories (/categories), Suppliers (/suppliers).
User info and logout button are also in the navbar.

[TASK]
Generate two files:

1. src/components/Navbar.jsx
   - Navigation links to all sections
   - Show logged-in user's name (from AuthContext)
   - Logout button that calls logout() from AuthContext

2. src/pages/Dashboard.jsx
   - On mount: fetch GET /products and GET /products/alerts in parallel
   - Show total number of products
   - Show number of products with low stock (alerts)
   - Show a list/table of low-stock products with: name, currentStock, minStock
   - Show loading state while fetching
   - Show error message if fetch fails

Update src/App.jsx to:
   - Add Navbar above all protected routes
   - Add placeholder routes for /products, /movements, /categories, /suppliers
     (just an <h1> for now)
   - Replace the Dashboard placeholder with the real Dashboard component

[RULES]
- Use functional components and hooks only.
- Use plain CSS or inline styles — no external UI libraries.
- Import axios client from src/api/client.js for all API calls.
- Use AuthContext for user info and logout.
- Handle loading and error states in Dashboard.

[OUTPUT]
Only code. No explanations. Include the filename as a comment at the top of each file.
```

---

## Respuesta del LLM

### src/components/Navbar.jsx

```jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkStyle = { marginRight: '1rem', textDecoration: 'none', color: '#333' };

  return (
    <nav style={{ padding: '1rem', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <Link style={linkStyle} to="/">Dashboard</Link>
        <Link style={linkStyle} to="/products">Products</Link>
        <Link style={linkStyle} to="/movements">Movements</Link>
        <Link style={linkStyle} to="/categories">Categories</Link>
        <Link style={linkStyle} to="/suppliers">Suppliers</Link>
      </div>
      <div>
        <span style={{ marginRight: '1rem' }}>Hello, {user?.name}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
```

### src/pages/Dashboard.jsx

```jsx
import { useEffect, useState } from 'react';
import apiClient from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, alerts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, alertsRes] = await Promise.all([
          apiClient.get('/products'),
          apiClient.get('/products/alerts')
        ]);

        setStats({
          total: productsRes.data.data.length,
          alerts: alertsRes.data.data
        });
      } catch (err) {
        setError('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard</h1>
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Total Products</h3>
          <p style={{ fontSize: '1.5rem', margin: 0 }}>{stats.total}</p>
        </div>
        <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Low Stock Alerts</h3>
          <p style={{ fontSize: '1.5rem', margin: 0 }}>{stats.alerts.length}</p>
        </div>
      </div>

      <h3>Low Stock Items</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '0.5rem' }}>Name</th>
            <th style={{ padding: '0.5rem' }}>Current Stock</th>
            <th style={{ padding: '0.5rem' }}>Min Stock</th>
          </tr>
        </thead>
        <tbody>
          {stats.alerts.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.5rem' }}>{item.name}</td>
              <td style={{ padding: '0.5rem' }}>{item.currentStock}</td>
              <td style={{ padding: '0.5rem' }}>{item.minStock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### src/App.jsx (actualizado)

```jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';

const Placeholder = ({ title }) => <div style={{ padding: '2rem' }}><h1>{title}</h1></div>;

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Placeholder title="Products" />} />
        <Route path="/movements" element={<Placeholder title="Movements" />} />
        <Route path="/categories" element={<Placeholder title="Categories" />} />
        <Route path="/suppliers" element={<Placeholder title="Suppliers" />} />
      </Routes>
    </Router>
  );
}
```

---

## Análisis

### Problemas detectados

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| B1 | Alta | `useAuth` importado en Navbar pero no existe — el prompt de setup exportó `AuthContext` y `AuthProvider`, nunca un hook `useAuth`. La app crashea en runtime con `TypeError: useAuth is not a function`. | Navbar.jsx |
| B2 | Alta | `App.jsx` actualizado elimina `AuthProvider` y `ProtectedRoute` del setup anterior. Resultado: toda la app pierde el contexto de autenticación y todas las rutas son públicas. Login y Register dejan de existir como rutas. La app es no funcional. | App.jsx |
| B3 | Media | `user?.name` en Navbar siempre es `undefined`. El JWT se firmó con `{ id, role }` en `auth.service.js` — el campo `name` nunca se incluyó en el payload. Navbar muestra "Hello, " sin nombre. | Navbar.jsx |
| F1 | Info | `handleLogout` llama a `logout()` (que ya hace `window.location.href = '/login'`) y luego `navigate('/login')`. Doble redirect — el segundo nunca llega a ejecutarse. | Navbar.jsx |
| F2 | Info | Sin mensaje cuando `stats.alerts` está vacío — la tabla muestra cabeceras con cuerpo vacío. | Dashboard.jsx |

### Observación metodológica — Patrón de fragmentación entre prompts

B1 y B2 son la manifestación más clara del **Patrón 8** documentado en el análisis de prompts básicos (fragmentación por conversaciones independientes), ahora aplicado al frontend:

- El LLM del prompt de Dashboard asumió que `AuthContext` exporta un hook `useAuth` — convención habitual en React pero no implementada en la conversación anterior.
- Al reescribir `App.jsx`, el LLM generó una versión limpia desde cero sin recordar la estructura de `AuthProvider` y `ProtectedRoute` del prompt anterior.

Estos errores no son de conocimiento — el LLM sabe implementar `useAuth` y sabe que React Router necesita el Provider. Son errores de **ausencia de contexto entre conversaciones**: exactamente el mismo problema que en el backend, ahora replicado en el frontend.

**Dato relevante para la memoria:** este patrón aparece en los prompts básicos del backend (módulos ES Modules vs CommonJS, PrismaClient sin singleton) y ahora en el frontend (hook inexistente, Provider eliminado). Confirma que la fragmentación de conversaciones es un problema estructural independiente del dominio técnico.

### Correcciones mínimas necesarias para integración

Estas correcciones son inevitables — sin ellas la app no funciona:

1. Añadir `export const useAuth = () => useContext(AuthContext)` en `AuthContext.jsx`
2. Restaurar `AuthProvider` y `ProtectedRoute` en `App.jsx`, y recuperar las rutas `/login` y `/register`
3. Incluir `name` en el payload JWT en `auth.service.js`: `jwt.sign({ id, role, name }, ...)`

Documentadas en `docs/correcciones_minimas.md` como C7, C8, C9.

---

## Número de iteraciones

1 — output aceptado para análisis. Correcciones mínimas documentadas por separado.
