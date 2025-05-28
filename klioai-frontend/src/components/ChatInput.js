// klioai-frontend/src/components/ChatInput.js
import { useState, useRef, useEffect } from 'react';
// motion is not used here, can be removed if not needed for future enhancements in this specific file
// import { motion } from 'framer-motion';
import { useVoiceInput } from '../hooks/useVoiceInput'; // Assuming path is correct
import { FiMic, FiSend, FiLoader, FiMicOff } from 'react-icons/fi';

// Assuming you have your global Button component, it might be useful for the Send button.
// If not, we style it directly.
// import Button from './ui/Button'; // Path to your global Button component

export default function ChatInput({ onSendMessage, isLoading }) {
  const [message, setMessage] = useState('');
  const { startListening, stopListening, transcript, isListening, error: voiceError } = useVoiceInput();
  const inputRef = useRef(null);

  useEffect(() => {
    if (transcript) {
      setMessage(prev => (prev ? prev + ' ' : '') + transcript);
    }
  }, [transcript]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      if (isListening) stopListening();
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      setMessage(''); // Clear message before starting new voice input
      startListening();
    }
  };
  
  useEffect(() => {
    // Focus input after voice input stops and there's a transcript
    if (!isListening && transcript && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isListening, transcript]);

  const MAX_LENGTH = 500; // Or get from a config

  // Define button styles using CSS variables for easy theming
  const voiceButtonBase = `p-2.5 rounded-[var(--radius-lg)] transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-1`;
  const voiceButtonInactive = `bg-[var(--accent-yellow-15-opacity)] text-[var(--accent-yellow-darker-for-border)] hover:bg-[var(--accent-yellow-20-opacity)] focus-visible:ring-[var(--accent-yellow)]`;
  const voiceButtonActive = `bg-[var(--accent-red)] text-[var(--accent-red-text-on)] hover:bg-[var(--accent-red-hover)] focus-visible:ring-[var(--accent-red)] animate-pulse`; // Using pastel red for active recording

  const sendButtonBase = `p-2.5 rounded-[var(--radius-lg)] transition-colors flex-shrink-0 text-[var(--accent-blue-text-on)] focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-[var(--accent-blue)]`;
  const sendButtonActive = `bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)]`;
  const sendButtonDisabled = `bg-[var(--accent-blue)]/40 cursor-not-allowed`;


  return (
    <form onSubmit={handleSubmit} className="w-full">
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Voice Input Button - Themed */}
          <button
            type="button"
            onClick={handleVoiceToggle}
            disabled={isLoading} // Disable if main send is loading, or add separate voice loading state
            className={`${voiceButtonBase} 
              ${isListening 
                ? voiceButtonActive
                : voiceButtonInactive
              } disabled:opacity-60 disabled:cursor-not-allowed disabled:!bg-[var(--border-subtle)] disabled:!text-[var(--text-tertiary)] disabled:hover:!bg-[var(--border-subtle)]`} // More specific disabled style
            title={isListening ? "Stop Recording" : "Start Voice Input"}
          >
            {isListening ? <FiMicOff size={18} /> : <FiMic size={18} />}
          </button>

          {/* Text Input - Themed (using .input-base from globals.css) */}
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
            placeholder={isListening ? "Listening..." : "Type your message..."}
            className="input-base flex-1 !py-2.5 text-sm sm:text-base !rounded-[var(--radius-lg)]" // Overriding .input-base radius if needed, or ensure .input-base uses --radius-lg
            maxLength={MAX_LENGTH}
            autoFocus
          />
          
          {/* Send Button - Themed */}
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className={`${sendButtonBase}
              ${isLoading || !message.trim() 
                ? sendButtonDisabled
                : sendButtonActive
              }
            `}
            title="Send Message"
          >
            {isLoading ? <FiLoader className="animate-spin" size={20} /> : <FiSend size={20} />}
          </button>
        </div>
        {voiceError && <p className="text-xs text-[var(--accent-red)] text-center mt-1.5">{voiceError}</p>}
    </form>
  );
}