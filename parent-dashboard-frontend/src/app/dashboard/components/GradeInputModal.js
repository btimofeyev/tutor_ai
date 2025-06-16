// app/dashboard/components/GradeInputModal.js
'use client';
import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function GradeInputModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  lesson,
  isLoading = false 
}) {
  const [gradeValue, setGradeValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && lesson) {
      setGradeValue(lesson.grade_value || '');
      setError('');
    }
  }, [isOpen, lesson]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!gradeValue.trim()) {
      setError('Grade is required to mark this assignment as complete.');
      return;
    }

    // Basic validation for numeric grades if max score is set
    if (lesson.grade_max_value) {
      const numericGrade = parseFloat(gradeValue);
      const maxScore = parseFloat(lesson.grade_max_value);
      
      if (isNaN(numericGrade)) {
        setError('Please enter a valid numeric grade.');
        return;
      }
      
      if (numericGrade < 0) {
        setError('Grade cannot be negative.');
        return;
      }
      
      if (numericGrade > maxScore) {
        setError(`Grade cannot exceed the maximum score of ${maxScore}.`);
        return;
      }
    }

    onSubmit(gradeValue.trim());
  };

  const handleClose = () => {
    if (!isLoading) {
      setError('');
      onClose();
    }
  };

  if (!isOpen || !lesson) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Enter Grade
          </h3>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              <span className="font-medium">{lesson.title}</span>
              {lesson.grade_max_value && (
                <span className="text-gray-500"> (Max: {lesson.grade_max_value} points)</span>
              )}
            </p>
            
            <label htmlFor="grade-input" className="block text-sm font-medium text-gray-700 mb-2">
              Grade {lesson.grade_max_value && `(out of ${lesson.grade_max_value})`}
            </label>
            <input
              id="grade-input"
              type="text"
              value={gradeValue}
              onChange={(e) => setGradeValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={lesson.grade_max_value ? `0-${lesson.grade_max_value}` : 'Enter grade'}
              disabled={isLoading}
              autoFocus
            />
            
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Mark Complete'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}