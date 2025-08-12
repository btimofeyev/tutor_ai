// parent-dashboard-frontend/src/app/pricing/page.js
'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  CheckIcon,
  SparklesIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ArrowRightIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/ui/Button';
import api from '../../utils/api';

const PRICE_IDS = {
  klio_addon: 'price_1RVZczD8TZAZUMMAQWokffCi',
  family: 'price_1RVZT4D8TZAZUMMA3YIJeWWE',
  academy: 'price_1RVZTrD8TZAZUMMAiUuoU72d'
};

export default function PricingPage() {
  const session = useSession();
  const router = useRouter();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState('');

  useEffect(() => {
    if (session) {
      fetchSubscriptionStatus();
    } else {
      setLoading(false);
    }
  }, [session]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await api.get('/stripe/subscription-status');
      setSubscription(response.data.subscription);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (priceId, planName) => {
    if (!session) {
      router.push('/login');
      return;
    }

    setUpgrading(planName);
    try {
      const response = await api.post('/stripe/create-checkout-session', {
        price_id: priceId,
        success_url: `${window.location.origin}/dashboard?upgraded=true`,
        cancel_url: `${window.location.origin}/pricing`
      });

      window.location.href = response.data.checkout_url;
    } catch (error) {
      alert('Failed to start upgrade process. Please try again.');
      setUpgrading('');
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await api.post('/stripe/create-portal-session');
      window.location.href = response.data.portal_url;
    } catch (error) {
      alert('Failed to access subscription management. Please try again.');
    }
  };

  const hasSubscription = subscription && subscription.status === 'active';
  const currentPlan = subscription?.plan_type;

  const plans = [
    {
      name: 'Free',
      id: 'free',
      price: '$0',
      period: 'forever',
      description: 'Basic homeschool tracking for one child',
      icon: <UserGroupIcon className="h-8 w-8" />,
      features: [
        '1 child account',
        'Curriculum tracking',
        'Grade tracking',
        'Progress monitoring',
        'File organization'
      ],
      limitations: [
        'No AI tutoring',
        'No child login accounts'
      ],
      buttonText: 'Current Plan',
      buttonAction: null,
      highlighted: false,
      available: true
    },
    {
      name: 'Klio Add-On',
      id: 'klio_addon',
      price: '$9.99',
      period: 'per month',
      description: 'Add AI tutoring and child login to your free account',
      icon: <SparklesIcon className="h-8 w-8" />,
      features: [
        'Everything in Free plan',
        '🤖 Klio AI personal tutor',
        '🔐 Child login account',
        'Interactive homework help',
        'Instant explanations',
        'Study session tracking',
        '24/7 AI availability'
      ],
      limitations: [
        'Still limited to 1 child'
      ],
      buttonText: 'Add AI Tutoring',
      buttonAction: () => handleUpgrade(PRICE_IDS.klio_addon, 'klio_addon'),
      highlighted: false,
      available: true,
      popular: true,
      isAddOn: true
    },
    {
      name: 'Family Plan',
      id: 'family',
      price: '$19',
      period: 'per month',
      description: 'Everything in Free + Klio for up to 3 children',
      icon: <UserGroupIcon className="h-8 w-8" />,
      features: [
        'Everything in Free + Klio',
        '👨‍👩‍👧‍👦 Up to 3 children',
        '🔐 Child login accounts',
        'Individual AI tutors per child',
        'Family dashboard'
      ],
      limitations: [],
      buttonText: 'Best Value',
      buttonAction: () => handleUpgrade(PRICE_IDS.family, 'family'),
      highlighted: true,
      available: true
    },
    {
      name: 'Academy',
      id: 'academy',
      price: '$39',
      period: 'per month',
      description: 'Same as Family Plan but for up to 10 children',
      icon: <AcademicCapIcon className="h-8 w-8" />,
      features: [
        'Everything in Family Plan',
        '🏫 Up to 10 children',
        'Perfect for large families',
        'Great for co-op homeschool groups'
      ],
      limitations: [],
      buttonText: 'Contact Sales',
      buttonAction: () => window.open('mailto:support@klioai.com?subject=Academy Plan Inquiry'),
      highlighted: false,
      available: true
    }
  ];

  // Update button states based on current subscription
  const updatedPlans = plans.map(plan => {
    if (!session) {
      return {
        ...plan,
        buttonText: plan.id === 'free' ? 'Sign Up Free' : plan.buttonText,
        buttonAction: plan.id === 'free' ? () => router.push('/signup') : plan.buttonAction
      };
    }

    if (!hasSubscription) {
      return {
        ...plan,
        buttonText: plan.id === 'free' ? 'Current Plan' : plan.buttonText,
        buttonAction: plan.id === 'free' ? null : plan.buttonAction
      };
    }

    // User has subscription
    if (currentPlan === plan.id) {
      return {
        ...plan,
        buttonText: 'Current Plan',
        buttonAction: null,
        highlighted: true
      };
    }

    // Check if this is an upgrade or downgrade
    const planHierarchy = ['free', 'klio_addon', 'family', 'academy'];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    const planIndex = planHierarchy.indexOf(plan.id);

    if (planIndex > currentIndex) {
      return {
        ...plan,
        buttonText: 'Upgrade',
        buttonAction: plan.buttonAction
      };
    } else if (planIndex < currentIndex) {
      return {
        ...plan,
        buttonText: 'Downgrade',
        buttonAction: plan.id === 'free' ? handleManageSubscription : plan.buttonAction
      };
    }

    return plan;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-main">
        <div className="text-xl text-text-secondary">Loading pricing...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background-main">
      {/* Header */}
      <header className="border-b border-border-subtle bg-background-card">
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
            <div className="flex items-center space-x-4">
              {session ? (
                <>
                  <Link href="/dashboard" className="text-text-secondary hover:text-text-primary">
                    Dashboard
                  </Link>
                  {hasSubscription && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManageSubscription}
                    >
                      Manage Subscription
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Link href="/login" className="text-text-secondary hover:text-text-primary">
                    Log In
                  </Link>
                  <Button as="link" href="/signup" variant="primary" size="sm">
                    Sign Up Free
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-6">
            Choose Your Perfect <span className="text-highlight-blue">Homeschool Plan</span>
          </h1>
          <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
            From free curriculum tracking to AI-powered tutoring, find the plan that grows with your family.
          </p>
          {hasSubscription && (
            <div className="inline-flex items-center px-4 py-2 bg-green-50 text-green-800 rounded-lg border border-green-200 mb-8">
              <CheckIcon className="h-5 w-5 mr-2" />
              Currently on {plans.find(p => p.id === currentPlan)?.name || 'Unknown'} Plan
            </div>
          )}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {updatedPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative card p-6 flex flex-col transition-all duration-200 hover:shadow-lg ${
                  plan.highlighted
                    ? 'ring-2 ring-accent-blue shadow-lg scale-105'
                    : ''
                }`}
              >
                {plan.isAddOn && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-accent-blue text-text-primary px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                      <SparklesIcon className="h-3 w-3 mr-1" />
                      Add-On Pack
                    </div>
                  </div>
                )}
                {plan.popular && !plan.isAddOn && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-accent-yellow text-text-primary px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                      <StarIcon className="h-3 w-3 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-blue rounded-full mb-4 text-text-primary">
                    {plan.icon}
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-text-primary">{plan.price}</span>
                    {plan.period && (
                      <span className="text-text-secondary ml-1">/{plan.period}</span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">{plan.description}</p>
                </div>

                <div className="flex-grow mb-6">
                  <h4 className="font-semibold text-text-primary mb-3">Features included:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <CheckIcon className="h-4 w-4 text-accent-green mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-text-secondary">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.limitations.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-xs font-medium text-text-tertiary mb-2">Limitations:</h5>
                      <ul className="space-y-1">
                        {plan.limitations.map((limitation, index) => (
                          <li key={index} className="text-xs text-text-tertiary">
                            • {limitation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-auto">
                  <Button
                    variant={plan.highlighted ? "primary" : "secondary"}
                    size="md"
                    onClick={plan.buttonAction}
                    disabled={!plan.buttonAction || upgrading === plan.id}
                    className="w-full"
                  >
                    {upgrading === plan.id ? (
                      <>
                        <ArrowRightIcon className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      plan.buttonText
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background-card">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-text-primary mb-12">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-text-primary mb-2">Can I change plans anytime?</h3>
              <p className="text-text-secondary text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we&apos;ll prorate any billing differences.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">What happens to my data if I downgrade?</h3>
              <p className="text-text-secondary text-sm">
                Your data is always safe. If you downgrade, some features may become unavailable, but your curriculum and progress data remains intact.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">Is there a free trial for paid plans?</h3>
              <p className="text-text-secondary text-sm">
                You can start with our generous free plan and upgrade when ready. We also offer a 7-day money-back guarantee on all paid plans.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-2">How does the AI tutoring work?</h3>
              <p className="text-text-secondary text-sm">
                Klio AI provides personalized tutoring based on your child&apos;s curriculum. It can explain concepts, help with homework, and adapt to your child&apos;s learning style.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Ready to Transform Your Homeschool?
          </h2>
          <p className="text-xl text-text-secondary mb-8">
            Join thousands of families who&apos;ve simplified their homeschool journey with Klio AI.
          </p>
          {!session ? (
            <Button as="link" href="/signup" variant="primary" size="lg">
              Start Free Today
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </Button>
          ) : !hasSubscription ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => handleUpgrade(PRICE_IDS.klio_addon, 'klio_addon')}
              disabled={upgrading === 'klio_addon'}
            >
              {upgrading === 'klio_addon' ? 'Processing...' : 'Add AI Tutoring'}
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </Button>
          ) : (
            <Button as="link" href="/dashboard" variant="primary" size="lg">
              Go to Dashboard
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
