// parent-dashboard-frontend/src/app/page.js
'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRef } from 'react';
import { ArrowDownCircleIcon, SparklesIcon, UserGroupIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import Link from 'next/link';

export default function LandingPage() {
  const featuresRef = useRef(null);
  const [currentYear, setCurrentYear] = useState('');

  // Set current year on client side to avoid hydration mismatch
  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

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
      {/* HEADER WITH NAVIGATION */}
      <header className="w-full border-b border-border-subtle bg-background-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/klio_logo.png"
                alt="Klio AI Logo"
                width={32}
                height={32}
                className="mr-2"
                priority
              />
              <span className="text-2xl font-bold text-accent-blue">Klio AI</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/pricing" className="text-text-secondary hover:text-text-primary font-medium transition-colors">
                Pricing
              </Link>
              <Link href="/tutor" className="text-accent-blue hover:text-accent-blue font-bold transition-colors">
                🎓 Student Tutor
              </Link>
              <Link href="/login" className="text-text-secondary hover:text-text-primary font-medium transition-colors">
                Log In
              </Link>
            </nav>
            {/* Mobile navigation */}
            <div className="md:hidden">
              <Link href="/login" className="text-text-secondary hover:text-text-primary font-medium text-sm">
                Log In
              </Link>
            </div>
          </div>
        </div>
      </header>

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
            The intelligent platform that <span className="text-highlight-blue">simplifies planning</span>, digitizes materials, and illuminates your child&apos;s learning path.
          </p>
          <p className="text-md text-text-secondary mb-10 max-w-lg mx-auto">
            Stop juggling spreadsheets and scattered notes. Klio AI brings calm and clarity to your homeschool. Spend less time managing, <span className="font-medium text-text-primary">more time inspiring.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center mb-6">
            <Button href="/signup" as="link" className="btn-primary text-lg px-7 py-3">
              Get Started Free
            </Button>
            <Button href="/pricing" as="link" className="btn-secondary text-lg px-7 py-3">
              View Pricing
            </Button>
          </div>
          <p className="text-xs text-text-tertiary">
            No credit card required. <Link href="/pricing" className="underline hover:text-text-secondary">See all plans</Link>
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
          <Image
            src="/hero_img.png"
            alt="Klio AI Dashboard Preview"
            width={800}
            height={550}
            className="rounded-lg object-contain w-full h-auto max-h-[400px] md:max-h-[550px] shadow-xl border border-border-subtle"
            priority
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

      {/* PRICING PREVIEW */}
      <section className="w-full max-w-5xl px-4 pb-20 md:pb-32">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Plans That Grow With Your Family
          </h2>
          <p className="text-lg text-text-secondary">
            Start free and add AI tutoring when you&apos;re ready
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="card p-6 text-center">
            <h3 className="text-xl font-semibold text-text-primary mb-2">Free</h3>
            <div className="text-3xl font-bold text-text-primary mb-4">$0</div>
            <p className="text-text-secondary text-sm mb-4">Perfect for getting started</p>
            <ul className="text-left space-y-2 text-sm text-text-secondary mb-6">
              <li>• 1 child account</li>
              <li>• Curriculum tracking</li>
              <li>• Progress monitoring</li>
              <li>• Grade tracking</li>
            </ul>
            <Button as="link" href="/signup" variant="secondary" className="w-full">
              Get Started
            </Button>
          </div>

          <div className="card p-6 text-center ring-2 ring-accent-blue relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent-yellow text-text-primary px-3 py-1 rounded-full text-xs font-semibold">
              Most Popular
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">Starter + AI</h3>
            <div className="text-3xl font-bold text-text-primary mb-4">$9.99<span className="text-base font-normal text-text-secondary">/mo</span></div>
            <p className="text-text-secondary text-sm mb-4">Add intelligent AI tutoring</p>
            <ul className="text-left space-y-2 text-sm text-text-secondary mb-6">
              <li>• Everything in Free</li>
              <li>• 🤖 Klio AI personal tutor</li>
              <li>• Interactive homework help</li>
              <li>• 24/7 AI availability</li>
            </ul>
            <Button as="link" href="/pricing" variant="primary" className="w-full">
              Add AI Tutoring
            </Button>
          </div>

          <div className="card p-6 text-center">
            <h3 className="text-xl font-semibold text-text-primary mb-2">Family Plan</h3>
            <div className="text-3xl font-bold text-text-primary mb-4">$19<span className="text-base font-normal text-text-secondary">/mo</span></div>
            <p className="text-text-secondary text-sm mb-4">Complete family solution</p>
            <ul className="text-left space-y-2 text-sm text-text-secondary mb-6">
              <li>• Everything in Starter + AI</li>
              <li>• Up to 3 children</li>
              <li>• Child login accounts</li>
              <li>• Advanced analytics</li>
            </ul>
            <Button as="link" href="/pricing" variant="secondary" className="w-full">
              Best Value
            </Button>
          </div>
        </div>
        <div className="text-center mt-8">
          <Button as="link" href="/pricing" variant="outline" size="lg">
            Compare All Plans & Features
          </Button>
        </div>
      </section>

      {/* TESTIMONIAL SECTION */}
      <section className="w-full py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-xl md:text-2xl text-text-primary italic leading-relaxed">
            &quot;Klio AI has transformed our homeschooling. Everything is organized, and the AI makes lesson planning a breeze! It feels like I have a <span className="text-highlight-blue">super-efficient assistant.</span>&quot;
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
            <p className="text-sm text-text-secondary leading-relaxed">Not at all. Klio AI is designed for simplicity and intuitive use, even if you&apos;re not tech-savvy.</p>
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
            <h4 className="font-medium text-lg text-text-primary mb-1.5">How does pricing work?</h4>
            <p className="text-sm text-text-secondary leading-relaxed">Start free with 1 child. Add AI tutoring for $9.99/month, or get our Family Plan for $19/month with up to 3 children. <Link href="/pricing" className="text-accent-blue hover:underline">See all plans</Link>.</p>
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/signup" as="link" className="btn-primary font-semibold text-lg px-7 py-3">
              Sign Up for Free
            </Button>
            <Button href="/pricing" as="link" className="btn-secondary font-semibold text-lg px-7 py-3">
              View Pricing
            </Button>
          </div>
          <div className="mt-8 text-xs text-text-tertiary space-x-6">
            <Link href="/pricing" className="hover:text-text-secondary">Pricing</Link>
            <span>•</span>
            <span>© {currentYear || '2024'} Klio AI. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
