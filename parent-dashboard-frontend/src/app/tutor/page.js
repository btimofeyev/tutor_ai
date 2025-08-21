'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function TutorRedirectPage() {
  useEffect(() => {
    // Determine the tutor URL based on environment
    const tutorUrl = process.env.NEXT_PUBLIC_TUTOR_URL || 
                    (process.env.NODE_ENV === 'production' 
                      ? 'https://tutor.klioai.com' 
                      : 'http://localhost:3001');

    // Redirect after a brief delay to show the loading message
    const timer = setTimeout(() => {
      window.location.href = tutorUrl;
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-background-main text-text-primary flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-6"></div>
        
        <h1 className="text-2xl font-bold text-accent-blue mb-4">
          🎓 Launching Klio AI Tutor
        </h1>
        
        <p className="text-text-secondary mb-6">
          Taking you to the student tutor interface...
        </p>
        
        <div className="bg-background-card border border-border-subtle rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-text-primary mb-2">For Students:</h2>
          <ul className="text-sm text-text-secondary space-y-1 text-left">
            <li>• Log in with your username and PIN</li>
            <li>• Get help with homework and learning</li>
            <li>• Safe, educational AI assistance</li>
          </ul>
        </div>
        
        <div className="bg-background-card border border-border-subtle rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-text-primary mb-2">For Parents:</h2>
          <p className="text-sm text-text-secondary">
            Your child needs an active AI plan subscription to use the tutor. 
            Upgrade in your{' '}
            <Link href="/dashboard" className="text-accent-blue hover:underline">
              parent dashboard
            </Link>
            .
          </p>
        </div>

        <p className="text-xs text-text-secondary">
          If you're not redirected automatically,{' '}
          <a 
            href={process.env.NODE_ENV === 'production' ? 'https://tutor.klioai.com' : 'http://localhost:3001'} 
            className="text-accent-blue hover:underline"
          >
            click here
          </a>
        </p>
      </div>
    </main>
  );
}