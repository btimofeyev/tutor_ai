// app/dashboard/components/StudentSidebar.js
'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeftOnRectangleIcon, 
  UserPlusIcon, 
  Cog6ToothIcon, 
  SparklesIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  ExclamationTriangleIcon,
  CreditCardIcon // Added for upgrade button
} from '@heroicons/react/24/outline';
import Button from '../../../components/ui/Button';
import SubscriptionManager from '../../../components/SubscriptionManager';

const formInputStyles = "block w-full border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--border-input-focus)] focus:border-[var(--border-input-focus)] rounded-[var(--radius-md)] bg-background-card text-text-primary placeholder-text-tertiary shadow-sm text-sm px-3 py-2";

export default function StudentSidebar({
  childrenList,
  selectedChild,
  onSelectChild,
  showAddChild,
  onToggleShowAddChild,
  newChildName,
  onNewChildNameChange,
  newChildGrade,
  onNewChildGradeChange,
  onAddChildSubmit,
  onOpenChildLoginSettings,
  subscription,
  canAddChild,
  onUpgradeNeeded, // New prop to handle upgrade clicks from here
}) {
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);

  const hasActiveSubscription = subscription && subscription.status === 'active';
  const planType = subscription?.plan_type;

  let planDisplayName = '🆓 Free Plan';
  if (hasActiveSubscription) {
    if (planType === 'klio_addon') planDisplayName = '🤖 Starter + AI';
    else if (planType === 'family') planDisplayName = '👨‍👩‍👧‍👦 Family Plan';
    else if (planType === 'academy') planDisplayName = '🏫 Academy Plan';
    else planDisplayName = 'Active Plan';
  }

  const handleUpgradeButtonClick = () => {
    if (onUpgradeNeeded) {
      // Determine which plan to suggest upgrading to
      let targetPlan = 'family'; // Default
      if (planType === 'free' || planType === 'klio_addon') {
        targetPlan = 'family';
      } else if (planType === 'family') {
        targetPlan = 'academy';
      }
      onUpgradeNeeded(targetPlan);
    }
  };

  return (
    <aside className="flex flex-col h-full text-text-primary bg-background-card">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <Link href="/" className="flex items-center group transition-opacity hover:opacity-80">
          <Image
            src="/klio_logo.png"
            alt="Klio AI Logo"
            width={32}
            height={32}
            className="mr-2"
            priority
          />
          <span className="text-2xl font-bold text-[var(--accent-blue)] group-hover:text-[var(--accent-blue-hover)] transition-colors">
            Klio AI
          </span>
        </Link>
      </div>

      {/* Students Section Header */}
      <div className="px-6 pt-2 pb-3 border-b border-border-subtle mb-2">
        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Students</h3>
      </div>

      {/* Students List (no changes) */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1.5">
        {(childrenList || []).map(child => {
          const isSelected = selectedChild?.id === child.id;
          return (
            <div
              key={child.id}
              className={`group relative rounded-[var(--radius-md)] transition-all duration-150 ease-in-out
                ${isSelected
                  ? 'bg-[var(--accent-blue)] text-[var(--text-on-accent)] shadow-md'
                  : 'hover:bg-[var(--accent-blue)]/20'
                }`
              }
            >
              <button
                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between focus:outline-none rounded-[var(--radius-md)]
                  ${isSelected
                    ? 'text-[var(--text-on-accent)]'
                    : 'text-text-primary hover:text-text-primary'
                  }`
                }
                onClick={() => onSelectChild(child)}
              >
                <div>
                  <div className="font-medium text-sm">
                    {child.name}
                  </div>
                  <div className={`text-xs ${isSelected ? 'text-[var(--text-on-accent)] opacity-80' : 'text-text-secondary'}`}>
                    Grade {child.grade || <span className="italic">N/A</span>}
                  </div>
                </div>
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onOpenChildLoginSettings(child);}}
                className={`absolute top-1/2 right-1.5 -translate-y-1/2 p-1 rounded-full transition-all focus:ring-0
                          ${isSelected
                                ? 'text-[var(--text-on-accent)] opacity-70 hover:bg-[var(--accent-blue-hover)]/[0.5] hover:opacity-100'
                                : 'text-text-tertiary hover:bg-[var(--accent-blue)]/30 hover:text-text-primary opacity-0 group-hover:opacity-100 focus:opacity-100'
                          }`
                        }
                title={`Login settings for ${child.name}`}
              >
                <Cog6ToothIcon className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>


      {/* Subscription & Add Student Section */}
      <div className="p-4 border-t border-border-subtle">
        {/* Subscription Section */}
        <div className="mb-4">
          <button
            onClick={() => setShowSubscriptionDetails(!showSubscriptionDetails)}
            className="w-full flex items-center justify-between text-left p-2 rounded-md hover:bg-background-card-hover transition-colors"
          >
            <div className="flex items-center">
              <SparklesIcon className="h-4 w-4 mr-2 text-accent-blue" />
              <span className="text-sm font-medium text-text-primary">
                {planDisplayName}
              </span>
            </div>
            {showSubscriptionDetails ? (
              <ChevronUpIcon className="h-4 w-4 text-text-tertiary" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-text-tertiary" />
            )}
          </button>
          
          {showSubscriptionDetails && (
            <div className="mt-2 px-2">
              <SubscriptionManager
                children={childrenList || []} // Ensure childrenList is an array
                compact={true}
                initialSubscription={subscription}
              />
            </div>
          )}
        </div>

        {/* Add Student Section */}
        {!showAddChild ? (
          <div>
            <Button
              variant={canAddChild ? "secondary" : "primary"} // Make upgrade more prominent
              size="md"
              onClick={canAddChild ? () => onToggleShowAddChild(true) : handleUpgradeButtonClick}
              className="w-full"
              // disabled={!canAddChild && !onUpgradeNeeded} // Disable only if no upgrade path
              title={!canAddChild ? "Upgrade your plan to add more children" : "Add a new student"}
            >
              {!canAddChild ? <CreditCardIcon className="h-5 w-5 mr-2"/> : <UserPlusIcon className="h-5 w-5 mr-2"/> }
              {canAddChild ? "Add Student" : "Upgrade to Add Student"}
            </Button>
            {!canAddChild && (
              <div className="mt-2 p-2 bg-orange-50 rounded-md border border-orange-200">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-orange-800">Plan Limit Reached</p>
                    <p className="text-xs text-orange-600 mt-0.5">
                      {hasActiveSubscription ? (
                        planType === 'klio_addon' ? 
                          'The AI Add-on is for 1 child. Upgrade to Family Plan for up to 3 children.' :
                          planType === 'family' ?
                            'Family plan supports up to 3 children. Upgrade to Academy for more.' :
                            'Your current plan is at its child limit. Contact support for options.' // General message for Academy or other
                      ) : (
                        'Free plan includes 1 child. Upgrade for more!'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Form for adding child (no changes)
          <form onSubmit={onAddChildSubmit} className="flex flex-col gap-2 p-3 bg-background-main rounded-lg border border-border-subtle">
            <input
              value={newChildName}
              onChange={onNewChildNameChange}
              placeholder="Student Name"
              className={formInputStyles} 
              required 
            />
            <input
              value={newChildGrade}
              onChange={onNewChildGradeChange}
              placeholder="Grade Level"
              className={formInputStyles} 
            />
            <div className="flex gap-2 mt-1.5">
              <Button type="submit" variant="primary" size="sm" className="flex-1">
                 Save {/* Removed CheckIcon for brevity to match Cancel */}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onToggleShowAddChild(false)}
                className="flex-1"
              >
                 Cancel {/* Removed XMarkIcon */}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Logout Section (no changes) */}
      <div className="p-4 border-t border-border-subtle mt-auto">
        <Button
          as="link"
          href="/api/auth/logout"
          variant="ghost"
          size="md"
          className="w-full !text-[var(--messageTextDanger)] hover:!bg-[var(--messageTextDanger)]/10"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2"/>
          Log Out
        </Button>
      </div>
    </aside>
  );
}