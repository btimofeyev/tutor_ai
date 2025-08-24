'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiSend, FiRotateCcw, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

const ScratchpadBase = forwardRef(({ 
  title = "Scratchpad",
  icon = "📝",
  onSubmitWork,
  onClose,
  isVisible,
  children,
  primaryColor = "blue"
}, ref) => {
  const [isDocked, setIsDocked] = useState(true);
  const [workContent, setWorkContent] = useState('');

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    clear: () => {
      setWorkContent('');
      // Clear any child component state through callback
      if (ref.current?.clearChildren) {
        ref.current.clearChildren();
      }
    },
    getWork: () => workContent,
    setWork: (content) => setWorkContent(content)
  }));

  const handleSubmit = () => {
    if (onSubmitWork) {
      // If this is a custom scratchpad (like History), let it handle submission
      if (children) {
        onSubmitWork();
      } else {
        // For basic scratchpads, use workContent
        if (workContent.trim()) {
          onSubmitWork(workContent);
        }
      }
    }
  };

  const handleClear = () => {
    setWorkContent('');
    if (ref.current?.clearChildren) {
      ref.current.clearChildren();
    }
  };

  const colorClasses = {
    blue: {
      header: 'bg-blue-600',
      button: 'bg-blue-500 hover:bg-blue-600',
      border: 'border-blue-200'
    },
    purple: {
      header: 'bg-purple-600',
      button: 'bg-purple-500 hover:bg-purple-600',
      border: 'border-purple-200'
    },
    green: {
      header: 'bg-green-600',
      button: 'bg-green-500 hover:bg-green-600',
      border: 'border-green-200'
    },
    orange: {
      header: 'bg-orange-600',
      button: 'bg-orange-500 hover:bg-orange-600',
      border: 'border-orange-200'
    }
  };

  const colors = colorClasses[primaryColor] || colorClasses.blue;

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`h-full flex flex-col bg-white ${isDocked ? '' : 'fixed right-4 top-20 w-96 h-[600px] shadow-2xl rounded-lg border ' + colors.border + ' z-50'}`}
    >
      {/* Header */}
      <div className={`${colors.header} text-white px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center space-x-2">
          <span className="text-xl">{icon}</span>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsDocked(!isDocked)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            title={isDocked ? "Float panel" : "Dock panel"}
          >
            {isDocked ? <FiMaximize2 size={16} /> : <FiMinimize2 size={16} />}
          </button>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            title="Close"
          >
            <FiX size={18} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>

      {/* Action Bar */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <button
            onClick={handleClear}
            className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm"
          >
            <FiRotateCcw size={16} />
            <span>Clear</span>
          </button>
          
          <button
            onClick={handleSubmit}
            className={`flex items-center space-x-1 px-4 py-2 text-white rounded-lg transition-colors text-sm ${colors.button}`}
          >
            <FiSend size={16} />
            <span>Submit Work</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
});

ScratchpadBase.displayName = 'ScratchpadBase';

export default ScratchpadBase;