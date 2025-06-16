// app/dashboard/components/QuickAccessSection.js
'use client';
import React, { useMemo } from 'react';
import { ExclamationTriangleIcon, ClockIcon, CheckCircleIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolidIcon } from '@heroicons/react/24/solid';
import { isDateOverdue, isDateDueSoon } from '../../../utils/dashboardHelpers';
import { APP_GRADABLE_CONTENT_TYPES } from '../../../utils/dashboardConstants';

const QuickAccessItem = ({ lesson, onToggleComplete, onEdit, type }) => {
  const isCompleted = !!lesson.completed_at;
  const isGradable = APP_GRADABLE_CONTENT_TYPES.includes(lesson.content_type);
  const hasMaxScore = lesson.grade_max_value && String(lesson.grade_max_value).trim() !== '';
  const hasGrade = lesson.grade_value !== null && lesson.grade_value !== undefined && lesson.grade_value !== '';

  const formatDueDate = (dateString) => {
    try {
      return new Date(dateString + 'T00:00:00Z').toLocaleDateString(undefined, { 
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
        text: 'Needs Grade',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      };
    }
    if (isCompleted) {
      return {
        text: 'Completed',
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
    <div className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border-l-4 ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {type === 'overdue' ? (
              <ExclamationTriangleIcon className={`h-4 w-4 ${iconColor} flex-shrink-0`} />
            ) : (
              <ClockIcon className={`h-4 w-4 ${iconColor} flex-shrink-0`} />
            )}
            <h4 className="text-sm font-medium text-gray-900 truncate" title={lesson.title}>
              {lesson.title}
            </h4>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
            <span className="capitalize">{lesson.content_type?.replace(/_/g, ' ')}</span>
            {lesson.subject_name && (
              <>
                <span>•</span>
                <span>{lesson.subject_name}</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Due: {formatDueDate(lesson.due_date)}
            </span>
            
            {statusInfo && (
              <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color} ${statusInfo.bgColor} font-medium`}>
                {statusInfo.text}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={() => onToggleComplete(lesson.id, !isCompleted)}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            title={isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
          >
            {isCompleted ? (
              <CheckSolidIcon className="h-4 w-4 text-green-500" />
            ) : (
              <div className="h-4 w-4 border-2 border-gray-300 rounded-full hover:border-green-500" />
            )}
          </button>
          
          <button
            onClick={() => onEdit(lesson)}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            title="Edit"
          >
            <PencilSquareIcon className="h-4 w-4 text-gray-400 hover:text-blue-500" />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Items */}
        {overdueItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-semibold text-red-700">
                Overdue ({overdueItems.length})
              </h3>
            </div>
            <div className="space-y-2">
              {overdueItems.map(lesson => (
                <QuickAccessItem
                  key={`overdue-${lesson.id}`}
                  lesson={lesson}
                  onToggleComplete={onToggleComplete}
                  onEdit={onEdit}
                  type="overdue"
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Items */}
        {upcomingItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClockIcon className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-orange-700">
                Due Soon ({upcomingItems.length})
              </h3>
            </div>
            <div className="space-y-2">
              {upcomingItems.map(lesson => (
                <QuickAccessItem
                  key={`upcoming-${lesson.id}`}
                  lesson={lesson}
                  onToggleComplete={onToggleComplete}
                  onEdit={onEdit}
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