'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored authentication
    const storedToken = localStorage.getItem('child_token');
    const storedChild = localStorage.getItem('child_data');
    
    if (storedToken && storedChild) {
      try {
        setChild(JSON.parse(storedChild));
      } catch (error) {
        console.error('Failed to parse stored child data:', error);
        localStorage.removeItem('child_token');
        localStorage.removeItem('child_data');
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
        // Store access token and child data
        localStorage.setItem('child_token', data.tokens.accessToken);
        localStorage.setItem('child_refresh_token', data.tokens.refreshToken);
        localStorage.setItem('child_data', JSON.stringify(data.child));
        // DON'T store session_id initially - this signals fresh login
        
        setChild({
          id: data.child.id,
          first_name: data.child.name.split(' ')[0], // Extract first name
          name: data.child.name,
          grade: data.child.grade
        });

        // Force start a new session on login
        try {
          const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/session/new`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.tokens.accessToken}`
            },
            body: JSON.stringify({ reason: 'login' })
          });
          
          const sessionData = await sessionResponse.json();
          if (sessionData.success && sessionData.sessionId) {
            // Only store session_id after we successfully create a new session
            localStorage.setItem('session_id', sessionData.sessionId);
            console.log('New session started on login:', sessionData.sessionId);
          }
        } catch (sessionError) {
          console.error('Failed to start new session on login:', sessionError);
        }

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
      const token = localStorage.getItem('child_token');
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/session/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reason: 'logout' })
        });
        console.log('Session ended on logout');
      }
    } catch (error) {
      console.error('Failed to end session on logout:', error);
    }

    // Clear all local storage
    localStorage.removeItem('child_token');
    localStorage.removeItem('child_refresh_token');
    localStorage.removeItem('child_data');
    localStorage.removeItem('session_id');
    setChild(null);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('child_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Handle token expiration - centralized logout
  const handleTokenExpiration = async () => {
    console.log('Token expired, logging out user');
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