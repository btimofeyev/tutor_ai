'use client';
import { useState } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';

export default function PaywallOverlay({ feature = 'AI Features', children, showUpgrade = true }) {
  const { hasAIAccess, planType, loading } = useSubscription();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render paywall if still loading subscription data
  if (loading) {
    return (
      <div className="relative">
        <div className="opacity-30 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-80">
          <div className="text-purple-600 font-semibold">Loading...</div>
        </div>
      </div>
    );
  }

  // If user has AI access, render children normally
  if (hasAIAccess) {
    return children;
  }

  // Show paywall overlay
  return (
    <div className="relative">
      {/* Disabled content */}
      <div className="opacity-30 pointer-events-none filter blur-sm">
        {children}
      </div>

      {/* Paywall overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 bg-opacity-95 rounded-lg border-2 border-purple-200">
        <div className="text-center p-6 max-w-md mx-auto">
          {/* Lock icon */}
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-gray-800 mb-2">
            🔒 {feature} Locked
          </h3>

          <p className="text-gray-600 mb-4">
            {planType === 'free'
              ? `Unlock ${feature.toLowerCase()} with a Klio AI subscription!`
              : `Your current plan doesn't include ${feature.toLowerCase()}.`
            }
          </p>

          {showUpgrade && (
            <div className="space-y-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                🚀 Upgrade to Continue
              </button>

              {isExpanded && (
                <div className="bg-white rounded-lg p-4 border border-purple-200 text-left">
                  <div className="text-sm text-gray-700 space-y-2">
                    <div className="font-semibold text-purple-700 mb-2">Available Plans:</div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      <span><strong>Klio AI Pack:</strong> $9.99/month - AI tutoring for 1 child</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span><strong>Family Plan:</strong> $29.99/month - AI for up to 3 children</span>
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Ask your parent to upgrade your family&apos;s subscription to unlock AI features.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
