// app/dashboard/components/MaterialListItem.js
'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { CheckCircleIcon as CheckSolidIcon } from '@heroicons/react/24/solid';
import { PencilSquareIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { APP_GRADABLE_CONTENT_TYPES } from '../../../utils/dashboardConstants';

// Utility functions
const isDateOverdue = (dateString, completed) => {
  if (completed || !dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateString + 'T00:00:00Z');
  return dueDate < today;
};

const isDateDueSoon = (dateString, completed, days = 7) => {
  if (completed || !dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateString + 'T00:00:00Z');
  const soonCutoff = new Date(today);
  soonCutoff.setDate(today.getDate() + days);
  return dueDate >= today && dueDate <= soonCutoff;
};

const formatContentType = (contentType) => {
  return contentType ? contentType.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : 'Material';
};

const formatDueDate = (dateString) => {
  try {
    return new Date(dateString + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'N/A';
  }
};

const CompletionToggle = React.memo(({ isCompleted, isToggling, onClick, disabled }) => (
  <button
    onClick={disabled ? undefined : onClick}
    className={`mr-3 p-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-200 focus:ring-accent-blue'}
    `}
    title={isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
    aria-pressed={isCompleted}
    disabled={isToggling || disabled}
  >
    {isToggling ? (
      <div className="h-5 w-5 border-2 border-gray-300 border-t-accent-blue rounded-full animate-spin" />
    ) : isCompleted ? (
      <CheckSolidIcon className="h-5 w-5 text-accent-green" />
    ) : (
      <div className="h-5 w-5 border-2 border-border-input rounded-full group-hover:border-accent-blue" />
    )}
  </button>
));
CompletionToggle.displayName = 'CompletionToggle';

const StatusBadge = ({ lesson, materialInfo }) => {
  // Check if this item has a grade (including grade of 0) and show it
  const hasGrade = lesson.grade_value !== null && lesson.grade_value !== undefined && lesson.grade_value !== '';
  if (hasGrade || (lesson.grade_value === 0 && materialInfo.hasMaxScore)) {
    return (
      <span className="font-semibold text-sm text-accent-blue" aria-label={`Grade: ${lesson.grade_value}${lesson.grade_max_value ? ` / ${lesson.grade_max_value}` : ''}`}>
        {String(lesson.grade_value)}{lesson.grade_max_value ? `/${String(lesson.grade_max_value)}` : ''}
      </span>
    );
  }
  // For gradable items that are completed but don't have grades, show "Needs Grade"
  if (materialInfo.isCompleted && materialInfo.isGradable && materialInfo.hasMaxScore) {
    return <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Needs Grade</span>;
  }
  // For non-gradable completed items, show "Completed"
  if (materialInfo.isCompleted) {
    return <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Completed</span>;
  }
  if (lesson.due_date) {
    const badgeColor = materialInfo.isOverdue ? 'text-red-600 bg-red-100' : materialInfo.isDueSoon ? 'text-orange-600 bg-orange-100' : 'text-gray-600 bg-gray-100';
    const prefix = materialInfo.isOverdue ? 'Overdue: ' : 'Due: ';
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center ${badgeColor}`}>
        <CalendarDaysIcon className="h-3.5 w-3.5 mr-1"/> {prefix}{formatDueDate(lesson.due_date)}
      </span>
    );
  }
  return null;
};

export default function MaterialListItem({ lesson, onOpenEditModal, onToggleComplete, isCompact = false }) {
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState('');

  const materialInfo = useMemo(() => {
    const isCompleted = !!lesson.completed_at;
    return {
      isGradable: APP_GRADABLE_CONTENT_TYPES.includes(lesson.content_type),
      hasMaxScore: lesson.grade_max_value && String(lesson.grade_max_value).trim() !== '',
      hasGrade: lesson.grade_value !== null && lesson.grade_value !== undefined && lesson.grade_value !== '',
      isCompleted,
      isOverdue: isDateOverdue(lesson.due_date, isCompleted),
      isDueSoon: isDateDueSoon(lesson.due_date, isCompleted),
    };
  }, [lesson]);

  const handleToggle = useCallback(async (e) => {
    e.stopPropagation();
    setError('');
    setIsToggling(true);
    try {
      // Pass the lesson ID and whether we're marking as complete
      await onToggleComplete(lesson.id, !lesson.completed_at);
    } catch (err) {
      setError('Failed to update.');
      console.error('Toggle error:', err);
    } finally {
      setIsToggling(false);
    }
  }, [lesson.id, lesson.completed_at, onToggleComplete]);

  const handleEditClick = useCallback((e) => {
    e.stopPropagation();
    onOpenEditModal(lesson);
  }, [lesson, onOpenEditModal]);

  const itemBaseClasses = "flex items-center group rounded-lg transition-all duration-150";
  const itemPadding = isCompact ? "px-2 py-1.5" : "p-3";
  const itemStateClasses = materialInfo.isCompleted ? "bg-green-50/50 hover:bg-green-50" : "bg-white hover:bg-gray-50";

  return (
    <li className={`${itemBaseClasses} ${itemPadding} ${itemStateClasses}`}>
      <CompletionToggle
        isCompleted={materialInfo.isCompleted}
        isToggling={isToggling}
        onClick={handleToggle}
        disabled={isToggling}
      />
      <div className="flex-grow flex items-center justify-between min-w-0" onClick={handleEditClick} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleEditClick()}>
        <div className="flex-grow min-w-0">
          <p className={`truncate font-medium text-sm ${materialInfo.isCompleted ? 'line-through text-text-tertiary' : 'text-text-primary'}`} title={lesson.title}>{lesson.title}</p>
          {!isCompact && <p className="text-xs text-text-secondary capitalize">{formatContentType(lesson.content_type)}</p>}
        </div>
        <div className="flex items-center space-x-3 ml-2 flex-shrink-0">
          <StatusBadge lesson={lesson} materialInfo={materialInfo} />
          <button onClick={handleEditClick} className="p-1 text-text-tertiary hover:text-accent-blue opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-md" title="Edit Material">
            <PencilSquareIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
       {error && <p className="text-xs text-red-500 text-center w-full mt-1">{error}</p>}
    </li>
  );
}
