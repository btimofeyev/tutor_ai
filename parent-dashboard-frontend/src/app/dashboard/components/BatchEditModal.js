// app/dashboard/components/BatchEditModal.js
'use client';
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline';
import Button from '../../../components/ui/Button';

export default function BatchEditModal({ 
  isOpen, 
  onClose, 
  selectedItems, 
  onSave,
  isLoading = false 
}) {
  const [batchChanges, setBatchChanges] = useState({
    due_date: '',
    content_type: '',
    grade_max_value: '',
    completed: null
  });

  useEffect(() => {
    if (isOpen) {
      setBatchChanges({
        due_date: '',
        content_type: '',
        grade_max_value: '',
        completed: null
      });
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Only include fields that have been changed
    const changes = {};
    if (batchChanges.due_date) changes.due_date = batchChanges.due_date;
    if (batchChanges.content_type) changes.content_type = batchChanges.content_type;
    if (batchChanges.grade_max_value) changes.grade_max_value = batchChanges.grade_max_value;
    if (batchChanges.completed !== null) changes.completed = batchChanges.completed;
    
    if (Object.keys(changes).length === 0) {
      alert('Please make at least one change.');
      return;
    }
    
    onSave(selectedItems, changes);
  };

  if (!isOpen) return null;

  const contentTypes = [
    'lesson', 'worksheet', 'assignment', 'test', 'quiz', 'reading', 'project', 'review', 'other'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Edit {selectedItems.length} Assignments
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Make changes to all selected assignments at once
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Due Date */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="h-4 w-4" />
              Set Due Date (Optional)
            </label>
            <input
              type="date"
              value={batchChanges.due_date}
              onChange={(e) => setBatchChanges(prev => ({ ...prev, due_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to keep existing due dates
            </p>
          </div>

          {/* Assignment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 Change Assignment Type (Optional)
            </label>
            <select
              value={batchChanges.content_type}
              onChange={(e) => setBatchChanges(prev => ({ ...prev, content_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">Keep existing types</option>
              {contentTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Max Points */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎯 Set Max Points (Optional)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={batchChanges.grade_max_value}
              onChange={(e) => setBatchChanges(prev => ({ ...prev, grade_max_value: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 100"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to keep existing max points
            </p>
          </div>

          {/* Completion Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ✅ Completion Status (Optional)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBatchChanges(prev => ({ ...prev, completed: null }))}
                className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                  batchChanges.completed === null 
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={isLoading}
              >
                No Change
              </button>
              <button
                type="button"
                onClick={() => setBatchChanges(prev => ({ ...prev, completed: true }))}
                className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                  batchChanges.completed === true 
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={isLoading}
              >
                Mark Complete
              </button>
              <button
                type="button"
                onClick={() => setBatchChanges(prev => ({ ...prev, completed: false }))}
                className={`p-2 text-sm rounded-lg border-2 transition-colors ${
                  batchChanges.completed === false 
                    ? 'border-orange-500 bg-orange-50 text-orange-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                disabled={isLoading}
              >
                Mark Incomplete
              </button>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : `Update ${selectedItems.length} Assignments`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

BatchEditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  selectedItems: PropTypes.array.isRequired,
  onSave: PropTypes.func.isRequired
};