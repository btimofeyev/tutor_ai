'use client';
import React, { useState, useEffect } from 'react';
import { SparklesIcon, UserGroupIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import api from '../utils/api';

const PRICE_IDS = {
  klio_addon: 'price_1RVZczD8TZAZUMMAQWokffCi', // Replace with your actual Stripe price IDs
  family: 'price_1RVZT4D8TZAZUMMA3YIJeWWE',
  academy: 'price_1RVZTrD8TZAZUMMAiUuoU72d'
};

export default function SubscriptionManager({ children = [], compact = false }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await api.get('/stripe/subscription-status');
      setSubscription(response.data.subscription);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (priceId) => {
    setUpgrading(true);
    try {
      const response = await api.post('/stripe/create-checkout-session', {
        price_id: priceId,
        success_url: `${window.location.origin}/dashboard?upgraded=true`,
        cancel_url: `${window.location.origin}/dashboard`
      });
      
      // Redirect to Stripe Checkout
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start upgrade process. Please try again.');
      setUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await api.post('/stripe/create-portal-session');
      window.location.href = response.data.portal_url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      alert('Failed to access subscription management. Please try again.');
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading subscription...</div>;
  }

  const hasSubscription = subscription && subscription.status === 'active';
  const planType = subscription?.plan_type;
  const childCount = children.length;

  // Compact version for sidebar
  if (compact) {
    return (
      <div className="space-y-3">
        {/* Current Plan Status */}
        {hasSubscription ? (
          <div className="text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-text-primary">
                {planType === 'klio_addon' && '🤖 Starter + AI'}
                {planType === 'family' && '👨‍👩‍👧‍👦 Family Plan'}
                {planType === 'academy' && '🏫 Academy Plan'}
              </span>
              <span className="text-accent-blue">✓</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManageSubscription}
              className="w-full !text-xs !py-1 !px-2"
            >
              Manage Subscription
            </Button>
          </div>
        ) : (
          <div className="text-xs">
            <div className="mb-2">
              <span className="font-medium text-text-primary">🆓 Free Plan</span>
              <div className="text-text-tertiary mt-0.5">1 child • No AI access</div>
            </div>
            
            {childCount === 1 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleUpgrade(PRICE_IDS.klio_addon)}
                disabled={upgrading}
                className="w-full !text-xs !py-1.5"
              >
                Add AI for $9.99/mo
              </Button>
            )}
            
            {childCount >= 2 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleUpgrade(PRICE_IDS.family)}
                disabled={upgrading}
                className="w-full !text-xs !py-1.5"
              >
                Upgrade to Family Plan
              </Button>
            )}
          </div>
        )}
        
        {/* Upgrade prompts for existing subscribers */}
        {planType === 'klio_addon' && childCount >= 2 && (
          <div className="text-xs p-2 bg-accent-yellow/20 rounded-md border border-accent-yellow/40">
            <div className="font-medium text-accent-yellow-darker mb-1">Consider Family Plan</div>
            <div className="text-text-tertiary mb-2">Better value for {childCount} children</div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleUpgrade(PRICE_IDS.family)}
              disabled={upgrading}
              className="w-full !text-xs !py-1"
            >
              Upgrade for $19/mo
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Full version for main pages

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      {hasSubscription && (
        <div className="card p-4 bg-green-50 border-green-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-green-800">
                {planType === 'klio_addon' && 'Starter + Klio AI'}
                {planType === 'family' && 'Family Plan'}
                {planType === 'academy' && 'Academy Plan'}
              </h3>
              <p className="text-sm text-green-600">
                Active until {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleManageSubscription}
            >
              Manage Subscription
            </Button>
          </div>
        </div>
      )}

      {/* Upgrade Prompts */}
      {!hasSubscription && childCount === 1 && (
        <div className="card p-6 border-2 border-dashed border-accent-blue">
          <div className="text-center">
            <SparklesIcon className="h-12 w-12 text-accent-blue mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Add AI Learning Support</h3>
            <p className="text-text-secondary mb-4">
              Give your child personalized AI tutoring with Klio. Get homework help, explanations, and adaptive learning.
            </p>
            <Button
              variant="primary"
              onClick={() => handleUpgrade(PRICE_IDS.klio_addon)}
              disabled={upgrading}
              className="mb-2"
            >
              Add Klio AI for $9.99/month
            </Button>
            <p className="text-xs text-text-tertiary">
              Cancel anytime • No setup fees • Instant access
            </p>
          </div>
        </div>
      )}

      {!hasSubscription && childCount >= 2 && (
        <div className="card p-6 border-2 border-dashed border-accent-yellow">
          <div className="text-center">
            <UserGroupIcon className="h-12 w-12 text-accent-yellow mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Upgrade to Family Plan</h3>
            <p className="text-text-secondary mb-4">
              You have {childCount} children. Get AI support for all of them plus advanced features with the Family Plan.
            </p>
            <Button
              variant="secondary"
              onClick={() => handleUpgrade(PRICE_IDS.family)}
              disabled={upgrading}
              className="mb-2"
            >
              Upgrade to Family Plan - $19/month
            </Button>
            <p className="text-xs text-text-tertiary">
              Includes Klio AI + up to 3 children • Child login accounts • Advanced analytics
            </p>
          </div>
        </div>
      )}

      {planType === 'klio_addon' && childCount >= 2 && (
        <div className="card p-6 border-2 border-dashed border-accent-yellow">
          <div className="text-center">
            <UserGroupIcon className="h-12 w-12 text-accent-yellow mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ready for Multiple Children?</h3>
            <p className="text-text-secondary mb-4">
              You have {childCount} children but only AI access for one. Upgrade to Family Plan for better value.
            </p>
            <Button
              variant="secondary"
              onClick={() => handleUpgrade(PRICE_IDS.family)}
              disabled={upgrading}
            >
              Upgrade to Family Plan - $19/month
            </Button>
          </div>
        </div>
      )}

      {planType === 'family' && childCount >= 8 && (
        <div className="card p-6 border-2 border-dashed border-purple-300">
          <div className="text-center">
            <AcademicCapIcon className="h-12 w-12 text-purple-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Consider Academy Plan</h3>
            <p className="text-text-secondary mb-4">
              With {childCount} children, you might benefit from our Academy Plan designed for larger families.
            </p>
            <Button
              variant="outline"
              onClick={() => handleUpgrade(PRICE_IDS.academy)}
              disabled={upgrading}
            >
              Upgrade to Academy Plan - $39/month
            </Button>
          </div>
        </div>
      )}

      {/* Feature Limits */}
      {!hasSubscription && (
        <div className="text-center text-sm text-text-secondary p-4 bg-gray-50 rounded-lg">
          <p><strong>Free Plan Limitations:</strong></p>
          <p>• 1 child only • No AI chatbot • No child login accounts</p>
          <p>Upgrade anytime to unlock full features!</p>
        </div>
      )}
    </div>
  );
}