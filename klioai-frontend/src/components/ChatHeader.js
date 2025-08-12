// klioai-frontend/src/components/ChatHeader.js - Simplified Header
import { motion } from 'framer-motion';
import { FiTrendingUp, FiAward, FiSidebar } from 'react-icons/fi';

export default function ChatHeader({
  learningStreak = 0,
  todaysPracticeCount = 0,
  hasWorkspace = false,
  isWorkspaceExpanded = false,
  onToggleWorkspace = null
}) {
  return (
    <header className="bg-[var(--background-card)] border-b border-[var(--border-subtle)] sticky top-0 z-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">

          {/* Workspace Toggle Button - Mobile Only */}
          {hasWorkspace && onToggleWorkspace && (
            <button
              onClick={onToggleWorkspace}
              className="md:hidden flex items-center space-x-2 px-3 py-1.5 text-sm bg-[var(--accent-blue)]/20 text-[var(--accent-blue-darker-for-border)] rounded-full hover:bg-[var(--accent-blue)]/30 transition-colors border border-[var(--accent-blue)]/40"
              aria-label={isWorkspaceExpanded ? "Hide workspace" : "Show workspace"}
            >
              <FiSidebar size={14} />
              <span>{isWorkspaceExpanded ? 'Hide' : 'Show'} Workspace</span>
            </button>
          )}

          {/* Learning Stats */}
          <div className="flex items-center space-x-2">

            {/* Learning Streak */}
            {learningStreak > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium"
              >
                <FiAward size={12} />
                <span>{learningStreak} day streak!</span>
              </motion.div>
            )}

            {/* Today's Practice Count */}
            {todaysPracticeCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium"
              >
                <FiTrendingUp size={12} />
                <span>{todaysPracticeCount} solved today</span>
              </motion.div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
