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
