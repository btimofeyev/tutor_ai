// klioai-frontend/src/components/QuickActions.js - Quick Tutoring Action Buttons
import { motion } from 'framer-motion';
import { FiBookOpen, FiHash, FiHelpCircle, FiTarget, FiEdit3, FiGlobe } from 'react-icons/fi';

const QUICK_ACTIONS = [
  {
    id: 'homework',
    icon: FiBookOpen,
    label: 'Homework Help',
    message: "I need help with my homework",
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600'
  },
  {
    id: 'math',
    icon: FiHash,
    label: 'Math Practice',
    message: "Let's practice some math problems!",
    color: 'bg-green-500',
    hoverColor: 'hover:bg-green-600'
  },
  {
    id: 'explain',
    icon: FiHelpCircle,
    label: 'Explain This',
    message: "Can you explain this concept to me?",
    color: 'bg-purple-500',
    hoverColor: 'hover:bg-purple-600'
  },
  {
    id: 'quiz',
    icon: FiTarget,
    label: 'Quick Quiz',
    message: "Give me a quick quiz to test my knowledge",
    color: 'bg-orange-500',
    hoverColor: 'hover:bg-orange-600'
  },
  {
    id: 'writing',
    icon: FiEdit3,
    label: 'Writing Help',
    message: "I need help with writing",
    color: 'bg-pink-500',
    hoverColor: 'hover:bg-pink-600'
  },
  {
    id: 'science',
    icon: FiGlobe,
    label: 'Science Facts',
    message: "Tell me something cool about science!",
    color: 'bg-teal-500',
    hoverColor: 'hover:bg-teal-600'
  }
];

export default function QuickActions({ onActionClick, isVisible = true }) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full px-4 sm:px-6 py-3 bg-[var(--background-card)] border-t border-[var(--border-subtle)]"
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[var(--text-secondary)]">
            Quick Actions
          </h3>
          <span className="text-xs text-[var(--text-tertiary)]">
            Choose what you'd like to work on
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {QUICK_ACTIONS.map((action, index) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onActionClick(action.message)}
              className={`
                flex flex-col items-center justify-center p-3 rounded-lg
                ${action.color} ${action.hoverColor}
                text-white shadow-sm hover:shadow-md
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              `}
            >
              <action.icon size={20} className="mb-1" />
              <span className="text-xs font-medium text-center leading-tight">
                {action.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}