// klioai-frontend/src/components/SuggestionBubbles.js
import { motion } from 'framer-motion';

export default function SuggestionBubbles({ suggestions, onSuggestionClick }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    // This div will be centered by its parent in ChatPage.js. 
    // The 'flex justify-center' here makes sure the bubbles themselves are centered if they don't fill the line.
    <motion.div 
      className="flex flex-wrap justify-center gap-2 py-2" 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.2 }}
    >
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={index}
          onClick={() => onSuggestionClick(suggestion)}
          className="px-3 py-1.5 text-xs sm:text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {suggestion}
        </motion.button>
      ))}
    </motion.div>
  );
}