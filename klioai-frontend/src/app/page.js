// klioai-frontend/src/app/page.js (or HomePage.js if that's its location)
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext'; // Assuming path is correct
import Link from 'next/link';
import Image from 'next/image'; // For Klio Logo

// You can define a custom bounce animation in globals.css or use Tailwind's if sufficient
// For a more gentle bounce than Tailwind's default:
// @keyframes bounce-gentle {
//   0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
//   50% { transform: translateY(0); animation-timing-function: cubic-bezier(0,0,0.2,1); }
// }
// .animate-bounce-gentle { animation: bounce-gentle 1.5s infinite; }

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/chat'); // Or '/dashboard' if that's the primary authenticated route
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-main)]">
        {/* Themed loading dots */}
        <div className="loading-dots text-4xl text-[var(--accent-blue)]">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--background-main)] text-[var(--text-primary)]">
      <div className="text-center">
        {/* Klio Logo */}
        <div className="mb-8 inline-block animate-bounce-gentle"> {/* Reusing bounce animation class */}
          <Image
            src="/klio_logo.png"
            alt="Klio AI Logo"
            width={128} // Adjust size as needed for a prominent display
            height={128}
            priority
          />
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold mb-4">
          Hi! I&apos;m <span className="text-[var(--accent-blue)]">Klio</span>
        </h1>

        <p className="text-xl sm:text-2xl text-[var(--text-secondary)] mb-10">
          Your AI Learning Friend
        </p>

        <div>
          {/*
            Assuming your global Button component is set up to use .btn-primary styles
            If not, the direct class approach below works.
          */}
          <Link href="/login" className="inline-block">
            {/* Using Button component is preferred if available and themed */}
            {/* <Button variant="primary" size="lg" className="text-xl sm:text-2xl px-10 sm:px-12 py-5 sm:py-6">
                Let&apos;s Learn! 🎯
            </Button> */}
            <button
              className="btn-primary text-xl sm:text-2xl px-10 sm:px-12 py-5 sm:py-6 rounded-[var(--radius-lg)]"
              // Add 3D effect classes if Button component usually adds them and you want them here:
              // style={{
              //   borderBottom: `4px solid var(--accent-blue-darker-for-border)`,
              //   boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              // }}
              // onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
              // onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Let&apos;s Learn! 🎯
            </button>
          </Link>
        </div>

        {/* Optional: Themed Emojis or Icons */}
        <div className="mt-16 flex gap-6 sm:gap-8 text-5xl sm:text-6xl">
          {/* Replace emojis with themed icons if desired, or keep emojis if they fit the 'fun' aspect */}
          {/* Example with themed icons (requires react-icons or similar) */}
          {/* <FiBookOpen className="text-[var(--accent-yellow)] animate-bounce-gentle" style={{ animationDelay: '0s' }} /> */}
          {/* <FiPalette className="text-[var(--accent-blue)] animate-bounce-gentle" style={{ animationDelay: '0.2s' }} /> */}
          {/* <FiPercent className="text-[var(--accent-green)] animate-bounce-gentle" style={{ animationDelay: '0.4s' }} /> */}
          {/* <FiStar className="text-[var(--accent-orange)] animate-bounce-gentle" style={{ animationDelay: '0.6s' }} /> */}

          {/* Keeping original emojis for now as they are inherently colorful and fun */}
          <span className="animate-bounce-gentle" style={{ animationDelay: '0s' }}>📚</span>
          <span className="animate-bounce-gentle" style={{ animationDelay: '0.2s' }}>🎨</span>
          <span className="animate-bounce-gentle" style={{ animationDelay: '0.4s' }}>🧮</span>
          <span className="animate-bounce-gentle" style={{ animationDelay: '0.6s' }}>🌟</span>
        </div>
      </div>
    </div>
  );
}
