// AuthContext.jsx — CORRECCIÓN MÍNIMA C7 aplicada:
// export const useAuth añadido — Navbar (prompt 09B) lo importa pero el prompt de
// setup (09A) nunca lo generó, solo AuthContext/AuthProvider (Patrón 8).
// El resto del fichero es el output original del prompt 09A.

import { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../api/auth';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

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
