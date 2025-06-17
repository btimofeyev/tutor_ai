// app/dashboard/chat-insights/components/StickyNote.js
'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDownIcon, 
  ChevronUpIcon,
  CheckIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

export default function StickyNote({ 
  summary, 
  color = 'yellow',
  onMarkRead, 
  onDelete,
  className = '' 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActioning, setIsActioning] = useState(false);

  const handleMarkRead = async () => {
    setIsActioning(true);
    try {
      await onMarkRead(summary.id);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Delete conversation summary for ${summary.childName}?`)) {
      setIsActioning(true);
      try {
        await onDelete(summary.id);
      } catch (error) {
        console.error('Failed to delete:', error);
        setIsActioning(false);
      }
    }
  };

  // Color classes for different children
  const colorClasses = {
    yellow: 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-l-yellow-400 text-yellow-900',
    blue: 'bg-gradient-to-br from-blue-100 to-blue-200 border-l-blue-400 text-blue-900',
    green: 'bg-gradient-to-br from-green-100 to-green-200 border-l-green-400 text-green-900',
    purple: 'bg-gradient-to-br from-purple-100 to-purple-200 border-l-purple-400 text-purple-900',
    pink: 'bg-gradient-to-br from-pink-100 to-pink-200 border-l-pink-400 text-pink-900',
    indigo: 'bg-gradient-to-br from-indigo-100 to-indigo-200 border-l-indigo-400 text-indigo-900',
    orange: 'bg-gradient-to-br from-orange-100 to-orange-200 border-l-orange-400 text-orange-900',
    teal: 'bg-gradient-to-br from-teal-100 to-teal-200 border-l-teal-400 text-teal-900',
  };

  const baseClasses = `
    relative p-4 rounded-lg shadow-md border-l-4 cursor-pointer
    transform transition-all duration-200 ease-in-out
    hover:scale-105 hover:shadow-lg hover:rotate-1
    ${colorClasses[color] || colorClasses.yellow}
    ${isExpanded ? 'scale-105' : ''}
    ${className}
  `;

  const formatTime = (minutes) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, y: -20, rotate: 1 }}
      transition={{ duration: 0.3 }}
      className={baseClasses}
      style={{
        transformOrigin: 'center center',
        opacity: isActioning ? 0.5 : 1,
        pointerEvents: isActioning ? 'none' : 'auto'
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-lg mb-1">{summary.childName}</h4>
          <div className="flex items-center gap-2 text-sm opacity-75">
            <span>{summary.sessionCount} session{summary.sessionCount !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{formatTime(summary.totalMinutes)}</span>
            {summary.engagementLevel && (
              <>
                <span>•</span>
                <span className={`font-medium ${
                  summary.engagementLevel === 'high' ? 'text-green-700' :
                  summary.engagementLevel === 'medium' ? 'text-yellow-700' :
                  'text-gray-600'
                }`}>
                  {summary.engagementLevel} engagement
                </span>
              </>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMarkRead();
            }}
            disabled={isActioning}
            className="p-1.5 rounded-full bg-white/50 hover:bg-green-200 transition-colors"
            title="Mark as read"
          >
            <CheckIcon className="h-4 w-4 text-green-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isActioning}
            className="p-1.5 rounded-full bg-white/50 hover:bg-red-200 transition-colors"
            title="Delete summary"
          >
            <XMarkIcon className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* Key Highlights Preview */}
      <div className="mb-3">
        <div className="text-sm space-y-1">
          {(summary.keyHighlights || []).slice(0, isExpanded ? undefined : 2).map((highlight, index) => (
            <div key={index} className="flex items-start gap-1">
              <span className="text-xs mt-0.5">•</span>
              <span className={isExpanded ? '' : 'truncate'}>{highlight}</span>
            </div>
          ))}
          {!isExpanded && (summary.keyHighlights || []).length > 2 && (
            <div className="text-xs opacity-60 font-medium">
              +{(summary.keyHighlights || []).length - 2} more highlights
            </div>
          )}
        </div>
      </div>

      {/* Subjects Badge */}
      {(summary.subjectsDiscussed || []).length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {(summary.subjectsDiscussed || []).map((subject, index) => (
              <span 
                key={index}
                className="px-2 py-1 text-xs rounded-full bg-white/60 font-medium"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/30 pt-3 mt-3 space-y-3"
          >
            {/* Learning Progress */}
            {summary.learningProgress && (
              <div>
                <h5 className="font-semibold text-sm mb-2">Learning Progress</h5>
                <div className="text-sm space-y-1">
                  {summary.learningProgress.problemsSolved > 0 && (
                    <div>🧮 Solved {summary.learningProgress.problemsSolved} problems</div>
                  )}
                  {(summary.learningProgress.masteredTopics || []).length > 0 && (
                    <div>✅ Mastered: {summary.learningProgress.masteredTopics.join(', ')}</div>
                  )}
                  {(summary.learningProgress.struggledWith || []).length > 0 && (
                    <div>🤔 Needs help with: {summary.learningProgress.struggledWith.join(', ')}</div>
                  )}
                </div>
              </div>
            )}

            {/* Parent Suggestions */}
            {(summary.parentSuggestions || []).length > 0 && (
              <div>
                <h5 className="font-semibold text-sm mb-2">Suggestions for You</h5>
                <div className="text-sm space-y-1">
                  {summary.parentSuggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-1">
                      <span className="text-xs mt-0.5">💡</span>
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Materials Worked On */}
            {(summary.materialsWorkedOn || []).length > 0 && (
              <div>
                <h5 className="font-semibold text-sm mb-2">Materials Covered</h5>
                <div className="text-sm space-y-1">
                  {summary.materialsWorkedOn.map((material, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        material.progress === 'completed' ? 'bg-green-500' :
                        material.progress === 'partial' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}></span>
                      <span>{material.title} ({material.subject})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute bottom-2 right-2 p-1 rounded-full bg-white/50 hover:bg-white/80 transition-colors"
        title={isExpanded ? 'Show less' : 'Show more'}
      >
        {isExpanded ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        )}
      </button>

      {/* Date/Status indicator */}
      <div className="absolute top-2 right-2 opacity-60">
        <div className={`w-2 h-2 rounded-full ${
          summary.status === 'unread' ? 'bg-blue-500' :
          summary.status === 'read' ? 'bg-gray-400' :
          'bg-gray-300'
        }`}></div>
      </div>
    </motion.div>
  );
}