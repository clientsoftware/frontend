import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    // Keep demo session without calling /auth/me
    if (token === 'demo-token') {
      setLoading(false);
      return;
    }
    let cancelled = false;
    authAPI
      .me()
      .then((res) => {
        if (!cancelled) {
          const u = res.data?.user || res.data;
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (credentials) => {
    const res = await authAPI.login(credentials);
    const payload = res.data?.token ? res.data : res.data?.data || res.data;
    const t = payload.token;
    const u = payload.user;
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      /* ignore */
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
