'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  }, []);

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
    if (pin.length < 6) {
      setPin(prevPin => prevPin + digit);
    }
  };

  const handlePinDelete = () => {
    setPin(prevPin => prevPin.slice(0, -1));
  };

  const attemptLogin = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits.');
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-slate-800">
        <div className="card-base max-w-md text-center">
          <FiCheckCircle className="text-6xl md:text-7xl text-green-500 mx-auto mb-6 animate-pulse-soft" />
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">Welcome, {welcomeName}!</h1>
          <p className="text-slate-600 text-lg mt-1 mb-6">Your Klio space is loading...</p>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div className="bg-purple-600 h-2.5 rounded-full animate-progress-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-slate-700">
      <div className="card-base max-w-sm"> {/* max-w-sm for a more compact login form */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-600 mb-1">Klio</h1>
          <p className="text-slate-500 text-base">Focus. Learn. Achieve.</p>
        </header>

        {!showPinPad ? (
          <form onSubmit={handleUsernameSubmit} className="space-y-5">
            <div>
              <label className="label-base">
                <FiGrid className="label-icon" /> Profile Icon
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
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500
                      ${avatar.color}
                      ${selectedAvatar?.id === avatar.id 
                        ? 'ring-2 ring-offset-white ring-purple-600 scale-110 shadow-md' 
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
              <label htmlFor="username" className="label-base">
                <FiUser className="label-icon" /> Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-base"
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
                className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 focus:ring-offset-1"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-slate-600 select-none cursor-pointer">
                Remember me
              </label>
            </div>
            
            {error && (
              <div className="error-message-box">
                <FiXCircle className="error-message-icon" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
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
              <p className="text-sm text-slate-500">Signing in as</p>
              <p className="text-lg font-semibold text-slate-800">{username}</p>
            </div>
            
            <div>
              <label className="label-base justify-center text-center"> {/* Centered label */}
                <FiKey className="label-icon" /> Enter PIN
              </label>
              <div className="flex justify-center space-x-1.5 sm:space-x-2 mb-3"> {/* Reduced mb */}
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-9 h-11 sm:w-10 sm:h-12 border-2 rounded-md flex items-center justify-center transition-all duration-100
                      ${pin.length > i ? 'bg-purple-500 border-purple-600' : 'bg-slate-100 border-slate-300'}
                      ${error && pin.length === i && i < pin.length /* Only if dot is filled */ ? 'border-red-500 animate-shake-short' : ''} 
                    `}
                  >
                    {pin.length > i && (
                      <span className="text-white text-2xl mt-[-4px]">•</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="error-message-box">
                <FiXCircle className="error-message-icon" />
                <span>{error}</span>
              </div>
            )}
            
            <div id="pin-pad" className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinInput(digit.toString())}
                  disabled={loading || pin.length >= 6}
                  className="btn-pinpad"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackToUsername}
                disabled={loading}
                className="btn-pinpad text-sm font-medium text-slate-600 flex items-center justify-center"
              >
                <FiArrowLeft className="mr-1 text-base" /> Back
              </button>
              <button
                type="button"
                onClick={() => handlePinInput('0')}
                disabled={loading || pin.length >= 6}
                className="btn-pinpad"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinDelete}
                disabled={loading || pin.length === 0}
                className="btn-pinpad text-xl font-medium text-slate-600"
              >
                ⌫
              </button>
            </div>
            
            <button
              type="button"
              onClick={attemptLogin}
              disabled={loading || pin.length < 4 || pin.length > 6}
              className="btn-primary w-full mt-1" // Reduced mt
            >
              {loading ? <FiLoader className="animate-spin mr-2" /> : <FiLogIn className="mr-2" />}
              Sign In
            </button>
          </div>
        )}
      </div>
      <footer className="text-center mt-6 sm:mt-8 text-xs text-slate-500">
        © {new Date().getFullYear()} Klio AI. Unlock Your Potential.
      </footer>
    </div>
  );
}