import axios from 'axios';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // change if your backend runs elsewhere
});

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
});

export default api;
