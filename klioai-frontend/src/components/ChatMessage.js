// klioai-frontend/src/components/ChatMessage.js
import { motion } from 'framer-motion'; // Removed AnimatePresence as actions are removed
// Removed FiVolume2, FiPauseCircle, FiCopy as actions are removed
import { FiAlertTriangle } from 'react-icons/fi'; // Keep for error icon

export default function ChatMessage({ message }) {
  // Removed onSpeak, onStopSpeak, isSpeakingThisMessage, isHovered, setIsHovered
  const isKlio = message.role === 'klio';

  const messageVariants = {
    hidden: { opacity: 0, y: 10 }, // Softer entry
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } },
    exit: { opacity: 0, transition: { duration: 0.15 } }
  };

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout // Keeps layout smooth when messages are added/removed
      className={`flex w-full ${!isKlio ? 'justify-end' : 'justify-start'}`}
    >
      {/* Message Bubble */}
      <div className={`flex flex-col max-w-[75%] sm:max-w-[70%]`}>
        <div
          className={`
            p-3 rounded-lg
            ${isKlio 
              ? (message.isError 
                  ? 'bg-red-50 text-red-600 border border-red-200 shadow-sm' // Error style
                  : 'bg-slate-100 text-slate-700 shadow-sm') // Klio's normal bubble
              : 'bg-purple-600 text-white shadow-sm' // Child's bubble
            }
          `}
        >
          <pre className="text-sm sm:text-base whitespace-pre-wrap font-fredoka">{message.content}</pre>
        </div>
        {/* Timestamp */}
        <time className={`text-xs mt-1 px-1 ${isKlio ? 'text-slate-400 self-start' : 'text-purple-200 self-end'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </time>
      </div>
    </motion.div>
  );
}