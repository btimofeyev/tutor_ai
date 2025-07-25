'use client';
import { useEffect } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const session = useSession();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Clear any local storage
        if (typeof window !== 'undefined') {
          // Clear all localStorage items related to the app
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('child') || key.includes('supabase'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
        }

        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Error signing out:', error);
        }
        
        // Force redirect to home page
        router.push('/');
        
        // Force page reload to clear any cached state
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      } catch (error) {
        console.error('Logout error:', error);
        // Force redirect even on error
        window.location.href = '/';
      }
    };

    handleLogout();
  }, [router, supabase]);

  return (
    <div className="flex items-center justify-center h-screen bg-background-main">
      <div className="text-xl text-text-secondary">Logging out...</div>
    </div>
  );
}
