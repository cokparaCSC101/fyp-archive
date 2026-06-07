// =====================================================================
//  AuthContext
//  Holds the current user + token, exposes login / register / logout,
//  and persists the session in localStorage so a refresh keeps you in.
// =====================================================================
import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialise from localStorage so refreshing the page keeps the session.
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('fyp_user');
    return stored ? JSON.parse(stored) : null;
  });

  const persist = (token, userData) => {
    localStorage.setItem('fyp_token', token);
    localStorage.setItem('fyp_user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    persist(data.token, data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    persist(data.token, data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('fyp_token');
    localStorage.removeItem('fyp_user');
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Convenience hook
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
