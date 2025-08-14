'use client';

import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect } from 'react';

export default function SupabaseProvider({ children }) {
  const supabase = createClientComponentClient({
    options: {
      auth: {
        persistSession: true,
        storageKey: 'klioai-auth-token',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    }
  });

  useEffect(() => {
    // Set up auto-refresh interval
    const refreshInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const expiresAt = session.expires_at;
        const currentTime = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - currentTime;
        
        // Refresh if less than 10 minutes left
        if (timeUntilExpiry < 600) {
          console.log('Auto-refreshing session...');
          await supabase.auth.refreshSession();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(refreshInterval);
  }, [supabase]);

  return (
    <SessionContextProvider 
      supabaseClient={supabase}
      initialSession={null}
    >
      {children}
    </SessionContextProvider>
  );
}
