// app/dashboard/components/MaterialDeleteModal.js
'use client';
import React, { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Button from '../../../components/ui/Button';

export default function MaterialDeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  material,
  isDeleting = false 
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen || !material) return null;

  const handleFirstDelete = () => {
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    await onConfirm(material.id);
    setShowConfirm(false);
    onClose();
  };

  const handleClose = () => {
    setShowConfirm(false);
    onClose();
  };

  const formatContentType = (contentType) => {
    return contentType ? contentType.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : 'Material';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">Delete Material</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isDeleting}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    This action cannot be undone
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>This will permanently delete the material and any associated grades or progress data.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Material to be deleted:</h4>
              <div className="space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Title:</span> {material.title}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Type:</span> {formatContentType(material.content_type)}
                </p>
                {material.due_date && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Due Date:</span> {new Date(material.due_date + 'T00:00:00').toLocaleDateString()}
                  </p>
                )}
                {material.grade_value !== null && material.grade_value !== undefined && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Grade:</span> {material.grade_value}{material.grade_max_value ? `/${material.grade_max_value}` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              onClick={handleClose}
              variant="outline"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            {!showConfirm ? (
              <Button
                onClick={handleFirstDelete}
                variant="danger"
                disabled={isDeleting}
              >
                Delete
              </Button>
            ) : (
              <Button
                onClick={handleConfirmDelete}
                variant="danger"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Confirm Delete'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}