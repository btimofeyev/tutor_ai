// parent-dashboard-frontend/src/hooks/useSubscription.js
import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import api from '../utils/api';

export function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]); // Assuming you still want to track children here

  const fetchSubscriptionStatus = useCallback(async () => { // Wrapped in useCallback
    setLoading(true);
    try {
      const response = await api.get('/stripe/subscription-status');
      setSubscription(response.data.subscription);
    } catch (error) {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array for useCallback, as api.get is stable

  const fetchChildren = useCallback(async () => { // Wrapped in useCallback
    // No need to set loading here unless it's a separate loading state for children
    try {
      const response = await api.get('/children');
      setChildren(response.data || []);
    } catch (error) {
    }
  }, []); // Empty dependency array for useCallback

  useEffect(() => {
    fetchSubscriptionStatus();
    fetchChildren();
  }, [fetchSubscriptionStatus, fetchChildren]); // Depend on the useCallback wrapped functions

  // Plan detection
  const hasActiveSubscription = subscription && subscription.status === 'active';
  const planType = subscription?.plan_type;
  const isFreePlan = !hasActiveSubscription;
  const hasAIAddon = hasActiveSubscription && planType === 'klio_addon';
  const isFamilyPlan = hasActiveSubscription && planType === 'family';
  const isAcademyPlan = hasActiveSubscription && planType === 'academy';

  // Feature permissions
  const permissions = {
    hasAIAccess: hasAIAddon || isFamilyPlan || isAcademyPlan,
    hasChildLogin: hasAIAddon || isFamilyPlan || isAcademyPlan,
    hasAdvancedFeatures: isFamilyPlan || isAcademyPlan,
    hasAdvancedReporting: isAcademyPlan,
    maxChildren: isAcademyPlan ? 10 : isFamilyPlan ? 3 : 1,
    hasUnlimitedStorage: isFamilyPlan || isAcademyPlan,
    hasPrioritySupport: isFamilyPlan || isAcademyPlan,
    hasCustomBranding: isAcademyPlan,
  };

  const canAddChild = (currentChildCount = children.length) => {
    return currentChildCount < permissions.maxChildren;
  };

  const getRemainingChildSlots = () => {
    return Math.max(0, permissions.maxChildren - children.length);
  };
  
  const getUpgradeMessage = (feature) => {
    const messages = {
    ai: hasActiveSubscription
    ? "Upgrade to Family Plan for AI access for all children"
    : "Add the Klio AI Pack for $9.99/month to unlock AI tutoring",
    children: "Upgrade your plan to add more children",
    childLogin: "Add Klio AI Pack for $9.99/month to enable child login accounts",
    advanced: "Upgrade to Family Plan for advanced features"
    };
    return messages[feature] || "Upgrade your plan to access this feature";
  };


  return {
    subscription,
    loading,
    hasActiveSubscription,
    planType,
    isFreePlan,
    hasAIAddon,
    isFamilyPlan,
    isAcademyPlan,
    children, // Exporting children from here
    childrenCount: children.length,
    permissions,
    canAddChild,
    getRemainingChildSlots,
    getUpgradeMessage,
    refetch: fetchSubscriptionStatus,
    refetchChildren: fetchChildren,
  };
}