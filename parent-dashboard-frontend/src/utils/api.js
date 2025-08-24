import axios from 'axios';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Get API URL from environment variables with fallback for development
const getApiBaseUrl = () => {
  // Production: Use environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000/api';
  }

  // Production fallback (should not reach here if env var is set)
  console.warn('NEXT_PUBLIC_API_URL not set. Using default production URL.');
  return '/api'; // Relative URL for production
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000, // 30 second timeout (default)
});

// Log the API configuration for debugging
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', api.defaults.baseURL);
}

// Request interceptor for authentication
api.interceptors.request.use(async config => {
  const supabase = createClientComponentClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  // If session error or no session, try to refresh
  if (sessionError || !session) {
    console.log('No valid session, attempting refresh...');
    const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
    
    if (newSession?.access_token) {
      config.headers['Authorization'] = `Bearer ${newSession.access_token}`;
      
      // Keep the x-parent-id header for legacy compatibility if needed
      if (newSession?.user?.id) {
        config.headers['x-parent-id'] = newSession.user.id;
      }
    } else if (refreshError) {
      console.error('Failed to refresh session:', refreshError);
      // Don't reject here, let the request go through and handle 401 in response interceptor
    }
  } else if (session?.access_token) {
    config.headers['Authorization'] = `Bearer ${session.access_token}`;
    
    // Keep the x-parent-id header for legacy compatibility if needed
    if (session?.user?.id) {
      config.headers['x-parent-id'] = session.user.id;
    }
  }

  return config;
}, error => {
  // Request error handling
  console.error('API Request Error:', error);
  return Promise.reject(error);
});

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // Handle common HTTP errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      if (status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        // Check if it's a session expiry error
        if (data?.code === 'SESSION_EXPIRED' || data?.message?.includes('expired')) {
          console.warn('Session expired, attempting to refresh...');
          
          const supabase = createClientComponentClient();
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (session?.access_token) {
            // Update the authorization header with new token
            originalRequest.headers['Authorization'] = `Bearer ${session.access_token}`;
            
            // Retry the original request with new token
            return api(originalRequest);
          } else {
            console.error('Failed to refresh session:', refreshError);
            // Only redirect to login if refresh completely fails
            if (typeof window !== 'undefined') {
              window.location.href = '/login?session_expired=true';
            }
          }
        } else {
          console.warn('Authentication failed. Redirecting to login...');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } else if (status >= 500) {
        console.error('Server error:', status, data?.error || data?.message);
      } else if (status === 404) {
        console.warn('API endpoint not found:', error.config?.url);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error - API server may be down:', error.message);
    } else {
      // Other error
      console.error('API Error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Export both the default api instance and a specialized upload api
export const uploadApi = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 120000, // 2 minute timeout for AI processing
});

// Apply same interceptors to upload API
uploadApi.interceptors.request.use(api.interceptors.request.handlers[0].fulfilled);
uploadApi.interceptors.response.use(
  api.interceptors.response.handlers[0].fulfilled,
  api.interceptors.response.handlers[0].rejected
);

export default api;