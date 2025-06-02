// parent-dashboard-frontend/src/components/FeatureGate.js
'use client';
import React, { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import UpgradePrompt from './UpgradePrompt';
import api from '../utils/api';

export default function FeatureGate({ 
  feature, 
  children, 
  fallback = null,
  showUpgradePrompt = true 
}) {
  const { permissions, planType, canAccessAI, canUseChildLogin } = useSubscription();
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
      const priceIds = {
        klio_addon: 'price_1RVZczD8TZAZUMMAQWokffCi',
        family: 'price_1RVZT4D8TZAZUMMA3YIJeWWE',
        academy: 'price_1RVZTrD8TZAZUMMAiUuoU72d'
      };

      const response = await api.post('/stripe/create-checkout-session', {
        price_id: priceIds[targetPlan],
        success_url: `${window.location.origin}${window.location.pathname}?upgraded=true`,
        cancel_url: window.location.href
      });
      
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
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

// ================================================================

// Example usage in dashboard components:

// In AddMaterialForm.js:
import FeatureGate from '../../../components/FeatureGate';
import { useSubscription } from '../../../hooks/useSubscription';

export default function AddMaterialForm(props) {
  const { permissions, enforceAIAccess } = useSubscription();

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Check material limit before submitting
      if (props.currentMaterialCount >= permissions.maxMaterialsPerChild) {
        throw new Error(`Material limit reached: ${permissions.maxMaterialsPerChild} maximum per child`);
      }

      // Rest of form submission logic...
      await props.onFormSubmit(e);
    } catch (error) {
      if (error.message.includes('Material limit reached')) {
        // Show upgrade prompt for materials
        alert(`${error.message}\n\nUpgrade your plan for more storage.`);
      } else {
        alert(error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Material limit warning */}
      {props.currentMaterialCount >= permissions.maxMaterialsPerChild * 0.8 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            You're approaching your material limit ({props.currentMaterialCount}/{permissions.maxMaterialsPerChild}).
            <Button as="link" href="/pricing" variant="ghost" size="sm" className="ml-2">
              Upgrade for more storage
            </Button>
          </p>
        </div>
      )}

      {/* Rest of your form */}
      <form onSubmit={handleFormSubmit}>
        {/* Your existing form content */}
      </form>
    </div>
  );
}

// In StudentSidebar.js - Child login settings:
<FeatureGate feature="childLogin">
  <Button
    variant="ghost"
    size="sm"
    onClick={(e) => { e.stopPropagation(); onOpenChildLoginSettings(child);}}
    className="..."
    title={`Login settings for ${child.name}`}
  >
    <Cog6ToothIcon className="h-4 w-4" />
  </Button>
</FeatureGate>