// app/schedule/components/ScheduleSettingsModal.js
"use client";
import { useState, useEffect } from 'react';
import { XMarkIcon, Cog6ToothIcon, ClockIcon, CheckIcon } from '@heroicons/react/24/outline';

const formInputStyles = "block w-full border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--border-input-focus)] focus:border-[var(--border-input-focus)] rounded-[var(--radius-md)] bg-background-card text-text-primary placeholder-text-tertiary shadow-sm text-sm px-3 py-2";
const formLabelStyles = "block text-sm font-medium text-[var(--text-primary)] mb-1";

export default function ScheduleSettingsModal({ 
  isOpen, 
  onClose, 
  onSave,
  schedulePreferences = {},
  childName = 'Student',
  isSaving = false 
}) {
  // Form state
  const [formData, setFormData] = useState({
    preferred_start_time: '09:00',
    preferred_end_time: '15:00',
    max_daily_study_minutes: 240,
    break_duration_minutes: 15,
    difficult_subjects_morning: true,
    study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  });

  const [errors, setErrors] = useState({});

  // Initialize form when modal opens or preferences change
  useEffect(() => {
    if (isOpen && schedulePreferences) {
      setFormData({
        preferred_start_time: schedulePreferences.preferred_start_time || '09:00',
        preferred_end_time: schedulePreferences.preferred_end_time || '15:00', 
        max_daily_study_minutes: schedulePreferences.max_daily_study_minutes || 240,
        break_duration_minutes: schedulePreferences.break_duration_minutes || 15,
        difficult_subjects_morning: schedulePreferences.difficult_subjects_morning !== false,
        study_days: schedulePreferences.study_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      });
      setErrors({});
    }
  }, [isOpen, schedulePreferences]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) || 0 : value)
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle study days changes
  const handleStudyDayChange = (day) => {
    setFormData(prev => ({
      ...prev,
      study_days: prev.study_days.includes(day)
        ? prev.study_days.filter(d => d !== day)
        : [...prev.study_days, day]
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.preferred_start_time) {
      newErrors.preferred_start_time = 'Start time is required';
    }

    if (!formData.preferred_end_time) {
      newErrors.preferred_end_time = 'End time is required';
    }

    // Check that end time is after start time
    if (formData.preferred_start_time && formData.preferred_end_time) {
      const startTime = new Date(`1970-01-01T${formData.preferred_start_time}`);
      const endTime = new Date(`1970-01-01T${formData.preferred_end_time}`);
      
      if (endTime <= startTime) {
        newErrors.preferred_end_time = 'End time must be after start time';
      }
    }

    if (formData.max_daily_study_minutes < 30) {
      newErrors.max_daily_study_minutes = 'Daily study time must be at least 30 minutes';
    }

    if (formData.break_duration_minutes < 5) {
      newErrors.break_duration_minutes = 'Break duration must be at least 5 minutes';
    }

    if (formData.study_days.length === 0) {
      newErrors.study_days = 'Please select at least one study day';
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
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors({ submit: 'Failed to save preferences. Please try again.' });
    }
  };

  // Days of the week
  const weekDays = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  // Study duration options (in minutes)
  const studyDurationOptions = [
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' },
    { value: 240, label: '4 hours' },
    { value: 300, label: '5 hours' },
    { value: 360, label: '6 hours' },
    { value: 420, label: '7 hours' },
    { value: 480, label: '8 hours' }
  ];

  // Break duration options (in minutes)
  const breakDurationOptions = [
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 20, label: '20 minutes' },
    { value: 30, label: '30 minutes' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-border-subtle">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[var(--border-subtle)] bg-[var(--background-card)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Cog6ToothIcon className="h-5 w-5 text-[var(--accent-blue)]" />
            Schedule Preferences for {childName}
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2 rounded-full hover:bg-[var(--accent-blue)]/10"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="space-y-6">
            {/* Study Time Window */}
            <div className="border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--background-main)]">
              <h4 className="text-md font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                Study Time Window
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="preferred_start_time" className={formLabelStyles}>
                    Preferred Start Time
                  </label>
                  <input
                    type="time"
                    id="preferred_start_time"
                    name="preferred_start_time"
                    value={formData.preferred_start_time}
                    onChange={handleInputChange}
                    className={formInputStyles}
                    required
                  />
                  {errors.preferred_start_time && (
                    <p className="text-red-600 text-xs mt-1">{errors.preferred_start_time}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="preferred_end_time" className={formLabelStyles}>
                    Preferred End Time
                  </label>
                  <input
                    type="time"
                    id="preferred_end_time"
                    name="preferred_end_time"
                    value={formData.preferred_end_time}
                    onChange={handleInputChange}
                    className={formInputStyles}
                    required
                  />
                  {errors.preferred_end_time && (
                    <p className="text-red-600 text-xs mt-1">{errors.preferred_end_time}</p>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                This defines the general time window when study sessions are preferred.
              </p>
            </div>

            {/* Daily Limits */}
            <div className="border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--background-main)]">
              <h4 className="text-md font-medium text-[var(--text-primary)] mb-3">
                Daily Study Limits
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="max_daily_study_minutes" className={formLabelStyles}>
                    Maximum Daily Study Time
                  </label>
                  <select
                    id="max_daily_study_minutes"
                    name="max_daily_study_minutes"
                    value={formData.max_daily_study_minutes}
                    onChange={handleInputChange}
                    className={formInputStyles}
                  >
                    {studyDurationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.max_daily_study_minutes && (
                    <p className="text-red-600 text-xs mt-1">{errors.max_daily_study_minutes}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="break_duration_minutes" className={formLabelStyles}>
                    Break Duration Between Sessions
                  </label>
                  <select
                    id="break_duration_minutes"
                    name="break_duration_minutes"
                    value={formData.break_duration_minutes}
                    onChange={handleInputChange}
                    className={formInputStyles}
                  >
                    {breakDurationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.break_duration_minutes && (
                    <p className="text-red-600 text-xs mt-1">{errors.break_duration_minutes}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Study Days */}
            <div className="border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--background-main)]">
              <h4 className="text-md font-medium text-[var(--text-primary)] mb-3">
                Study Days
              </h4>
              
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Select which days of the week are available for scheduling study sessions.
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                {weekDays.map(day => (
                  <label key={day.value} className="flex items-center gap-2 p-2 rounded hover:bg-[var(--background-card)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.study_days.includes(day.value)}
                      onChange={() => handleStudyDayChange(day.value)}
                      className="rounded border-[var(--border-input)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                    />
                    <span className="text-sm text-[var(--text-primary)]">{day.label}</span>
                  </label>
                ))}
              </div>
              
              {errors.study_days && (
                <p className="text-red-600 text-xs mt-2">{errors.study_days}</p>
              )}
            </div>

            {/* Learning Preferences */}
            <div className="border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--background-main)]">
              <h4 className="text-md font-medium text-[var(--text-primary)] mb-3">
                Learning Preferences
              </h4>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="difficult_subjects_morning"
                  name="difficult_subjects_morning"
                  checked={formData.difficult_subjects_morning}
                  onChange={handleInputChange}
                  className="rounded border-[var(--border-input)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                />
                <label htmlFor="difficult_subjects_morning" className="text-sm text-[var(--text-primary)]">
                  Prioritize difficult subjects in the morning
                </label>
              </div>
              
              <p className="text-xs text-[var(--text-secondary)] mt-2 ml-6">
                When enabled, AI scheduling will place challenging subjects like Math and Science earlier in the day when focus is typically highest.
              </p>
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
        <div className="flex justify-end items-center gap-3 p-6 border-t border-[var(--border-subtle)] bg-[var(--background-card)]">
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
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}