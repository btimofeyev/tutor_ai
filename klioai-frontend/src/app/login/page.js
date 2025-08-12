'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiUser,
  FiArrowLeft,
  FiLogIn,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiGrid,
  FiKey,
  FiArrowRight // For next button
} from 'react-icons/fi';

const AVATARS = [
  { id: 1, emoji: '🦁', color: 'bg-yellow-400' },
  { id: 2, emoji: '🐘', color: 'bg-neutral-400' },
  { id: 3, emoji: '🦊', color: 'bg-orange-400' },
  { id: 4, emoji: '🐼', color: 'bg-purple-400' },
  { id: 5, emoji: '🦋', color: 'bg-pink-400' },
  { id: 6, emoji: '🐢', color: 'bg-green-400' },
  { id: 7, emoji: '🦉', color: 'bg-sky-400' },
  { id: 8, emoji: '🐙', color: 'bg-indigo-500' },
];

export default function KlioLoginPage() {
  const router = useRouter();
  const { refreshAuthState, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPinPad, setShowPinPad] = useState(false);
  const [rememberUsername, setRememberUsername] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      router.push('/chat');
      return;
    }

    const savedUsername = localStorage.getItem('klio_username');
    const savedAvatarData = localStorage.getItem('klio_avatar');

    if (savedUsername) {
      setUsername(savedUsername);
      setRememberUsername(true);
      if (savedAvatarData) {
        try {
          const parsedAvatar = JSON.parse(savedAvatarData);
          setSelectedAvatar(parsedAvatar);
          setShowPinPad(true);
        } catch (e) {
          console.error("Failed to parse saved avatar:", e);
          localStorage.removeItem('klio_avatar'); // Clear corrupted data
        }
      }
    } else if (savedAvatarData) {
      try {
        const parsedAvatar = JSON.parse(savedAvatarData);
        setSelectedAvatar(parsedAvatar);
      } catch (e) {
        console.error("Failed to parse saved avatar:", e);
        localStorage.removeItem('klio_avatar');
      }
    }
  }, [isAuthenticated, router]);

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }
    if (!selectedAvatar) {
      setError('Please select a profile icon.');
      return;
    }
    setError('');
    setShowPinPad(true);

    if (rememberUsername) {
      localStorage.setItem('klio_username', username);
      localStorage.setItem('klio_avatar', JSON.stringify(selectedAvatar));
    } else {
      localStorage.removeItem('klio_username');
      localStorage.removeItem('klio_avatar');
    }
  };

  const handlePinInput = (digit) => {
    if (pin.length < 4) {
      setPin(prevPin => prevPin + digit);
    }
  };

  const handlePinDelete = () => {
    setPin(prevPin => prevPin.slice(0, -1));
  };

  const attemptLogin = async () => {
    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    await processLogin(pin);
  };

  const processLogin = async (pinToUse) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/child/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.toLowerCase(), pin: pinToUse }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed. Please check your PIN and try again.');
      }

      localStorage.setItem('klio_access_token', data.tokens.accessToken);
      localStorage.setItem('klio_refresh_token', data.tokens.refreshToken);
      localStorage.setItem('klio_session_id', data.sessionId);
      localStorage.setItem('klio_child', JSON.stringify(data.child));

      // Refresh auth state to pick up the new tokens
      refreshAuthState();

      setWelcomeName(data.child.name || username); // Use username as fallback
      setShowSuccess(true);

      setTimeout(() => {
        router.push('/chat');
      }, 2500);

    } catch (err) {
      setError(err.message);
      setPin(''); // Clear PIN on error
      const pinPadEl = document.getElementById('pin-pad-container');
      if (pinPadEl) {
        pinPadEl.classList.remove('shake'); // remove first to re-trigger
        void pinPadEl.offsetWidth; // trigger reflow
        pinPadEl.classList.add('shake');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToUsername = () => {
    setShowPinPad(false);
    setPin('');
    setError('');
    // Don't clear username or avatar if user just wants to go back
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--background-main)]">
        <div className="bg-[var(--background-card)] p-8 rounded-[var(--radius-xl)] shadow-lg border border-[var(--border-subtle)] max-w-md text-center">
          <FiCheckCircle className="text-6xl md:text-7xl text-[var(--accent-green)] mx-auto mb-6 animate-pulse" />
          <h1 className="text-2xl md:text-3xl font-semibold mb-2 text-[var(--text-primary)]">Welcome, {welcomeName}!</h1>
          <p className="text-[var(--text-secondary)] text-lg mt-1 mb-6">Your Klio space is loading...</p>
          <div className="w-full bg-[var(--border-subtle)] rounded-full h-2.5 overflow-hidden">
            <div className="bg-[var(--accent-blue)] h-2.5 rounded-full animate-progress-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--background-main)]">
      <div className="bg-[var(--background-card)] p-8 rounded-[var(--radius-xl)] shadow-lg border border-[var(--border-subtle)] w-full max-w-sm"> {/* Using design system */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--accent-blue)] mb-1" style={{color: '#3B82F6'}}>Klio</h1>
          <p className="text-[var(--text-secondary)] text-base">Focus. Learn. Achieve.</p>
        </header>

        {!showPinPad ? (
          <form onSubmit={handleUsernameSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3 flex items-center">
                <FiGrid className="mr-2 text-[var(--text-secondary)]" /> Profile Icon
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar)}
                    title={avatar.emoji}
                    className={`
                      w-full aspect-square rounded-full flex items-center justify-center text-3xl
                      transition-all duration-150 ease-in-out cursor-pointer
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent-blue)]
                      ${avatar.color}
                      ${selectedAvatar?.id === avatar.id
                        ? 'ring-2 ring-offset-white ring-[var(--accent-blue)] scale-110 shadow-md'
                        : 'hover:scale-105 hover:shadow-sm'
                      }
                    `}
                  >
                    {avatar.emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[var(--text-primary)] mb-2 flex items-center">
                <FiUser className="mr-2 text-[var(--text-secondary)]" /> Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-input)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] bg-[var(--background-card)] text-[var(--text-primary)]"
                placeholder="Your unique username"
                autoComplete="username"
                autoCapitalize="off"
                required
              />
            </div>

            <div className="flex items-center pt-1">
              <input
                id="remember"
                type="checkbox"
                checked={rememberUsername}
                onChange={(e) => setRememberUsername(e.target.checked)}
                className="w-4 h-4 text-[var(--accent-blue)] border-[var(--border-input)] rounded focus:ring-[var(--accent-blue)] focus:ring-offset-1"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-[var(--text-secondary)] select-none cursor-pointer">
                Remember me
              </label>
            </div>

            {error && (
              <div className="flex items-center p-3 bg-[var(--accent-red)]/20 border border-[var(--accent-red)] rounded-[var(--radius-md)] text-[var(--text-primary)]">
                <FiXCircle className="mr-2 text-[var(--accent-red)] flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-[var(--radius-md)] text-[var(--text-primary)] font-medium transition-colors duration-150"
            >
              {loading ? <FiLoader className="animate-spin mr-2" /> : <FiArrowRight className="mr-1.5" />}
              Next
            </button>
          </form>
        ) : (
          <div id="pin-pad-container" className="space-y-5">
            <div className="flex flex-col items-center text-center">
              {selectedAvatar && (
                <div className={`${selectedAvatar.color} w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-2.5 shadow-sm`}>
                  {selectedAvatar.emoji}
                </div>
              )}
              <p className="text-sm text-[var(--text-secondary)]">Signing in as</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{username}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3 text-center flex items-center justify-center">
                <FiKey className="mr-2 text-[var(--text-secondary)]" /> Enter 4-Digit PIN
              </label>
              <div className="flex justify-center space-x-2 sm:space-x-3 mb-3"> {/* Larger spacing for 4 digits */}
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-12 h-14 sm:w-14 sm:h-16 border-2 rounded-lg flex items-center justify-center transition-all duration-150
                      ${pin.length > i ? 'bg-[var(--accent-blue)] border-[var(--accent-blue)]' : 'bg-[var(--background-card)] border-[var(--border-subtle)]'}
                      ${error && pin.length === i && i < pin.length ? 'border-red-500 animate-shake-short' : ''}
                    `}
                  >
                    {pin.length > i && (
                      <span className="text-white text-3xl mt-[-2px]">•</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center p-3 bg-[var(--accent-red)]/20 border border-[var(--accent-red)] rounded-[var(--radius-md)] text-[var(--text-primary)]">
                <FiXCircle className="mr-2 text-[var(--accent-red)] flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div id="pin-pad" className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinInput(digit.toString())}
                  disabled={loading || pin.length >= 4}
                  className="h-12 w-full bg-[var(--background-card)] border border-[var(--border-subtle)] hover:bg-[var(--accent-blue)]/20 hover:border-[var(--accent-blue)] disabled:opacity-50 disabled:cursor-not-allowed rounded-[var(--radius-md)] text-[var(--text-primary)] font-medium text-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackToUsername}
                disabled={loading}
                className="h-12 w-full bg-[var(--background-card)] border border-[var(--border-subtle)] hover:bg-[var(--accent-blue)]/20 hover:border-[var(--accent-blue)] disabled:opacity-50 disabled:cursor-not-allowed rounded-[var(--radius-md)] text-[var(--text-secondary)] font-medium text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] flex items-center justify-center"
              >
                <FiArrowLeft className="mr-1 text-base" /> Back
              </button>
              <button
                type="button"
                onClick={() => handlePinInput('0')}
                disabled={loading || pin.length >= 4}
                className="h-12 w-full bg-[var(--background-card)] border border-[var(--border-subtle)] hover:bg-[var(--accent-blue)]/20 hover:border-[var(--accent-blue)] disabled:opacity-50 disabled:cursor-not-allowed rounded-[var(--radius-md)] text-[var(--text-primary)] font-medium text-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinDelete}
                disabled={loading || pin.length === 0}
                className="h-12 w-full bg-[var(--background-card)] border border-[var(--border-subtle)] hover:bg-[var(--accent-red)]/20 hover:border-[var(--accent-red)] disabled:opacity-50 disabled:cursor-not-allowed rounded-[var(--radius-md)] text-[var(--text-secondary)] font-medium text-xl transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
              >
                ⌫
              </button>
            </div>

            <button
              type="button"
              onClick={attemptLogin}
              disabled={loading || pin.length !== 4}
              className="w-full flex items-center justify-center px-4 py-3 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-[var(--radius-md)] text-[var(--text-primary)] font-medium transition-colors duration-150 mt-1"
            >
              {loading ? <FiLoader className="animate-spin mr-2" /> : <FiLogIn className="mr-2" />}
              Sign In
            </button>
          </div>
        )}
      </div>
      <footer className="text-center mt-6 sm:mt-8 text-xs text-[var(--text-tertiary)]">
        © {new Date().getFullYear()} Klio AI. Unlock Your Potential.
      </footer>
    </div>
  );
}
