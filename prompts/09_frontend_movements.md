# Prompt 09D — Frontend: Registro de movimientos de stock

**Módulo:** Frontend — Movements (selector de producto, registro de movimiento, historial)
**Fase:** 3.5
**Tipo de prompt:** Único, con [RULES] de estilo e integración, sin restricciones de seguridad (sin comparativa básico/refinado)
**Iteraciones:** 1
**Prompt anterior:** `09_frontend_products.md`

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

  GET /products
    → { data: [ { id, name, currentStock } ] }

  POST /movements   body: { productId, quantity, type, notes }
    - productId: UUID string, required
    - quantity: positive integer, required
    - type: one of "IN", "OUT", "ADJUSTMENT", required
    - notes: string, optional
    → 201 { data: { id, quantity, type, notes, productId, userId, createdAt } }
    On error (e.g. insufficient stock for an OUT movement) the API returns 400 with
    { success: false, error, message } — display `message` to the user.

  GET /movements/product/:id
    → 200 { data: [ { id, quantity, type, notes, productId, userId, createdAt,
                       user: { id, name } } ] }
    Results are ordered newest first.

[TASK]
Generate the stock movement view:

1. src/pages/Movements.jsx
   - On mount: fetch GET /products, populate a product selector (dropdown showing
     product name and its currentStock)
   - When a product is selected: fetch GET /movements/product/:id and show its
     movement history in a table (type, quantity, notes, user.name, createdAt
     formatted as a locale date string)
   - A form to register a new movement for the currently selected product:
     type (select: IN / OUT / ADJUSTMENT), quantity (number input), notes (text input)
   - On submit: POST /movements with the selected product's id and the form values,
     then refresh both the movement history and the product list (so the displayed
     currentStock updates)
   - Show a loading state while fetching, and an error message (from
     response.data.message) if a fetch or the POST fails, without crashing the view
   - Disable the movement form (or show a message) until a product is selected

Update src/App.jsx:
   - Replace the Movements placeholder route with the real Movements component

[RULES]
- Use functional components and hooks only.
- Use plain CSS or inline styles — no external UI libraries.
- Import axios client from src/api/client.js for all API calls, never fetch directly.
- Do not implement client-side stock-sufficiency checks — the API already validates
  this server-side and returns an error message to display.

[OUTPUT]
Only code. No explanations. Include the filename as a comment at the top of each file.
```

---

## Respuesta del LLM

### src/pages/Movements.jsx

```jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';

const Movements = () => {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ type: 'IN', quantity: '', notes: '' });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get('/products');
      setProducts(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchHistory = async (id) => {
    if (!id) {
      setHistory([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/movements/product/${id}`);
      setHistory(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (e) => {
    const id = e.target.value;
    setSelectedProductId(id);
    fetchHistory(id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/movements', {
        ...form,
        productId: selectedProductId,
        quantity: parseInt(form.quantity, 10)
      });
      setForm({ type: 'IN', quantity: '', notes: '' });
      await Promise.all([fetchData(), fetchHistory(selectedProductId)]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit movement');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Inventory Movements</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      <select onChange={handleProductChange} value={selectedProductId} style={{ marginBottom: '20px' }}>
        <option value="">Select a product</option>
        {products.map(p => (
          <option key={p.id} value={p.id}>{p.name} (Stock: {p.currentStock})</option>
        ))}
      </select>

      <form onSubmit={handleSubmit} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
        <h3>Add Movement</h3>
        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} disabled={!selectedProductId}>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
          <option value="ADJUSTMENT">ADJUSTMENT</option>
        </select>
        <input type="number" placeholder="Quantity" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} disabled={!selectedProductId} required />
        <input type="text" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} disabled={!selectedProductId} />
        <button type="submit" disabled={!selectedProductId || loading}>Submit</button>
      </form>

      {loading && <p>Loading...</p>}

      {!loading && selectedProductId && (
        <table border="1" style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Quantity</th>
              <th>Notes</th>
              <th>User</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map(m => (
              <tr key={m.id}>
                <td>{m.type}</td>
                <td>{m.quantity}</td>
                <td>{m.notes}</td>
                <td>{m.user?.name}</td>
                <td>{new Date(m.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Movements;
```

### src/App.jsx (respuesta del LLM — reescrito desde cero)

```jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Movements from './pages/Movements';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/movements" element={<Movements />} />
      </Routes>
    </Router>
  );
}

export default App;
```

---

## Análisis

### Lo que el LLM generó correctamente

| Requisito | Estado | Detalle |
|-----------|--------|---------|
| Selector de producto con stock visible | ✅ | `{p.name} (Stock: {p.currentStock})` |
| Historial se recarga al cambiar de producto | ✅ | `handleProductChange` llama a `fetchHistory` |
| Formulario deshabilitado sin producto seleccionado | ✅ | `disabled={!selectedProductId}` en todos los campos y el submit |
| Refresco de productos + historial tras registrar | ✅ | `Promise.all([fetchData(), fetchHistory(selectedProductId)])` — el stock mostrado se actualiza |
| Manejo de errores sin crash, mensaje inline (no `alert()`) | ✅ | Más consistente con Login/Register/Dashboard que el prompt de Products |
| Sin validación de stock en cliente | ✅ | Delega enteramente en el servidor, tal y como pedía `[RULES]` |
| Botón submit deshabilitado durante `loading` | ✅ | Extra no solicitado explícitamente, evita doble envío |

### Problemas detectados

| ID | Severidad | Problema | Fichero |
|----|-----------|----------|---------|
| B1 | Alta | **App.jsx reescrito desde cero — cuarta ocurrencia consecutiva del Patrón 8.** Elimina `AuthProvider`, `ProtectedRoute`, `Navbar`, `Login`, `Register`, `Dashboard`, `Products` y los placeholders de Categories/Suppliers. Solo sobrevive `/movements`, sin siquiera un catch-all esta vez. | App.jsx |
| F1 | Info | `<table border="1">` — mismo uso del atributo HTML obsoleto ya visto en `Products.jsx` (F2 de 09C), en vez de estilos inline. | Movements.jsx |
| F2 | Info | El `[CONTEXT]` pide React 18/React Router v6, pero `frontend/package.json` real fija React `^19.2.7` y `react-router-dom` `^7.18.1` desde el scaffold inicial — ver F5 de `09_frontend_setup.md` para el detalle. Sin impacto funcional. | package.json |

### Hallazgo adicional — mensaje de error genérico en el backend (no corregido)

`movement.controller.js` hardcodea `message: 'Failed to record movement'` en el catch en vez de devolver el motivo real (p. ej. "Insufficient stock"), inconsistente con `auth.controller.js`/`product.controller.js`. No corregido — documentado para la Fase 4A.

### Correcciones mínimas aplicadas

Documentada en `docs/correcciones_minimas.md`:

- **C13** (`App.jsx`): se conserva la estructura completa y solo se sustituye el
  placeholder de `/movements` por el componente real.

### Verificación en navegador

Playwright headless: login → navegación a `/movements` → seleccionar producto → registrar
movimiento IN (aparece en el historial, stock del selector se actualiza) → registrar
movimiento OUT con cantidad mayor al stock disponible (se muestra mensaje de error sin
crashear la vista). Sin errores de consola de JavaScript (solo el log esperado del
navegador para la respuesta HTTP 400, ya gestionada por el `catch`).
