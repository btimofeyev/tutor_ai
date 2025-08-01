// klioai-frontend/src/components/ChatMessage.js - ENHANCED VERSION
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiStar, FiHeart, FiTrendingUp, FiCopy, FiCheck } from 'react-icons/fi';
import { useState, useEffect, useMemo, memo } from 'react';
import Image from 'next/image';

// Format relative time (e.g., "just now", "2 min ago", "1:30 PM")
const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  if (diffInMinutes < 1440) { // Less than 24 hours
    return messageTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// Enhanced Klio Avatar with dynamic expressions
const KlioAvatar = ({ messageType = 'default' }) => {
  const getAvatarStyle = () => {
    switch (messageType) {
      case 'celebration':
        return 'ring-2 ring-yellow-400 ring-offset-2 animate-pulse';
      case 'encouragement':
        return 'ring-2 ring-green-400 ring-offset-2';
      case 'question':
        return 'ring-2 ring-blue-400 ring-offset-2';
      default:
        return '';
    }
  };

  return (
    <div className={`flex-shrink-0 w-8 h-8 rounded-full overflow-hidden mr-2 shadow-sm bg-[var(--background-card)] ${getAvatarStyle()}`}>
      <Image
        src="/klio_logo.png"
        alt={`Klio AI tutor avatar - ${messageType === 'celebration' ? 'celebrating your success' : messageType === 'encouragement' ? 'encouraging you' : messageType === 'question' ? 'asking a question' : 'ready to help'}`}
        width={32}
        height={32}
        className="object-cover"
      />
    </div>
  );
};

// Detect the emotional tone and content type of messages
const analyzeMessageTone = (content) => {
  if (!content) return { type: 'default', hasEmojis: false, celebratory: false };
  
  const contentLower = content.toLowerCase();
  
  // Celebration indicators
  const celebrationWords = [
    'excellent', 'perfect', 'fantastic', 'amazing', 'great job', 'well done',
    'correct', 'right', 'brilliant', 'outstanding', 'wonderful', 'superb'
  ];
  
  // Encouragement indicators  
  const encouragementWords = [
    'keep going', 'you can do it', 'try again', 'almost there', 'good effort',
    'nice work', 'getting better', 'improving', 'progress'
  ];
  
  // Question indicators
  const questionWords = [
    'what do you think', 'can you', 'how about', 'what if', 'let\'s try',
    'what would happen', 'can you tell me'
  ];
  
  const hasEmojis = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(content);
  
  let type = 'default';
  let celebratory = false;
  
  if (celebrationWords.some(word => contentLower.includes(word))) {
    type = 'celebration';
    celebratory = true;
  } else if (encouragementWords.some(word => contentLower.includes(word))) {
    type = 'encouragement';
  } else if (questionWords.some(word => contentLower.includes(word)) || content.includes('?')) {
    type = 'question';
  }
  
  return { type, hasEmojis, celebratory };
};

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
    
    // Creative writing patterns
    /write.*story/i,
    /create.*character/i,
    /brainstorm.*ideas/i,
    /develop.*plot/i,
    /write.*essay/i,
    /creative.*writing/i,
    /story.*element/i,
    /character.*development/i,
    /setting.*description/i,
    /narrative.*voice/i,
    
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
  
  // Check for creative writing keywords
  const writingKeywords = ['story', 'character', 'plot', 'setting', 'write', 'essay', 'paragraph', 'creative', 'narrative', 'brainstorm', 'draft', 'revise'];
  const hasWritingKeywords = writingKeywords.some(keyword => content.toLowerCase().includes(keyword));
  
  // Special check for numbered lists that look like practice problems
  const hasNumberedMathList = /^\s*\d+\.\s*\\?\(/m.test(content) || // 1. \( or 1. (
                              /^\s*\d+\.\s*[^.]*[\+\-\*×÷\/]/m.test(content); // 1. something with math
  
  return hasIndicator || hasNumberedMathList || (hasMultipleNumbers && hasMathKeywords) || hasWritingKeywords;
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

const ChatMessage = memo(function ChatMessage({ message, onSendToWorkspace, hasStructuredWorkspace = false }) {
  const isKlio = message.role === 'klio';
  const [showCelebration, setShowCelebration] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Memoize message analysis to prevent recalculation
  const messageAnalysis = useMemo(() => analyzeMessageTone(message.content), [message.content]);

  // Copy message to clipboard
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };
  
  // Trigger celebration effect for celebratory messages
  useEffect(() => {
    if (isKlio && messageAnalysis.celebratory) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isKlio, messageAnalysis.celebratory]);

  // Simplified animations for better performance
  const messageVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: messageAnalysis.celebratory ? "spring" : "tween", 
        stiffness: 300, 
        damping: 25,
        duration: messageAnalysis.celebratory ? undefined : 0.2
      } 
    },
    exit: { opacity: 0, transition: { duration: 0.1 } }
  }), [messageAnalysis.celebratory]);

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
      // Dynamic styling based on message tone
      let borderColor = 'var(--accent-blue)';
      let bgColor = 'var(--background-card)';
      
      switch (messageAnalysis.type) {
        case 'celebration':
          borderColor = 'var(--accent-yellow)';
          bgColor = 'rgb(254 249 195)'; // yellow-100
          baseBubbleClasses = `p-3 shadow-lg bg-gradient-to-r from-yellow-50 to-orange-50 text-[var(--text-primary)]`;
          break;
        case 'encouragement':
          borderColor = 'var(--accent-green)';
          bgColor = 'rgb(240 253 244)'; // green-50
          baseBubbleClasses = `p-3 shadow-sm bg-gradient-to-r from-green-50 to-emerald-50 text-[var(--text-primary)]`;
          break;
        case 'question':
          borderColor = 'var(--accent-blue)';
          bgColor = 'rgb(239 246 255)'; // blue-50
          baseBubbleClasses = `p-3 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 text-[var(--text-primary)]`;
          break;
      }
      
      // Klio's Normal Message: Left and Bottom border with dynamic color
      borderBubbleClasses = `border-l-[3px] border-b-[3px] border-[${borderColor}]`;
      roundedClasses = 'rounded-tr-xl rounded-br-xl rounded-tl-xl';
      timestampClasses += ' text-[var(--text-secondary)] self-start';
      
      // Remove distracting animations - focus on content quality
    }
  } else {
    // Child's Message: Right and Bottom border in Accent Yellow
    borderBubbleClasses = `border-r-[3px] border-b-[3px] border-[var(--accent-yellow)]`;
    roundedClasses = 'rounded-tl-xl rounded-bl-xl rounded-tr-xl';
    timestampClasses += ' text-[var(--text-secondary)] self-end';
  }

  // Combine all bubble classes
  const finalBubbleClasses = `${baseBubbleClasses} ${borderBubbleClasses} ${roundedClasses}`;

  // Memoize message content formatting
  const { displayContent, shouldUseHTML } = useMemo(() => {
    const formatted = isKlio && !message.isError 
      ? formatKlioMessage(message.content) 
      : message.content;
    
    return {
      displayContent: formatted,
      shouldUseHTML: isKlio && !message.isError && formatted !== message.content
    };
  }, [isKlio, message.isError, message.content, formatKlioMessage]);

  // Memoize structured content detection
  const hasStructured = useMemo(() => 
    hasStructuredWorkspace || hasStructuredContent(message.content),
    [hasStructuredWorkspace, message.content]
  );

  // Handle the workspace button click
  const handleSendToWorkspace = () => {
    // Use structured workspace content if available
    if (message.workspaceContent) {
      if (onSendToWorkspace) {
        onSendToWorkspace(message, message.workspaceContent);
      }
      return;
    }
    
    // Fallback to parsing message content
    if (onSendToWorkspace) {
      onSendToWorkspace(message);
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
      role="group"
      aria-label={`Message from ${isKlio ? 'Klio AI assistant' : 'student'}`}
    >
      {isKlio && !message.isError && <KlioAvatar messageType={messageAnalysis.type} />}
      
      <div className={`flex flex-col max-w-[75%] sm:max-w-[70%] ${isKlio && message.isError ? 'ml-10' : ''}`}>
        <div className={finalBubbleClasses} role={isKlio ? 'assistant' : 'user'}>
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
          
          {/* Message Action Buttons */}
          <div className="flex items-center gap-2 mt-2">
            {/* Copy Button - Only for Klio messages */}
            {isKlio && !message.isError && (
              <button
                onClick={handleCopyMessage}
                className="text-xs bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow-darker-for-border)] px-2 py-1 rounded-full hover:bg-[var(--accent-yellow)]/30 transition-all duration-200 flex items-center space-x-1 border border-[var(--accent-yellow)]/40 hover:border-[var(--accent-yellow)]/60 focus-visible:ring-2 focus-visible:ring-[var(--accent-yellow)] focus-visible:ring-offset-1 touch-manipulation"
                title="Copy message to clipboard"
                aria-label="Copy message text"
              >
                {copied ? <FiCheck size={12} /> : <FiCopy size={12} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            )}
            
            {/* ENHANCED: Send to Workspace Button - Shows for ANY structured content */}
            {isKlio && hasStructured && onSendToWorkspace && (
              <motion.button
                onClick={handleSendToWorkspace}
                className="text-xs bg-[var(--accent-blue)]/20 text-[var(--accent-blue-darker-for-border)] px-2 py-1 rounded-full hover:bg-[var(--accent-blue)]/30 transition-all duration-200 flex items-center space-x-1 border border-[var(--accent-blue)]/40 hover:border-[var(--accent-blue)]/60 focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-1 touch-manipulation"
              title="Send these problems to your workspace for practice"
              aria-label="Send problems to workspace for interactive practice"
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)"
              }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.span
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                aria-hidden="true"
              >
                📋
              </motion.span>
              <span>Send to Workspace</span>
              </motion.button>
            )}
          </div>
        </div>
        <time className={timestampClasses} title={new Date(message.timestamp).toLocaleString()}>
          {formatRelativeTime(message.timestamp)}
        </time>
      </div>
    </motion.div>
  );
});

export default ChatMessage;