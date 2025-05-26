// app/dashboard/components/MaterialListItem.js
'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

// Constants
const GRADABLE_CONTENT_TYPES = ['worksheet', 'assignment', 'test', 'quiz'];
const DUE_SOON_DAYS = 7;

// Style classes for different states
const ITEM_STYLES = {
  base: 'rounded-md px-3 py-2.5 group transition-all duration-150 ease-in-out relative',
  completed: 'bg-green-50 hover:bg-green-100 border-l-4 border-green-500',
  overdue: 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500',
  dueSoon: 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400',
  normal: 'bg-gray-50 hover:bg-gray-100 border-l-4 border-transparent'
};

const GRADE_INPUT_STYLES = {
  container: 'flex items-center w-full gap-2 p-2 bg-blue-50 border border-blue-200 rounded',
  label: 'text-xs font-medium text-blue-800 whitespace-nowrap',
  input: 'flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500',
  submitBtn: 'px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50',
  cancelBtn: 'px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500'
};

// Utility functions
const isDateOverdue = (dateString, completed) => {
  if (completed || !dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateString + 'T00:00:00Z');
  return dueDate < today;
};

const isDateDueSoon = (dateString, completed, days = DUE_SOON_DAYS) => {
  if (completed || !dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateString + 'T00:00:00Z');
  const soonCutoff = new Date(today);
  soonCutoff.setDate(today.getDate() + days);
  return dueDate >= today && dueDate <= soonCutoff;
};

const formatContentType = (contentType) => {
  return contentType ? contentType.replace(/_/g, ' ') : '';
};

const formatDueDate = (dateString) => {
  try {
    return new Date(dateString + 'T00:00:00Z').toLocaleDateString();
  } catch {
    return 'Invalid date';
  }
};

// Grade Input Component
const GradeInput = React.memo(({ 
  value, 
  onChange, 
  onSubmit, 
  onCancel, 
  maxScore, 
  isSubmitting, 
  error 
}) => {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }, [onSubmit, onCancel]);

  return (
    <div className={GRADE_INPUT_STYLES.container} role="form" aria-label="Enter grade">
      <label className={GRADE_INPUT_STYLES.label} htmlFor="grade-input">
        Grade:
      </label>
      <input
        id="grade-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={GRADE_INPUT_STYLES.input}
        placeholder={`out of ${maxScore}`}
        autoFocus
        aria-describedby={error ? "grade-error" : undefined}
        aria-invalid={!!error}
      />
      <button
        onClick={onSubmit}
        disabled={isSubmitting || !value.trim()}
        className={GRADE_INPUT_STYLES.submitBtn}
        aria-label="Submit grade"
        type="button"
      >
        {isSubmitting ? '...' : '✓'}
      </button>
      <button
        onClick={onCancel}
        className={GRADE_INPUT_STYLES.cancelBtn}
        aria-label="Cancel grade input"
        type="button"
      >
        ✕
      </button>
      {error && (
        <div id="grade-error" className="absolute top-full left-0 mt-1 text-xs text-red-600 bg-white p-1 rounded shadow">
          {error}
        </div>
      )}
    </div>
  );
});

GradeInput.displayName = 'GradeInput';

// Completion Toggle Button Component
const CompletionToggle = React.memo(({ 
  isCompleted, 
  isToggling, 
  onClick, 
  disabled 
}) => {
  const handleKeyDown = useCallback((e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onClick(e);
    }
  }, [onClick, disabled]);

  return (
    <div 
      onClick={disabled ? undefined : onClick}
      className={`mr-3 p-1 rounded-full transition-colors ${
        disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'cursor-pointer hover:bg-gray-200'
      }`}
      title={isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
      role="button"
      aria-pressed={isCompleted}
      aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      {isToggling ? (
        <div 
          className="h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"
          aria-label="Loading"
        />
      ) : isCompleted ? (
        <CheckCircleIcon className="h-5 w-5 text-green-500" aria-label="Completed" />
      ) : (
        <div 
          className="h-5 w-5 border-2 border-gray-300 rounded-full group-hover:border-blue-400"
          aria-label="Not completed"
        />
      )}
    </div>
  );
});

CompletionToggle.displayName = 'CompletionToggle';

