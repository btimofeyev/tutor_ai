// klioai-frontend/src/components/SuggestionBubbles.js
import { motion } from 'framer-motion';

export default function SuggestionBubbles({ suggestions, onSuggestionClick, workspaceType = null, isAdaptive = false }) {
  // Get context-aware suggestions based on current workspace
  const getContextSuggestions = () => {
    const contextSuggestions = {
      'math_problems': [
        "Give me more math practice! 🧮",
        "Help me with fractions 🍕",
        "Can we try word problems? 📝"
      ],
      'science_investigation': [
        "Let's do a science experiment! 🔬",
        "Help me with my hypothesis 💡",
        "Explain this science concept 🧪"
      ],
      'language_practice': [
        "Help me write a story ✍️",
        "Practice reading comprehension 📖",
        "Check my grammar 📝"
      ],
      'creative_writing_toolkit': [
        "Help me develop my character 👤",
        "Improve my story plot 📈",
        "Help me revise my writing ✏️"
      ],
      'history_analysis': [
        "Explain this historical event 📜",
        "Help me with timeline questions ⏰",
        "Compare different time periods 🏛️"
      ]
    };

    return contextSuggestions[workspaceType] || [];
  };

  // Combine regular suggestions with context-aware ones
  const allSuggestions = workspaceType
    ? [...getContextSuggestions(), ...suggestions.slice(0, 2)]
    : suggestions;

  if (!allSuggestions || allSuggestions.length === 0) return null;

  // Themed styles for suggestion bubbles
  const bubbleBaseStyles = "px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-1";

  // Using accent-blue for suggestions
  const bubbleThemeStyles = `
    bg-[var(--accent-blue)]/20
    text-[var(--accent-blue-darker-for-border)] /* Using a slightly darker blue for text for readability */
    border border-[var(--accent-blue)]/40
    hover:bg-[var(--accent-blue)]/30
    hover:border-[var(--accent-blue)]/60
    focus-visible:ring-[var(--accent-blue)]
    focus-visible:ring-offset-[var(--background-card)]
  `;

  return (
    <motion.div
      className="flex flex-wrap justify-center gap-2 py-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.2 }}
    >
      {allSuggestions.map((suggestion, index) => (
        <motion.button
          key={index}
          onClick={() => onSuggestionClick(suggestion)}
          className={`${bubbleBaseStyles} ${bubbleThemeStyles}`}
          whileHover={{ scale: 1.03, y: -1 }} // Slight lift on hover
          whileTap={{ scale: 0.97 }}

        >
          {suggestion}
        </motion.button>
      ))}
    </motion.div>
  );
}
