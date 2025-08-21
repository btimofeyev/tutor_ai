'use client';

import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import TutorPage from './components/TutorPage';

export default function Home() {
  const { child, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-accent-blue rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-gentle">
            <span className="text-3xl">🎓</span>
          </div>
          <p className="text-lg text-gray-600 font-fredoka">Loading Klio...</p>
        </div>
      </div>
    );
  }

  return child ? <TutorPage /> : <LoginPage />;
}
