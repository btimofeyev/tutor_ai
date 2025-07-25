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
                <span>Due: {new Date(item.due_date + 'T00:00:00Z').toLocaleDateString()}</span>
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
        // Use the correct API endpoint structure
        const response = await api.get(`/api/schedule/${selectedChild.id}`);
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

  const { todaysWork, priorityItems } = useMemo(() => {
    const allLessons = Object.values(lessonsBySubject).flat();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get assignments due today
    const todayAssignments = allLessons.filter(lesson => {
      if (!lesson.due_date) return false;
      const dueDate = new Date(lesson.due_date + 'T00:00:00Z');
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime() && !lesson.completed_at;
    });
    
    // Get overdue items (higher priority)
    const overdueAssignments = allLessons.filter(lesson => 
      !lesson.completed_at && isDateOverdue(lesson.due_date)
    );
    
    // Get due soon items
    const dueSoonAssignments = allLessons.filter(lesson => 
      !lesson.completed_at && 
      isDateDueSoon(lesson.due_date, 3) && 
      !isDateOverdue(lesson.due_date) &&
      !todayAssignments.includes(lesson)
    );

    // Combine today's work: schedule items + assignments due today
    const todaysWork = [
      ...todayScheduleItems.map(item => ({ ...item, type: 'scheduled' })),
      ...todayAssignments.map(item => ({ ...item, type: 'due-today' }))
    ].sort((a, b) => {
      // Sort by time for schedule items, then by title
      if (a.start_time && b.start_time) {
        return a.start_time.localeCompare(b.start_time);
      }
      if (a.start_time && !b.start_time) return -1;
      if (!a.start_time && b.start_time) return 1;
      return a.title.localeCompare(b.title);
    }).slice(0, maxItems);
    
    // If no schedule items available, show more assignments due today and this week
    if (todayScheduleItems.length === 0 && todayAssignments.length === 0) {
      const thisWeekAssignments = allLessons.filter(lesson => 
        !lesson.completed_at && 
        isDateDueSoon(lesson.due_date, 7) && 
        !isDateOverdue(lesson.due_date)
      ).slice(0, 3);
      
      todaysWork.push(...thisWeekAssignments.map(item => ({ ...item, type: 'this-week' })));
    }

    // Priority items: overdue + due soon
    const priorityItems = [
      ...overdueAssignments.map(item => ({ ...item, type: 'overdue' })),
      ...dueSoonAssignments.map(item => ({ ...item, type: 'upcoming' }))
    ].sort((a, b) => {
      // Overdue items first, then by due date
      if (a.type === 'overdue' && b.type !== 'overdue') return -1;
      if (a.type !== 'overdue' && b.type === 'overdue') return 1;
      if (a.due_date && b.due_date) {
        return new Date(a.due_date) - new Date(b.due_date);
      }
      return a.title.localeCompare(b.title);
    }).slice(0, maxItems);

    return { todaysWork, priorityItems };
  }, [lessonsBySubject, todayScheduleItems, maxItems]);

  // Don't show if no items
  if (todaysWork.length === 0 && priorityItems.length === 0) {
    return (
      <div className="mb-6">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            All Caught Up!
          </h3>
          <p className="text-sm text-green-700">
            No urgent assignments or overdue work right now. Great job staying on top of things!
          </p>
        </div>
      </div>
    );
  }

  const todayDate = new Date().toLocaleDateString(undefined, { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <section className="mb-6" aria-labelledby="todays-focus-heading">
      <div className="mb-4">
        <h2 id="todays-focus-heading" className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">📅</span>
          Today&apos;s Focus - {todayDate}
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Schedule items and important assignments for today
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Schedule & Assignments */}
        {todaysWork.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" role="region" aria-labelledby="todays-plan-heading">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDaysIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />
              <h3 id="todays-plan-heading" className="font-semibold text-blue-800">
                {todayScheduleItems.length > 0 ? "Today's Plan" : "Upcoming Work"} ({todaysWork.length})
              </h3>
            </div>
            {loadingSchedule ? (
              <div className="text-center py-2 text-blue-600">Loading schedule...</div>
            ) : (
              <div className="space-y-2">
                {todaysWork.map((item, index) => (
                  <TodayOverviewItem
                    key={`today-${item.id || index}`}
                    item={item}
                    type={item.type}
                    onToggleComplete={onToggleComplete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Priority Items */}
        {priorityItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4" role="region" aria-labelledby="needs-attention-heading">
            <div className="flex items-center gap-2 mb-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" aria-hidden="true" />
              <h3 id="needs-attention-heading" className="font-semibold text-amber-800">
                Needs Attention ({priorityItems.length})
              </h3>
            </div>
            <div className="space-y-2">
              {priorityItems.map(item => (
                <TodayOverviewItem
                  key={`priority-${item.id}`}
                  item={item}
                  type={item.type}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          </div>
        )}
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