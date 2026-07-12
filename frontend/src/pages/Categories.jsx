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
