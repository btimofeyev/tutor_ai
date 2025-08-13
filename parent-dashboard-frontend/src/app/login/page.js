'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeMinimal } from '@supabase/auth-ui-shared';
import supabase from '../../utils/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if we have a valid authenticated session
    if (session?.user) router.replace('/dashboard');
  }, [session, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background-main p-4">
      {/* Logo & Brand */}
      <Link href="/" className="flex flex-col items-center mb-8 group">
        <Image
          src="/klio_logo.png"
          alt="Klio AI Logo"
          width={54}
          height={54}
          className="mb-2"
          priority
        />
        <span className="text-3xl font-bold text-accent-blue group-hover:text-accent-blue-hover transition-colors tracking-tight">
          Klio AI
        </span>
      </Link>
      {/* Card */}
      <div className="bg-background-card shadow-md rounded-lg p-8 w-full max-w-md border border-border-subtle">
        <h2 className="text-2xl font-semibold mb-6 text-center text-text-primary">
          Welcome Back
        </h2>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeMinimal,
            variables: {
              default: {
                colors: {
                  brand: '#3b82f6',
                  brandAccent: '#2563eb',
                  brandButtonText: 'white',
                  defaultButtonBackground: '#3b82f6',
                  defaultButtonBackgroundHover: '#2563eb', 
                  defaultButtonText: 'white',
                  defaultButtonBorder: '#3b82f6',
                  defaultButtonBorderHover: '#2563eb',
                  inputBackground: '#ffffff',
                  inputBorder: '#d1d5db',
                  inputBorderHover: '#d1d5db',
                  inputBorderFocus: '#3b82f6',
                  inputText: '#374151',
                  inputLabelText: '#6b7280',
                  inputPlaceholder: '#9ca3af',
                  messageText: '#6b7280',
                  messageTextDanger: '#ef4444'
                },
                fonts: {
                  bodyFont: 'var(--font-main)',
                  buttonFont: 'var(--font-main)',
                  labelFont: 'var(--font-main)',
                },
                radii: {
                  borderRadiusButton: 'var(--radius-md)',
                  inputBorderRadius: 'var(--radius-md)',
                },
                space: {
                  spaceSmall: '4px',
                  spaceMedium: '8px',
                  spaceLarge: '16px',
                },
              },
            },
          }}
          providers={[]}
          socialLayout="horizontal"
          onlyThirdPartyProviders={false}
          view="sign_in"
          redirectTo="/dashboard"
        />
        <div className="text-center text-sm mt-8">
          <span className="text-text-secondary">Don&apos;t have an account? </span>
          <Link href="/signup" className="font-medium text-accent-blue hover:underline hover:text-accent-blue-hover transition-colors">
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
