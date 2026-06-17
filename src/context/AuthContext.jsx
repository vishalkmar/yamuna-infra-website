import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

// Holds the logged-in admin + login/logout. On mount, if a token exists it
// validates it via /admin/auth/me so a refresh keeps the session.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) { setAdmin(null); setLoading(false); return; }
    try {
      const { data } = await api.get('/admin/auth/me');
      setAdmin(data.data);
    } catch {
      localStorage.removeItem('admin_token');
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  // React to 401s raised by the axios interceptor anywhere in the app.
  useEffect(() => {
    const onUnauth = () => setAdmin(null);
    window.addEventListener('admin-unauthorized', onUnauth);
    return () => window.removeEventListener('admin-unauthorized', onUnauth);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/admin/auth/login', { email, password });
    localStorage.setItem('admin_token', data.data.token);
    setAdmin(data.data.admin);
    return data.data.admin;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    setAdmin(null);
  }, []);

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, refresh: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
