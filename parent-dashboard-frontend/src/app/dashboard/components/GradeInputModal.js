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
  const [scoreValue, setScoreValue] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && lesson) {
      if (lesson.grade_value && lesson.grade_max_value) {
        setScoreValue(lesson.grade_value.toString());
        setTotalValue(lesson.grade_max_value.toString());
      } else {
        setScoreValue('');
        setTotalValue(lesson.grade_max_value?.toString() || '');
      }
      setError('');
    }
  }, [isOpen, lesson]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!scoreValue.trim() || !totalValue.trim()) {
      setError('Both score and total are required.');
      return;
    }

    const score = parseFloat(scoreValue);
    const total = parseFloat(totalValue);

    if (isNaN(score) || isNaN(total)) {
      setError('Please enter valid numbers.');
      return;
    }

    if (score < 0 || total < 0) {
      setError('Values cannot be negative.');
      return;
    }

    if (total === 0) {
      setError('Total cannot be zero.');
      return;
    }

    if (score > total) {
      setError('Score cannot exceed total points.');
      return;
    }

    // Pass both grade value and max value as expected by the gradebook API
    onSubmit({
      grade_value: score,
      grade_max_value: total
    });
  };

  const handleCompleteWithoutGrade = () => {
    // Pass null to indicate completion without grade
    onSubmit(null);
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
              <p className="text-sm text-blue-700 mt-1">Enter the score out of total points</p>
            </div>

            {/* Grade Input - Score out of Total */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Grade
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label htmlFor="score-input" className="block text-xs text-gray-500 mb-1">
                    Points Scored
                  </label>
                  <input
                    id="score-input"
                    type="number"
                    step="0.1"
                    min="0"
                    value={scoreValue}
                    onChange={(e) => setScoreValue(e.target.value)}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                    placeholder="5"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <div className="text-2xl font-bold text-gray-400 pt-6">/</div>
                <div className="flex-1">
                  <label htmlFor="total-input" className="block text-xs text-gray-500 mb-1">
                    Total Points
                  </label>
                  <input
                    id="total-input"
                    type="number"
                    step="0.1"
                    min="0"
                    value={totalValue}
                    onChange={(e) => setTotalValue(e.target.value)}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                    placeholder="7"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            {/* Info message about grading later */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Tip:</span> You can add a grade later from the &quot;Needs Grading&quot; section on your dashboard.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full py-3 text-base font-semibold"
            >
              {isLoading ? 'Saving...' : 'Complete with Grade'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleCompleteWithoutGrade}
              disabled={isLoading}
              className="w-full py-3 text-base"
            >
              Complete Without Grade
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isLoading}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
