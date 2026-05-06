import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

function readStoredUser() {
  const stored = localStorage.getItem('ttm_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem('ttm_user');
    localStorage.removeItem('ttm_token');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('ttm_token'));
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    if (!token) return;
    authApi.me().then(setUser).catch(() => logout());
  }, [token]);

  const saveSession = (session) => {
    localStorage.setItem('ttm_token', session.token);
    localStorage.setItem('ttm_user', JSON.stringify(session.user));
    setToken(session.token);
    setUser(session.user);
  };

  const login = async (payload) => saveSession(await authApi.login(payload));
  const signup = async (payload) => saveSession(await authApi.signup(payload));
  const logout = () => {
    localStorage.removeItem('ttm_token');
    localStorage.removeItem('ttm_user');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ token, user, login, signup, logout }), [token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
