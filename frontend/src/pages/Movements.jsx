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
