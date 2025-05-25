// klioai-frontend/src/utils/auth.js
'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class AuthService {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.child = null;
    this.sessionId = null;
    this.initializeFromStorage();
  }

  initializeFromStorage() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('klio_access_token');
      this.refreshToken = localStorage.getItem('klio_refresh_token');
      this.sessionId = localStorage.getItem('klio_session_id');
      const childData = localStorage.getItem('klio_child');
      if (childData) {
        try {
          this.child = JSON.parse(childData);
        } catch (e) {
          console.error('Failed to parse child data:', e);
        }
      }
    }
  }

  getToken() {
    return this.token;
  }

  getChild() {
    return this.child;
  }

  isAuthenticated() {
    return !!this.token && !!this.child;
  }

  // --- Add this method! ---
  setupAxiosInterceptors(axiosInstance) {
    axiosInstance.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }
  // --- End add ---

  async login(username, pin) {
    try {
      const response = await fetch(`${API_URL}/api/auth/child/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, pin }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      const { tokens, child, sessionId } = data;
      
      this.token = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      this.child = child;
      this.sessionId = sessionId;

      // Save to localStorage
      localStorage.setItem('klio_access_token', tokens.accessToken);
      localStorage.setItem('klio_refresh_token', tokens.refreshToken);
      localStorage.setItem('klio_session_id', sessionId);
      localStorage.setItem('klio_child', JSON.stringify(child));

      return data;
    } catch (error) {
      throw error;
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/child/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const { tokens } = data;
      
      this.token = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;

      // Update localStorage
      localStorage.setItem('klio_access_token', tokens.accessToken);
      localStorage.setItem('klio_refresh_token', tokens.refreshToken);

      return tokens.accessToken;
    } catch (error) {
      // If refresh fails, logout
      this.logout();
      throw new Error('Session expired. Please login again.');
    }
  }

  async logout() {
    try {
      if (this.token && this.sessionId) {
        await fetch(`${API_URL}/api/auth/child/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({ sessionId: this.sessionId }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local data regardless
      this.token = null;
      this.refreshToken = null;
      this.child = null;
      this.sessionId = null;
      
      localStorage.removeItem('klio_access_token');
      localStorage.removeItem('klio_refresh_token');
      localStorage.removeItem('klio_session_id');
      localStorage.removeItem('klio_child');
    }
  }
}

export const authService = new AuthService();
