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
          
          // Validate session with backend
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/child/session`, {
            headers: {
              Authorization: `Bearer ${authService.getToken()}`
            }
          });

          if (!response.ok) {
            throw new Error('Session invalid');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        authService.logout();
        setChild(null);
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
