// app/dashboard/chat-insights/components/ConversationSummariesView.js
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StickyNotesSection from './StickyNotesSection';
import api from '../../../../utils/api';
import { useToast } from '../../../../hooks/useToast';

export default function ConversationSummariesView({ selectedChild, refreshTrigger = 0 }) {
  const [chatInsights, setChatInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('unread'); // 'unread', 'read', 'all'
  const { showSuccess, showError } = useToast();

  // Color mapping for children (using existing subject color system)
  const childColors = ['yellow', 'blue', 'green', 'purple', 'pink', 'indigo', 'orange', 'teal'];
  const getChildColor = (childId) => {
    // Simple hash to consistently assign colors
    const hash = childId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return childColors[hash % childColors.length];
  };

  // Fetch chat insights
  const fetchChatInsights = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        days: '14', // Show last 2 weeks
        status: filter
      });
      
      if (selectedChild?.id) {
        params.append('childId', selectedChild.id);
      }

      const response = await api.get(`/parent/chat-insights?${params}`);
      
      if (response.data.success) {
        setChatInsights(response.data.chatInsights || []);
      } else {
        throw new Error('Failed to fetch chat insights');
      }
    } catch (err) {
      console.error('Error fetching chat insights:', err);
      setError(err.response?.data?.error || 'Failed to load conversation summaries');
      setChatInsights([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchChatInsights();
  }, [selectedChild, filter, refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle marking summary as read
  const handleMarkAsRead = async (summaryId) => {
    try {
      await api.post(`/parent/chat-insights/${summaryId}/mark-read`);
      showSuccess('Marked as read');
      
      // Update local state to reflect the change
      setChatInsights(prev => prev.map(day => ({
        ...day,
        summaries: day.summaries.map(summary => 
          summary.id === summaryId 
            ? { ...summary, status: 'read' }
            : summary
        )
      })).filter(day => filter === 'all' || day.summaries.some(s => 
        filter === 'read' ? s.status === 'read' : s.status === 'unread'
      )));
      
    } catch (err) {
      console.error('Error marking as read:', err);
      showError('Failed to mark as read');
    }
  };

  // Handle deleting summary
  const handleDelete = async (summaryId) => {
    try {
      await api.delete(`/parent/chat-insights/${summaryId}`);
      showSuccess('Summary deleted');
      
      // Remove from local state
      setChatInsights(prev => prev.map(day => ({
        ...day,
        summaries: day.summaries.filter(summary => summary.id !== summaryId)
      })).filter(day => day.summaries.length > 0));
      
    } catch (err) {
      console.error('Error deleting summary:', err);
      showError('Failed to delete summary');
    }
  };

  // Handle marking all as read
  const handleMarkAllAsRead = async () => {
    if (!window.confirm('Mark all summaries as read?')) return;
    
    try {
      const payload = {};
      if (selectedChild?.id) {
        payload.childId = selectedChild.id;
      }
      
      const response = await api.post('/parent/chat-insights/mark-all-read', payload);
      showSuccess(`Marked ${response.data.updatedCount} summaries as read`);
      
      // Refresh the view
      fetchChatInsights();
      
    } catch (err) {
      console.error('Error marking all as read:', err);
      showError('Failed to mark all as read');
    }
  };

  // Group insights by time periods
  const groupedInsights = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const grouped = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };
    
    chatInsights.forEach(dayData => {
      const date = new Date(dayData.date);
      
      if (dayData.date === todayStr) {
        grouped.today = dayData.summaries;
      } else if (dayData.date === yesterdayStr) {
        grouped.yesterday = dayData.summaries;
      } else if (date >= oneWeekAgo) {
        grouped.thisWeek.push(dayData);
      } else {
        grouped.older.push(dayData);
      }
    });
    
    return grouped;
  }, [chatInsights]);

  // Calculate total unread count
  const unreadCount = useMemo(() => {
    return chatInsights.reduce((total, day) => 
      total + day.summaries.filter(s => s.status === 'unread').length, 0
    );
  }, [chatInsights]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading conversation summaries...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <p className="font-medium">Error loading summaries</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={fetchChatInsights}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Conversation Summaries
            {selectedChild && <span className="text-gray-600"> for {selectedChild.name}</span>}
          </h2>
          {unreadCount > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter Buttons */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {[
              { key: 'unread', label: 'Unread' },
              { key: 'read', label: 'Read' },
              { key: 'all', label: 'All' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          
          {/* Mark All Read Button */}
          {unreadCount > 0 && filter !== 'read' && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Summaries Sections */}
      <AnimatePresence mode="wait">
        {chatInsights.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No conversation summaries found
            </h3>
            <p className="text-gray-600 mb-4">
              {selectedChild 
                ? `${selectedChild.name} hasn't had any tutoring conversations recently`
                : 'Your children haven&apos;t had any tutoring conversations recently'
              }
            </p>
            <p className="text-sm text-gray-500">
              Summaries appear here after your child has learning sessions with Klio
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Today */}
            {groupedInsights.today.length > 0 && (
              <StickyNotesSection
                title="📅 Today"
                summaries={groupedInsights.today}
                onMarkRead={handleMarkAsRead}
                onDelete={handleDelete}
                getChildColor={getChildColor}
              />
            )}

            {/* Yesterday */}
            {groupedInsights.yesterday.length > 0 && (
              <StickyNotesSection
                title="📅 Yesterday"
                summaries={groupedInsights.yesterday}
                onMarkRead={handleMarkAsRead}
                onDelete={handleDelete}
                getChildColor={getChildColor}
              />
            )}

            {/* This Week */}
            {groupedInsights.thisWeek.map(dayData => (
              <StickyNotesSection
                key={dayData.date}
                date={dayData.date}
                summaries={dayData.summaries}
                onMarkRead={handleMarkAsRead}
                onDelete={handleDelete}
                getChildColor={getChildColor}
              />
            ))}

            {/* Older */}
            {groupedInsights.older.map(dayData => (
              <StickyNotesSection
                key={dayData.date}
                date={dayData.date}
                summaries={dayData.summaries}
                onMarkRead={handleMarkAsRead}
                onDelete={handleDelete}
                getChildColor={getChildColor}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}