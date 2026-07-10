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
