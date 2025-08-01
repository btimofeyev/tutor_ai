// app/dashboard/components/TodayOverview.js
'use client';
import React, { useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  ExclamationTriangleIcon, 
  ClockIcon, 
  CalendarDaysIcon,
  CheckCircleIcon as CheckOutlineIcon,
  PlayIcon 
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolidIcon } from '@heroicons/react/24/solid';
import { isDateOverdue, isDateDueSoon } from '../../../utils/dashboardHelpers';
import { APP_GRADABLE_CONTENT_TYPES } from '../../../utils/dashboardConstants';
import api from '../../../utils/api';

const TodayOverviewItem = React.memo(({ item, type, onToggleComplete }) => {
  const isAssignment = item.hasOwnProperty('completed_at');
  const isScheduleItem = item.hasOwnProperty('start_time');
  const isCompleted = isAssignment ? !!item.completed_at : false;

  const formatTime = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour24 = parseInt(hours);
      const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const getItemIcon = () => {
    if (type === 'overdue') return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
    if (type === 'upcoming') return <ClockIcon className="h-4 w-4 text-orange-500" />;
    if (type === 'scheduled') return <CalendarDaysIcon className="h-4 w-4 text-blue-500" />;
    return <PlayIcon className="h-4 w-4 text-gray-500" />;
  };

  const getItemColor = () => {
    if (type === 'overdue') return 'border-l-red-500 bg-red-50';
    if (type === 'upcoming') return 'border-l-orange-500 bg-orange-50';
    if (type === 'scheduled') return 'border-l-blue-500 bg-blue-50';
    if (type === 'due-today') return 'border-l-green-500 bg-green-50';
    if (type === 'this-week') return 'border-l-purple-500 bg-purple-50';
    return 'border-l-gray-500 bg-gray-50';
  };

  return (
    <div className={`border-l-2 ${getItemColor()} p-3 rounded text-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {getItemIcon()}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate" title={item.title}>
              {item.title}
            </div>
            <div className="text-xs text-gray-600 flex items-center gap-2 mt-1">
              {isScheduleItem && item.start_time && (
                <span className="flex items-center gap-1">
                  <CalendarDaysIcon className="h-3 w-3" />
                  {formatTime(item.start_time)}
                  {item.duration_minutes && (
                    <span className="text-gray-500">({item.duration_minutes}m)</span>
                  )}
                </span>
              )}
              {isAssignment && item.due_date && (
                <span>Due: {new Date(item.due_date + 'T00:00:00').toLocaleDateString()}</span>
              )}
              {item.subject_name && (
                <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                  {item.subject_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {isAssignment && (
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button
              onClick={() => onToggleComplete(item.id, !isCompleted)}
              className="p-1 rounded hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
              aria-label={isCompleted ? `Mark ${item.title} as incomplete` : `Mark ${item.title} as complete`}
            >
              {isCompleted ? (
                <CheckSolidIcon className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 border border-gray-400 rounded-full hover:border-green-500" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

TodayOverviewItem.displayName = 'TodayOverviewItem';

TodayOverviewItem.propTypes = {
  item: PropTypes.object.isRequired,
  type: PropTypes.string.isRequired,
  onToggleComplete: PropTypes.func.isRequired
};

export default function TodayOverview({ 
  lessonsBySubject, 
  selectedChild,
  onToggleComplete, 
  onEdit,
  onDelete,
  maxItems = 6 
}) {
  const [todayScheduleItems, setTodayScheduleItems] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Fetch today's schedule items
  useEffect(() => {
    if (!selectedChild?.id) return;

    const fetchTodaySchedule = async () => {
      setLoadingSchedule(true);
      try {
        // Use the correct API endpoint structure (baseURL already includes /api)
        const response = await api.get(`/schedule/${selectedChild.id}`);
        const allScheduleItems = response.data || [];
        
        // Filter for today's items using the correct field name
        const today = new Date().toISOString().split('T')[0];
        const todayItems = allScheduleItems.filter(item => {
          if (!item.scheduled_date) return false;
          return item.scheduled_date === today;
        });
        
        setTodayScheduleItems(todayItems);
      } catch (error) {
        // If schedule API fails, just show assignments without schedule integration
        console.warn('Schedule API not available, showing assignments only:', error.message);
        setTodayScheduleItems([]);
      } finally {
        setLoadingSchedule(false);
      }
    };

    fetchTodaySchedule();
  }, [selectedChild?.id]);

  const { upcomingWork, todaySchedule, totalIncompleteItems } = useMemo(() => {
    const allLessons = Object.values(lessonsBySubject).flat();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all incomplete lessons with due dates (filter out assignments - those are for students)
    const incompleteWithDueDates = allLessons.filter(lesson => 
      !lesson.completed_at && 
      lesson.due_date &&
      !APP_GRADABLE_CONTENT_TYPES.includes(lesson.content_type) // Exclude assignments
    );
    
    // Add urgency info to each item
    const itemsWithUrgency = incompleteWithDueDates.map(lesson => {
      const dueDate = new Date(lesson.due_date + 'T00:00:00');
      dueDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
      
      let type = 'future';
      let urgencyScore = 1000 + daysDiff; // Default for future items
      
      if (daysDiff < 0) {
        type = 'overdue';
        urgencyScore = daysDiff; // Negative number, so most overdue will be most negative
      } else if (daysDiff === 0) {
        type = 'due-today';
        urgencyScore = 0;
      } else if (daysDiff === 1) {
        type = 'tomorrow';
        urgencyScore = 1;
      } else if (daysDiff <= 3) {
        type = 'upcoming';
        urgencyScore = daysDiff;
      } else if (daysDiff <= 7) {
        type = 'this-week';
        urgencyScore = 10 + daysDiff;
      }
      
      return {
        ...lesson,
        type,
        urgencyScore,
        daysUntilDue: daysDiff
      };
    });
    
    // Sort by urgency (most urgent first)
    const sortedByUrgency = itemsWithUrgency.sort((a, b) => {
      // First sort by urgency score (lower is more urgent)
      if (a.urgencyScore !== b.urgencyScore) {
        return a.urgencyScore - b.urgencyScore;
      }
      // Then by title for items with same urgency
      return a.title.localeCompare(b.title);
    });
    
    // Show only top 3 most urgent lessons for parents to work through
    const upcomingWork = sortedByUrgency.slice(0, 3);
    
    // Today's schedule items (if any)
    const todaySchedule = todayScheduleItems.map(item => ({ 
      ...item, 
      type: 'scheduled',
      urgencyScore: -1 // Schedule items always show first
    })).sort((a, b) => {
      if (a.start_time && b.start_time) {
        return a.start_time.localeCompare(b.start_time);
      }
      return 0;
    });

    return { upcomingWork, todaySchedule, totalIncompleteItems: incompleteWithDueDates.length };
  }, [lessonsBySubject, todayScheduleItems, maxItems]);

  // Show component even with just a few items to give parents a quick snapshot
  // But hide if absolutely nothing to show
  if (upcomingWork.length === 0 && todaySchedule.length === 0) {
    return null;
  }

  const todayDate = new Date().toLocaleDateString(undefined, { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <section className="mb-4" aria-labelledby="upcoming-work-heading">
      <div className="mb-4">
        <h2 id="upcoming-work-heading" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">📋</span>
          Next 3 Lessons
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {upcomingWork.filter(item => item.type === 'overdue').length > 0 ? (
            <span className="text-red-600 font-medium">
              ⚠️ {upcomingWork.filter(item => item.type === 'overdue').length} overdue lessons need attention
            </span>
          ) : upcomingWork.filter(item => item.type === 'due-today').length > 0 ? (
            <span className="text-orange-600 font-medium">
              📅 {upcomingWork.filter(item => item.type === 'due-today').length} lessons due today
            </span>
          ) : (
            'Complete lessons in order - next one will appear as you finish'
          )}
        </p>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Today's Schedule (if any) */}
        {todaySchedule.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDaysIcon className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <h3 className="font-semibold text-gray-900">
                Today&apos;s Schedule - {todayDate}
              </h3>
            </div>
            {loadingSchedule ? (
              <div className="text-center py-2 text-gray-500">Loading schedule...</div>
            ) : (
              <div className="space-y-2">
                {todaySchedule.map((item, index) => (
                  <TodayOverviewItem
                    key={`schedule-${item.id || index}`}
                    item={item}
                    type={item.type}
                    onToggleComplete={onToggleComplete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Assignments */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" aria-hidden="true" />
              Lessons to Complete
            </h3>
            <span className="text-sm text-gray-500">
              {upcomingWork.length} items
            </span>
          </div>
          
          <div className="space-y-2">
            {upcomingWork.map((item, index) => (
              <TodayOverviewItem
                key={`upcoming-${item.id || index}`}
                item={item}
                type={item.type}
                onToggleComplete={onToggleComplete}
              />
            ))}
          </div>
          
          {/* Show indicator if there are more items */}
          {totalIncompleteItems > upcomingWork.length && (
            <div className="mt-3 text-center text-sm text-gray-500">
              Showing {upcomingWork.length} most urgent items out of {totalIncompleteItems} total
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

TodayOverview.propTypes = {
  lessonsBySubject: PropTypes.object.isRequired,
  selectedChild: PropTypes.object,
  onToggleComplete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  maxItems: PropTypes.number
};