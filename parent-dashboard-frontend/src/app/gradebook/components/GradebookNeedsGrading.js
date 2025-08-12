'use client';
import React, { useState, useMemo } from 'react';
import {
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserIcon,
  BookOpenIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import MaterialListItem from '../../dashboard/components/MaterialListItem';
import { formatContentTypeName } from '../../../utils/dashboardConstants';

const NeedsGradingItem = React.memo(({
  item,
  onOpenGradeModal,
  customCategories = []
}) => {
  const getDaysWaiting = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysWaiting = getDaysWaiting(item.completed_at);

  // Get color for content type (including custom categories)
  const getContentTypeColor = (contentType) => {
    if (contentType?.startsWith('custom_')) {
      return 'bg-purple-500'; // Purple for all custom categories
    }

    switch (contentType) {
      case 'test': return 'bg-red-500';
      case 'quiz': return 'bg-orange-500';
      case 'assignment': return 'bg-green-500';
      case 'worksheet': return 'bg-blue-500';
      case 'review': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // Get badge color for content type
  const getBadgeColor = (contentType) => {
    if (contentType?.startsWith('custom_')) {
      return 'bg-purple-100 text-purple-800';
    }

    switch (contentType) {
      case 'test': return 'bg-red-100 text-red-800';
      case 'quiz': return 'bg-orange-100 text-orange-800';
      case 'assignment': return 'bg-green-100 text-green-800';
      case 'worksheet': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Create a custom action for grading instead of the default edit/delete actions
  const customGradeAction = (
    <button
      onClick={() => onOpenGradeModal(item)}
      className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1"
    >
      <span>Grade</span>
    </button>
  );

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 relative">
      {/* Days waiting indicator */}
      {daysWaiting > 2 && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full z-10">
          Waiting {daysWaiting} days
        </div>
      )}

      {/* Priority border based on content type */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${getContentTypeColor(item.content_type)}`} />

      {/* Custom grading interface using MaterialListItem styling but with grading context */}
      <div className="group relative flex items-center py-4 px-4 cursor-default">
        {/* Grading indicator instead of completion toggle */}
        <div className="mr-4 p-2.5 rounded-full bg-orange-100 border border-orange-200 flex-shrink-0">
          <div className="h-5 w-5 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">?</span>
          </div>
        </div>

        <div className="flex-grow flex items-center justify-between min-w-0">
          <div className="flex-grow min-w-0">
            <p className="truncate font-semibold text-sm text-gray-900" title={item.title}>
              {item.title}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getBadgeColor(item.content_type)}`}>
                {formatContentTypeName(item.content_type, customCategories)}
              </span>
              <span className="text-xs text-gray-500">
                {item.child_name} • {item.subject_name}
              </span>
              <span className="text-xs text-gray-500">
                Completed {new Date(item.completed_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            {item.grade_max_value && (
              <span className="text-xs text-gray-500 mr-2">
                Max: {item.grade_max_value} pts
              </span>
            )}
            {customGradeAction}
          </div>
        </div>
      </div>
    </div>
  );
});

NeedsGradingItem.displayName = 'NeedsGradingItem';

export default function GradebookNeedsGrading({
  needsGradingItems,
  onOpenGradeModal,
  loading = false,
  customCategories = []
}) {
  const [expandedChildren, setExpandedChildren] = useState({});

  // Group items by child
  const itemsByChild = useMemo(() => {
    const grouped = {};

    needsGradingItems.forEach(item => {
      if (!grouped[item.child_id]) {
        grouped[item.child_id] = {
          child_name: item.child_name,
          child_grade: item.child_grade,
          items: []
        };
      }
      grouped[item.child_id].items.push(item);
    });

    return grouped;
  }, [needsGradingItems]);

  // Calculate priority counts
  const priorityCounts = useMemo(() => {
    const counts = {
      test: 0,
      quiz: 0,
      assignment: 0,
      worksheet: 0,
      review: 0,
      custom: 0 // Count all custom categories together
    };

    needsGradingItems.forEach(item => {
      if (item.content_type?.startsWith('custom_')) {
        counts.custom++;
      } else if (counts[item.content_type] !== undefined) {
        counts[item.content_type]++;
      }
    });

    return counts;
  }, [needsGradingItems]);

  const toggleChildExpanded = (childId) => {
    setExpandedChildren(prev => ({
      ...prev,
      [childId]: !prev[childId]
    }));
  };

  const expandAll = () => {
    const allExpanded = {};
    Object.keys(itemsByChild).forEach(childId => {
      allExpanded[childId] = true;
    });
    setExpandedChildren(allExpanded);
  };

  const collapseAll = () => {
    setExpandedChildren({});
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 py-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-20 bg-gray-100 rounded"></div>
        <div className="h-20 bg-gray-100 rounded"></div>
        <div className="h-20 bg-gray-100 rounded"></div>
      </div>
    );
  }

  if (needsGradingItems.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <ClipboardDocumentCheckIcon className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-500 max-w-sm">
            No materials are waiting for grades. Great job staying on top of grading!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Simplified expand/collapse controls - only show when there are multiple children */}
      {Object.keys(itemsByChild).length > 1 && (
        <div className="flex justify-end gap-3 text-xs">
          <button
            onClick={expandAll}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Expand All
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={collapseAll}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Collapse All
          </button>
        </div>
      )}

      {/* Items grouped by child */}
      <div className="space-y-3">
        {Object.entries(itemsByChild).map(([childId, childData]) => {
          const isExpanded = expandedChildren[childId] !== false; // Default to expanded

          return (
            <div key={childId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleChildExpanded(childId)}
                className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                  )}
                  <UserIcon className="h-5 w-5 text-gray-600" />
                  <span className="font-medium text-gray-900">
                    {childData.child_name}
                  </span>
                  {childData.child_grade && (
                    <span className="text-sm text-gray-500">
                      (Grade {childData.child_grade})
                    </span>
                  )}
                </div>
                <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                  {childData.items.length} items
                </span>
              </button>

              {isExpanded && (
                <div className="p-4 space-y-3">
                  {childData.items.map(item => (
                    <NeedsGradingItem
                      key={item.id}
                      item={item}
                      onOpenGradeModal={onOpenGradeModal}
                      customCategories={customCategories}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
