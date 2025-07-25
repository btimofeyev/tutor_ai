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
  const [selectedQuickGrade, setSelectedQuickGrade] = useState(null);

  useEffect(() => {
    if (isOpen && lesson) {
      setGradeValue(lesson.grade_value || '');
      setError('');
      setSelectedQuickGrade(null);
    }
  }, [isOpen, lesson]);

  // Generate quick grade options based on max score
  const getQuickGradeOptions = () => {
    if (!lesson.grade_max_value) return [];
    
    const maxScore = parseFloat(lesson.grade_max_value);
    return [
      { label: 'Perfect!', value: maxScore, percentage: 100, icon: '🌟' },
      { label: 'Great Job', value: Math.round(maxScore * 0.9), percentage: 90, icon: '😊' },
      { label: 'Good Work', value: Math.round(maxScore * 0.8), percentage: 80, icon: '👍' },
      { label: 'Needs Practice', value: Math.round(maxScore * 0.7), percentage: 70, icon: '📚' },
    ];
  };

  const handleQuickGrade = (option) => {
    setSelectedQuickGrade(option);
    setGradeValue(option.value.toString());
    setError('');
  };

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
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              How did {lesson.title} go?
            </h3>
            <p className="text-sm text-gray-500">
              Mark this assignment as complete with a grade
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="font-medium text-blue-900">{lesson.title}</p>
              {lesson.grade_max_value && (
                <p className="text-sm text-blue-700 mt-1">Maximum Points: {lesson.grade_max_value}</p>
              )}
            </div>

            {/* Quick Grade Options */}
            {getQuickGradeOptions().length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Quick Grade Options
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {getQuickGradeOptions().map((option, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleQuickGrade(option)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedQuickGrade?.label === option.label
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{option.icon}</span>
                        <span className="font-bold text-lg">{option.value}</span>
                      </div>
                      <div className="text-sm font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.percentage}%</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="grade-input" className="block text-sm font-medium text-gray-700 mb-2">
                Or Enter Custom Grade {lesson.grade_max_value && `(0-${lesson.grade_max_value})`}
              </label>
              <input
                id="grade-input"
                type="number"
                step="0.1"
                min="0"
                max={lesson.grade_max_value || undefined}
                value={gradeValue}
                onChange={(e) => {
                  setGradeValue(e.target.value);
                  setSelectedQuickGrade(null);
                }}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={lesson.grade_max_value ? `0-${lesson.grade_max_value}` : 'Enter grade'}
                disabled={isLoading}
                autoFocus={getQuickGradeOptions().length === 0}
              />
              
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>
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