'use client';
import React from 'react';
import Image from 'next/image';
import { useRef } from 'react';
import { ArrowDownCircleIcon, SparklesIcon, UserGroupIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';

export default function LandingPage() {
  const featuresRef = useRef(null);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    {
      icon: <SparklesIcon className="text-[var(--accent-blue)]" />,
      title: "Transform Piles into Plans",
      desc: "Snap a photo or upload any document. Klio AI intelligently analyzes, structures, and categorizes your materials, turning raw content into ready-to-use lessons and assignments in seconds.",
    },
    {
      icon: <UserGroupIcon className="text-[var(--accent-yellow)]" />,
      title: "Orchestrate Learning, Child by Child",
      desc: "Design bespoke learning paths with custom subjects and units. Klio AI provides a clear, organized view of each child's progress, upcoming work, and achievements.",
    },
    {
      icon: <ShieldCheckIcon className="text-[var(--accent-blue)]" />,
      title: "Your Family's Journey, Securely Yours",
      desc: "Klio AI is built on a foundation of privacy, ensuring your family's learning remains confidential and under your control. No ads, no data selling. Ever.",
    }
  ];

  const FeatureCard = ({ icon, title, children }) => (
    <div className="card p-6 text-center flex flex-col items-center">
      <div className="mb-4 flex items-center justify-center w-12 h-12 bg-white rounded-full border border-border-subtle">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{children}</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-background-main text-text-primary flex flex-col items-center">
      {/* HERO PANEL */}
      <section className="flex flex-col justify-center items-center w-full py-20 md:py-32 px-4 animate-fade-in">
        {/* LOGO */}
        <Image
          src="/klio_logo.png"
          alt="Klio AI Logo"
          width={96}
          height={96}
          className="mb-6"
          priority
        />
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            Craft Your Homeschool Journey with <span className="text-highlight-yellow"><span className="text-accent-primary-text">Klio AI.</span></span>
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary mb-8 max-w-xl mx-auto">
            The intelligent platform that <span className="text-highlight-blue">simplifies planning</span>, digitizes materials, and illuminates your child's learning path.
          </p>
          <p className="text-md text-text-secondary mb-10 max-w-lg mx-auto">
            Stop juggling spreadsheets and scattered notes. Klio AI brings calm and clarity to your homeschool. Spend less time managing, <span className="font-medium text-text-primary">more time inspiring.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center mb-6">
            <Button href="/signup" as="link" className="btn-primary text-lg px-7 py-3">
              Get Started Free
            </Button>
            <Button href="/login" as="link" className="btn-secondary text-lg px-7 py-3">
              Log In
            </Button>
          </div>
          <p className="text-xs text-text-tertiary">
            No credit card required.
          </p>
        </div>
        <button
          onClick={scrollToFeatures}
          className="mt-16 text-text-tertiary hover:text-accent-dark transition-colors"
          aria-label="Scroll down to features"
        >
          <ArrowDownCircleIcon className="h-10 w-10 animate-bounce" />
        </button>
      </section>

      {/* HERO IMAGE SECTION */}
      <section className="w-full flex justify-center mb-16 md:mb-24 px-4">
        <div className="max-w-4xl w-full bg-transparent p-0">
          <img
            src="/klio-dashboard-mockup-light.png"
            alt="Klio AI Dashboard Preview"
            className="rounded-lg object-contain w-full h-auto max-h-[400px] md:max-h-[550px] shadow-xl border border-border-subtle"
          />
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section ref={featuresRef} className="w-full max-w-5xl px-4 pb-20 md:pb-32">
        <h2 className="text-3xl font-bold mb-12 text-center text-text-primary">
          Intelligent Homeschooling, <span className="text-highlight-blue">Effortlessly Orchestrated.</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {features.map((f) => (
            <FeatureCard
              key={f.title}
              icon={f.icon}
              title={f.title}
            >
              {f.desc}
            </FeatureCard>
          ))}
        </div>
      </section>

      {/* TESTIMONIAL SECTION */}
      <section className="w-full py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-xl md:text-2xl text-text-primary italic leading-relaxed">
            "Klio AI has transformed our homeschooling. Everything is organized, and the AI makes lesson planning a breeze! It feels like I have a <span className="text-highlight-blue">super-efficient assistant.</span>"
          </p>
          <p className="mt-4 text-sm text-text-tertiary">— Sarah L., Homeschool Parent</p>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="w-full max-w-5xl px-4 py-20 md:py-32">
        <h3 className="text-3xl font-bold mb-12 text-center text-text-primary">Unlock Effortless Homeschooling</h3>
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-8">
          <div>
            <h4 className="font-medium text-lg text-text-primary mb-1.5">Do I need any technical skills?</h4>
            <p className="text-sm text-text-secondary leading-relaxed">Not at all. Klio AI is designed for simplicity and intuitive use, even if you're not tech-savvy.</p>
          </div>
          <div>
            <h4 className="font-medium text-lg text-text-primary mb-1.5">Can I add multiple children?</h4>
            <p className="text-sm text-text-secondary leading-relaxed">Absolutely. Each child gets their own personalized dashboard, subjects, and progress tracking.</p>
          </div>
          <div>
            <h4 className="font-medium text-lg text-text-primary mb-1.5">What about my existing curriculum?</h4>
            <p className="text-sm text-text-secondary leading-relaxed">Bring it on! Upload PDFs, images, or even text files. Klio AI helps you digitize and organize it all.</p>
          </div>
          <div>
            <h4 className="font-medium text-lg text-text-primary mb-1.5">Is there a trial period?</h4>
            <p className="text-sm text-text-secondary leading-relaxed">You can start with our free plan to explore core features. Upgrade when you're ready for more.</p>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION FOOTER */}
      <footer className="w-full py-12 md:py-16 flex flex-col items-center bg-background-card border-t border-border-subtle">
        <div className="text-center px-4">
          <h3 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
            Ready to simplify your homeschool?
          </h3>
          <p className="text-md text-text-secondary mb-8 max-w-md mx-auto">
            Join Klio AI today and experience the future of <span className="text-highlight-yellow">personalized family learning.</span>
          </p>
          <Button href="/signup" as="link" className="btn-primary font-semibold text-lg px-7 py-3">
            Sign Up for Free
          </Button>
          <div className="mt-8 text-xs text-text-tertiary">
            © {new Date().getFullYear()} Klio AI. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
