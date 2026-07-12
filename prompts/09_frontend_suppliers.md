# Prompt 09F — Frontend: Gestión de proveedores

**Módulo:** Frontend — Suppliers (listado, creación, edición, borrado)
**Fase:** 3.5
**Tipo de prompt:** Refinado directo (sin comparativa básico/refinado — metodología en diario.md 2026-03-26)
**LLM usado:** Gemini Pro
**Iteraciones:** 1
**Fecha:** 2026-07-12
**Prompt anterior:** `09_frontend_categories.md`

---

## Prompt enviado

```
[CONTEXT]
Frontend for an inventory management REST API.
Stack: React 18, Vite, React Router v6, Axios.
API base URL: http://localhost:3000
Auth: JWT token in localStorage. All API calls use src/api/client.js (axios instance
that automatically attaches Authorization: Bearer <token> header if present).
All API responses follow: { success, data, error, message }

API endpoints for this prompt:

  GET /suppliers
    → { data: [ { id, name, contactName, email, phone } ] }
    Note: unlike /categories, this list endpoint does NOT return a product count.

  POST /suppliers   body: { name, contactName, email, phone }
    - name: string, required
    - contactName: string, optional (may be omitted, empty, or null)
    - email: string, optional, must be a valid email format if provided
    - phone: string, optional
    → 201 { data: { id, name, contactName, email, phone } }

  PUT /suppliers/:id   body: same shape as POST, all fields optional (partial update —
    unlike /categories, this endpoint DOES accept partial bodies)
    → 200 { data: { id, name, contactName, email, phone } }

  DELETE /suppliers/:id
    → 200 { data: null } on success
    → 400 { success: false, error, message } if the supplier still has products
      assigned to it (message: "Deletion failed", the real reason is in `error`,
      e.g. "Cannot delete supplier with associated products") — display `message`
      to the user since that is the only field guaranteed to be a plain string.

  On validation error the API returns 400 with { success: false, error, message }
  where error may be a string or a Zod error array — display `message` to the user.

[TASK]
Generate the supplier management view:

1. src/pages/Suppliers.jsx
   - On mount: fetch GET /suppliers
   - Show a loading state while fetching, error message if the fetch fails
   - Render a table of suppliers: name, contactName, email, phone, and Edit/Delete
     action buttons per row
   - "New Supplier" button shows an inline form in create mode (empty fields)
   - Edit button shows the same form pre-filled with that supplier's data
   - A single form (not a separate component) with controlled fields: name,
     contactName, email, phone
   - On submit in create mode: POST /suppliers, then refresh the supplier list
   - On submit in edit mode: PUT /suppliers/:id, then refresh the supplier list
   - Delete button: confirm with window.confirm(), then DELETE /suppliers/:id and
     refresh the list
   - Show an error message (from response.data.message) if create/update/delete fails,
     without crashing the view — this must handle the case where delete fails because
     the supplier has products assigned
   - Hide the form after successful submit or cancel

Update src/App.jsx:
   - Replace the Suppliers placeholder route with the real Suppliers component

[RULES]
- Use functional components and hooks only.
- Use plain CSS or inline styles — no external UI libraries.
- Import axios client from src/api/client.js for all API calls, never fetch directly.
- Do not implement client-side authorization checks (e.g. hiding buttons by role) —
  the API itself does not enforce authorization on these routes.

[OUTPUT]
Only code. No explanations. Include the filename as a comment at the top of each file.
```

---

## Respuesta del LLM

### src/pages/Suppliers.jsx

