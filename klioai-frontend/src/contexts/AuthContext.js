'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../utils/auth';

const AuthContext = createContext({
  child: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }) {
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated on mount
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          setChild(authService.getChild());
          
          // Validate session with backend (optional validation)
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/child/session`, {
              headers: {
                Authorization: `Bearer ${authService.getToken()}`
              }
            });

            // Only clear auth on explicit 401/403 responses
            if (response.status === 401 || response.status === 403) {
              throw new Error('Session invalid');
            }
            // Allow other errors (network, server issues) to pass through
          } catch (fetchError) {
            // Only clear auth on explicit auth errors, not network errors
            if (fetchError.message === 'Session invalid') {
              throw fetchError;
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Only logout on actual auth errors, not network issues
        if (error.message === 'Session invalid') {
          authService.logout();
          setChild(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username, pin) => {
    try {
      const data = await authService.login(username, pin);
      setChild(data.child);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const refreshAuthState = () => {
    // Re-initialize auth service from storage to pick up any new tokens
    authService.initializeFromStorage();
    if (authService.isAuthenticated()) {
      setChild(authService.getChild());
    } else {
      setChild(null);
    }
  };

  const logout = async () => {
    await authService.logout();
    setChild(null);
    router.push('/login');
  };

  const value = {
    child,
    loading,
    login,
    logout,
    refreshAuthState,
    isAuthenticated: !!child
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
