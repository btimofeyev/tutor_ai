'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/chat');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-dots text-4xl text-purple-600">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center">
        {/* Animated Robot */}
        <div className="text-9xl mb-6 inline-block animate-bounce-gentle">
          🤖
        </div>

        <h1 className="text-6xl font-bold text-gray-800 mb-4">
          Hi! I&apos;m <span className="text-purple-600">Klio</span>
        </h1>
        
        <p className="text-2xl text-gray-600 mb-8">
          Your AI Learning Friend
        </p>

        <div>
          <Link href="/login" className="inline-block">
            <button className="btn-primary text-2xl px-12 py-6">
              Let&apos;s Learn! 🎯
            </button>
          </Link>
        </div>

        <div className="mt-12 flex gap-8 text-6xl">
          <span className="animate-bounce-gentle" style={{ animationDelay: '0s' }}>📚</span>
          <span className="animate-bounce-gentle" style={{ animationDelay: '0.2s' }}>🎨</span>
          <span className="animate-bounce-gentle" style={{ animationDelay: '0.4s' }}>🧮</span>
          <span className="animate-bounce-gentle" style={{ animationDelay: '0.6s' }}>🌟</span>
        </div>
      </div>
    </div>
  );
}