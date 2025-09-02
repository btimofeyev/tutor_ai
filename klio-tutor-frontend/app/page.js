'use client';

import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import SimpleChatInterface from './components/tutor/SimpleChatInterface';

export default function Home() {
  const { child, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <span className="text-3xl">🎓</span>
          </div>
          <p className="text-lg text-gray-600">Loading Klio...</p>
        </div>
      </div>
    );
  }

  return child ? <SimpleChatInterface childData={child} /> : <LoginPage />;
}
