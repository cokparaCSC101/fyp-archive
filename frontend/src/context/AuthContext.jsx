// =====================================================================
//  AuthContext
//  Holds the current user + token, exposes login / register / verify /
//  resend / logout, and persists the session in localStorage.
//
//  Note: register() no longer signs the user in. New accounts must
//  verify their email with a 6-digit code first (verifyEmail()).
// =====================================================================
import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
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

  // Creates the account and triggers the email code. Does NOT sign in.
  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data; // { requiresVerification, email, message }
  }, []);

  // Confirms the emailed code, then signs the user in.
  const verifyEmail = useCallback(async (email, code) => {
    const { data } = await api.post('/auth/verify-email', { email, code });
    persist(data.token, data.user);
    return data.user;
  }, []);

  const resendCode = useCallback(async (email) => {
    const { data } = await api.post('/auth/resend-code', { email });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('fyp_token');
    localStorage.removeItem('fyp_user');
    setUser(null);
  }, []);

  const role = user?.role || null;
  const value = {
    user,
    role,
    isAuthenticated: !!user,
    isAdmin: role === 'admin',
    isHod: role === 'hod',
    isLecturer: role === 'lecturer',
    isStaff: role === 'admin' || role === 'hod' || role === 'lecturer',
    canApprove: role === 'admin' || role === 'hod',
    login,
    register,
    verifyEmail,
    resendCode,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
