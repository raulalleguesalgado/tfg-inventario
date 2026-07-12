// App.jsx — CORRECCIÓN MÍNIMA C8 aplicada:
// El prompt 09B reescribió este fichero desde cero y eliminó AuthProvider,
// ProtectedRoute y las rutas /login, /register generadas en el prompt 09A (Patrón 8).
// Esta versión integra la estructura de rutas de 09A con el Navbar, Dashboard y
// placeholders añadidos en 09B.
// CORRECCIÓN MÍNIMA C12 aplicada: el prompt de Products (09C) volvió a reescribir
// App.jsx desde cero, esta vez dejando solo la ruta /products (tercera ocurrencia
// del mismo patrón de fragmentación — Patrón 8). Solo se sustituye el placeholder
// de Products por el componente real; el resto de la estructura se conserva.
// CORRECCIÓN MÍNIMA C13 aplicada: el prompt de Movements (09D) reescribió App.jsx
// una CUARTA vez seguida, dejando solo la ruta /movements (n=4/4 prompts que tocan
// App.jsx, patrón completamente reproducible). Solo se sustituye el placeholder de
// Movements por el componente real.
// CORRECCIÓN MÍNIMA C14 aplicada: el prompt de Categories (09E) reescribió App.jsx
// una QUINTA vez seguida, dejando solo la ruta /categories (n=5/5). Solo se sustituye
// el placeholder de Categories por el componente real.
// CORRECCIÓN MÍNIMA C16 aplicada: el prompt de Suppliers (09F) reescribió App.jsx
// una SEXTA vez seguida, dejando solo la ruta /suppliers (n=6/6). Solo se sustituye
// el placeholder de Suppliers por el componente real.

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
