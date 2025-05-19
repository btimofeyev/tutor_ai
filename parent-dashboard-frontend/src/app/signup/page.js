'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import supabase from '../../utils/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@supabase/auth-helpers-react';

export default function SignupPage() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace('/dashboard');
  }, [session, router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white shadow rounded-2xl px-8 py-10 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Sign up for EduNest</h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          onlyThirdPartyProviders={false}
          view="sign_up"
        />
        <div className="text-center text-sm mt-4">
          Already have an account? <a href="/login" className="text-blue-500 hover:underline">Log In</a>
        </div>
      </div>
    </main>
  );
}
