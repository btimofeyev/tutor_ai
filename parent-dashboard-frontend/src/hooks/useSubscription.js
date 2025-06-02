// parent-dashboard-frontend/src/hooks/useSubscription.js
import { useState, useEffect } from 'react';
import api from '../utils/api';

export function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]); // Track children count

  useEffect(() => {
    fetchSubscriptionStatus();
    fetchChildren();
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

  const fetchChildren = async () => {
    try {
      const response = await api.get('/children');
      setChildren(response.data || []);
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  // Plan detection
  const hasActiveSubscription = subscription && subscription.status === 'active';
  const planType = subscription?.plan_type;
  const isFreePlan = !hasActiveSubscription;
  const hasAIAddon = hasActiveSubscription && planType === 'klio_addon';
  const isFamilyPlan = hasActiveSubscription && planType === 'family';
  const isAcademyPlan = hasActiveSubscription && planType === 'academy';

  // Feature permissions
  const permissions = {
    // AI Features
    hasAIAccess: hasAIAddon || isFamilyPlan || isAcademyPlan,
    hasChildLogin: isFamilyPlan || isAcademyPlan,
    hasAdvancedFeatures: isFamilyPlan || isAcademyPlan,
    hasAdvancedReporting: isAcademyPlan,
    
    // Child limits
    maxChildren: isAcademyPlan ? 10 : isFamilyPlan ? 3 : 1,
    
    // Other limits
    hasUnlimitedStorage: isFamilyPlan || isAcademyPlan,
    hasPrioritySupport: isFamilyPlan || isAcademyPlan,
    hasCustomBranding: isAcademyPlan,
  };

  // Helper functions
  const canAddChild = (currentChildCount = children.length) => {
    return currentChildCount < permissions.maxChildren;
  };

  const canAccessAI = () => {
    return permissions.hasAIAccess;
  };

  const canUseChildLogin = () => {
    return permissions.hasChildLogin;
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
      childLogin: "Upgrade to Family Plan to enable child login accounts",
      advanced: "Upgrade to Family Plan for advanced features"
    };
    return messages[feature] || "Upgrade your plan to access this feature";
  };

  // Enforcement functions
  const enforceChildLimit = () => {
    if (children.length >= permissions.maxChildren) {
      throw new Error(`You've reached your plan's limit of ${permissions.maxChildren} child${permissions.maxChildren !== 1 ? 'ren' : ''}. ${getUpgradeMessage('children')}`);
    }
  };

  const enforceAIAccess = () => {
    if (!permissions.hasAIAccess) {
      throw new Error(getUpgradeMessage('ai'));
    }
  };

  const enforceChildLoginAccess = () => {
    if (!permissions.hasChildLogin) {
      throw new Error(getUpgradeMessage('childLogin'));
    }
  };

  return {
    // Subscription info
    subscription,
    loading,
    hasActiveSubscription,
    planType,
    isFreePlan,
    hasAIAddon,
    isFamilyPlan,
    isAcademyPlan,
    
    // Children info
    children,
    childrenCount: children.length,
    
    // Permissions
    permissions,
    
    // Helper functions
    canAddChild,
    canAccessAI,
    canUseChildLogin,
    getRemainingChildSlots,
    getUpgradeMessage,
    
    // Enforcement functions
    enforceChildLimit,
    enforceAIAccess,
    enforceChildLoginAccess,
    
    // Refresh functions
    refetch: fetchSubscriptionStatus,
    refetchChildren: fetchChildren
  };
}