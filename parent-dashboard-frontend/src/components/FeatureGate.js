// parent-dashboard-frontend/src/components/FeatureGate.js
'use client';
import React, { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import UpgradePrompt from './UpgradePrompt';
import Button from './ui/Button';
import api from '../utils/api';
import { PRICE_IDS } from '../utils/subscriptionConstants';

export default function FeatureGate({
  feature,
  children,
  fallback = null,
  showUpgradePrompt = true
}) {
  const { permissions, planType } = useSubscription();
  const [showPrompt, setShowPrompt] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const hasAccess = () => {
    switch (feature) {
      case 'ai':
        return canAccessAI();
      case 'childLogin':
        return canUseChildLogin();
      case 'advanced':
        return permissions.hasAdvancedFeatures;
      default:
        return true;
    }
  };

  const handleUpgrade = async (targetPlan) => {
    setUpgrading(true);
    try {
      const response = await api.post('/stripe/create-checkout-session', {
        price_id: PRICE_IDS[targetPlan],
        success_url: `${window.location.origin}${window.location.pathname}?upgraded=true`,
        cancel_url: window.location.href
      });

      window.location.href = response.data.checkout_url;
    } catch (error) {
      alert('Failed to start upgrade process. Please try again.');
      setUpgrading(false);
    }
  };

  if (hasAccess()) {
    return children;
  }

  if (fallback) {
    return fallback;
  }

  if (showUpgradePrompt) {
    return (
      <>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background-main bg-opacity-80">
          <Button
            variant="primary"
            onClick={() => setShowPrompt(true)}
          >
            Unlock This Feature
          </Button>
        </div>
        {showPrompt && (
          <UpgradePrompt
            feature={feature}
            currentPlan={planType || 'free'}
            onUpgrade={handleUpgrade}
            onClose={() => setShowPrompt(false)}
            upgrading={upgrading}
          />
        )}
      </>
    );
  }

  return null;
}
