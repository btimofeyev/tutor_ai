// app/dashboard/chat-insights/components/StickyNotesSection.js
'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StickyNote from './StickyNote';

export default function StickyNotesSection({
  title,
  date,
  summaries = [],
  onMarkRead,
  onDelete,
  getChildColor,
  emptyMessage = "No conversations this day"
}) {
  const [formattedDate, setFormattedDate] = useState('');

  // Format date on client side to avoid hydration mismatch
  useEffect(() => {
    if (!date) return;

    const formatSectionDate = (dateString) => {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Reset time to compare dates only
      today.setHours(0, 0, 0, 0);
      yesterday.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      if (date.getTime() === today.getTime()) {
        return '📅 Today';
      } else if (date.getTime() === yesterday.getTime()) {
        return '📅 Yesterday';
      } else {
        return `📅 ${date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        })}`;
      }
    };

    setFormattedDate(formatSectionDate(date));
  }, [date]);

  if (summaries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {title || formattedDate || 'Loading...'}
        </h3>
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-2">💤</div>
          <p className="text-sm font-medium">{emptyMessage}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-8"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {title || formattedDate || 'Loading...'}
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{summaries.length} child{summaries.length !== 1 ? 'ren' : ''}</span>
          <span>•</span>
          <span>
            {summaries.reduce((total, summary) => total + (summary.sessionCount || 0), 0)} session
            {summaries.reduce((total, summary) => total + (summary.sessionCount || 0), 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Sticky Notes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {summaries.map((summary, index) => (
          <motion.div
            key={summary.id}
            initial={{ opacity: 0, y: 20, rotate: -2 }}
            animate={{
              opacity: 1,
              y: 0,
              rotate: (index % 3) * 2 - 2 // Slight rotation variation: -2, 0, 2 degrees
            }}
            transition={{
              duration: 0.3,
              delay: index * 0.1 // Stagger animation
            }}
          >
            <StickyNote
              summary={summary}
              color={getChildColor ? getChildColor(summary.childId) : 'yellow'}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
            />
          </motion.div>
        ))}
      </div>

      {/* Section Footer with Stats */}
      {summaries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span>
              📊 Total learning time: {summaries.reduce((total, summary) => total + (summary.totalMinutes || 0), 0)} minutes
            </span>
            <span>
              🎯 Problems solved: {summaries.reduce((total, summary) =>
                total + (summary.learningProgress?.problemsSolved || 0), 0
              )}
            </span>
            <span>
              📚 Subjects: {[...new Set(summaries.flatMap(s => s.subjectsDiscussed || []))].join(', ') || 'Various'}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
