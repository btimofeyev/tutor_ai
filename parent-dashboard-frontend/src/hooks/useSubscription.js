import { useState, useEffect } from 'react';
import api from '../utils/api';

export function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Helper functions
  const hasActiveSubscription = subscription && subscription.status === 'active';
  const planType = subscription?.plan_type;

  const limits = {
    children: planType === 'academy' ? 10 : planType === 'family' ? 3 : 1,
    hasAIAccess: hasActiveSubscription && (planType === 'klio_addon' || planType === 'family' || planType === 'academy'),
    hasChildLoginAccess: hasActiveSubscription && (planType === 'family' || planType === 'academy'),
    hasAdvancedFeatures: hasActiveSubscription && (planType === 'family' || planType === 'academy')
  };

  const canAddChild = (currentChildCount) => {
    if (!hasActiveSubscription) return currentChildCount < 1; // Free plan: 1 child max
    return currentChildCount < limits.children;
  };

  return {
    subscription,
    loading,
    hasActiveSubscription,
    planType,
    limits,
    canAddChild,
    refetch: fetchSubscriptionStatus
  };
}