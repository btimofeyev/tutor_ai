// app/dashboard/chat-insights/page.js
'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StudentSidebar from '../components/StudentSidebar';
import ConversationSummariesView from './components/ConversationSummariesView';
import { useChildrenData } from '../../../hooks/useChildrenData';
import { useSubscription } from '../../../hooks/useSubscription';
import { useSession } from '@supabase/auth-helpers-react';
import { 
  ChatBubbleLeftRightIcon,
  InformationCircleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

export default function ChatInsightsPage() {
  const session = useSession();
  const subscription = useSubscription();
  const childrenData = useChildrenData(session, subscription.subscription, subscription.permissions);
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Set initial time and update periodically (client-side only to avoid hydration mismatch)
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };
    
    // Set initial time
    updateTime();
    
    // Update time every minute
    const interval = setInterval(updateTime, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Refresh insights data
  const refreshInsights = () => {
    setRefreshTrigger(prev => prev + 1);
    // Also update the time when refreshing
    setTimeout(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 0);
  };

  // Handle child login settings (placeholder - reuse existing functionality)
  const handleOpenChildLoginSettings = (child) => {
    // This would integrate with existing child login settings modal
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background-main)]">
      {/* Student Sidebar */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200">
        <StudentSidebar
          childrenList={childrenData.children}
          selectedChild={childrenData.selectedChild}
          onSelectChild={childrenData.setSelectedChild}
          showAddChild={false} // Hide add child functionality on insights page
          onToggleShowAddChild={() => {}} // Required prop, but not used on insights page
          newChildName=""
          onNewChildNameChange={() => {}}
          newChildGrade=""
          onNewChildGradeChange={() => {}}
          onAddChildSubmit={(e) => e.preventDefault()}
          onOpenChildLoginSettings={handleOpenChildLoginSettings}
          subscription={subscription.subscription}
          canAddChild={subscription.permissions?.maxChildren > childrenData.children.length}
          onUpgradeNeeded={() => {}}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Chat Insights</h1>
                <p className="text-sm text-gray-600">
                  Daily summaries of your {childrenData.selectedChild ? `${childrenData.selectedChild.name}'s` : 'children&apos;s'} learning conversations
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Info Button */}
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="About Chat Insights"
              >
                <InformationCircleIcon className="h-5 w-5" />
              </button>
              
              {/* Refresh Button */}
              <button
                onClick={refreshInsights}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </header>

        {/* Info Panel */}
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 border-b border-blue-200 px-6 py-4"
          >
            <div className="max-w-4xl">
              <h3 className="font-semibold text-blue-900 mb-2">About Chat Insights</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• <strong>Daily summaries:</strong> See what your children learned and worked on each day</p>
                <p>• <strong>Learning progress:</strong> Track problem-solving, topics mastered, and areas needing attention</p>
                <p>• <strong>Privacy-first:</strong> Only learning insights are shared, not detailed conversation content</p>
                <p>• <strong>Auto-cleanup:</strong> Summaries automatically delete after 7 days or when marked as read</p>
                <p>• <strong>Action items:</strong> Get suggestions for supporting your child&apos;s learning at home</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Loading State */}
            {childrenData.loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading children data...</span>
              </div>
            )}

            {/* Error State */}
            {childrenData.error && (
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">
                  <p className="font-medium">Error loading children data</p>
                  <p className="text-sm">{childrenData.error}</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reload Page
                </button>
              </div>
            )}

            {/* No Children State */}
            {!childrenData.loading && !childrenData.error && childrenData.children.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No children added yet</h3>
                <p className="text-gray-600 mb-4">
                  Add children to your account to see their conversation summaries here
                </p>
                <a
                  href="/dashboard"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <span>Go to Dashboard</span>
                  <span>→</span>
                </a>
              </div>
            )}

            {/* Conversation Summaries */}
            {!childrenData.loading && !childrenData.error && childrenData.children.length > 0 && (
              <ConversationSummariesView
                selectedChild={childrenData.selectedChild}
                refreshTrigger={refreshTrigger}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>💡 Chat insights help you stay connected with your child&apos;s learning journey</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Auto-refresh every 5 minutes</span>
              <span>•</span>
              <span>Last updated: {currentTime || 'Loading...'}</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}