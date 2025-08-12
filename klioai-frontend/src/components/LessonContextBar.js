// klioai-frontend/src/components/LessonContextBar.js
import { motion } from 'framer-motion';

export default function LessonContextBar({ lessonContext, onClose, onGetHelp }) {
  if (!lessonContext) return null;

  const typeEmoji = {
    worksheet: '📝',
    assignment: '📋',
    test: '📊',
    quiz: '❓',
    lesson: '📖',
    notes: '📓',
    reading_material: '📚'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-purple-100 border-b-2 border-purple-300 px-4 py-2"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">
            {typeEmoji[lessonContext.lessonType] || '📄'}
          </span>
          <div>
            <p className="text-sm font-medium text-purple-900">
              Currently helping with:
            </p>
            <p className="text-xs text-purple-700">
              {lessonContext.lessonTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onGetHelp}
            className="text-xs bg-purple-200 hover:bg-purple-300 px-3 py-1 rounded-full transition-colors"
          >
            💡 Get Tips
          </button>
          <button
            onClick={onClose}
            className="text-purple-600 hover:text-purple-800 text-xl"
          >
            ×
          </button>
        </div>
      </div>
    </motion.div>
  );
}
