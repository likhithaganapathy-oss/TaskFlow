import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

/**
 * SECURITY NOTE (for production):
 * JWT tokens are currently stored in localStorage for simplicity.
 * localStorage is accessible to any JavaScript running on the page, so an XSS
 * vulnerability could expose the token. For a production deployment, consider
 * using secure, HttpOnly cookies with appropriate CSRF protections instead.
 */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('taskflow_token'));
  const [loading, setLoading] = useState(true);

  // Initialize session: verify stored token with /api/auth/me
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('taskflow_token');
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (response.success && response.user) {
          setUser(response.user);
          setToken(storedToken);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('[TaskFlow Auth] Session verification failed:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen to expiration events dispatched by api.js
    const handleExpired = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('taskflow-auth-expired', handleExpired);
    return () => window.removeEventListener('taskflow-auth-expired', handleExpired);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.success && response.token) {
      localStorage.setItem('taskflow_token', response.token);
      localStorage.setItem('taskflow_user', JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
      return response;
    }
    throw new Error(response.message || 'Login failed');
  };

  const register = async (name, email, password, confirmPassword) => {
    const response = await api.post('/auth/register', {
      name,
      email,
      password,
      confirmPassword,
    });
    if (response.success && response.token) {
      localStorage.setItem('taskflow_token', response.token);
      localStorage.setItem('taskflow_user', JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
      return response;
    }
    throw new Error(response.message || 'Registration failed');
  };

  const logout = () => {
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

