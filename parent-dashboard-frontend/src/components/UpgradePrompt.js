// parent-dashboard-frontend/src/components/UpgradePrompt.js
'use client';
import React from 'react';
import { ExclamationTriangleIcon, SparklesIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';

export default function UpgradePrompt({ 
  feature, 
  currentPlan, 
  onUpgrade, 
  onClose,
  upgrading = false 
}) {
  const prompts = {
    ai: {
      icon: <SparklesIcon className="h-12 w-12 text-accent-blue" />,
      title: "AI Tutoring Required",
      description: "Add the Klio AI Pack to unlock personalized tutoring for your child.",
      buttonText: "Add AI Pack - $9.99/month",
      upgradeAction: () => onUpgrade('klio_addon')
    },
    children: {
      icon: <UserGroupIcon className="h-12 w-12 text-accent-yellow" />,
      title: "Child Limit Reached",
      description: currentPlan === 'free' 
        ? "Upgrade to Family Plan to add up to 3 children with AI tutoring for all."
        : "Upgrade to Academy Plan to add up to 10 children.",
      buttonText: currentPlan === 'free' ? "Upgrade to Family Plan - $19/month" : "Upgrade to Academy Plan - $39/month",
      upgradeAction: () => onUpgrade(currentPlan === 'free' ? 'family' : 'academy')
    },
    childLogin: {
      icon: <UserGroupIcon className="h-12 w-12 text-accent-blue" />,
      title: "Child Login Accounts Required",
      description: "Upgrade to Family Plan to enable individual login accounts for your children.",
      buttonText: "Upgrade to Family Plan - $19/month",
      upgradeAction: () => onUpgrade('family')
    },
    materials: {
      icon: <ExclamationTriangleIcon className="h-12 w-12 text-accent-yellow" />,
      title: "Material Limit Reached",
      description: currentPlan === 'free' 
        ? "You've reached the 50 material limit. Add the AI Pack for 100 materials or upgrade to Family Plan for 500."
        : "You've reached your material limit. Upgrade for more storage.",
      buttonText: currentPlan === 'free' ? "Add AI Pack - $9.99/month" : "Upgrade Plan",
      upgradeAction: () => onUpgrade(currentPlan === 'free' ? 'klio_addon' : 'family')
    }
  };

  const prompt = prompts[feature];
  if (!prompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-background-card rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto mb-4">
            {prompt.icon}
          </div>
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            {prompt.title}
          </h3>
          <p className="text-text-secondary mb-6">
            {prompt.description}
          </p>
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={prompt.upgradeAction}
              disabled={upgrading}
              className="flex-1"
            >
              {upgrading ? 'Processing...' : prompt.buttonText}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Not Now
            </Button>
          </div>
          <p className="text-xs text-text-tertiary mt-3">
            <Button as="link" href="/pricing" variant="ghost" size="sm">
              Compare all plans
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}

