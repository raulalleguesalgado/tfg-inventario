# Prompt 09A — Frontend: Setup base + Login/Register

**Módulo:** Frontend — estructura base, cliente API, contexto de auth, Login, Register
**Tipo de prompt:** Único, con [RULES] de estilo e integración, sin restricciones de seguridad (sin comparativa básico/refinado — todo el frontend usa un único prompt por vista)
**Iteraciones:** 1

---

## Prompt enviado

```
[CONTEXT]
Frontend for an inventory management REST API.
Stack: React 18, Vite, React Router v6, Axios.
API base URL: http://localhost:3000
Auth: JWT token stored in localStorage under key 'token'.
All API responses follow: { success, data, error, message }
All protected routes require a valid JWT. If no token exists, redirect to /login.

API endpoints relevant to this prompt:
  POST /auth/login    body: { email, password }  → returns { data: { token, user } }
  POST /auth/register body: { name, email, password } → returns { data: { ...user } }

[TASK]
Generate the base frontend structure:

1. src/api/client.js
   - Axios instance with baseURL http://localhost:3000
   - Request interceptor: attach Authorization: Bearer <token> from localStorage if present
   - Response interceptor: if 401, remove token from localStorage and redirect to /login

2. src/api/auth.js
   - login(email, password): POST /auth/login, store token in localStorage, return user
   - logout(): remove token from localStorage
   - getCurrentUser(): decode JWT payload from localStorage token (use atob on the payload
     segment), return null if no token

3. src/context/AuthContext.jsx
   - AuthContext with: user (state), login(email,password), logout(), loading (bool)
   - On mount: call getCurrentUser() to restore session from localStorage

4. src/components/ProtectedRoute.jsx
   - If loading: show nothing (or a spinner text)
   - If no user: <Navigate to="/login" />
   - Otherwise: render <Outlet />

5. src/pages/Login.jsx
   - Form with email and password fields
   - On submit: call auth login, on success navigate to /
   - Show error message if login fails
   - Link to /register

6. src/pages/Register.jsx
   - Form with name, email, password fields
   - On submit: call auth register, on success navigate to /login
   - Show error message if registration fails
   - Link to /login

7. src/App.jsx
   - React Router setup with routes:
     /login → Login (public)
     /register → Register (public)
     / → ProtectedRoute wrapping an <Outlet> (children added later)
   - Wrap everything in AuthProvider

8. src/main.jsx
   - Standard Vite React entry point

[RULES]
- Use functional components and hooks only — no class components.
- Use plain CSS or inline styles — no external UI libraries (no MUI, no Tailwind).
- JWT decode must use atob() on the base64 payload — do NOT import any jwt-decode library.
- Error messages from the API must use response.data.message field.
- On logout, clear token from localStorage and navigate to /login.
- All API calls go through src/api/client.js (the axios instance), never use fetch directly.

[OUTPUT]
Only code. No explanations. Include the filename as a comment at the top of each file.
```

---

## Respuesta del LLM

### src/api/client.js

```javascript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3000',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
```

### src/api/auth.js

```javascript
import client from './client';

export const login = async (email, password) => {
  const { data } = await client.post('/auth/login', { email, password });
  localStorage.setItem('token', data.data.token);
  return data.data.user;
};

export const register = async (name, email, password) => {
  await client.post('/auth/register', { name, email, password });
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getCurrentUser = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
};
```

### src/context/AuthContext.jsx

```jsx
import { createContext, useState, useEffect } from 'react';
import * as authService from '../api/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = authService.getCurrentUser();
    setUser(userData);
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const user = await authService.login(email, password);
    setUser(user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### src/components/ProtectedRoute.jsx

```jsx
import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;
  return user ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
```

### src/pages/Login.jsx

```jsx
import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} required />
      <button type="submit">Login</button>
      <p>Don't have an account? <Link to="/register">Register</Link></p>
    </form>
  );
};

export default Login;
```

### src/pages/Register.jsx

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(formData.name, formData.email, formData.password);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input type="text" placeholder="Name" onChange={(e) => setFormData({...formData, name: e.target.value})} required />
      <input type="email" placeholder="Email" onChange={(e) => setFormData({...formData, email: e.target.value})} required />
      <input type="password" placeholder="Password" onChange={(e) => setFormData({...formData, password: e.target.value})} required />
      <button type="submit">Register</button>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </form>
  );
};

export default Register;
```

### src/App.jsx

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute />}>
            <Route index element={<h1>Dashboard</h1>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

### src/main.jsx

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## Análisis

### Nota sobre `src/main.jsx`

El bloque de código mostrado arriba para `src/main.jsx` usa el patrón de React 18 (`import React from 'react'`, `ReactDOM.createRoot`, `<React.StrictMode>`). El fichero real (`frontend/src/main.jsx`, commit `a41ec7d`) usa el patrón de importaciones con nombre de React 19/Vite (`import { StrictMode } from 'react'`, `import { createRoot } from 'react-dom/client'`) — mismo comportamiento, sintaxis de import distinta. El `[TASK]` pedía solo "Standard Vite React entry point", sin más detalle, y el fichero no existía antes de este commit ni fue tocado por ningún commit posterior — descarta una sustitución manual posterior no documentada. Queda sin determinar si la respuesta real del LLM ya usaba esta sintaxis o si el bloque mostrado arriba es una transcripción inexacta del prompt log.
