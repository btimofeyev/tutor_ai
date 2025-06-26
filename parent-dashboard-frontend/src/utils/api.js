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
  timeout: 30000, // 30 second timeout
});

// Log the API configuration for debugging
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', getApiBaseUrl());
}

// Request interceptor for authentication
api.interceptors.request.use(async config => {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    config.headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  
  // Keep the x-parent-id header for legacy compatibility if needed
  if (session?.user?.id) {
    config.headers['x-parent-id'] = session.user.id;
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
  error => {
    // Handle common HTTP errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      if (status === 401) {
        console.warn('Authentication failed. Redirecting to login...');
        // Could trigger logout or redirect logic here
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

export default api;
