// UnitManagementModal.js
// Extracted from main dashboard component to improve code organization and performance
'use client';

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
  XMarkIcon, 
  PlusCircleIcon, 
  PencilIcon, 
  TrashIcon,
  ListBulletIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { modalBackdropStyles, modalHeaderStyles, formInputStyles } from '../../../utils/dashboardStyles';
import { handleApiError, createSuccessResponse } from '../../../utils/commonHelpers';
import { focusManagement, ariaLabels } from '../../../utils/accessibility';

export default function UnitManagementModal({
  isOpen,
  onClose,
  managingUnitsForSubject,
  currentSubjectUnitsInModal,
  setCurrentSubjectUnitsInModal,
  newUnitNameModalState,
  setNewUnitNameModalState,
  bulkUnitCount,
  setBulkUnitCount,
  editingUnit,
  setEditingUnit,
  expandedUnitsInModal,
  setExpandedUnitsInModal,
  creatingLessonGroupForUnit,
  setCreatingLessonGroupForUnit,
  newLessonGroupTitle,
  setNewLessonGroupTitle,
  onAddUnit,
  onBulkAddUnits,
  onUpdateUnit,
  onDeleteUnit,
  onCreateLessonGroupInModal,
  childrenData,
  showSuccess,
  showError
}) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement;
      
      // Set up focus trap when modal opens
      if (modalRef.current) {
        const cleanup = focusManagement.trapFocus(modalRef.current);
        return cleanup;
      }
    } else if (previousFocusRef.current) {
      // Restore focus when modal closes
      focusManagement.restoreFocus(previousFocusRef.current);
    }
  }, [isOpen]);

  if (!isOpen || !managingUnitsForSubject) return null;

  return (
    <div 
      className={modalBackdropStyles} 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-gray-200" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={modalHeaderStyles}>
          <div className="flex items-center justify-between">
            <div>
              <h2 
                id="modal-title"
                className="text-xl font-bold text-gray-900"
              >
                📚 Organize Your Curriculum
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Create units for <span className="font-semibold text-blue-700">{managingUnitsForSubject.name}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-80 rounded-full transition-colors"
              aria-label={`Close ${managingUnitsForSubject.name} units management modal`}
              data-close-modal
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add New Unit - Top Section */}
          {!editingUnit && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <PlusCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                Add New Units
              </h3>
              
              {/* Bulk Creation Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Name
                    </label>
                    <input
                      type="text"
                      value={newUnitNameModalState}
                      onChange={(e) => setNewUnitNameModalState(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Chapter, Unit, Module, etc."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      How Many?
                    </label>
                    <select
                      value={bulkUnitCount}
                      onChange={(e) => setBulkUnitCount(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value={1}>1 (Single Unit)</option>
                      <option value={5}>5 Units</option>
                      <option value={10}>10 Units</option>
                      <option value={15}>15 Units</option>
                      <option value={20}>20 Units</option>
                      <option value={25}>25 Units</option>
                    </select>
                  </div>
                </div>
                
                {bulkUnitCount > 1 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Preview:</strong> This will create {bulkUnitCount} units:
                    </p>
                    <div className="text-xs text-blue-700 space-y-1 max-h-24 overflow-y-auto">
                      {Array.from({ length: Math.min(bulkUnitCount, 5) }, (_, i) => (
                        <div key={i}>• {newUnitNameModalState || 'Unit'} {i + 1}</div>
                      ))}
                      {bulkUnitCount > 5 && (
                        <div className="text-blue-600">... and {bulkUnitCount - 5} more</div>
                      )}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={onBulkAddUnits}
                  type="button"
                  style={{ 
                    backgroundColor: 'var(--accent-yellow)', 
                    color: 'var(--text-primary)',
                    border: '1px solid transparent',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: '600',
                    transition: 'all 150ms ease-out',
                    boxShadow: 'var(--shadow-sm)',
                    padding: '12px 16px',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--accent-yellow-hover)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--accent-yellow)'}
                >
                  Create {bulkUnitCount} Unit{bulkUnitCount !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {/* Existing Units */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📋</span>
              Current Units ({currentSubjectUnitsInModal.length})
            </h3>
            
            {currentSubjectUnitsInModal.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📚</div>
                <p className="text-gray-500 text-lg mb-2">No units yet!</p>
                <p className="text-gray-400 text-sm">Create your first unit above to get started organizing content.</p>
              </div>
            ) : (
              currentSubjectUnitsInModal.map((unit, index) => (
                <div
                  key={unit.id}
                  className={`bg-white border-2 rounded-xl transition-all duration-200 ${
                    editingUnit?.id === unit.id
                      ? "border-blue-300 shadow-lg bg-blue-50"
                      : "border-gray-200 hover:border-blue-200 hover:shadow-md"
                  }`}
                >
                  {editingUnit?.id === unit.id ? (
                    <div className="p-6">
                      <form onSubmit={onUpdateUnit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Unit Name
                          </label>
                          <input
                            type="text"
                            value={editingUnit.name}
                            onChange={(e) =>
                              setEditingUnit({
                                ...editingUnit,
                                name: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            autoFocus
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description (Optional)
                          </label>
                          <textarea
                            value={editingUnit.description || ""}
                            onChange={(e) =>
                              setEditingUnit({
                                ...editingUnit,
                                description: e.target.value,
                              })
                            }
                            rows="3"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            placeholder="Add a brief description of what this unit covers..."
                          />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingUnit(null)}
                            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-2xl mr-3">📖</span>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">
                                {unit.name}
                              </h4>
                              {unit.description && (
                                <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                                  {unit.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => setExpandedUnitsInModal(prev => ({
                              ...prev,
                              [unit.id]: !prev[unit.id]
                            }))}
                            className="p-3 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                            title="Manage Lesson Groups"
                          >
                            <ListBulletIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() =>
                              setEditingUnit({
                                ...unit,
                                description: unit.description || "",
                              })
                            }
                            className="p-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Unit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => onDeleteUnit(unit.id)}
                            className="p-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Unit"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Lesson Groups Section */}
                      {expandedUnitsInModal[unit.id] && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-md font-semibold text-gray-800">Lesson Groups</h5>
                            <button
                              onClick={() => setCreatingLessonGroupForUnit(unit.id)}
                              className="inline-flex items-center px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            >
                              <PlusIcon className="h-4 w-4 mr-1" />
                              Add Group
                            </button>
                          </div>
                          
                          {/* Add New Lesson Group Form */}
                          {creatingLessonGroupForUnit === unit.id && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newLessonGroupTitle}
                                  onChange={(e) => setNewLessonGroupTitle(e.target.value)}
                                  placeholder="Lesson group title..."
                                  className="flex-1 px-3 py-2 text-sm border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => onCreateLessonGroupInModal(unit.id)}
                                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  Create
                                </button>
                                <button
                                  onClick={() => {
                                    setCreatingLessonGroupForUnit(null);
                                    setNewLessonGroupTitle("");
                                  }}
                                  className="px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Existing Lesson Groups */}
                          <div className="space-y-2">
                            {(childrenData.lessonsByUnit[unit.id] || []).length === 0 ? (
                              <p className="text-sm text-gray-500 italic">No lesson groups yet.</p>
                            ) : (
                              (childrenData.lessonsByUnit[unit.id] || []).map(lessonGroup => (
                                <div key={lessonGroup.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                  <span className="text-sm text-gray-700">{lessonGroup.title}</span>
                                  <span className="text-xs text-gray-500">
                                    {childrenData.lessonsBySubject[managingUnitsForSubject.id]?.filter(l => l.lesson_id === lessonGroup.id).length || 0} materials
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

UnitManagementModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  managingUnitsForSubject: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired
  }),
  currentSubjectUnitsInModal: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string
  })).isRequired,
  setCurrentSubjectUnitsInModal: PropTypes.func.isRequired,
  newUnitNameModalState: PropTypes.string.isRequired,
  setNewUnitNameModalState: PropTypes.func.isRequired,
  bulkUnitCount: PropTypes.number.isRequired,
  setBulkUnitCount: PropTypes.func.isRequired,
  editingUnit: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string
  }),
  setEditingUnit: PropTypes.func.isRequired,
  expandedUnitsInModal: PropTypes.object.isRequired,
  setExpandedUnitsInModal: PropTypes.func.isRequired,
  creatingLessonGroupForUnit: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  setCreatingLessonGroupForUnit: PropTypes.func.isRequired,
  newLessonGroupTitle: PropTypes.string.isRequired,
  setNewLessonGroupTitle: PropTypes.func.isRequired,
  onAddUnit: PropTypes.func.isRequired,
  onBulkAddUnits: PropTypes.func.isRequired,
  onUpdateUnit: PropTypes.func.isRequired,
  onDeleteUnit: PropTypes.func.isRequired,
  onCreateLessonGroupInModal: PropTypes.func.isRequired,
  childrenData: PropTypes.shape({
    lessonsByUnit: PropTypes.object.isRequired,
    lessonsBySubject: PropTypes.object.isRequired
  }).isRequired,
  showSuccess: PropTypes.func.isRequired,
  showError: PropTypes.func.isRequired
};