# Prompt 09C — Frontend: Gestión de productos

**Módulo:** Frontend — Products (listado, creación, edición, borrado)
**Fase:** 3.5
**Tipo de prompt:** Refinado directo (sin comparativa básico/refinado)
**Iteraciones:** 1
**Prompt anterior:** `09_frontend_dashboard.md`

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

  GET /products
    → { data: [ { id, name, description, reference, purchasePrice, salePrice,
                  currentStock, minStock, categoryId, supplierId,
                  category: { id, name }, supplier: { id, name } } ] }

  GET /categories
    → { data: [ { id, name, description } ] }

  GET /suppliers
    → { data: [ { id, name, contactName, email, phone } ] }

  POST /products   body: { name, description, reference, purchasePrice, salePrice,
                            currentStock, minStock, categoryId, supplierId }
    → 201 { data: { ...createdProduct } }
    description and reference are optional (may be omitted or empty string).
    purchasePrice/salePrice: positive numbers. currentStock/minStock: non-negative integers.
    categoryId/supplierId: UUID strings, must reference an existing category/supplier.

  PUT /products/:id   body: same shape as POST, all fields optional (partial update)
    → 200 { data: { ...updatedProduct } }

  DELETE /products/:id
    → 200 { data: null }

  On validation error the API returns 400 with { success: false, error, message }
  where error may be a string or a Zod error array — display `message` to the user.

[TASK]
Generate the product management view:

1. src/components/ProductForm.jsx
   - Props: initialData (null for create, object for edit), categories (array),
     suppliers (array), onSubmit(formData), onCancel()
   - Controlled form fields: name, description, reference, purchasePrice, salePrice,
     currentStock, minStock, category (select from `categories` prop), supplier
     (select from `suppliers` prop)
   - Pre-fill fields from initialData when editing
   - On submit: call onSubmit with the form data as a plain object (numeric fields
     converted to Number)
   - Show a "Cancel" button that calls onCancel()

2. src/pages/Products.jsx
   - On mount: fetch GET /products, GET /categories, GET /suppliers in parallel
   - Show loading state while fetching, error message if any fetch fails
   - Render a table of products: name, category.name, supplier.name, currentStock,
     minStock, purchasePrice, salePrice, and Edit/Delete action buttons per row
   - "New Product" button shows ProductForm in create mode (initialData=null)
   - Edit button shows ProductForm pre-filled with that product's data
   - On ProductForm submit in create mode: POST /products, then refresh the product list
   - On ProductForm submit in edit mode: PUT /products/:id, then refresh the product list
   - Delete button: confirm with window.confirm(), then DELETE /products/:id and refresh
     the list
   - Show an error message (from response.data.message) if create/update/delete fails,
     without crashing the view
   - Hide the form after successful submit or cancel

Update src/App.jsx:
   - Replace the Products placeholder route with the real Products component

[RULES]
- Use functional components and hooks only.
- Use plain CSS or inline styles — no external UI libraries.
- Import axios client from src/api/client.js for all API calls, never fetch directly.
- Keep ProductForm reusable for both create and edit (single component, controlled by props).
- Do not implement client-side authorization checks (e.g. hiding buttons by role) —
  the API itself does not enforce authorization on these routes.

[OUTPUT]
Only code. No explanations. Include the filename as a comment at the top of each file.
```

---

## Respuesta del LLM

### src/components/ProductForm.jsx

```jsx
import { useState } from 'react';

