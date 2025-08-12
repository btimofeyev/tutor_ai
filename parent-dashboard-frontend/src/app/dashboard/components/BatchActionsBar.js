// app/dashboard/components/BatchActionsBar.js
'use client';
import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircleIcon, TrashIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '../../../components/ui/Button';

export default function BatchActionsBar({
  selectedItems,
  onClearSelection,
  onBatchComplete,
  onBatchDelete,
  onBatchEdit,
  isVisible
}) {
  if (!isVisible || selectedItems.length === 0) return null;

  const handleComplete = () => {
    const incompleteItems = selectedItems.filter(item => !item.completed_at);
    if (incompleteItems.length === 0) {
      alert('All selected assignments are already completed.');
      return;
    }

    if (confirm(`Mark ${incompleteItems.length} assignment(s) as complete?`)) {
      onBatchComplete(incompleteItems);
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedItems.length} assignment(s)? This cannot be undone.`)) {
      onBatchDelete(selectedItems);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 sm:p-4 z-50 min-w-[280px] sm:min-w-[320px] max-w-[90vw]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
            {selectedItems.length} selected
          </div>
          <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">
            {selectedItems.filter(item => !item.completed_at).length} incomplete
          </span>
        </div>

        <button
          onClick={onClearSelection}
          className="text-gray-400 hover:text-gray-600 p-1"
          title="Clear selection"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex gap-1 sm:gap-2 mt-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handleComplete}
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
          disabled={selectedItems.filter(item => !item.completed_at).length === 0}
        >
          <CheckCircleIcon className="h-3 sm:h-4 w-3 sm:w-4" />
          <span className="hidden sm:inline">Mark Complete</span>
          <span className="sm:hidden">Complete</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onBatchEdit}
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
        >
          <PencilIcon className="h-3 sm:h-4 w-3 sm:w-4" />
          <span className="hidden sm:inline">Edit Selected</span>
          <span className="sm:hidden">Edit</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          className="flex items-center gap-1 sm:gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm px-2 sm:px-3"
        >
          <TrashIcon className="h-3 sm:h-4 w-3 sm:w-4" />
          <span className="hidden sm:inline">Delete</span>
          <span className="sm:hidden">Del</span>
        </Button>
      </div>
    </div>
  );
}

BatchActionsBar.propTypes = {
  selectedItems: PropTypes.array.isRequired,
  onClearSelection: PropTypes.func.isRequired,
  onBatchComplete: PropTypes.func.isRequired,
  onBatchDelete: PropTypes.func.isRequired,
  onBatchEdit: PropTypes.func.isRequired,
  isVisible: PropTypes.bool.isRequired
};
