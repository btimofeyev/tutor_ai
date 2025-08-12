// app/dashboard/components/NeedsGradingSection.js
'use client';
import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { APP_GRADABLE_CONTENT_TYPES } from '../../../utils/dashboardConstants';

const NeedsGradingItem = React.memo(({
  item,
  onQuickGrade,
  onOpenGradeModal,
  isGrading
}) => {

  const getContentTypeIcon = () => {
    switch (item.content_type) {
      case 'test':
        return <AcademicCapIcon className="h-4 w-4 text-red-500" />;
      case 'quiz':
        return <ClipboardDocumentCheckIcon className="h-4 w-4 text-orange-500" />;
      case 'assignment':
        return <PencilSquareIcon className="h-4 w-4 text-green-500" />;
      case 'worksheet':
        return <PencilSquareIcon className="h-4 w-4 text-blue-500" />;
      case 'review':
        return <PencilSquareIcon className="h-4 w-4 text-purple-500" />;
      default:
        return <PencilSquareIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = () => {
    switch (item.content_type) {
      case 'test':
        return 'border-l-red-500 bg-red-50';
      case 'quiz':
        return 'border-l-orange-500 bg-orange-50';
      case 'assignment':
        return 'border-l-green-500 bg-green-50';
      case 'worksheet':
        return 'border-l-blue-500 bg-blue-50';
      case 'review':
        return 'border-l-purple-500 bg-purple-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatCompletedDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Completed today';
    if (diffDays === 1) return 'Completed yesterday';
    if (diffDays < 7) return `Completed ${diffDays} days ago`;
    return `Completed ${date.toLocaleDateString()}`;
  };

  return (
    <div className={`border-l-2 ${getPriorityColor()} p-3 rounded text-sm mb-2 transition-all duration-300 ease-in-out animate-fade-in`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {getContentTypeIcon()}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate" title={item.title}>
              {item.title}
            </div>
            <div className="text-xs text-gray-600 flex items-center gap-2 mt-1">
              <span className="capitalize">{item.content_type}</span>
              <span className="text-gray-400">•</span>
              <span>{item.subject_name}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">{formatCompletedDate(item.completed_at)}</span>
              {item.grade_max_value ? (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="font-medium">Max: {item.grade_max_value} pts</span>
                </>
              ) : (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="font-medium">Grade: 0-100%</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          <button
            onClick={() => onOpenGradeModal(item)}
            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            disabled={isGrading}
          >
            Grade
          </button>
        </div>
      </div>
    </div>
  );
});

NeedsGradingItem.displayName = 'NeedsGradingItem';

export default function NeedsGradingSection({
  lessonsBySubject,
  onQuickGrade,
  onOpenGradeModal,
  isGrading = false
}) {
  const itemsNeedingGrades = useMemo(() => {
    const allLessons = Object.values(lessonsBySubject).flat();

    // Filter for completed gradable items without grades
    const needsGrading = allLessons.filter(lesson =>
      lesson.completed_at && // Is completed
      APP_GRADABLE_CONTENT_TYPES.includes(lesson.content_type) && // Is gradable
      (lesson.grade_value === null || lesson.grade_value === undefined || lesson.grade_value === '') // No grade yet
    );

    // Sort by priority: tests > quizzes > assignments > reviews > worksheets
    // Then by completion date (most recent first)
    const priorityOrder = {
      'test': 0,
      'quiz': 1,
      'assignment': 2,
      'review': 3,
      'worksheet': 4
    };

    return needsGrading.sort((a, b) => {
      // First sort by content type priority
      const priorityDiff = (priorityOrder[a.content_type] || 99) - (priorityOrder[b.content_type] || 99);
      if (priorityDiff !== 0) return priorityDiff;

      // Then by completion date (most recent first)
      return new Date(b.completed_at) - new Date(a.completed_at);
    });
  }, [lessonsBySubject]);

  // Don't render if no items need grading
  if (itemsNeedingGrades.length === 0) {
    return null;
  }

  // Limit display to 5 items
  const displayItems = itemsNeedingGrades.slice(0, 5);
  const totalCount = itemsNeedingGrades.length;
  const hasMore = totalCount > 5;

  return (
    <section className="mb-6" aria-labelledby="needs-grading-heading">
      <div className="mb-4">
        <h2 id="needs-grading-heading" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ExclamationCircleIcon className="h-5 w-5 text-orange-500" />
          Needs Grading
          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
            {totalCount}
          </span>
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Completed assignments waiting for grades
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="space-y-0">
          {displayItems.map((item) => (
            <NeedsGradingItem
              key={item.id}
              item={item}
              onQuickGrade={onQuickGrade}
              onOpenGradeModal={onOpenGradeModal}
              isGrading={isGrading}
            />
          ))}
        </div>

        {hasMore && (
          <div className="mt-3 pt-3 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Showing 5 of {totalCount} items needing grades
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

NeedsGradingSection.propTypes = {
  lessonsBySubject: PropTypes.object.isRequired,
  onQuickGrade: PropTypes.func.isRequired,
  onOpenGradeModal: PropTypes.func.isRequired,
  isGrading: PropTypes.bool
};
