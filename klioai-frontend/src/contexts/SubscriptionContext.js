'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext({
  subscription: null,
  loading: true,
  hasAIAccess: false,
  planType: null,
  error: null,
  checkSubscription: async () => {},
});

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { child, isAuthenticated } = useAuth();

  const checkSubscription = useCallback(async () => {
    if (!isAuthenticated || !child) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get parent ID from child data to check subscription
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/children/${child.id}/parent-subscription`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('klio_access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      } else if (response.status === 403) {
        // Subscription not active
        setSubscription(null);
      } else {
        throw new Error('Failed to fetch subscription status');
      }
    } catch (err) {
      console.error('Subscription check failed:', err);
      setError(err.message);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [child?.id]);

  useEffect(() => {
    if (isAuthenticated && child) {
      checkSubscription();
    }
  }, [child, isAuthenticated, checkSubscription]);

  // Determine subscription permissions
  const hasActiveSubscription = subscription && subscription.status === 'active';
  const planType = subscription?.plan_type;
  const hasAIAccess = hasActiveSubscription && ['klio_addon', 'family', 'academy'].includes(planType);

  const value = {
    subscription,
    loading,
    hasAIAccess,
    planType: planType || 'free',
    error,
    checkSubscription,
    // Additional helper properties
    isFreePlan: !hasActiveSubscription,
    hasAdvancedFeatures: hasActiveSubscription && ['family', 'academy'].includes(planType),
    maxChildren: planType === 'academy' ? 10 : planType === 'family' ? 3 : 1,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};