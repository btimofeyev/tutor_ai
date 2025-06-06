// klioai-frontend/src/components/ChatHeader.js - Enhanced with Learning Features
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FiMessageSquare, FiRefreshCw, FiTrendingUp, FiAward } from 'react-icons/fi';

export default function ChatHeader({ 
  childName, 
  currentTopic, 
  onNewChat, 
  learningStreak = 0, 
  todaysPracticeCount = 0 
}) {
  const router = useRouter();

  return (
    <header className="bg-[var(--background-card)] border-b border-[var(--border-subtle)] sticky top-0 z-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"> {/* Aligns with chat content max-width */}
        <div className="flex items-center justify-between h-16">
          
          {/* Left side: Current Topic or Child Name */}
          <div className="flex-grow min-w-0"> {/* flex-grow and min-w-0 allow text to truncate */}
            {currentTopic && (
                 <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate" title={currentTopic}>
                   {currentTopic}
                 </h2>
            )}
            {childName && !currentTopic && ( // Show child name if no specific topic is active
                <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                  Learning with {childName}
                </h2>
            )}
            {/* If both childName and currentTopic exist, you might combine them or prioritize one */}
            {childName && currentTopic && (
                 <div className="truncate">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] inline" title={currentTopic}>
                        {currentTopic}
                    </h2>
                    <span className="text-sm text-[var(--text-secondary)] ml-2">
                        for {childName}
                    </span>
                 </div>
            )}
             {!childName && !currentTopic && ( // Fallback if nothing is provided
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Klio Chat
                </h2>
            )}
          </div>

          {/* Right side: Learning Stats and Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
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

            {/* New Chat Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNewChat}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--accent-blue)]/20 hover:text-[var(--accent-blue)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-blue)] transition-colors"
              title="Start New Chat"
            >
              <FiMessageSquare size={16} />
              <span className="hidden sm:inline text-sm font-medium">New Chat</span>
            </motion.button>
          </div>

        </div>
      </div>
    </header>
  );
}