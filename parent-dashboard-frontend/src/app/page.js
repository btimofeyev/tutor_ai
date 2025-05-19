'use client';
import Link from 'next/link';
import { useRef } from 'react';

export default function LandingPage() {
  const featuresRef = useRef(null);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex flex-col items-center" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* HERO PANEL */}
      <section className="flex flex-col justify-center items-center min-h-[75vh] w-full">
        <div className="max-w-2xl w-full text-center px-6 py-20"
             style={{
               background: 'rgba(255,255,255,0.72)',
               boxShadow: '0 8px 32px rgba(0,0,0,0.09)',
               borderRadius: '2rem',
               border: '1px solid #eee',
               backdropFilter: 'blur(8px)'
             }}>
          <h1 className="text-5xl font-bold mb-4 tracking-tight" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            EduNest
          </h1>
          <p className="text-lg mb-2" style={{ color: 'var(--foreground)', fontWeight: 600 }}>
            Where Family Learning Takes Flight
          </p>
          <p className="text-xl mb-8" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
            Organize, digitize, and track every lesson—your all-in-one AI-powered homeschool dashboard.<br />
            <span style={{ fontWeight: 600 }}>Fast. Private. Effortless.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Link href="/signup">
              <button className="w-full sm:w-auto px-8 py-3 rounded-xl" style={{
                background: 'var(--foreground)',
                color: 'var(--background)',
                fontWeight: 500,
                fontSize: '1.1rem',
                transition: 'all 0.18s',
                border: 'none',
                boxShadow: '0 1px 5px rgba(0,0,0,0.03)'
              }}>Get Started Free</button>
            </Link>
            <Link href="/login">
              <button className="w-full sm:w-auto px-8 py-3 rounded-xl" style={{
                background: 'var(--background)',
                color: 'var(--foreground)',
                fontWeight: 500,
                fontSize: '1.1rem',
                border: '1.5px solid var(--foreground)',
                boxShadow: '0 1px 5px rgba(0,0,0,0.02)',
                transition: 'all 0.18s'
              }}>Log In</button>
            </Link>
          </div>
          <div className="mb-6 text-xs text-gray-500" style={{ opacity: 0.9 }}>
            No credit card required. Cancel anytime.
          </div>
        </div>
        {/* Scroll Down Arrow */}
        <button
          onClick={scrollToFeatures}
          className="mt-10 animate-bounce text-gray-400 hover:text-black"
          style={{ background: 'none', border: 'none', outline: 'none', cursor: 'pointer' }}
          aria-label="Scroll down to features"
        >
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14m0 0l-6-6m6 6l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </section>

      {/* HERO IMAGE / ILLUSTRATION */}
      <section className="w-full flex justify-center mt-[-60px] mb-16">
        <img
          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
          alt="Family learning together"
          className="rounded-3xl shadow-lg border-2 border-white max-w-xl w-full"
          style={{
            objectFit: 'cover',
            height: '320px'
          }}
        />
      </section>

      {/* FEATURES SECTION */}
      <section ref={featuresRef} className="w-full max-w-5xl px-6 pb-20">
        <h2 className="text-3xl font-bold mb-12 text-center">Why EduNest?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white/80 border border-gray-100 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
            <span className="text-4xl mb-3" role="img" aria-label="Rocket">🚀</span>
            <h3 className="font-semibold text-lg mb-2">Instant AI Organization</h3>
            <p className="text-gray-600">Upload lessons and worksheets—AI instantly categorizes and structures everything for you.</p>
          </div>
          {/* Feature 2 */}
          <div className="bg-white/80 border border-gray-100 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
            <span className="text-4xl mb-3" role="img" aria-label="Family">👨‍👩‍👧‍👦</span>
            <h3 className="font-semibold text-lg mb-2">Made for Homeschool</h3>
            <p className="text-gray-600">Designed specifically for families—keep each child’s subjects, progress, and work beautifully separated.</p>
          </div>
          {/* Feature 3 */}
          <div className="bg-white/80 border border-gray-100 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center">
            <span className="text-4xl mb-3" role="img" aria-label="Shield">🔒</span>
            <h3 className="font-semibold text-lg mb-2">Private & Secure</h3>
            <p className="text-gray-600">No data sold. No ads. You control your family’s learning data, always.</p>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL / SOCIAL PROOF */}
      <section className="w-full bg-white/70 border-t border-b border-gray-200 py-12 mb-16">
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          <div className="mb-4 text-lg font-semibold text-gray-700">
            <span className="text-green-500">★</span> Trusted by families nationwide <span className="text-green-500">★</span>
          </div>
          <blockquote className="italic text-center text-gray-700">
            "EduNest has transformed our homeschooling. Everything is organized, and the AI makes lesson planning a breeze!"
          </blockquote>
          <div className="mt-2 text-xs text-gray-500">— Sarah L., Homeschool Parent</div>
        </div>
      </section>

      {/* FAQ / BENEFITS SECTION */}
      <section className="w-full max-w-5xl px-6 pb-32">
        <h3 className="text-2xl font-bold mb-8 text-center">Frequently Asked</h3>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold mb-2">Do I need any technical skills?</h4>
            <p className="text-gray-600 mb-4">Nope! EduNest is built to be simple and intuitive for busy parents.</p>
            <h4 className="font-semibold mb-2">Can I add multiple children?</h4>
            <p className="text-gray-600">Yes! Each child gets their own subjects and lesson tracking.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">What happens to my data?</h4>
            <p className="text-gray-600 mb-4">Your content stays private—never sold, never shared. Delete anytime.</p>
            <h4 className="font-semibold mb-2">How much does it cost?</h4>
            <p className="text-gray-600">Start free! Upgrade only if you need extra features or storage.</p>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION FOOTER */}
      <footer className="w-full py-8 flex flex-col items-center bg-white/60 border-t border-gray-200">
        <h3 className="text-xl font-semibold mb-2">Ready to take flight?</h3>
        <Link href="/signup">
          <button className="px-8 py-3 rounded-xl bg-black text-white font-medium text-lg shadow hover:bg-gray-900 transition">
            Start Free Now
          </button>
        </Link>
        <div className="mt-4 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} EduNest. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
