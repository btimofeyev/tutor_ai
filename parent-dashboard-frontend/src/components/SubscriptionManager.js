// parent-dashboard-frontend/src/components/SubscriptionManager.js
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { SparklesIcon, UserGroupIcon, AcademicCapIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import api from '../utils/api';
import { PRICE_IDS } from '../utils/subscriptionConstants';
import { ComingSoonBadge } from './ComingSoonOverlay';

export default function SubscriptionManager({
  childrenList = [], // Represents the list of children, used for childCount
  compact = false,
  initialSubscription = null,
}) {
  const [subscription, setSubscription] = useState(initialSubscription);
  const [loading, setLoading] = useState(!initialSubscription);
  const [upgrading, setUpgrading] = useState(false);

  const fetchSubscriptionStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/stripe/subscription-status');
      setSubscription(response.data.subscription);
    } catch (error) {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialSubscription) {
      setSubscription(initialSubscription);
      setLoading(false);
    } else {
      fetchSubscriptionStatus();
    }
  }, [initialSubscription, fetchSubscriptionStatus]);

  const handleUpgrade = async (priceId) => {
    if (!priceId) {
        alert("Target plan ID is missing.");
        return;
    }
    setUpgrading(true);
    try {
      const response = await api.post('/stripe/create-checkout-session', {
        price_id: priceId,
        success_url: `${window.location.origin}/dashboard?upgraded=true`,
        cancel_url: `${window.location.origin}/dashboard`
      });
      window.location.href = response.data.checkout_url;
    } catch (error) {
      alert('Failed to start upgrade process. Please try again.');
    } finally {
      // Set upgrading to false only if not redirecting or on error
      // If redirect happens, this component might unmount.
      // For safety, keep it simple:
      setUpgrading(false);
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

  if (loading) {
    return <div className="animate-pulse text-xs text-text-tertiary p-2">Loading ...</div>;
  }

  const hasSubscription = subscription && subscription.status === 'active';
  const planType = subscription?.plan_type;
  const childCount = Array.isArray(childrenList) ? childrenList.length : 0;

  // Max children allowed by current plan
  let maxChildrenForCurrentPlan = 1; // Default for free
  if (planType === 'klio_addon') maxChildrenForCurrentPlan = 1;
  if (planType === 'family') maxChildrenForCurrentPlan = 3;
  if (planType === 'academy') maxChildrenForCurrentPlan = 10; // Or your defined limit

  // Compact version for sidebar
  if (compact) {
    return (
      <div className="space-y-3">
        {hasSubscription ? (
          <div className="text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-text-primary">
                {planType === 'klio_addon' && '🤖 AI Pack'}
                {planType === 'family' && '👨‍👩‍👧‍👦 Family Plan'}
                {planType === 'academy' && '🏫 Academy Plan'}
                {(!planType || !['klio_addon', 'family', 'academy'].includes(planType)) && 'Active Plan'}
              </span>
              <span className="text-accent-blue">✓ Active</span>
            </div>
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManageSubscription}
                className="w-full !text-xs !py-1 !px-2 hover:bg-gray-100"
              >
                Manage Subscription
              </Button>
              {/* Conditional Upgrade Prompts */}
              {planType === 'klio_addon' && (
                <Button
                  variant="primaryGradient" // A distinct style for upgrade
                  size="sm"
                  onClick={() => handleUpgrade(PRICE_IDS.family)}
                  disabled={upgrading}
                  className="w-full !text-xs !py-1.5"
                >
                  <UserGroupIcon className="h-3.5 w-3.5 mr-1"/> Upgrade to Family
                </Button>
              )}
              {planType === 'family' && childCount >= maxChildrenForCurrentPlan && ( // If family plan is full
                 <Button
                    variant="primaryGradient"
                    size="sm"
                    onClick={() => handleUpgrade(PRICE_IDS.academy)}
                    disabled={upgrading}
                    className="w-full !text-xs !py-1.5"
                >
                    <AcademicCapIcon className="h-3.5 w-3.5 mr-1"/> Upgrade to Academy
                </Button>
              )}
               <Button
                as="link"
                href="/pricing"
                variant="ghost"
                size="sm"
                className="w-full !text-xs !py-1 !px-2 hover:bg-gray-100"
              >
                View All Plans
              </Button>
            </div>
          </div>
        ) : ( // Not an active subscriber (Free plan)
          <div className="text-xs">
            <div className="mb-2">
              <span className="font-medium text-text-primary">🆓 Free Plan</span>
              <div className="text-text-tertiary mt-0.5">{maxChildrenForCurrentPlan} child • Basic features</div>
            </div>

            <div className="space-y-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {}} // Disabled
                disabled={true}
                className="w-full !text-xs !py-1.5 opacity-60 cursor-not-allowed"
                title="AI Pack is currently in development"
              >
                <SparklesIcon className="h-3.5 w-3.5 mr-1"/> AI Pack (Coming Soon)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleUpgrade(PRICE_IDS.family)}
                disabled={upgrading}
                className="w-full !text-xs !py-1.5"
              >
                <UserGroupIcon className="h-3.5 w-3.5 mr-1"/> Upgrade to Family
              </Button>
              <Button
                as="link"
                href="/pricing"
                variant="ghost"
                size="sm"
                className="w-full !text-xs !py-1 !px-2 hover:bg-gray-100"
              >
                View All Plans
                <ArrowRightIcon className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full version (ensure it also uses the local 'subscription' state and childCount)
  return (
    <div className="space-y-6">
      {hasSubscription && (
        <div className="card p-4 bg-green-50 border-green-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-green-800">
                {planType === 'klio_addon' && 'Free Plan + Klio AI Pack'}
                {planType === 'family' && 'Family Plan'}
                {planType === 'academy' && 'Academy Plan'}
                 {(!planType || !['klio_addon', 'family', 'academy'].includes(planType)) && 'Active Plan'}
              </h3>
              <p className="text-sm text-green-600">
                Active until {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleManageSubscription}
              >
                Manage Subscription
              </Button>
              <Button
                as="link"
                href="/pricing"
                variant="outline"
                size="sm"
              >
                View Plans
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Prompts based on current state */}
      {!hasSubscription && ( // On Free Plan
        <div className="card p-6 border-2 border-dashed border-accent-blue">
          <div className="text-center">
            <SparklesIcon className="h-12 w-12 text-accent-blue mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Unlock Klio AI Features</h3>
            <p className="text-text-secondary mb-4">
              {childCount <= 1 ? (
                <>
                  AI tutoring features are coming soon! Meanwhile, upgrade to Family Plan for multiple children and advanced features.
                </>
              ) : (
                "Upgrade to Family for more children and advanced features."
              )}
            </p>
            <div className="flex gap-2 justify-center">
              {childCount <= 1 ? (
                <>
                  <Button
                    variant="secondary"
                    disabled={true}
                    className="opacity-60 cursor-not-allowed"
                    title="AI features are currently in development"
                  >
                    Klio AI Pack (Coming Soon)
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleUpgrade(PRICE_IDS.family)}
                    disabled={upgrading}
                  >
                    Upgrade to Family Plan
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => handleUpgrade(PRICE_IDS.family)}
                  disabled={upgrading}
                >
                  Upgrade to Family Plan
                </Button>
              )}
              <Button as="link" href="/pricing" variant="outline">Compare Plans</Button>
            </div>
          </div>
        </div>
      )}

      {planType === 'klio_addon' && (
        <div className="card p-6 border-2 border-dashed border-accent-yellow">
          <div className="text-center">
            <UserGroupIcon className="h-12 w-12 text-accent-yellow mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Need More Students or AI for All?</h3>
            <p className="text-text-secondary mb-4">
              Family Plan gives AI tutoring for all children (up to 3) plus advanced features.
            </p>
            <Button variant="secondary" onClick={() => handleUpgrade(PRICE_IDS.family)} disabled={upgrading}>
                Upgrade to Family Plan
            </Button>
          </div>
        </div>
      )}
       {planType === 'family' && childCount >= maxChildrenForCurrentPlan && (
        <div className="card p-6 border-2 border-dashed border-purple-300">
          <div className="text-center">
            <AcademicCapIcon className="h-12 w-12 text-purple-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Expand Your Academy!</h3>
            <p className="text-text-secondary mb-4">
              You&apos;ve reached the limit for the Family Plan. Upgrade to Academy for up to {PRICE_IDS.academy_max_children || 10} children.
            </p>
            <Button variant="outline" onClick={() => handleUpgrade(PRICE_IDS.academy)} disabled={upgrading}>
              Upgrade to Academy Plan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
