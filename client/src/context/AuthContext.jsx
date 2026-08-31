import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mmt_user')) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const persist = (token, userData) => {
    localStorage.setItem('mmt_token', token);
    localStorage.setItem('mmt_user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = useCallback(async (identifier, password) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    persist(data.data.token, data.data.user);
    return data.data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    persist(data.data.token, data.data.user);
    return data.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('mmt_token');
    localStorage.removeItem('mmt_user');
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      const safe = data.data.user;
      localStorage.setItem('mmt_user', JSON.stringify(safe));
      setUser(safe);
    } catch {
      /* keep existing */
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('mmt_token')) {
      refreshMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshMe]);

  const can = useCallback(
    (...roles) => (user ? roles.includes(user.role) : false),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshMe, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
