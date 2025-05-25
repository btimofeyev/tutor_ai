// klioai-frontend/src/components/ChatHeader.js
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FiRefreshCw, FiSettings, FiLogOut, FiMessageSquare } from 'react-icons/fi'; // Using react-icons

export default function ChatHeader({ childName, onClearChat, onLogout }) {
  const router = useRouter();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20"> {/* Subtle border, sticky */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"> {/* Aligns with chat content max-width */}
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-2.5">
            <motion.div
              // Optional: a more subtle animation or a static icon
              // animate={{ rotate: [0, 5, -5, 0] }} 
              // transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              className="text-2xl text-purple-600 cursor-pointer" // Slightly smaller if keeping emoji
              onClick={() => router.push('/')} // Assuming home is '/' or make it '/dashboard'
              title="Klio Home"
            >
              {/* 🤖 or <FiMessageSquare size={24} /> */}
               <span className="font-bold text-2xl">Klio</span>
            </motion.div>
            {/* Removed the Klio text next to emoji, using Klio as clickable brand */}
            {childName && (
                <span className="text-sm text-slate-500 hidden sm:block">
                  | Learning with {childName}
                </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClearChat}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-purple-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              title="New Chat"
            >
              <FiRefreshCw size={18} />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/settings')} // Use router.push
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-purple-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              title="Settings"
            >
              <FiSettings size={18} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLogout}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-red-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500" // Red for logout emphasis
              title="Logout"
            >
              <FiLogOut size={18} />
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
}