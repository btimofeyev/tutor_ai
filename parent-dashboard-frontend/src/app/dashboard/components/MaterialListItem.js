// app/dashboard/components/MaterialListItem.js
'use client';
import React, { useState } from 'react'; // Added useState for local loading state
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'; // Using solid icons for better visibility

// Assume these are imported or passed if needed for styling decisions (isOverdue, isDueSoon)
// import { isDateOverdue, isDateDueSoon } from '../../../utils/dateHelpers'; 

export default function MaterialListItem({ lesson, onOpenEditModal, onToggleComplete }) {
  const [isToggling, setIsToggling] = useState(false);

  // Define gradable content types
  const GRADABLE_CONTENT_TYPES = ['worksheet', 'assignment', 'test', 'quiz'];
  
  const isGradable = GRADABLE_CONTENT_TYPES.includes(lesson.content_type);
  const hasMaxScore = lesson.grade_max_value && lesson.grade_max_value.trim() !== '';
  const hasGrade = lesson.grade_value && lesson.grade_value.trim() !== '';
  
  const handleToggle = async (e) => {
    e.stopPropagation(); // Prevent opening edit modal when clicking checkbox area
    
    // Check if this is a gradable item that requires a grade before completion
    if (!lesson.completed_at && isGradable && hasMaxScore && !hasGrade) {
      alert(`This ${lesson.content_type} has a max score of ${lesson.grade_max_value} but no grade has been entered. Please add a grade before marking as complete.`);
      onOpenEditModal(lesson); // Open edit modal to add grade
      return;
    }
    
    setIsToggling(true);
    await onToggleComplete(lesson.id, !lesson.completed_at);
    setIsToggling(false);
  };
  
  // Determine visual cues based on lesson properties
  // These helpers would ideally be imported from a shared utils file
  const isLessonOverdue = (dateString, completed) => {
    if (completed || !dateString) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString + 'T00:00:00Z');
    return dueDate < today;
  };
  const isLessonDueSoon = (dateString, completed, days = 7) => {
    if (completed || !dateString) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString + 'T00:00:00Z');
    const soonCutoff = new Date(today); soonCutoff.setDate(today.getDate() + days);
    return dueDate >= today && dueDate <= soonCutoff;
  };

  const overdue = isLessonOverdue(lesson.due_date, !!lesson.completed_at);
  const dueSoon = isLessonDueSoon(lesson.due_date, !!lesson.completed_at);

  return (
    <li
      className={`rounded-md px-3 py-2.5 flex items-center group transition-all duration-150 ease-in-out relative
                  ${lesson.completed_at ? 'bg-green-50 hover:bg-green-100 border-l-4 border-green-500' 
                      : (overdue ? 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500' 
                      : (dueSoon ? 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400' :'bg-gray-50 hover:bg-gray-100 border-l-4 border-transparent'))}`}
    >
      {/* Quick Complete Checkbox Area */}
      <div 
        onClick={handleToggle} 
        className={`mr-3 p-1 rounded-full cursor-pointer hover:bg-gray-200 transition-colors ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={lesson.completed_at ? "Mark as Incomplete" : "Mark as Complete"}
        role="button"
        aria-pressed={!!lesson.completed_at}
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleToggle(e)}
      >
        {isToggling ? (
            <div className="h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        ) : lesson.completed_at ? (
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
        ) : (
          <div className="h-5 w-5 border-2 border-gray-300 rounded-full group-hover:border-blue-400"></div> // Empty circle
        )}
      </div>
      
      {/* Main Content - Clickable to open Edit Modal */}
      <div 
        className="flex-grow flex items-center justify-between min-w-0 cursor-pointer"
        onClick={() => onOpenEditModal(lesson)}
      >
        <div className="flex items-center min-w-0"> {/* For truncation */}
            {/* Removed visual cues like !, ▶ from here as checkbox serves primary status */}
            <span className={`truncate ${lesson.completed_at ? 'line-through text-gray-500' : 'font-medium text-gray-800'}`}>
            {lesson.title}
            </span>
            {lesson.content_type && <span className="ml-2 text-gray-400 text-[10px] uppercase whitespace-nowrap">({lesson.content_type.replace(/_/g, ' ')})</span>}
        </div>
        <div className="text-xs text-gray-500 ml-2 whitespace-nowrap">
            {lesson.grade_value ? <span className="font-semibold text-blue-600"> {lesson.grade_value}{lesson.grade_max_value ? `/${lesson.grade_max_value}`:''}</span> 
                : (lesson.due_date ? 
                    <span className={`${overdue ? 'text-red-600 font-semibold' : (dueSoon ? 'text-yellow-600 font-semibold' : '')}`}>
                        Due: {new Date(lesson.due_date + 'T00:00:00Z').toLocaleDateString()}
                    </span> 
                    : '')}
        </div>
      </div>
    </li>
  );
}