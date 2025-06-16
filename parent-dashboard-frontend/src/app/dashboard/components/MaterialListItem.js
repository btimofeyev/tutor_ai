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
    className={`mr-4 p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-blue-50'}
      ${isCompleted ? 'bg-green-50' : 'hover:bg-gray-50'}
    `}
    title={isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
    aria-pressed={isCompleted}
    disabled={isToggling || disabled}
  >
    {isToggling ? (
      <div className="h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
    ) : isCompleted ? (
      <CheckSolidIcon className="h-5 w-5 text-green-600" />
    ) : (
      <div className="h-5 w-5 border-2 border-gray-300 rounded-full transition-colors group-hover:border-blue-500" />
    )}
  </button>
));
CompletionToggle.displayName = 'CompletionToggle';

const StatusBadge = ({ lesson, materialInfo }) => {
  // Check if this item has a grade (including grade of 0) and show it
  const hasGrade = lesson.grade_value !== null && lesson.grade_value !== undefined && lesson.grade_value !== '';
  if (hasGrade || (lesson.grade_value === 0 && materialInfo.hasMaxScore)) {
    return (
      <div className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-blue-200/60 shadow-sm">
        <span className="font-bold text-blue-700 text-xs sm:text-sm" aria-label={`Grade: ${lesson.grade_value}${lesson.grade_max_value ? ` / ${lesson.grade_max_value}` : ''}`}>
          {String(lesson.grade_value)}{lesson.grade_max_value ? `/${String(lesson.grade_max_value)}` : ''}
        </span>
      </div>
    );
  }
  // For gradable items that are completed but don't have grades, show "Needs Grade" 
  if (materialInfo.isCompleted && materialInfo.isGradable && materialInfo.hasMaxScore) {
    return (
      <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-gradient-to-r from-amber-100 to-yellow-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-amber-200/60 shadow-sm">
        <span className="hidden sm:inline">Needs Grade</span>
        <span className="sm:hidden">Grade?</span>
      </span>
    );
  }
  
  // Show "Needs Attention" for overdue or upcoming items
  if (!materialInfo.isCompleted && (materialInfo.isOverdue || materialInfo.isDueSoon)) {
    const isOverdue = materialInfo.isOverdue;
    return (
      <span className={`inline-flex items-center text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border shadow-sm ${
        isOverdue 
          ? 'text-red-700 bg-gradient-to-r from-red-100 to-rose-100 border-red-200/60' 
          : 'text-amber-700 bg-gradient-to-r from-amber-100 to-yellow-100 border-amber-200/60'
      }`}>
        <span className="hidden sm:inline">{isOverdue ? 'Needs Attention' : 'Due Soon'}</span>
        <span className="sm:hidden">{isOverdue ? 'Overdue' : 'Soon'}</span>
      </span>
    );
  }
  // For non-gradable completed items, show "Completed"
  if (materialInfo.isCompleted) {
    return (
      <span className="inline-flex items-center text-xs font-bold text-green-700 bg-gradient-to-r from-green-100 to-emerald-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-green-200/60 shadow-sm">
        <span className="hidden sm:inline">Completed</span>
        <span className="sm:hidden">Done</span>
      </span>
    );
  }
  if (lesson.due_date) {
    const badgeConfig = materialInfo.isOverdue 
      ? { 
          gradient: 'bg-gradient-to-r from-red-100 to-rose-100', 
          text: 'text-red-700', 
          border: 'border-red-200/60', 
          prefix: 'Overdue' 
        }
      : materialInfo.isDueSoon 
      ? { 
          gradient: 'bg-gradient-to-r from-orange-100 to-amber-100', 
          text: 'text-orange-700', 
          border: 'border-orange-200/60', 
          prefix: 'Due' 
        }
      : { 
          gradient: 'bg-gradient-to-r from-gray-100 to-slate-100', 
          text: 'text-gray-700', 
          border: 'border-gray-200/60', 
          prefix: 'Due' 
        };
    
    return (
      <span className={`inline-flex items-center text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border shadow-sm ${badgeConfig.gradient} ${badgeConfig.text} ${badgeConfig.border}`}>
        <CalendarDaysIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5 flex-shrink-0" />
        <span className="hidden sm:inline">{badgeConfig.prefix}: {formatDueDate(lesson.due_date)}</span>
        <span className="sm:hidden">{formatDueDate(lesson.due_date)}</span>
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

  const itemBaseClasses = "flex items-center group rounded-lg transition-all duration-200 hover:shadow-sm";
  const itemPadding = isCompact ? "px-2 sm:px-3 py-1.5 sm:py-2" : "p-3 sm:p-4";
  const itemStateClasses = materialInfo.isCompleted 
    ? "bg-gradient-to-r from-green-50/80 to-emerald-50/50 border border-green-200/60 hover:from-green-50 hover:to-emerald-50" 
    : "bg-white border border-gray-200/60 hover:border-gray-300/80 hover:bg-gray-50/50";

  return (
    <li className={`${itemBaseClasses} ${itemPadding} ${itemStateClasses}`}>
      <CompletionToggle
        isCompleted={materialInfo.isCompleted}
        isToggling={isToggling}
        onClick={handleToggle}
        disabled={isToggling}
      />
      <div className="flex-grow flex items-center justify-between min-w-0 cursor-pointer" onClick={handleEditClick} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleEditClick()}>
        <div className="flex-grow min-w-0">
          <p className={`truncate font-semibold text-sm sm:text-base transition-colors ${materialInfo.isCompleted ? 'line-through text-gray-500' : 'text-gray-900 group-hover:text-blue-700'}`} title={lesson.title}>
            {lesson.title}
          </p>
          {!isCompact && (
            <p className="text-xs text-gray-600 capitalize mt-0.5 font-medium truncate">
              {formatContentType(lesson.content_type)}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 ml-2 sm:ml-3 flex-shrink-0">
          <StatusBadge lesson={lesson} materialInfo={materialInfo} />
          <button 
            onClick={handleEditClick} 
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 rounded-lg" 
            title="Edit Material"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 text-center w-full mt-2 px-2">{error}</p>}
    </li>
  );
}
