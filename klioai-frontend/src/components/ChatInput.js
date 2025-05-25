// klioai-frontend/src/components/ChatInput.js
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { FiMic, FiSend, FiLoader, FiMicOff } from 'react-icons/fi';

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
      setMessage('');
      startListening();
    }
  };
  
  useEffect(() => {
    if (!isListening && transcript && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isListening, transcript]);

  const MAX_LENGTH = 500;

  return (
    <form onSubmit={handleSubmit} className="w-full">
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Voice Input Button - Matching screenshot style */}
          <button
            type="button"
            onClick={handleVoiceToggle}
            disabled={isLoading}
            className={`p-2.5 rounded-lg transition-colors flex-shrink-0
              ${isListening 
                ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' // Active recording
                : 'bg-purple-100 text-purple-600 hover:bg-purple-200' // Inactive
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            title={isListening ? "Stop Recording" : "Start Voice Input"}
          >
            {isListening ? <FiMicOff size={18} /> : <FiMic size={18} />}
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
            placeholder={isListening ? "Listening..." : "Type your message..."}
            className="input-base flex-1 !py-2.5 text-sm sm:text-base !rounded-lg" // Ensure rounded-lg
            maxLength={MAX_LENGTH}
            autoFocus
          />
          
          {/* Send Button - Matching screenshot style */}
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className={`p-2.5 rounded-lg transition-colors flex-shrink-0 text-white
              ${isLoading || !message.trim() 
                ? 'bg-purple-300 cursor-not-allowed' // Disabled state from screenshot
                : 'bg-purple-500 hover:bg-purple-600' // Active state
              }
            `}
            title="Send Message"
          >
            {isLoading ? <FiLoader className="animate-spin" size={20} /> : <FiSend size={20} />}
          </button>
        </div>
        {voiceError && <p className="text-xs text-red-500 text-center mt-1.5">{voiceError}</p>}
    </form>
  );
}