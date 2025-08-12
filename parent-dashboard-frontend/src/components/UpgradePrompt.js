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
      icon: <SparklesIcon className="h-16 w-16" style={{ color: 'var(--accent-blue)' }} />,
      title: "AI Tutoring Required",
      description: "Add the Klio AI Pack to unlock personalized tutoring for your child.",
      buttonText: "Add AI Pack - $9.99/month",
      upgradeAction: () => onUpgrade('klio_addon')
    },
    children: {
      icon: <UserGroupIcon className="h-16 w-16" style={{ color: 'var(--accent-yellow)' }} />,
      title: "Child Limit Reached",
      description: currentPlan === 'free'
        ? "Upgrade to Family Plan to add up to 3 children with AI tutoring for all."
        : "Upgrade to Academy Plan to add up to 10 children.",
      buttonText: currentPlan === 'free' ? "Upgrade to Family Plan - $19/month" : "Upgrade to Academy Plan - $39/month",
      upgradeAction: () => onUpgrade(currentPlan === 'free' ? 'family' : 'academy')
    },
    childLogin: {
      icon: <UserGroupIcon className="h-16 w-16" style={{ color: 'var(--accent-blue)' }} />,
      title: "Child Login Accounts Required",
      description: "Upgrade to Family Plan to enable individual login accounts for your children.",
      buttonText: "Upgrade to Family Plan - $19/month",
      upgradeAction: () => onUpgrade('family')
    },
    materials: {
      icon: <ExclamationTriangleIcon className="h-16 w-16" style={{ color: 'var(--accent-yellow)' }} />,
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
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md border border-gray-200">
        <div className="text-center">
          <div className="mx-auto mb-6">
            {prompt.icon}
          </div>
          <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {prompt.title}
          </h3>
          <p className="text-lg mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {prompt.description}
          </p>
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              onClick={prompt.upgradeAction}
              disabled={upgrading}
              className="w-full"
            >
              {upgrading ? 'Processing...' : prompt.buttonText}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Not Now
            </Button>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button as="link" href="/pricing" variant="ghost" size="sm">
              Compare all plans →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

