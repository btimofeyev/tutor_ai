// klioai-frontend/src/components/ChatHeader.js - Simplified Header
import { motion } from 'framer-motion';
import { FiTrendingUp, FiAward } from 'react-icons/fi';

export default function ChatHeader({ 
  learningStreak = 0, 
  todaysPracticeCount = 0 
}) {
  return (
    <header className="bg-[var(--background-card)] border-b border-[var(--border-subtle)] sticky top-0 z-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end h-12">
          
          {/* Learning Stats Only */}
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