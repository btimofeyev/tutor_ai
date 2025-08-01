// app/dashboard/components/QuickAccessSection.js
'use client';
import React, { useMemo } from 'react';
import { ExclamationTriangleIcon, ClockIcon, CheckCircleIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolidIcon } from '@heroicons/react/24/solid';
import { isDateOverdue, isDateDueSoon } from '../../../utils/dashboardHelpers';
import { APP_GRADABLE_CONTENT_TYPES } from '../../../utils/dashboardConstants';

const QuickAccessItem = ({ lesson, onToggleComplete, onEdit, onDelete, type }) => {
  const isCompleted = !!lesson.completed_at;
  const isGradable = APP_GRADABLE_CONTENT_TYPES.includes(lesson.content_type);
  const hasMaxScore = lesson.grade_max_value && String(lesson.grade_max_value).trim() !== '';
  const hasGrade = lesson.grade_value !== null && lesson.grade_value !== undefined && lesson.grade_value !== '';

  const formatDueDate = (dateString) => {
    try {
      return new Date(dateString + 'T00:00:00').toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusInfo = () => {
    if (hasGrade) {
      return {
        text: `${lesson.grade_value}/${lesson.grade_max_value}`,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      };
    }
    if (isCompleted && isGradable && hasMaxScore) {
      return {
        text: 'Ready to Grade',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      };
    }
    if (isCompleted) {
      return {
        text: 'Done ✓',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      };
    }
    return null;
  };

  const statusInfo = getStatusInfo();
  const iconColor = type === 'overdue' ? 'text-red-500' : 'text-orange-500';
  const borderColor = type === 'overdue' ? 'border-l-red-500' : 'border-l-orange-500';

  return (
    <div className={`border-l-2 ${borderColor} bg-gray-50 p-2 rounded text-xs`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {type === 'overdue' ? (
            <ExclamationTriangleIcon className={`h-3 w-3 ${iconColor} flex-shrink-0`} />
          ) : (
            <ClockIcon className={`h-3 w-3 ${iconColor} flex-shrink-0`} />
          )}
          <span className="font-medium text-gray-900 truncate" title={lesson.title}>
            {lesson.title}
          </span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-500 whitespace-nowrap">
            {formatDueDate(lesson.due_date)}
          </span>
        </div>

        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={() => onToggleComplete(lesson.id, !isCompleted)}
            className="p-0.5 rounded hover:bg-gray-200 transition-colors"
            title={isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
          >
            {isCompleted ? (
              <CheckSolidIcon className="h-3 w-3 text-green-500" />
            ) : (
              <div className="h-3 w-3 border border-gray-400 rounded-full hover:border-green-500" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function QuickAccessSection({ 
  lessonsBySubject, 
  onToggleComplete, 
  onEdit,
  onDelete,
  maxItems = 5 
}) {
  const { overdueItems, upcomingItems } = useMemo(() => {
    const allLessons = Object.values(lessonsBySubject).flat();
    
    const overdue = allLessons
      .filter(lesson => !lesson.completed_at && isDateOverdue(lesson.due_date))
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, maxItems);
    
    const upcoming = allLessons
      .filter(lesson => !lesson.completed_at && isDateDueSoon(lesson.due_date, 7) && !isDateOverdue(lesson.due_date))
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, maxItems);
    
    return {
      overdueItems: overdue,
      upcomingItems: upcoming
    };
  }, [lessonsBySubject, maxItems]);

  // Don't show the section if there are no overdue or upcoming items
  if (overdueItems.length === 0 && upcomingItems.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <span className="text-xl">📋</span>
          What Needs Attention Today
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Important assignments and upcoming work for your child
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overdue Items */}
        {overdueItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-red-800">
                Past Due ({overdueItems.length})
              </h3>
            </div>
            <div className="space-y-2">
              {overdueItems.map(lesson => (
                <QuickAccessItem
                  key={`overdue-${lesson.id}`}
                  lesson={lesson}
                  onToggleComplete={onToggleComplete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  type="overdue"
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Items */}
        {upcomingItems.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClockIcon className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-orange-800">
                Due This Week ({upcomingItems.length})
              </h3>
            </div>
            <div className="space-y-2">
              {upcomingItems.map(lesson => (
                <QuickAccessItem
                  key={`upcoming-${lesson.id}`}
                  lesson={lesson}
                  onToggleComplete={onToggleComplete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  type="upcoming"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}