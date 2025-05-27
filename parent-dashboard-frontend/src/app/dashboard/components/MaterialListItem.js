// app/dashboard/components/MaterialListItem.js
'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { CheckCircleIcon as CheckSolidIcon } from '@heroicons/react/24/solid';
import { PencilSquareIcon, CalendarDaysIcon, CheckCircleIcon, NoSymbolIcon, DocumentTextIcon } from '@heroicons/react/24/outline'; // Using outline for actions


// Constants
const GRADABLE_CONTENT_TYPES = ['worksheet', 'assignment', 'test', 'quiz'];
const DUE_SOON_DAYS = 7;

// Style classes for different states - these will be simpler with direct Tailwind and CSS vars
// For item background and borders - now handled by conditional classes

const GRADE_INPUT_STYLES = {
  container: 'flex items-center w-full gap-1.5 p-1.5 bg-blue-50 border border-blue-200 rounded-md my-1',
  label: 'text-xs font-medium text-accent-blue whitespace-nowrap',
  input: 'flex-1 px-2 py-1 text-xs border border-border-input rounded-md focus:outline-none focus:ring-1 focus:ring-accent-blue shadow-sm',
  submitBtn: 'px-2 py-1 text-xs bg-accent-green text-text-on-accent rounded-md hover:bg-green-600 disabled:opacity-60',
  cancelBtn: 'px-2 py-1 text-xs bg-gray-400 text-text-on-accent rounded-md hover:bg-gray-500'
};

// Utility functions
const isDateOverdue = (dateString, completed) => {
  if (completed || !dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateString + 'T00:00:00Z'); // Ensure UTC interpretation
  return dueDate < today;
};

const isDateDueSoon = (dateString, completed, days = DUE_SOON_DAYS) => {
  if (completed || !dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateString + 'T00:00:00Z'); // Ensure UTC interpretation
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

// Grade Input Component
const GradeInput = React.memo(({ 
  value, onChange, onSubmit, onCancel, maxScore, isSubmitting, error 
}) => {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } 
    else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  }, [onSubmit, onCancel]);

  return (
    <div className={GRADE_INPUT_STYLES.container} role="form" aria-label="Enter grade">
      <label className={GRADE_INPUT_STYLES.label} htmlFor="grade-input">Grade:</label>
      <input
        id="grade-input" type="text" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown}
        className={GRADE_INPUT_STYLES.input} placeholder={maxScore ? `e.g., 85 / ${maxScore}`: 'e.g. A+'} autoFocus
        aria-describedby={error ? "grade-error" : undefined} aria-invalid={!!error}
      />
      <button onClick={onSubmit} disabled={isSubmitting || !value.trim()} className={GRADE_INPUT_STYLES.submitBtn} aria-label="Submit grade" type="button">
        {isSubmitting ? '...' : '✓'}
      </button>
      <button onClick={onCancel} className={GRADE_INPUT_STYLES.cancelBtn} aria-label="Cancel grade input" type="button">✕</button>
      {error && <p id="grade-error" className="text-xs text-accent-red mt-0.5 col-span-full">{error}</p>}
    </div>
  );
});
GradeInput.displayName = 'GradeInput';

// Completion Toggle Button Component
const CompletionToggle = React.memo(({ isCompleted, isToggling, onClick, disabled }) => {
  const handleKeyDown = useCallback((e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) { e.preventDefault(); onClick(e); }
  }, [onClick, disabled]);

  return (
    <button 
      onClick={disabled ? undefined : onClick}
      className={`mr-2.5 p-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-200 focus:ring-accent-blue'}
      `}
      title={isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
      aria-pressed={isCompleted} aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
      tabIndex={disabled ? -1 : 0} onKeyDown={handleKeyDown}
      disabled={isToggling || disabled}
    >
      {isToggling ? (
        <div className="h-5 w-5 border-2 border-gray-300 border-t-accent-blue rounded-full animate-spin" aria-label="Loading"/>
      ) : isCompleted ? (
        <CheckSolidIcon className="h-5 w-5 text-accent-green" aria-label="Completed" />
      ) : (
        <div className="h-5 w-5 border-2 border-border-input rounded-full group-hover:border-accent-blue" aria-label="Not completed"/>
      )}
    </button>
  );
});
CompletionToggle.displayName = 'CompletionToggle';


