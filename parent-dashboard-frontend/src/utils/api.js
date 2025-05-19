import axios from 'axios';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // change if your backend runs elsewhere
});

api.interceptors.request.use(async config => {
  const supabase = createClientComponentClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id) {
    config.headers['x-parent-id'] = user.id;
  }
  return config;
});

export default api;
