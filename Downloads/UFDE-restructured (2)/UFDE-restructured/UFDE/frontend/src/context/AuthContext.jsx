import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, tokenStore, decodeToken } from '../api/client';

const AuthContext = createContext(null);

const RANK = { Viewer: 1, Analyst: 2, Admin: 3 };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // The role is read from the JWT itself, matching the roleGuard contract
    // the backend enforces on every protected route.
    const claims = decodeToken(tokenStore.get());
    return claims ? { id: claims.id, name: claims.name, email: claims.email, role: claims.role } : null;
  });
  const [loading, setLoading] = useState(!!tokenStore.get());

  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((me) => {
        setUser(me);
        tokenStore.setUser(me);
      })
      .catch(() => {
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await api.login(email, password);
    tokenStore.set(result.token);
    tokenStore.setUser(result.user);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      /** Mirrors requireRole() on the backend: Admin > Analyst > Viewer. */
      hasRole: (minRole) => (RANK[user?.role] || 0) >= (RANK[minRole] || 0),
    }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
