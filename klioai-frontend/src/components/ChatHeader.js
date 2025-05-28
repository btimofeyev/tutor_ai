// klioai-frontend/src/components/ChatHeader.js
// (Assuming this is the header specifically for the chat content area,
// and a separate main Sidebar handles global branding and navigation)

// motion can be removed if no animations are used in this simplified header
// import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation'; // Still might be needed if it links somewhere specific from topic

export default function ChatHeader({ childName, currentTopic }) {
  const router = useRouter(); // Keep if topic might be clickable

  return (
    <header className="bg-[var(--background-card)] border-b border-[var(--border-subtle)] sticky top-0 z-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"> {/* Aligns with chat content max-width */}
        <div className="flex items-center justify-between h-16">
          
          {/* Left side: Current Topic or Child Name */}
          <div className="flex-grow min-w-0"> {/* flex-grow and min-w-0 allow text to truncate */}
            {currentTopic && (
                 <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate" title={currentTopic}>
                   {currentTopic}
                 </h2>
            )}
            {childName && !currentTopic && ( // Show child name if no specific topic is active
                <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                  Learning with {childName}
                </h2>
            )}
            {/* If both childName and currentTopic exist, you might combine them or prioritize one */}
            {childName && currentTopic && (
                 <div className="truncate">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] inline" title={currentTopic}>
                        {currentTopic}
                    </h2>
                    <span className="text-sm text-[var(--text-secondary)] ml-2">
                        for {childName}
                    </span>
                 </div>
            )}
             {!childName && !currentTopic && ( // Fallback if nothing is provided
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Klio Chat
                </h2>
            )}
          </div>

          {/* Right side: Placeholder for any CHAT-SPECIFIC actions if needed in the future */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Example of a chat-specific action (e.g., "Chat Info") - currently empty */}
            {/* 
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              // onClick={handleShowChatInfo} 
              className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--accent-blue)]/20 hover:text-[var(--accent-blue)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-blue)]"
              title="Chat Information"
            >
              <FiInfo size={18} />
            </motion.button> 
            */}
          </div>

        </div>
      </div>
    </header>
  );
}