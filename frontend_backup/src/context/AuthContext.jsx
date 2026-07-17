import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_KEY = 'EM-2026-xK9pLm4qR7vN3wZa8bYc1dEf';

// Set default API key header on ALL axios requests
axios.defaults.headers.common['X-API-Key'] = API_KEY;
if (import.meta.env.VITE_API_BASE_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('marketplace_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('marketplace_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('marketplace_user');
    }
  }, [user]);

  const signup = async (email, password, role = 'Buyer', address = null, vendor_name = null, logistics_name = null) => {
    const res = await axios.post('/auth/signup', { email, password, role, address, vendor_name, logistics_name });
    setUser(res.data);
    return res.data;
  };

  const login = async (email, password) => {
    const res = await axios.post('/auth/login', { email, password });
    setUser(res.data);
    return res.data;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
