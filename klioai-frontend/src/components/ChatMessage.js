// klioai-frontend/src/components/ChatMessage.js - ENHANCED VERSION
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

// ENHANCED: Better detection for ALL types of structured content including LaTeX
const hasStructuredContent = (content) => {
  if (!content || typeof content !== 'string') return false;
  
  const indicators = [
    // LaTeX expressions (PRIORITY - these are very common in math)
    /\\?\(\s*[^)]*[\+\-\*×÷\/\\]\s*[^)]*\s*\\?\)/,  // \( 7 + 5 \) or ( 7 + 5 )
    /\\frac\{[^}]+\}\{[^}]+\}/,  // \frac{2}{3}
    /\\times/,  // \times
    
    // Numbered lists with math content
    /^\s*\d+\.\s*[^.]*[\+\-\*×÷\/\\]/m,  // 1. 4 × something
    
    // Math problems - ANY arithmetic
    /\d+\s*[\+\-\*×÷\/]\s*\d+/,
    /what\s+is\s+\d+[\+\-\*×÷\/]\d+/i,
    /\*\*[^*]*\d+[^*]*\*\*/,  // Bold text with numbers
    
    // Fractions
    /\d+\/\d+.*[×\*].*\d+\/\d+/,
    /multiply.*numerator/i,
    /multiply.*denominator/i,
    
    // Problem indicators
    /problem\s*\d+/i,
    /question\s*\d+/i,
    
    // Learning content
    /learning goals/i,
    /assignment/i,
    
    // Step-by-step content
    /step\s*\d+/i,
    /first.*second/i,
    /\d+\.\s*\*\*/,
    
    // Educational patterns that suggest practice/workspace
    /tackle.*together/i,
    /let's.*solve/i,
    /practice.*problem/i,
    /warm.*up.*problem/i,
    /give.*try/i,
    /let me know what.*come up with/i,
    /work through/i,
    /try solving/i,
    
    // Math instruction patterns
    /multiply.*together/i,
    /add.*numbers/i,
    /solve.*equation/i,
    /calculate/i,
    
    // Tree diagrams and visual content
    /tree diagram/i,
    /fundamental principle/i
  ];
  
  const hasIndicator = indicators.some(pattern => pattern.test(content));
  
  // Additional check for multiple numbers that might be problems
  const numberCount = (content.match(/\d+/g) || []).length;
  const hasMultipleNumbers = numberCount >= 2;
  
  // Check for math-related keywords
  const mathKeywords = ['solve', 'calculate', 'multiply', 'add', 'subtract', 'divide', 'problem', 'equation', 'answer', 'practice', 'try'];
  const hasMathKeywords = mathKeywords.some(keyword => content.toLowerCase().includes(keyword));
  
  // Special check for numbered lists that look like practice problems
  const hasNumberedMathList = /^\s*\d+\.\s*\\?\(/m.test(content) || // 1. \( or 1. (
                              /^\s*\d+\.\s*[^.]*[\+\-\*×÷\/]/m.test(content); // 1. something with math
  
  const result = hasIndicator || hasNumberedMathList || (hasMultipleNumbers && hasMathKeywords);
  
  if (result) {
    console.log('✅ Structured content detected in:', content.substring(0, 100));
    console.log('   - Has math indicators:', hasIndicator);
    console.log('   - Has numbered math list:', hasNumberedMathList);
    console.log('   - Has multiple numbers + keywords:', hasMultipleNumbers && hasMathKeywords);
  }
  
  return result;
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
  
  // Style math problems in bold and LaTeX expressions
  formattedContent = formattedContent.replace(
    /(\*\*[^*]+\*\*)/g,
    '<span class="math-problem-highlight">$1</span>'
  );
  
  // Style LaTeX expressions
  formattedContent = formattedContent.replace(
    /(\\?\([^)]*[\+\-\*×÷\/\\][^)]*\\?\))/g,
    '<span class="math-problem-highlight">$1</span>'
  );
  
  return formattedContent;
}

export default function ChatMessage({ message, onSendToWorkspace, hasStructuredWorkspace = false }) {
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
      borderBubbleClasses = `border-l-[3px] border-b-[3px] border-[var(--accent-blue)]`;
      roundedClasses = 'rounded-tr-xl rounded-br-xl rounded-tl-xl';
      timestampClasses += ' text-[var(--text-secondary)] self-start';
    }
  } else {
    // Child's Message: Right and Bottom border in Accent Yellow
    borderBubbleClasses = `border-r-[3px] border-b-[3px] border-[var(--accent-yellow)]`;
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

  // Check if this message has structured content - ENHANCED detection
  const hasStructured = hasStructuredWorkspace || hasStructuredContent(message.content);

  // Handle the workspace button click
  const handleSendToWorkspace = () => {
    console.log('🔄 Sending message to workspace:', message.content.substring(0, 100));
    
    // NEW: If we have structured workspace content, use it directly
    if (message.workspaceContent) {
      console.log('✅ Using structured workspace content from message');
      // For structured content, we could trigger a different handler
      // or pass the structured content directly
      if (onSendToWorkspace) {
        onSendToWorkspace(message, message.workspaceContent);
      }
      return;
    }
    
    // LEGACY: Fallback to parsing message content
    if (onSendToWorkspace) {
      onSendToWorkspace(message);
    } else {
      console.warn('⚠️ onSendToWorkspace not provided');
    }
  };

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
          
          {/* ENHANCED: Send to Workspace Button - Shows for ANY structured content */}
          {isKlio && hasStructured && onSendToWorkspace && (
            <button
              onClick={handleSendToWorkspace}
              className="mt-3 text-xs bg-[var(--accent-blue-10-opacity)] text-[var(--accent-blue)] px-3 py-1.5 rounded-full hover:bg-[var(--accent-blue-20-opacity)] transition-all duration-200 flex items-center space-x-1 border border-[var(--accent-blue-40-opacity-for-border)] hover:border-[var(--accent-blue)] transform hover:scale-105"
              title="Send these problems to your workspace for practice"
            >
              <span>📋</span>
              <span>Send to Workspace</span>
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