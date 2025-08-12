// ===================================
// klioai-frontend/src/app/settings/page.js (Basic settings page)
// ===================================

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsPage() {
  const router = useRouter();
  const { child, logout } = useAuth();
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [textSize, setTextSize] = useState('medium');

  useEffect(() => {
    // Load settings from localStorage
    const savedAutoSpeak = localStorage.getItem('klio_auto_speak');
    const savedTextSize = localStorage.getItem('klio_text_size');

    if (savedAutoSpeak !== null) {
      setAutoSpeak(savedAutoSpeak !== 'false');
    }
    if (savedTextSize) {
      setTextSize(savedTextSize);
    }
  }, []);

  const handleAutoSpeakToggle = () => {
    const newValue = !autoSpeak;
    setAutoSpeak(newValue);
    localStorage.setItem('klio_auto_speak', newValue.toString());
  };

  const handleTextSizeChange = (size) => {
    setTextSize(size);
    localStorage.setItem('klio_text_size', size);
    // You can implement actual text size changes in your app
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await logout();
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
              <button
                onClick={() => router.push('/chat')}
                className="text-4xl hover:scale-110 transition-transform"
              >
                ❌
              </button>
            </div>

            <div className="space-y-6">
              {/* Voice Settings */}
              <div className="border-b pb-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">🔊 Voice Settings</h2>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-read Klio&apos;s messages</p>
                    <p className="text-sm text-gray-600">Klio will speak automatically</p>
                  </div>
                  <button
                    onClick={handleAutoSpeakToggle}
                    className={`w-16 h-8 rounded-full transition-colors ${
                      autoSpeak ? 'bg-purple-500' : 'bg-gray-300'
                    } relative`}
                  >
                    <motion.div
                      animate={{ x: autoSpeak ? 32 : 0 }}
                      className="absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full shadow"
                    />
                  </button>
                </div>
              </div>

              {/* Display Settings */}
              <div className="border-b pb-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">👀 Display Settings</h2>

                <p className="font-medium mb-3">Text Size</p>
                <div className="flex gap-3">
                  {['small', 'medium', 'large'].map((size) => (
                    <button
                      key={size}
                      onClick={() => handleTextSizeChange(size)}
                      className={`px-4 py-2 rounded-lg capitalize ${
                        textSize === size
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* About */}
              <div className="border-b pb-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">ℹ️ About</h2>
                <p className="text-gray-600">
                  Hi {child?.name}! I&apos;m Klio, your AI learning friend. I&apos;m here to help you learn
                  and have fun! Version 1.0 🎉
                </p>
              </div>

              {/* Account Actions */}
              <div>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">👤 Account</h2>
                <button
                  onClick={handleLogout}
                  className="w-full sm:w-auto px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  🚪 Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
