import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('maccan_token');
    const savedUser = localStorage.getItem('maccan_user');
    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch {
        localStorage.removeItem('maccan_token');
        localStorage.removeItem('maccan_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    // User object now includes permissions array from backend
    const userData = {
      ...data.user,
      permissions: data.user.permissions || [],
    };
    localStorage.setItem('maccan_token', data.token);
    localStorage.setItem('maccan_user', JSON.stringify(userData));
    setUser(userData);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('maccan_token');
    localStorage.removeItem('maccan_user');
    setUser(null);
  };

  // Helper: check if user has a specific permission
  const hasPermission = (permission) => {
    if (!user?.permissions) return false;
    return user.permissions.includes(permission);
  };

  // Helper: check if user has ANY of the given permissions
  const hasAnyPermission = (...permissions) => {
    if (!user?.permissions) return false;
    return permissions.some(p => user.permissions.includes(p));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, hasPermission, hasAnyPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
