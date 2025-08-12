// app/dashboard/components/ChildAccountDeleteModal.js
'use client';
import React, { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function ChildAccountDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  child,
  childStats,
  isDeleting = false
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isConfirmationValid, setIsConfirmationValid] = useState(false);

  const requiredText = child ? `DELETE ${child.name}` : '';

  useEffect(() => {
    setIsConfirmationValid(confirmationText === requiredText);
  }, [confirmationText, requiredText]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowConfirm(false);
      setConfirmationText('');
    }
  }, [isOpen]);

  if (!isOpen || !child) return null;

  const handleFirstDelete = () => {
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!isConfirmationValid) return;
    await onConfirm(child.id);
    setShowConfirm(false);
    setConfirmationText('');
    onClose();
  };

  const handleClose = () => {
    setShowConfirm(false);
    setConfirmationText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">Delete Child Account</h2>
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
                    <p>This will permanently delete the child account and <strong>ALL</strong> associated data including:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All materials and assignments</li>
                      <li>All grades and progress data</li>
                      <li>All subjects and curriculum</li>
                      <li>All schedule entries</li>
                      <li>Login credentials</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Child account to be deleted:</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Name:</span> {child.name}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Grade:</span> {child.grade || 'Not specified'}
                </p>
                {child.child_username && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Username:</span> {child.child_username}
                  </p>
                )}
                {childStats && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Total Materials:</span> {childStats.totalMaterials || 0}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Subjects:</span> {childStats.totalSubjects || 0}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Completed Items:</span> {childStats.completedMaterials || 0}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {showConfirm && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">
                  Confirmation Required
                </h4>
                <p className="text-sm text-yellow-700 mb-3">
                  Type <code className="bg-yellow-200 px-1 rounded font-mono">{requiredText}</code> to confirm deletion:
                </p>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Type the confirmation text"
                  autoFocus
                  disabled={isDeleting}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              disabled={isDeleting}
            >
              Cancel
            </button>

            {/* First step: Show Delete Account button */}
            {!showConfirm && (
              <button
                onClick={handleFirstDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 hover:border-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                disabled={isDeleting}
                style={{ backgroundColor: '#dc2626', color: 'white' }}
              >
                Delete Account
              </button>
            )}

            {/* Second step: Show Confirm Delete button */}
            {showConfirm && (
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors flex items-center"
                style={{
                  backgroundColor: isConfirmationValid && !isDeleting ? '#dc2626' : '#9ca3af',
                  borderColor: isConfirmationValid && !isDeleting ? '#dc2626' : '#9ca3af',
                  color: 'white',
                  cursor: isConfirmationValid && !isDeleting ? 'pointer' : 'not-allowed'
                }}
                disabled={!isConfirmationValid || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Confirm Delete Account'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