// Main Component
export default function MaterialListItem({ 
  lesson, 
  onOpenEditModal, 
  onToggleComplete 
}) {
  // State management
  const [isToggling, setIsToggling] = useState(false);
  const [showGradeInput, setShowGradeInput] = useState(false);
  const [gradeInput, setGradeInput] = useState('');
  const [error, setError] = useState('');

  // Memoized calculations
  const materialInfo = useMemo(() => {
    const isGradable = GRADABLE_CONTENT_TYPES.includes(lesson.content_type);
    const hasMaxScore = lesson.grade_max_value && lesson.grade_max_value.trim() !== '';
    const hasGrade = lesson.grade_value && lesson.grade_value.trim() !== '';
    const isCompleted = !!lesson.completed_at;
    const isOverdue = isDateOverdue(lesson.due_date, isCompleted);
    const isDueSoon = isDateDueSoon(lesson.due_date, isCompleted);
    
    return {
      isGradable,
      hasMaxScore,
      hasGrade,
      isCompleted,
      isOverdue,
      isDueSoon,
      needsGradeForCompletion: !isCompleted && isGradable && hasMaxScore && !hasGrade
    };
  }, [lesson]);

  // Style classes based on state
  const itemClassName = useMemo(() => {
    let stateClass = ITEM_STYLES.normal;
    if (materialInfo.isCompleted) stateClass = ITEM_STYLES.completed;
    else if (materialInfo.isOverdue) stateClass = ITEM_STYLES.overdue;
    else if (materialInfo.isDueSoon) stateClass = ITEM_STYLES.dueSoon;
    
    return `${ITEM_STYLES.base} ${stateClass}`;
  }, [materialInfo]);

  // Event handlers
  const handleToggle = useCallback(async (e) => {
    e.stopPropagation();
    setError('');
    
    if (materialInfo.needsGradeForCompletion) {
      setShowGradeInput(true);
      setGradeInput(lesson.grade_value || '');
      return;
    }
    
    try {
      setIsToggling(true);
      await onToggleComplete(lesson.id, !lesson.completed_at);
    } catch (err) {
      setError('Failed to update completion status');
      console.error('Toggle completion error:', err);
    } finally {
      setIsToggling(false);
    }
  }, [lesson, materialInfo.needsGradeForCompletion, onToggleComplete]);

  const handleGradeSubmit = useCallback(async () => {
    const trimmedGrade = gradeInput.trim();
    if (!trimmedGrade) {
      setError('Please enter a grade');
      return;
    }
    
    try {
      setIsToggling(true);
      setError('');
      await onToggleComplete(lesson.id, true, trimmedGrade);
      setShowGradeInput(false);
      setGradeInput('');
    } catch (err) {
      setError('Failed to save grade and complete item');
      console.error('Grade submit error:', err);
    } finally {
      setIsToggling(false);
    }
  }, [gradeInput, lesson.id, onToggleComplete]);

  const handleGradeCancel = useCallback((e) => {
    e?.stopPropagation();
    setShowGradeInput(false);
    setGradeInput('');
    setError('');
  }, []);

  const handleEditClick = useCallback(() => {
    onOpenEditModal(lesson);
  }, [lesson, onOpenEditModal]);

  // Render grade input mode
  if (showGradeInput) {
    return (
      <li className={itemClassName}>
        <GradeInput
          value={gradeInput}
          onChange={setGradeInput}
          onSubmit={handleGradeSubmit}
          onCancel={handleGradeCancel}
          maxScore={lesson.grade_max_value}
          isSubmitting={isToggling}
          error={error}
        />
      </li>
    );
  }

  // Render normal mode
  return (
    <li className={itemClassName}>
      <div className="flex items-center w-full">
        <CompletionToggle
          isCompleted={materialInfo.isCompleted}
          isToggling={isToggling}
          onClick={handleToggle}
          disabled={isToggling}
        />
        
        <div 
          className="flex-grow flex items-center justify-between min-w-0 cursor-pointer"
          onClick={handleEditClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleEditClick()}
          aria-label={`Open details for ${lesson.title}`}
        >
          <div className="flex items-center min-w-0">
            <span 
              className={`truncate ${
                materialInfo.isCompleted 
                  ? 'line-through text-gray-500' 
                  : 'font-medium text-gray-800'
              }`}
              title={lesson.title}
            >
              {lesson.title}
            </span>
            {lesson.content_type && (
              <span 
                className="ml-2 text-gray-400 text-[10px] uppercase whitespace-nowrap"
                aria-label={`Content type: ${formatContentType(lesson.content_type)}`}
              >
                ({formatContentType(lesson.content_type)})
              </span>
            )}
          </div>
          
          <div className="text-xs text-gray-500 ml-2 whitespace-nowrap">
            {lesson.grade_value ? (
              <span 
                className="font-semibold text-blue-600"
                aria-label={`Grade: ${lesson.grade_value}${lesson.grade_max_value ? ` out of ${lesson.grade_max_value}` : ''}`}
              >
                {lesson.grade_value}{lesson.grade_max_value ? `/${lesson.grade_max_value}` : ''}
              </span>
            ) : lesson.due_date ? (
              <span 
                className={
                  materialInfo.isOverdue 
                    ? 'text-red-600 font-semibold' 
                    : materialInfo.isDueSoon 
                    ? 'text-yellow-600 font-semibold' 
                    : ''
                }
                aria-label={`Due date: ${formatDueDate(lesson.due_date)}`}
              >
                Due: {formatDueDate(lesson.due_date)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      
      {error && (
        <div 
          className="absolute top-full left-0 mt-1 text-xs text-red-600 bg-white p-2 rounded shadow border z-10"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
    </li>
  );
}

// PropTypes for development (could be replaced with TypeScript)
MaterialListItem.defaultProps = {
  lesson: {
    id: '',
    title: '',
    content_type: '',
    completed_at: null,
    grade_value: '',
    grade_max_value: '',
    due_date: ''
  }
};