// Correcciones mínimas C8, C12, C13, C14 y C16: se conserva la estructura de rutas que cada prompt borraba.

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Movements from './pages/Movements';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';

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
                  <Products />
                </>
              }
            />
            <Route
              path="/movements"
              element={
                <>
                  <Navbar />
                  <Movements />
                </>
              }
            />
            <Route
              path="/categories"
              element={
                <>
                  <Navbar />
                  <Categories />
                </>
              }
            />
            <Route
              path="/suppliers"
              element={
                <>
                  <Navbar />
                  <Suppliers />
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