```jsx
import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', contactName: '', email: '', phone: '' });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/suppliers');
      setSuppliers(res.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenForm = (supplier = null) => {
    if (supplier) {
      setEditingId(supplier.id);
      setFormData({ name: supplier.name, contactName: supplier.contactName || '', email: supplier.email || '', phone: supplier.phone || '' });
    } else {
      setEditingId(null);
      setFormData({ name: '', contactName: '', email: '', phone: '' });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.put(`/suppliers/${editingId}`, formData);
      } else {
        await apiClient.post('/suppliers', formData);
      }
      setShowForm(false);
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await apiClient.delete(`/suppliers/${id}`);
        fetchSuppliers();
      } catch (err) {
        alert(err.response?.data?.message || 'Delete failed');
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Suppliers</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button onClick={() => handleOpenForm()}>New Supplier</button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ margin: '20px 0', padding: '10px', border: '1px solid #ccc' }}>
          <h3>{editingId ? 'Edit Supplier' : 'New Supplier'}</h3>
          <input placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <input placeholder="Contact Name" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} />
          <input placeholder="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          <input placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          <button type="submit">Save</button>
          <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
        </form>
      )}

      <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ddd' }}>Name</th>
            <th style={{ borderBottom: '1px solid #ddd' }}>Contact</th>
            <th style={{ borderBottom: '1px solid #ddd' }}>Email</th>
            <th style={{ borderBottom: '1px solid #ddd' }}>Phone</th>
            <th style={{ borderBottom: '1px solid #ddd' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map(s => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.contactName}</td>
              <td>{s.email}</td>
              <td>{s.phone}</td>
              <td>
                <button onClick={() => handleOpenForm(s)}>Edit</button>
                <button onClick={() => handleDelete(s.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### src/App.jsx (respuesta del LLM — reescrito desde cero)

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Suppliers from './pages/Suppliers';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/suppliers" element={<Suppliers />} />
        {/* Other routes */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## Análisis

### Lo que el LLM generó correctamente

| Requisito | Estado | Detalle |
|-----------|--------|---------|
| Tabla con name/contactName/email/phone + acciones | ✅ | Render directo de los campos planos |
| Formulario único reutilizado create/edit | ✅ | Controlado por `editingId` (null = create) |
| CRUD completo con refresco de lista | ✅ | POST/PUT/DELETE seguidos de `fetchSuppliers()` |
| Confirmación antes de borrar | ✅ | `window.confirm()` |
| Manejo de errores sin crash (incluye borrado bloqueado por productos asignados) | ✅ | `try/catch` con `alert()` |
| Estilos de tabla vía `style` (sin `<table border="1">`) | ✅ | Primera vez en la serie de frontend sin el atributo HTML obsoleto (ver F1 de 09C/09D/09E) |
| Sin librerías de UI | ✅ | Solo inline styles |

### Problemas detectados

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| B1 | **Alta (bloqueante)** | **Email vacío rompe create/edit.** El input de email no tiene `required`, así que un usuario puede dejarlo en blanco → `formData.email` queda `''`. El backend valida `email: z.string().email().optional().nullable()`: al ser `.email()` encadenado, `''` se valida como formato de email y **falla** aunque el campo sea opcional (el `.optional()` de Zod solo permite *omitir* la clave, no un string vacío). Resultado: crear o editar cualquier proveedor sin rellenar el email devuelve siempre 400 "Invalid email", incluso aunque el enunciado del prompt diga explícitamente que el campo es opcional. | Suppliers.jsx |
| B2 | Alta | **App.jsx reescrito desde cero — sexta ocurrencia consecutiva del Patrón 8.** Elimina `AuthProvider`, `ProtectedRoute`, `Navbar`, `Login`, `Register`, `Dashboard`, `Products`, `Movements`, `Categories`. Solo sobrevive `/suppliers`, con un comentario `{/* Other routes */}` que no llega a implementarse. | App.jsx |
| F1 | Info | Errores de create/update/delete con `window.alert()`, mismo patrón que Products (F1 de 09C) y Categories (F2 de 09E). | Suppliers.jsx |

### Observación metodológica — Patrón 8, n=6 de 6

Sexto prompt de frontend consecutivo que reescribe `App.jsx` por completo al añadir una
ruta — n=6/6, sin excepción. El comentario `{/* Other routes */}` que el propio LLM deja
en su salida es indicativo: es consciente de que "otras rutas" deberían existir, pero al no
tener el archivo real en su contexto, no puede reconstruirlas y las sustituye por un
comentario vacío.

### Hallazgo B1 — asimetría con el patrón de correcciones anteriores

A diferencia de C7-C13 (bugs de integración entre conversaciones, Patrones 1/8), B1 es un
bug dentro de un único módulo, causado por una particularidad de Zod (`.optional()` no
exime a `.email()` de validar un string vacío) que el LLM no tuvo en cuenta al no marcar el
campo `required` en el formulario. Bloquea un flujo funcional básico (crear/editar un
proveedor sin email), por lo que entra en el mismo criterio de corrección mínima que C11
(bug que impide completar el flujo, no vulnerabilidad de seguridad) — no es un hallazgo de
calidad para Fase 4A, se corrige ahora.

### Correcciones mínimas aplicadas

Documentadas en `docs/correcciones_minimas.md`:

- **C15** (`Suppliers.jsx`): antes de enviar el formulario, `email` se convierte a
  `undefined` cuando está vacío (`formData.email || undefined`) para que la clave se omita
  del body en vez de enviarse como `''`, evitando el 400 "Invalid email" en creación/edición
  sin email.
- **C16** (`App.jsx`): se conserva la estructura completa (`AuthProvider`, `ProtectedRoute`,
  `Navbar`, `Login`, `Register`, `Dashboard`, `Products`, `Movements`, `Categories`) y solo
  se sustituye el placeholder de `/suppliers` por el componente real.

### Verificación en navegador

Playwright headless: login → navegación a `/categories` → crear categoría → editar →
verificar bloqueo de borrado con productos asignados → borrar categoría sin productos →
navegación a `/suppliers` → crear proveedor **sin email** (confirma que sin C15 la petición
fallaría) → editar → verificar bloqueo de borrado con productos asignados → borrar
proveedor sin productos. Sin errores de consola.

---

## Número de iteraciones

1 — output aceptado para análisis. Correcciones mínimas aplicadas por separado.