// Main Component
export default function MaterialListItem({ lesson, onOpenEditModal, onToggleComplete, isCompact = false }) {
  const [isToggling, setIsToggling] = useState(false);
  const [showGradeInput, setShowGradeInput] = useState(false);
  const [gradeInput, setGradeInput] = useState('');
  const [error, setError] = useState('');

  const materialInfo = useMemo(() => {
    const isGradable = GRADABLE_CONTENT_TYPES.includes(lesson.content_type);
    const hasMaxScore = lesson.grade_max_value && String(lesson.grade_max_value).trim() !== '';
    const hasGrade = lesson.grade_value && String(lesson.grade_value).trim() !== '';
    const isCompleted = !!lesson.completed_at;
    const overdue = isDateOverdue(lesson.due_date, isCompleted);
    const dueSoon = isDateDueSoon(lesson.due_date, isCompleted);
    
    return {
      isGradable, hasMaxScore, hasGrade, isCompleted,
      isOverdue: overdue, isDueSoon: dueSoon,
      needsGradeForCompletion: !isCompleted && isGradable && hasMaxScore && !hasGrade
    };
  }, [lesson]);

  const itemBaseClasses = "flex flex-col relative group rounded-md transition-colors duration-150";
  const itemPadding = isCompact ? "px-2 py-1.5" : "px-2.5 py-2";
  
  let itemStateClasses = "bg-background-card hover:bg-gray-50 border border-border-subtle";
  if (materialInfo.isCompleted) itemStateClasses = "bg-green-50 hover:bg-green-100 border border-green-200";
  else if (materialInfo.isOverdue) itemStateClasses = "bg-red-50 hover:bg-red-100 border border-red-200";
  else if (materialInfo.isDueSoon) itemStateClasses = "bg-orange-50 hover:bg-orange-100 border border-orange-200";

  const itemClassName = `${itemBaseClasses} ${itemPadding} ${itemStateClasses}`;

  const handleToggle = useCallback(async (e) => {
    e.stopPropagation(); setError('');
    if (materialInfo.needsGradeForCompletion) {
      setShowGradeInput(true); setGradeInput(lesson.grade_value || ''); return;
    }
    try {
      setIsToggling(true); await onToggleComplete(lesson.id, !lesson.completed_at);
    } catch (err) { setError('Failed to update.'); console.error('Toggle error:', err); } 
    finally { setIsToggling(false); }
  }, [lesson, materialInfo.needsGradeForCompletion, onToggleComplete]);

  const handleGradeSubmit = useCallback(async () => {
    const trimmedGrade = gradeInput.trim();
    if (!trimmedGrade && materialInfo.hasMaxScore) { setError('Please enter a grade.'); return; }
    try {
      setIsToggling(true); setError('');
      await onToggleComplete(lesson.id, true, trimmedGrade || null); // Pass null if empty for non-required grades
      setShowGradeInput(false); setGradeInput('');
    } catch (err) { setError('Failed to save.'); console.error('Grade submit error:', err); } 
    finally { setIsToggling(false); }
  }, [gradeInput, lesson.id, onToggleComplete, materialInfo.hasMaxScore]);

  const handleGradeCancel = useCallback((e) => {
    e?.stopPropagation(); setShowGradeInput(false); setGradeInput(''); setError('');
  }, []);

  const handleEditClick = useCallback(() => onOpenEditModal(lesson), [lesson, onOpenEditModal]);

  if (showGradeInput) {
    return (
      <li className={`${itemBaseClasses} ${itemPadding} bg-blue-50 border border-accent-blue`}>
        <GradeInput
          value={gradeInput} onChange={setGradeInput} onSubmit={handleGradeSubmit} onCancel={handleGradeCancel}
          maxScore={lesson.grade_max_value} isSubmitting={isToggling} error={error}
        />
      </li>
    );
  }

  return (
    <li className={itemClassName}>
      <div className="flex items-center w-full">
        <CompletionToggle
          isCompleted={materialInfo.isCompleted} isToggling={isToggling}
          onClick={handleToggle} disabled={isToggling}
        />
        
        <div className="flex-grow flex items-center justify-between min-w-0">
          <div 
            className="flex-grow min-w-0 cursor-pointer"
            onClick={handleEditClick} role="button" tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleEditClick()}
            aria-label={`Edit details for ${lesson.title}`}
          >
            <p className={`truncate font-medium text-sm ${materialInfo.isCompleted ? 'line-through text-text-tertiary' : 'text-text-primary'}`} title={lesson.title}>
              {lesson.title}
            </p>
            {!isCompact && lesson.content_type && (
              <p className="text-xs text-text-tertiary capitalize">{formatContentType(lesson.content_type)}</p>
            )}
          </div>
          
          <div className="text-xs text-text-secondary ml-2 whitespace-nowrap flex items-center flex-shrink-0">
            {lesson.grade_value || (lesson.grade_value === 0 && materialInfo.hasMaxScore) ? ( // Show 0 if grade_value is 0
              <span className="font-medium text-accent-blue mr-2" aria-label={`Grade: ${lesson.grade_value}${lesson.grade_max_value ? ` / ${lesson.grade_max_value}` : ''}`}>
                {String(lesson.grade_value)}{lesson.grade_max_value ? `/${String(lesson.grade_max_value)}` : ''}
              </span>
            ) : lesson.due_date && !materialInfo.isCompleted ? (
              <span className={`font-medium mr-2 flex items-center ${
                  materialInfo.isOverdue ? 'text-accent-red' : 
                  materialInfo.isDueSoon ? 'text-accent-orange' : 'text-text-tertiary'
                }`}
                aria-label={`Due: ${formatDueDate(lesson.due_date)}`}>
                <CalendarDaysIcon className="h-3.5 w-3.5 mr-0.5"/> {formatDueDate(lesson.due_date)}
              </span>
            ) : null}
            <button 
                onClick={handleEditClick} 
                className="p-1 text-text-tertiary hover:text-accent-blue opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-md"
                title="Edit Material"
            >
                <PencilSquareIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {error && (
        <p className="mt-1 text-xs text-accent-red bg-red-50 p-1 px-1.5 rounded text-center" role="alert">{error}</p>
      )}
    </li>
  );
}

MaterialListItem.defaultProps = {
  lesson: { id: '', title: '', content_type: '', completed_at: null, grade_value: null, grade_max_value: null, due_date: null },
  isCompact: false,
};