// App.jsx — CORRECCIÓN MÍNIMA C8 aplicada:
// El prompt 09B reescribió este fichero desde cero y eliminó AuthProvider,
// ProtectedRoute y las rutas /login, /register generadas en el prompt 09A (Patrón 8).
// Esta versión integra la estructura de rutas de 09A con el Navbar, Dashboard y
// placeholders añadidos en 09B.

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

const Placeholder = ({ title }) => <div style={{ padding: '2rem' }}><h1>{title}</h1></div>;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={
                <>
                  <Navbar />
                  <Dashboard />
                </>
              }
            />
            <Route
              path="/products"
              element={
                <>
                  <Navbar />
                  <Placeholder title="Products" />
                </>
              }
            />
            <Route
              path="/movements"
              element={
                <>
                  <Navbar />
                  <Placeholder title="Movements" />
                </>
              }
            />
            <Route
              path="/categories"
              element={
                <>
                  <Navbar />
                  <Placeholder title="Categories" />
                </>
              }
            />
            <Route
              path="/suppliers"
              element={
                <>
                  <Navbar />
                  <Placeholder title="Suppliers" />
                </>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
