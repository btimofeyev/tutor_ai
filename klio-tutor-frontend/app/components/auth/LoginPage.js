'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Pin pad functions
  const handlePinInput = (digit) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClearPin = () => {
    setPin('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim()) {
      setError('Please enter your username');
      setLoading(false);
      return;
    }

    if (pin.length !== 4) {
      setError('Please enter your complete 4-digit PIN');
      setLoading(false);
      return;
    }

    const result = await login(username.trim(), pin);
    
    if (!result.success) {
      setError(result.error || 'Login failed. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-md max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Image
            src="/klio_logo.png"
            alt="Klio AI Logo"
            width={64}
            height={64}
            className="mx-auto mb-3"
            priority
          />
          <h1 className="text-3xl font-bold text-[#4A4A4A] mb-2 font-fredoka">
            Klio AI Tutor
          </h1>
          <p className="text-base text-[#7A7A7A] mb-3">
            Your personal learning companion
          </p>
          
          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/80 rounded-xl p-3 text-center shadow-sm border border-[#7FB069]/20">
              <div className="text-2xl mb-1">📚</div>
              <p className="text-xs text-[#7A7A7A] font-medium">Get Homework Help</p>
            </div>
            <div className="bg-white/80 rounded-xl p-3 text-center shadow-sm border border-[#7FB069]/20">
              <div className="text-2xl mb-1">🤔</div>
              <p className="text-xs text-[#7A7A7A] font-medium">Learn by Thinking</p>
            </div>
            <div className="bg-white/80 rounded-xl p-3 text-center shadow-sm border border-[#7FB069]/20">
              <div className="text-2xl mb-1">🔒</div>
              <p className="text-xs text-[#7A7A7A] font-medium">Safe & Educational</p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white/90 rounded-2xl border border-[#D4CAC4] p-6 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#4A4A4A] mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-base"
                placeholder="Enter your username"
                disabled={loading}
                autoComplete="username"
              />
            </div>

            {/* PIN Field with Pin Pad */}
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-2">
                PIN
              </label>
              
              {/* PIN Display */}
              <div className="mb-4 p-4 bg-[#F0F8ED] rounded-xl border border-[#7FB069]/30 shadow-sm">
                <div className="flex justify-center space-x-3">
                  {[...Array(4)].map((_, index) => (
                    <div
                      key={index}
                      className={`w-5 h-5 rounded-full border-2 transition-colors ${
                        index < pin.length
                          ? 'bg-[#7FB069] border-[#7FB069]'
                          : 'bg-white border-[#D4CAC4]'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-[#8A8A8A] mt-2">
                  Enter your {pin.length > 0 ? `${4 - pin.length} more` : '4'} digit PIN
                </p>
              </div>

              {/* Pin Pad */}
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() => handlePinInput(number.toString())}
                    disabled={loading || pin.length >= 4}
                    className="w-16 h-16 bg-white border-2 border-[#D4CAC4] rounded-xl text-xl font-bold text-[#4A4A4A] hover:bg-[#F0F8ED] hover:border-[#7FB069] active:bg-[#E8F5E0] transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-sm flex items-center justify-center"
                  >
                    {number}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClearPin}
                  disabled={loading || pin.length === 0}
                  className="w-16 h-16 bg-[#FCE8E6] border-2 border-[#E88873]/30 rounded-xl text-xs font-bold text-[#E88873] hover:bg-[#F8D7D4] hover:border-[#E88873] active:bg-[#F4C2BC] transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-sm flex items-center justify-center"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handlePinInput('0')}
                  disabled={loading || pin.length >= 4}
                  className="w-16 h-16 bg-white border-2 border-gray-200 rounded-xl text-xl font-bold text-gray-800 hover:bg-blue-50 hover:border-blue-300 active:bg-blue-100 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-sm flex items-center justify-center"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  disabled={loading || pin.length === 0}
                  className="w-16 h-16 bg-[#FFF8E1] border-2 border-[#F4D06F]/30 rounded-xl text-lg font-bold text-[#D4A827] hover:bg-[#FFF4CC] hover:border-[#F4D06F] active:bg-[#FFEFB5] transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-sm flex items-center justify-center"
                >
                  ⌫
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-[#FCE8E6] border border-[#E88873]/30 rounded-xl p-3">
                <p className="text-[#D6776B] text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !username.trim() || pin.length !== 4}
              className="w-full btn-primary px-4 py-3 text-lg font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {loading ? (
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                'Start Learning!'
              )}
            </button>
          </form>
        </div>

        {/* Help Text */}
        <div className="text-center mt-4 space-y-2">
          <p className="text-sm text-[#8A8A8A]">
            Need help? Ask your parent for your username and PIN.
          </p>
          <div className="bg-white/80 rounded-xl p-3 text-left shadow-sm border border-[#D4CAC4]">
            <h3 className="font-semibold text-[#4A4A4A] text-xs mb-1">For Parents:</h3>
            <p className="text-xs text-[#7A7A7A] mb-1">
              Manage accounts at{' '}
              <a href={process.env.NODE_ENV === 'production' ? 'https://klioai.com' : 'http://localhost:3000'} 
                 className="text-[#7FB069] hover:underline font-medium">
                klioai.com
              </a>
            </p>
            <p className="text-xs text-[#8A8A8A]">
              💡 AI plan subscription required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}