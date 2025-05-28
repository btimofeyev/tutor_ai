// klioai-frontend/src/components/ChatMessage.js
import { motion } from 'framer-motion';
import { FiAlertTriangle } from 'react-icons/fi';
import Image from 'next/image';

const KlioAvatar = () => (
  <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden mr-2 shadow-sm bg-[var(--background-card)]">
    <Image
      src="/klio_logo.png"
      alt="Klio AI"
      width={32}
      height={32}
      className="object-cover"
    />
  </div>
);

export default function ChatMessage({ message }) {
  const isKlio = message.role === 'klio';

  const messageVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } },
    exit: { opacity: 0, transition: { duration: 0.15 } }
  };

  // Base bubble classes: white background, padding, shadow, default text
  let baseBubbleClasses = 'p-3 shadow-sm bg-[var(--background-card)] text-[var(--text-primary)]';
  let borderBubbleClasses = ''; // For the unique border style
  let roundedClasses = '';
  let timestampClasses = 'text-xs mt-1 px-1';

  if (isKlio) {
    if (message.isError) {
      // Error messages get a full, light red border and slightly tinted background for prominence
      baseBubbleClasses = `p-3 shadow-sm bg-[var(--accent-red)]/10 text-[var(--accent-red)]`; // Light red bg, red text
      borderBubbleClasses = `border-2 border-[var(--accent-red)]/50`; // Full red border
      roundedClasses = 'rounded-xl'; // Standard rounding for errors
      timestampClasses += ' text-[var(--accent-red)]/70 self-start';
    } else {
      // Klio's Normal Message: Left and Bottom border in Accent Blue
      // We want the bubble to be rounded, but the border to only show on specific sides before rounding.
      // Tailwind applies borders before rounding.
      borderBubbleClasses = `border-l-[3px] border-b-[3px] border-[var(--accent-blue)]`;
      // Specific rounding: top-right and bottom-right fully rounded, top-left rounded, bottom-left more "square" due to border.
      roundedClasses = 'rounded-tr-xl rounded-br-xl rounded-tl-xl';
      timestampClasses += ' text-[var(--text-secondary)] self-start';
    }
  } else {
    // Child's Message: Right and Bottom border in Accent Yellow
    borderBubbleClasses = `border-r-[3px] border-b-[3px] border-[var(--accent-yellow)]`;
    // Specific rounding: top-left and bottom-left fully rounded, top-right rounded, bottom-right more "square"
    roundedClasses = 'rounded-tl-xl rounded-bl-xl rounded-tr-xl';
    timestampClasses += ' text-[var(--text-secondary)] self-end';
  }

  // Combine all bubble classes
  const finalBubbleClasses = `${baseBubbleClasses} ${borderBubbleClasses} ${roundedClasses}`;

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className={`flex w-full ${!isKlio ? 'justify-end' : 'items-end'}`}
    >
      {isKlio && !message.isError && <KlioAvatar />}
      
      <div className={`flex flex-col max-w-[75%] sm:max-w-[70%] ${isKlio && message.isError ? 'ml-10' : ''}`}>
        <div className={finalBubbleClasses}>
          {message.isError && (
            <FiAlertTriangle className="inline-block mr-1.5 mb-0.5" size={16} />
          )}
          <div className="text-sm sm:text-base whitespace-pre-wrap font-fredoka break-words">
            {message.content}
          </div>
        </div>
        <time className={timestampClasses}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </time>
      </div>
    </motion.div>
  );
}