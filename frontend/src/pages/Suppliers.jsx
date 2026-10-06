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
      // Corrección mínima C15: el email vacío se omite en vez de enviarse como ''.
      const payload = { ...formData, email: formData.email || undefined };
      if (editingId) {
        await apiClient.put(`/suppliers/${editingId}`, payload);
      } else {
        await apiClient.post('/suppliers', payload);
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