export default function ProductForm({ initialData, categories, suppliers, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    reference: initialData?.reference || '',
    purchasePrice: initialData?.purchasePrice || 0,
    salePrice: initialData?.salePrice || 0,
    currentStock: initialData?.currentStock || 0,
    minStock: initialData?.minStock || 0,
    categoryId: initialData?.categoryId || '',
    supplierId: initialData?.supplierId || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ['purchasePrice', 'salePrice', 'currentStock', 'minStock'];
    setFormData((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '1rem', border: '1px solid #ccc', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
      <h3>{initialData ? 'Edit Product' : 'New Product'}</h3>
      <input name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
      <input name="description" placeholder="Description" value={formData.description} onChange={handleChange} />
      <input name="reference" placeholder="Reference" value={formData.reference} onChange={handleChange} />
      <input type="number" name="purchasePrice" placeholder="Purchase Price" value={formData.purchasePrice} onChange={handleChange} required />
      <input type="number" name="salePrice" placeholder="Sale Price" value={formData.salePrice} onChange={handleChange} required />
      <input type="number" name="currentStock" placeholder="Current Stock" value={formData.currentStock} onChange={handleChange} required />
      <input type="number" name="minStock" placeholder="Min Stock" value={formData.minStock} onChange={handleChange} required />

      <select name="categoryId" value={formData.categoryId} onChange={handleChange} required>
        <option value="">Select Category</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <select name="supplierId" value={formData.supplierId} onChange={handleChange} required>
        <option value="">Select Supplier</option>
        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <div>
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel} style={{ marginLeft: '0.5rem' }}>Cancel</button>
      </div>
    </form>
  );
}
```

### src/pages/Products.jsx

```jsx
import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import ProductForm from '../components/ProductForm';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([
        apiClient.get('/products'),
        apiClient.get('/categories'),
        apiClient.get('/suppliers')
      ]);
      setProducts(p.data.data);
      setCategories(c.data.data);
      setSuppliers(s.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (formData) => {
    try {
      if (editingProduct) {
        await apiClient.put(`/products/${editingProduct.id}`, formData);
      } else {
        await apiClient.post('/products', formData);
      }
      setShowForm(false);
      setEditingProduct(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await apiClient.delete(`/products/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Products</h1>
      <button onClick={() => { setEditingProduct(null); setShowForm(true); }}>New Product</button>

      {showForm && (
        <ProductForm
          initialData={editingProduct}
          categories={categories}
          suppliers={suppliers}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      <table border="1" style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Name</th><th>Category</th><th>Supplier</th><th>Stock</th><th>Min</th><th>Buy</th><th>Sale</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.category?.name}</td>
              <td>{p.supplier?.name}</td>
              <td>{p.currentStock}</td>
              <td>{p.minStock}</td>
              <td>{p.purchasePrice}</td>
              <td>{p.salePrice}</td>
              <td>
                <button onClick={() => { setEditingProduct(p); setShowForm(true); }}>Edit</button>
                <button onClick={() => handleDelete(p.id)}>Delete</button>
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
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Products from './pages/Products';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/products" element={<Products />} />
        <Route path="*" element={<Navigate to="/products" />} />
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
| ProductForm reutilizable create/edit | ✅ | Un único componente controlado por `initialData` |
| Fetch paralelo de products/categories/suppliers | ✅ | `Promise.all` en `fetchData()` |
| CRUD completo (create/edit/delete) | ✅ | POST/PUT/DELETE seguidos de refresco de la lista |
| Confirmación antes de borrar | ✅ | `window.confirm()` |
| Manejo de errores sin crash | ✅ | `try/catch` con `alert()`/mensaje, la vista no revienta |
| Sin librerías de UI | ✅ | Solo inline styles + tabla HTML plana |

### Problemas detectados

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| B1 | Alta | **App.jsx reescrito desde cero — tercera ocurrencia del Patrón 8.** Elimina `AuthProvider`, `ProtectedRoute`, `Navbar`, `Login`, `Register`, `Dashboard` y los placeholders de Movements/Categories/Suppliers generados en 09A/09B. Solo sobrevive `/products`, con un catch-all que redirige todo lo demás ahí. Aplicado tal cual, la app pierde login, protección de rutas y el resto de vistas. | App.jsx |
| B2 | Media | **Tipo de dato incorrecto en edición.** `purchasePrice`/`salePrice` se leen de `initialData` sin convertir a `Number`. La API serializa los campos `Decimal` de Prisma como **string** en el JSON (confirmado: `"purchasePrice":"10"`), pero el esquema Zod del backend (`PUT /products/:id`) exige `z.number()`. Si el usuario edita un producto sin tocar los campos de precio, se reenvía el string original y la petición fallaría validación. | ProductForm.jsx |
| F1 | Info | Errores de create/update/delete se muestran con `window.alert()`, inconsistente con el patrón de mensaje inline (`<p style={{color:'red'}}>`) usado en Login/Register/Dashboard. No es un bug, es una discrepancia de estilo entre conversaciones. | Products.jsx |
| F2 | Info | `<table border="1">` usa el atributo HTML obsoleto en vez de estilos inline, inconsistente con el resto de tablas del proyecto (Dashboard usa `borderCollapse` vía `style`). | Products.jsx |
| F3 | Info | El `[CONTEXT]` pide React 18/React Router v6, pero `frontend/package.json` real fija React `^19.2.7` y `react-router-dom` `^7.18.1` desde el scaffold inicial — ver F5 de `09_frontend_setup.md` para el detalle. Sin impacto funcional. | package.json |

### Correcciones mínimas aplicadas

Documentadas en `docs/correcciones_minimas.md`:

- **C11** (`ProductForm.jsx`): `purchasePrice`/`salePrice` convertidos con `Number()` al leer `initialData`, evitando el envío de strings al backend en ediciones donde el precio no se modifica.
- **C12** (`App.jsx`): se conserva la estructura completa (`AuthProvider`, `ProtectedRoute`, `Navbar`, `Login`, `Register`, `Dashboard`, placeholders restantes) y solo se sustituye el placeholder de `/products` por el componente real.

### Verificación en navegador

Verificado end-to-end con Playwright headless (login → navegación a `/products` → crear producto → editar sin tocar el precio → borrar). Resultado: sin errores de consola, sin peticiones fallidas, y la edición sin tocar el precio se guarda correctamente tras aplicar C11 (confirma que sin la corrección habría fallado la validación del backend).
