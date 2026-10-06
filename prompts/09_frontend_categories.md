# Prompt 09E — Frontend: Gestión de categorías

**Módulo:** Frontend — Categories (listado, creación, edición, borrado)
**Tipo de prompt:** Único, con [RULES] de estilo e integración, sin restricciones de seguridad (sin comparativa básico/refinado)
**Iteraciones:** 1
**Prompt anterior:** `09_frontend_movements.md`

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

  GET /categories
    → { data: [ { id, name, description, _count: { products: number } } ] }
    _count.products is the number of products currently assigned to that category.

  POST /categories   body: { name, description }
    - name: string, required, 1-255 chars
    - description: string, optional (may be omitted, empty, or null)
    → 201 { data: { id, name, description } }

  PUT /categories/:id   body: { name, description }
    - Same shape and validation as POST. This endpoint does NOT accept partial
      updates — both fields must be sent even when only one changed.
    → 200 { data: { id, name, description } }

  DELETE /categories/:id
    → 200 { data: null } on success
    → 400 { success: false, error, message } if the category still has products
      assigned to it (message: "Deletion failed", the real reason is in `error`,
      e.g. "Cannot delete category with associated products") — display `message`
      to the user since that is the only field guaranteed to be a plain string.

  On validation error the API returns 400 with { success: false, error, message }
  where error may be a string or a Zod error array — display `message` to the user.

[TASK]
Generate the category management view:

1. src/pages/Categories.jsx
   - On mount: fetch GET /categories
   - Show a loading state while fetching, error message if the fetch fails
   - Render a table of categories: name, description, product count (_count.products),
     and Edit/Delete action buttons per row
   - "New Category" button shows an inline form in create mode (empty fields)
   - Edit button shows the same form pre-filled with that category's name/description
   - A single form (not a separate component — this view has no reusable-form
     requirement like ProductForm) with controlled fields: name, description
   - On submit in create mode: POST /categories, then refresh the category list
   - On submit in edit mode: PUT /categories/:id, then refresh the category list
   - Delete button: confirm with window.confirm(), then DELETE /categories/:id and
     refresh the list
   - Show an error message (from response.data.message) if create/update/delete fails,
     without crashing the view — this must handle the case where delete fails because
     the category has products assigned
   - Hide the form after successful submit or cancel

Update src/App.jsx:
   - Replace the Categories placeholder route with the real Categories component

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

### src/pages/Categories.jsx

```jsx
import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ id: null, name: '', description: '' });
  const [isFormVisible, setIsFormVisible] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/categories');
      setCategories(res.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.id) {
        await apiClient.put(`/categories/${form.id}`, { name: form.name, description: form.description || '' });
      } else {
        await apiClient.post('/categories', { name: form.name, description: form.description || '' });
      }
      setIsFormVisible(false);
      setForm({ id: null, name: '', description: '' });
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await apiClient.delete(`/categories/${id}`);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Deletion failed');
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Categories</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={() => { setForm({ id: null, name: '', description: '' }); setIsFormVisible(true); }}>
        New Category
      </button>

      {isFormVisible && (
        <form onSubmit={handleSubmit} style={{ margin: '20px 0', padding: '10px', border: '1px solid #ccc' }}>
          <h3>{form.id ? 'Edit Category' : 'Create Category'}</h3>
          <div>
            <label>Name: </label>
            <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required maxLength={255} />
          </div>
          <div>
            <label>Description: </label>
            <input value={form.description || ''} onChange={(e) => setForm({...form, description: e.target.value})} />
          </div>
          <button type="submit">Save</button>
          <button type="button" onClick={() => setIsFormVisible(false)}>Cancel</button>
        </form>
      )}

      <table border="1" style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Products</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id}>
              <td>{cat.name}</td>
              <td>{cat.description}</td>
              <td>{cat._count.products}</td>
              <td>
                <button onClick={() => { setForm(cat); setIsFormVisible(true); }}>Edit</button>
                <button onClick={() => handleDelete(cat.id)}>Delete</button>
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
import Categories from './pages/Categories';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/categories" element={<Categories />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## Análisis

### Problemas detectados

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| — | Alta | **App.jsx reescrito desde cero — quinta ocurrencia consecutiva del Patrón 8.** Elimina `AuthProvider`, `ProtectedRoute`, `Navbar`, `Login`, `Register`, `Dashboard`, `Products`, `Movements` y el placeholder de Suppliers. Solo sobrevive `/categories`, sin catch-all. | App.jsx |

### Correcciones mínimas

C14 (detalle en `docs/correcciones_minimas.md`).
