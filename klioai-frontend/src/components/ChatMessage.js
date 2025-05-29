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

const hasStructuredContent = (content) => {
  const indicators = [
    /(?:problem|question)\s*\d+/i,
    /learning goals/i,
    /assignment/i,
    /tree diagram/i,
    /fundamental principle/i,
    /tackle.*together/i,
    // Enhanced fraction detection
    /multiply.*numerator/i,
    /multiply.*denominator/i,
    /\\frac\{.*\}\{.*\}/i,
    /\d+\/\d+.*×.*\d+\/\d+/i,
    /step.*multiply/i,
    /multiplying fractions.*fun/i,  // For your specific message
    /quick refresher.*how to/i
  ];
  
  return indicators.some(pattern => pattern.test(content));
};

// Function to automatically style Klio's structured responses
function formatKlioMessage(content) {
  if (!content) return content;
  
  // Auto-detect and style urgent items (🚨) - more flexible patterns
  let formattedContent = content.replace(
    /(🚨[^\n]*(?:overdue|OVERDUE|was due|past due)[^\n]*)/gi, 
    '<span class="urgent-item">$1</span>'
  );
  
  // Auto-detect and style due today items (⚠️)
  formattedContent = formattedContent.replace(
    /(⚠️[^\n]*(?:due today|DUE TODAY|today)[^\n]*)/gi, 
    '<span class="due-today-item">$1</span>'
  );
  
  // Auto-detect and style upcoming items (📅)
  formattedContent = formattedContent.replace(
    /(📅[^\n]*(?:due tomorrow|DUE TOMORROW|tomorrow|coming up)[^\n]*)/gi, 
    '<span class="upcoming-item">$1</span>'
  );
  
  // Also catch lines that mention overdue without emoji
  formattedContent = formattedContent.replace(
    /([^\n]*(?:overdue|was due yesterday)[^\n]*)/gi, 
    '<span class="urgent-item">$1</span>'
  );
  
  // Catch lines that mention due today without emoji  
  formattedContent = formattedContent.replace(
    /([^\n]*(?:due today)[^\n]*)/gi, 
    '<span class="due-today-item">$1</span>'
  );
  
  // Catch lines that mention due tomorrow without emoji
  formattedContent = formattedContent.replace(
    /([^\n]*(?:due tomorrow)[^\n]*)/gi, 
    '<span class="upcoming-item">$1</span>'
  );
  
  // Auto-detect and style grade information
  formattedContent = formattedContent.replace(
    /(Your .+ average is .+|Grade: .+\/.+|scored .+\/.+|\d+\.\d+%|\d+%)/g, 
    '<span class="grade-info">$1</span>'
  );
  
  // Auto-detect and style section headers (like "URGENT - Overdue!")
  formattedContent = formattedContent.replace(
    /^(URGENT[^\n]*|Due Today[^\n]*|Due Tomorrow[^\n]*|Coming up[^\n]*)/gm,
    '<strong>$1</strong>'
  );
  
  return formattedContent;
}

export default function ChatMessage({ message, onSendToWorkspace }) {
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

  // Format Klio's messages for better visual hierarchy
  const displayContent = isKlio && !message.isError 
    ? formatKlioMessage(message.content) 
    : message.content;

  // Determine if we should use HTML rendering or plain text
  const shouldUseHTML = isKlio && !message.isError && displayContent !== message.content;

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
          
          {shouldUseHTML ? (
            <div 
              className="text-sm sm:text-base whitespace-pre-wrap font-fredoka break-words chat-message-content"
              dangerouslySetInnerHTML={{ __html: displayContent }}
            />
          ) : (
            <div className="text-sm sm:text-base whitespace-pre-wrap font-fredoka break-words chat-message-content">
              {displayContent}
            </div>
          )}
          
          {/* Send to Workspace Button - NOW PROPERLY INSIDE THE COMPONENT */}
          {isKlio && hasStructuredContent(message.content) && onSendToWorkspace && (
            <button
              onClick={() => onSendToWorkspace(message)}
              className="mt-2 text-xs bg-[var(--accent-blue-10-opacity)] text-[var(--accent-blue)] px-3 py-1 rounded-full hover:bg-[var(--accent-blue-20-opacity)] transition-colors flex items-center"
            >
              📋 Send to Workspace
            </button>
          )}
        </div>
        <time className={timestampClasses}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </time>
      </div>
    </motion.div>
  );
}