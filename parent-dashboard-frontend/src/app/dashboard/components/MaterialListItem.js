// app/dashboard/components/MaterialListItem.js
'use client';
import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { CheckCircleIcon as CheckSolidIcon } from '@heroicons/react/24/solid';
import { PencilSquareIcon, CalendarDaysIcon, TrashIcon } from '@heroicons/react/24/outline';
import { APP_GRADABLE_CONTENT_TYPES } from '../../../utils/dashboardConstants';
import { useProcessingContext } from '../../../components/ProcessingNotificationProvider';

// Utility functions
const isDateOverdue = (dateString, completed) => {
  if (completed || !dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateString + 'T00:00:00');
  return dueDate < today;
};

const isDateDueSoon = (dateString, completed, days = 7) => {
  if (completed || !dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateString + 'T00:00:00');
  const soonCutoff = new Date(today);
  soonCutoff.setDate(today.getDate() + days);
  return dueDate >= today && dueDate <= soonCutoff;
};

const formatContentType = (contentType) => {
  return contentType ? contentType.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : 'Material';
};

const formatDueDate = (dateString) => {
  try {
    return new Date(dateString + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'N/A';
  }
};

const CompletionToggle = React.memo(({ isCompleted, isToggling, onClick, disabled }) => (
  <button
    onClick={disabled ? undefined : onClick}
    className={`mr-4 p-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0 transition-all duration-200
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
      ${isCompleted ? 'bg-green-100 hover:bg-green-200' : 'bg-gray-50 hover:bg-blue-50'}
    `}
    title={isCompleted ? "Mark as incomplete" : "Mark as finished"}
    aria-pressed={isCompleted}
    disabled={isToggling || disabled}
  >
    {isToggling ? (
      <div className="h-6 w-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
    ) : isCompleted ? (
      <CheckSolidIcon className="h-6 w-6 text-green-600" />
    ) : (
      <div className="h-6 w-6 border-2 border-gray-300 rounded-full hover:border-blue-400 transition-colors" />
    )}
  </button>
));
CompletionToggle.displayName = 'CompletionToggle';

const StatusBadge = React.memo(({ lesson, materialInfo }) => {
  const { processingMaterials } = useProcessingContext();
  
  // Check if this material is currently being processed
  const isProcessing = processingMaterials.includes(String(lesson.id));
  
  // Check if this material was recently processed (within last 24 hours)
  const isRecentlyProcessed = useMemo(() => {
    if (!lesson.processing_completed_at) return false;
    const completedTime = new Date(lesson.processing_completed_at);
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return completedTime > twentyFourHoursAgo;
  }, [lesson.processing_completed_at]);
  
  // Show processing indicator if this material is being processed
  if (isProcessing) {
    return (
      <div className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 rounded-full border border-blue-200 shadow-sm">
        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
        <span className="font-medium text-blue-700 text-sm">
          <span className="hidden sm:inline">AI Processing</span>
          <span className="sm:hidden">Processing</span>
        </span>
      </div>
    );
  }
  
  // Show NEW badge for recently processed materials (24 hours)
  if (isRecentlyProcessed && !materialInfo.isCompleted) {
    return (
      <div className="flex items-center bg-gradient-to-r from-emerald-50 to-green-50 px-3 py-1.5 rounded-full border border-emerald-200 shadow-sm">
        <span className="text-emerald-500 mr-1.5">✨</span>
        <span className="font-bold text-emerald-700 text-sm">
          <span className="hidden sm:inline">NEW</span>
          <span className="sm:hidden">NEW</span>
        </span>
      </div>
    );
  }
  
  // Check if this item has a grade (including grade of 0) and show it
  const hasGrade = lesson.grade_value !== null && lesson.grade_value !== undefined && lesson.grade_value !== '';
  if (hasGrade || (lesson.grade_value === 0 && materialInfo.hasMaxScore)) {
    return (
      <div className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 rounded-full border border-blue-200 shadow-sm">
        <span className="text-blue-500 mr-1.5">📊</span>
        <span className="font-bold text-blue-700 text-sm" aria-label={`Grade: ${lesson.grade_value}${lesson.grade_max_value ? ` / ${lesson.grade_max_value}` : ''}`}>
          {String(lesson.grade_value)}{lesson.grade_max_value ? `/${String(lesson.grade_max_value)}` : ''}
        </span>
      </div>
    );
  }
  // For gradable items that are completed but don't have grades, show "Ready to Grade" 
  if (materialInfo.isCompleted && materialInfo.isGradable && materialInfo.hasMaxScore) {
    return (
      <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-1.5 rounded-full border border-amber-200 shadow-sm">
        <span className="mr-1.5">⭐</span>
        <span className="hidden sm:inline">Ready to Grade</span>
        <span className="sm:hidden">Grade?</span>
      </span>
    );
  }
  
  // Show priority status for overdue or upcoming items
  if (!materialInfo.isCompleted && (materialInfo.isOverdue || materialInfo.isDueSoon)) {
    const isOverdue = materialInfo.isOverdue;
    return (
      <span className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full border shadow-sm ${
        isOverdue 
          ? 'text-red-700 bg-gradient-to-r from-red-50 to-rose-50 border-red-200' 
          : 'text-orange-700 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'
      }`}>
        <span className="mr-1.5">{isOverdue ? '🚨' : '⏰'}</span>
        <span className="hidden sm:inline">{isOverdue ? 'Past Due' : 'Due This Week'}</span>
        <span className="sm:hidden">{isOverdue ? 'Overdue' : 'Soon'}</span>
      </span>
    );
  }
  // For non-gradable completed items, show "Completed"
  if (materialInfo.isCompleted) {
    return (
      <span className="inline-flex items-center text-xs font-bold text-green-700 bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-1.5 rounded-full border border-green-200 shadow-sm">
        <span className="mr-1.5">✅</span>
        <span className="hidden sm:inline">Finished</span>
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
        <CalendarDaysIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5 sm:mr-2 flex-shrink-0" />
        <span className="hidden sm:inline">{badgeConfig.prefix}: {formatDueDate(lesson.due_date)}</span>
        <span className="sm:hidden">{formatDueDate(lesson.due_date)}</span>
      </span>
    );
  }
  return null;
});
StatusBadge.displayName = 'StatusBadge';

export default function MaterialListItem({ 
  lesson, 
  onOpenEditModal, 
  onToggleComplete, 
  onDeleteMaterial, 
  isCompact = false,
  isSelectable = false,
  isSelected = false,
  onSelectionChange
}) {
  // Add prop validation
  if (typeof onOpenEditModal !== 'function') {
    console.warn('MaterialListItem: onOpenEditModal prop is not a function', {
      lesson: lesson?.title,
      onOpenEditModal,
      type: typeof onOpenEditModal
    });
  }
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
    } finally {
      setIsToggling(false);
    }
  }, [lesson.id, lesson.completed_at, onToggleComplete]);

  const handleEditClick = useCallback((e) => {
    e.stopPropagation();
    if (typeof onOpenEditModal === 'function') {
      onOpenEditModal(lesson);
    } else {
      console.error('onOpenEditModal is not a function', { onOpenEditModal, lesson });
    }
  }, [lesson, onOpenEditModal]);

  const handleDeleteClick = useCallback((e) => {
    e.stopPropagation();
    onDeleteMaterial(lesson);
  }, [lesson, onDeleteMaterial]);

  const itemBaseClasses = "group flex items-center rounded-lg transition-all duration-200 hover:shadow-md";
  const itemPadding = isCompact ? "px-3 py-2" : "p-4";
  const itemStateClasses = materialInfo.isCompleted 
    ? "bg-gradient-to-r from-green-50/80 to-emerald-50/50 border border-green-200/60" 
    : "bg-white border border-gray-200/60 hover:border-blue-200";

  return (
    <li className={`${itemBaseClasses} ${itemPadding} ${itemStateClasses}`}>
      {/* Selection Checkbox */}
      {isSelectable && (
        <div className="mr-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectionChange && onSelectionChange(lesson, e.target.checked)}
            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      
      <CompletionToggle
        isCompleted={materialInfo.isCompleted}
        isToggling={isToggling}
        onClick={handleToggle}
        disabled={isToggling}
      />
      <div className="flex-grow flex items-center justify-between min-w-0 cursor-pointer" onClick={handleEditClick} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleEditClick()}>
        <div className="flex-grow min-w-0">
          <p className={`truncate font-semibold text-sm ${materialInfo.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`} title={lesson.title}>
            {lesson.title}
          </p>
          {!isCompact && (
            <p className="text-xs text-gray-600 capitalize mt-0.5 font-medium truncate">
              {formatContentType(lesson.content_type)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <StatusBadge lesson={lesson} materialInfo={materialInfo} />
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={handleEditClick} 
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              title="Edit assignment details"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button 
              onClick={handleDeleteClick} 
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all" 
              title="Remove assignment"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 text-center w-full mt-2 px-2">{error}</p>}
    </li>
  );
}

MaterialListItem.propTypes = {
  lesson: PropTypes.object.isRequired,
  onOpenEditModal: PropTypes.func.isRequired,
  onToggleComplete: PropTypes.func.isRequired,
  onDeleteMaterial: PropTypes.func.isRequired,
  isCompact: PropTypes.bool,
  isSelectable: PropTypes.bool,
  isSelected: PropTypes.bool,
  onSelectionChange: PropTypes.func
};
