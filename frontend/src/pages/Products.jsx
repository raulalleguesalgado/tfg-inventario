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
