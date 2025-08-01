// app/schedule/components/EditScheduleEntryModal.js
"use client";
import { useState, useEffect } from 'react';
import { XMarkIcon, ClockIcon, CalendarDaysIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const formInputStyles = "block w-full border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 rounded-md bg-white text-gray-900 placeholder-gray-500 shadow-sm text-sm px-3 py-2 relative z-10 schedule-select";
const formLabelStyles = "block text-sm font-medium text-gray-900 mb-1";

export default function EditScheduleEntryModal({ 
  isOpen, 
  onClose, 
  onSave,
  onDelete,
  scheduleEntry,
  childSubjects = [],
  materials = [],
  lessonsBySubject = {},
  unitsBySubject = {},
  lessonsByUnit = {},
  isSaving = false 
}) {
  // Form state
  const [formData, setFormData] = useState({
    subject_name: '',
    material_id: '',
    scheduled_date: '',
    start_time: '',
    duration_minutes: 30,
    notes: '',
    status: 'scheduled',
    is_material_based: false
  });

  const [errors, setErrors] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Material type filter state
  const [showAllMaterialTypes, setShowAllMaterialTypes] = useState(false);

  // Initialize form when modal opens or entry changes
  useEffect(() => {
    if (isOpen && scheduleEntry) {
      setFormData({
        subject_name: scheduleEntry.subject_name || scheduleEntry.subject || '',
        material_id: scheduleEntry.material_id || '',
        scheduled_date: scheduleEntry.scheduled_date || scheduleEntry.date || '',
        start_time: scheduleEntry.start_time || scheduleEntry.startTime || '',
        duration_minutes: scheduleEntry.duration_minutes || scheduleEntry.duration || 30,
        notes: scheduleEntry.notes || '',
        status: scheduleEntry.status || 'scheduled',
        is_material_based: !!scheduleEntry.material_id
      });
      setErrors({});
      setShowDeleteConfirm(false);
      setShowAllMaterialTypes(false);
    }
  }, [isOpen, scheduleEntry]);

  // Filter materials by content type
  const getFilteredMaterials = () => {
    if (!materials || materials.length === 0) return [];
    
    if (showAllMaterialTypes) {
      return materials;
    }
    
    // Only show lessons, readings, and videos by default
    return materials.filter(material => {
      const isLesson = material.content_type === 'lesson' || 
                      material.content_type === 'reading' || 
                      material.content_type === 'video';
      return isLesson;
    });
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'is_material_based') {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        // Clear the other field when switching modes
        material_id: checked ? prev.material_id : '',
        subject_name: checked ? '' : prev.subject_name
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseInt(value) || 0 : value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle material selection
  const handleMaterialChange = (e) => {
    const materialId = e.target.value;
    const selectedMaterial = materials.find(m => m.id === materialId);
    
    setFormData(prev => ({
      ...prev,
      material_id: materialId,
      subject_name: selectedMaterial ? selectedMaterial.subject_name : ''
    }));
  };

  // Handle status change
  const handleStatusChange = (newStatus) => {
    setFormData(prev => ({ ...prev, status: newStatus }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.scheduled_date) {
      newErrors.scheduled_date = 'Date is required';
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required';
    }

    if (formData.duration_minutes < 5) {
      newErrors.duration_minutes = 'Duration must be at least 5 minutes';
    }

    if (formData.is_material_based) {
      if (!formData.material_id) {
        newErrors.material_id = 'Please select a material';
      }
    } else {
      if (!formData.subject_name.trim()) {
        newErrors.subject_name = 'Subject name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // Clean the form data to remove fields that don't exist in database
      const cleanedData = {
        subject_name: formData.subject_name,
        material_id: formData.material_id || null,
        scheduled_date: formData.scheduled_date,
        start_time: formData.start_time,
        duration_minutes: parseInt(formData.duration_minutes),
        notes: formData.notes,
        status: formData.status
        // Don't include is_material_based - it's not a database field
      };
      
      await onSave(scheduleEntry.id, cleanedData);
      onClose();
    } catch (error) {
      console.error('Error updating schedule entry:', error);
      setErrors({ submit: 'Failed to update schedule entry. Please try again.' });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      await onDelete(scheduleEntry.id);
      onClose();
    } catch (error) {
      setErrors({ submit: 'Failed to delete schedule entry. Please try again.' });
    }
  };

  // Duration options
  const durationOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' }
  ];

  // Status options
  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
    { value: 'skipped', label: 'Skipped', color: 'bg-gray-100 text-gray-800' }
  ];

  if (!isOpen || !scheduleEntry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in modal-container">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col border border-[var(--border-subtle)] relative z-50">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[var(--border-subtle)] bg-[var(--background-card)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-[var(--accent-blue)]" />
            Edit Study Time
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2 rounded-full hover:bg-[var(--accent-blue)]/10"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-[var(--background-card)] relative modal-form">
          <div className="space-y-4">
            {/* Status Pills */}
            <div>
              <label className={formLabelStyles}>Status</label>
              <div className="flex gap-2">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleStatusChange(option.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      formData.status === option.value
                        ? option.color
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date and Time Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="scheduled_date" className={formLabelStyles}>
                  Date
                </label>
                <input
                  type="date"
                  id="scheduled_date"
                  name="scheduled_date"
                  value={formData.scheduled_date}
                  onChange={handleInputChange}
                  className={formInputStyles}
                  required
                />
                {errors.scheduled_date && (
                  <p className="text-red-600 text-xs mt-1">{errors.scheduled_date}</p>
                )}
              </div>

              <div>
                <label htmlFor="start_time" className={formLabelStyles}>
                  Start Time
                </label>
                <input
                  type="time"
                  id="start_time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  className={formInputStyles}
                  required
                />
                {errors.start_time && (
                  <p className="text-red-600 text-xs mt-1">{errors.start_time}</p>
                )}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="duration_minutes" className={formLabelStyles}>
                Duration
              </label>
              <select
                id="duration_minutes"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleInputChange}
                className={formInputStyles}
              >
                {durationOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.duration_minutes && (
                <p className="text-red-600 text-xs mt-1">{errors.duration_minutes}</p>
              )}
            </div>

            {/* Material vs Subject Toggle */}
            <div className="border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--background-main)]">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="is_material_based"
                  name="is_material_based"
                  checked={formData.is_material_based}
                  onChange={handleInputChange}
                  className="rounded border-[var(--border-input)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                />
                <label htmlFor="is_material_based" className="text-sm font-medium text-[var(--text-primary)]">
                  Schedule specific lesson/assignment
                </label>
              </div>

              {formData.is_material_based ? (
                // Material Selection
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className={formLabelStyles}>
                      Select Material to Schedule
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={showAllMaterialTypes}
                        onChange={(e) => setShowAllMaterialTypes(e.target.checked)}
                        className="rounded border-[var(--border-input)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)] h-3 w-3"
                      />
                      <span className="text-[var(--text-secondary)]">Show assignments & reviews</span>
                    </label>
                  </div>
                  
                  {getFilteredMaterials().length === 0 ? (
                    <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded border">
                      {materials.length === 0 ? 
                        'No materials uploaded yet. Add materials to your curriculum first, or uncheck the box above to schedule general study time.' :
                        'No lessons found. Try enabling "Show assignments & reviews" above.'
                      }
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="material_id" className="text-xs text-gray-600 mb-1 block">
                        Choose from {getFilteredMaterials().length} available {showAllMaterialTypes ? 'materials' : 'lessons'}:
                      </label>
                      <select
                        id="material_id"
                        name="material_id"
                        value={formData.material_id}
                        onChange={handleMaterialChange}
                        className={formInputStyles}
                      >
                        <option value="">Select a material...</option>
                        {getFilteredMaterials()
                          .sort((a, b) => {
                            // Sort by content type first, then by subject, then by creation date/title
                            const typeOrder = { lesson: 1, reading: 2, video: 3, worksheet: 4, assignment: 5, quiz: 6, test: 7, review: 8 };
                            const typeA = typeOrder[a.content_type] || 99;
                            const typeB = typeOrder[b.content_type] || 99;
                            if (typeA !== typeB) return typeA - typeB;
                            
                            const subjectA = a.subject_name || '';
                            const subjectB = b.subject_name || '';
                            if (subjectA !== subjectB) return subjectA.localeCompare(subjectB);
                            
                            // Sort by created_at if available, otherwise by title
                            if (a.created_at && b.created_at) {
                              return new Date(a.created_at) - new Date(b.created_at);
                            }
                            
                            const titleA = a.title || '';
                            const titleB = b.title || '';
                            return titleA.localeCompare(titleB);
                          })
                          .map((material, index) => {
                            const typeLabel = material.content_type ? 
                              material.content_type.charAt(0).toUpperCase() + material.content_type.slice(1).replace(/_/g, ' ') : 
                              'Unknown';
                            
                            // Show actual lesson title with number for clarity
                            const subjectPrefix = material.subject_name ? `[${material.subject_name}] ` : '';
                            const lessonNumber = index + 1;
                            let displayTitle = material.title || 'Untitled';
                            
                            // Clean up the title and truncate if too long
                            displayTitle = displayTitle.replace(/\(\)$/, '');
                            const maxLength = 30 - subjectPrefix.length;
                            if (displayTitle.length > maxLength) {
                              displayTitle = displayTitle.substring(0, maxLength - 3) + '...';
                            }
                            
                            const fullDisplayTitle = `${lessonNumber}. ${displayTitle}`;
                            
                            return (
                              <option key={material.id} value={material.id}>
                                {subjectPrefix}{fullDisplayTitle} • {typeLabel}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                  )}
                  
                  {errors.material_id && (
                    <p className="text-red-600 text-xs mt-1">{errors.material_id}</p>
                  )}
                </div>
              ) : (
                // Subject Name Input
                <div>
                  <label htmlFor="subject_name" className={formLabelStyles}>
                    Subject
                  </label>
                  {childSubjects.length > 0 ? (
                    <select
                      id="subject_name"
                      name="subject_name"
                      value={formData.subject_name}
                      onChange={handleInputChange}
                      className={formInputStyles}
                    >
                      <option value="">Select a subject...</option>
                      {childSubjects.map(subject => (
                        <option key={subject.child_subject_id} value={subject.name}>
                          {subject.name}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      id="subject_name"
                      name="subject_name"
                      value={formData.subject_name}
                      onChange={handleInputChange}
                      placeholder="e.g., Math, Science, English"
                      className={formInputStyles}
                    />
                  )}
                  {errors.subject_name && (
                    <p className="text-red-600 text-xs mt-1">{errors.subject_name}</p>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className={formLabelStyles}>
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Add any notes about this study session..."
                className={formInputStyles}
              />
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-[var(--border-subtle)] bg-[var(--background-card)]">
          {/* Delete Button */}
          <div>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                disabled={isSaving}
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                  disabled={isSaving}
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-gray-600 hover:text-gray-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="btn-primary flex items-center gap-2"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <ClockIcon className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Update
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}