'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TutorRedirectPage() {
  const [showFallback, setShowFallback] = useState(false);
  const [tutorUrl, setTutorUrl] = useState('');

  useEffect(() => {
    // Determine the tutor URL based on environment
    const url = process.env.NEXT_PUBLIC_TUTOR_URL || 
                (process.env.NODE_ENV === 'production' 
                  ? 'https://tutor.klioai.com' 
                  : 'http://localhost:3001');
    
    setTutorUrl(url);

    // Try to redirect after a brief delay
    const timer = setTimeout(() => {
      try {
        window.location.href = url;
      } catch (error) {
        console.error('Redirect failed:', error);
        setShowFallback(true);
      }
    }, 1500);

    // Show fallback after 5 seconds if redirect hasn't worked
    const fallbackTimer = setTimeout(() => {
      setShowFallback(true);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <main className="min-h-screen bg-background-main text-text-primary flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        {!showFallback ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-6"></div>
            
            <h1 className="text-2xl font-bold text-accent-blue mb-4">
              🎓 Launching Klio AI Tutor
            </h1>
            
            <p className="text-text-secondary mb-6">
              Taking you to the student tutor interface...
            </p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Tutor Not Available
            </h1>
            
            <p className="text-text-secondary mb-6">
              The student tutor interface is not currently accessible. This might be because:
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <ul className="text-sm text-red-700 space-y-2">
                <li>• The tutor service is not running</li>
                <li>• The domain is not configured</li>
                <li>• There's a network connectivity issue</li>
              </ul>
            </div>

            <div className="space-y-4">
              <a 
                href={tutorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-accent-blue text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Try Direct Link: {tutorUrl}
              </a>
              
              <div>
                <Link 
                  href="/dashboard" 
                  className="inline-block bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          </>
        )}
        
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