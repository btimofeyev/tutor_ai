'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored authentication - only on client side
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('child_token');
      const storedChild = localStorage.getItem('child_data');
      
      // Check for existing auth data
      
      if (storedToken && storedChild) {
        try {
          const childData = JSON.parse(storedChild);
          setChild(childData);
        } catch (error) {
          console.error('Failed to parse stored child data:', error);
          localStorage.removeItem('child_token');
          localStorage.removeItem('child_data');
          localStorage.removeItem('child_refresh_token'); 
          localStorage.removeItem('session_id');
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, pin) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/child/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, pin }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Store access token and child data - only on client side
        if (typeof window !== 'undefined') {
          localStorage.setItem('child_token', data.tokens.accessToken);
          localStorage.setItem('child_refresh_token', data.tokens.refreshToken);
          localStorage.setItem('child_data', JSON.stringify(data.child));
          // DON'T store session_id initially - this signals fresh login
        }
        
        setChild({
          id: data.child.id,
          first_name: data.child.name.split(' ')[0], // Extract first name
          name: data.child.name,
          grade: data.child.grade
        });

        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Connection error. Please try again.' };
    }
  };

  const logout = async () => {
    // End current session before logout
    try {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('child_token');
        const currentSessionId = sessionStorage.getItem('current_session_id');
        
        if (token && currentSessionId) {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/session/end`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              sessionId: currentSessionId,
              reason: 'logout' 
            })
          });
        }
      }
    } catch (error) {
      console.error('Failed to end session on logout:', error);
    }

    // Clear all local storage and session storage - only on client side
    if (typeof window !== 'undefined') {
      // Clear localStorage
      localStorage.removeItem('child_token');
      localStorage.removeItem('child_refresh_token');
      localStorage.removeItem('child_data');
      localStorage.removeItem('session_id');
      
      // Clear sessionStorage (conversation-related data)
      const currentSessionId = sessionStorage.getItem('current_session_id');
      if (currentSessionId) {
        sessionStorage.removeItem(`response_${currentSessionId}`);
        sessionStorage.removeItem(`conversation_${currentSessionId}`);
      }
      sessionStorage.removeItem('current_session_id');
      
    }
    setChild(null);
  };

  const getAuthHeaders = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('child_token');
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
    return {};
  };

  // Handle token expiration - centralized logout
  const handleTokenExpiration = async () => {
    await logout();
  };

  // Enhanced fetch with automatic token expiration handling
  const authenticatedFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Check for token expiration
    if (response.status === 401) {
      const data = await response.json();
      if (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_TOKEN' || data.code === 'MISSING_TOKEN') {
        handleTokenExpiration();
        throw new Error('Token expired');
      }
    }

    return response;
  };

  const value = {
    child,
    loading,
    login,
    logout,
    getAuthHeaders,
    handleTokenExpiration,
    authenticatedFetch,
    isAuthenticated: !!child,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}