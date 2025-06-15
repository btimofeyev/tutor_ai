// app/schedule/components/AIScheduleModal.js
"use client";
import { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, ClockIcon, CheckIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { format, addDays, startOfWeek } from 'date-fns';

const formInputStyles = "block w-full border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--border-input-focus)] focus:border-[var(--border-input-focus)] rounded-[var(--radius-md)] bg-background-card text-text-primary placeholder-text-tertiary shadow-sm text-sm px-3 py-2";
const formLabelStyles = "block text-sm font-medium text-[var(--text-primary)] mb-1";

export default function AIScheduleModal({ 
  isOpen, 
  onClose, 
  onGenerateSchedule,
  onApplySchedule,
  childId,
  childName = 'Student',
  childSubjects = [],
  aiScheduleResults = null,
  isGenerating = false,
  isApplying = false 
}) {
  // Form state for AI parameters
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    focus_subjects: [],
    weekly_hours: 15,
    session_duration: 'mixed', // 'short', 'medium', 'long', 'mixed'
    priority_mode: 'balanced' // 'difficult_first', 'easy_first', 'balanced'
  });

  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState('parameters'); // 'parameters', 'results'

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
      const endOfWeek = addDays(startOfThisWeek, 6);
      
      setFormData({
        start_date: format(startOfThisWeek, 'yyyy-MM-dd'),
        end_date: format(endOfWeek, 'yyyy-MM-dd'),
        focus_subjects: [],
        weekly_hours: 15,
        session_duration: 'mixed',
        priority_mode: 'balanced'
      });
      setErrors({});
      setCurrentStep('parameters');
    }
  }, [isOpen]);

  // Reset to parameters step when AI results are cleared
  useEffect(() => {
    if (!aiScheduleResults) {
      setCurrentStep('parameters');
    } else {
      setCurrentStep('results');
    }
  }, [aiScheduleResults]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle subject focus changes
  const handleSubjectChange = (subjectName) => {
    setFormData(prev => ({
      ...prev,
      focus_subjects: prev.focus_subjects.includes(subjectName)
        ? prev.focus_subjects.filter(s => s !== subjectName)
        : [...prev.focus_subjects, subjectName]
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    // Check that end date is after start date
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    if (formData.weekly_hours < 1 || formData.weekly_hours > 40) {
      newErrors.weekly_hours = 'Weekly hours must be between 1 and 40';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle AI generation
  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onGenerateSchedule({
        child_id: childId,
        ...formData
      });
    } catch (error) {
      console.error('Error generating AI schedule:', error);
      setErrors({ submit: 'Failed to generate AI schedule. Please try again.' });
    }
  };

  // Handle applying the AI schedule
  const handleApply = async () => {
    if (!aiScheduleResults?.suggestions) {
      return;
    }

    try {
      await onApplySchedule(aiScheduleResults.suggestions);
      onClose(); // Close modal after successful application
    } catch (error) {
      console.error('Error applying AI schedule:', error);
      setErrors({ submit: 'Failed to apply AI schedule. Please try again.' });
    }
  };

  // Session duration options
  const sessionDurationOptions = [
    { value: 'short', label: 'Short Sessions (15-30 min)', description: 'Better for younger children or difficult subjects' },
    { value: 'medium', label: 'Medium Sessions (30-60 min)', description: 'Balanced approach for most subjects' },
    { value: 'long', label: 'Long Sessions (60-90 min)', description: 'Deep focus for complex topics' },
    { value: 'mixed', label: 'Mixed Durations', description: 'AI will choose optimal duration per subject' }
  ];

  // Priority mode options
  const priorityModeOptions = [
    { value: 'difficult_first', label: 'Difficult Subjects First', description: 'Schedule challenging topics when energy is highest' },
    { value: 'easy_first', label: 'Easy Subjects First', description: 'Build momentum with simpler topics' },
    { value: 'balanced', label: 'Balanced Mix', description: 'Alternate between easy and difficult subjects' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border-subtle">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[var(--border-subtle)] bg-[var(--background-card)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-[var(--accent-blue)]" />
            AI Schedule Generator for {childName}
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2 rounded-full hover:bg-[var(--accent-blue)]/10"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {currentStep === 'parameters' && (
            <form onSubmit={handleGenerate} className="p-6 bg-white">
              <div className="space-y-6">
                {/* Date Range */}
                <div className="border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--background-main)]">
                  <h4 className="text-md font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <CalendarDaysIcon className="h-4 w-4" />
                    Schedule Time Range
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="start_date" className={formLabelStyles}>
                        Start Date
                      </label>
                      <input
                        type="date"
                        id="start_date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        className={formInputStyles}
                        required
                      />
                      {errors.start_date && (
                        <p className="text-red-600 text-xs mt-1">{errors.start_date}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="end_date" className={formLabelStyles}>
                        End Date
                      </label>
                      <input
                        type="date"
                        id="end_date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        className={formInputStyles}
                        required
                      />
                      {errors.end_date && (
                        <p className="text-red-600 text-xs mt-1">{errors.end_date}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Study Volume */}
                <div className="border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--background-main)]">
                  <h4 className="text-md font-medium text-[var(--text-primary)] mb-3">
                    Study Volume
                  </h4>
                  
                  <div>
                    <label htmlFor="weekly_hours" className={formLabelStyles}>
                      Target Weekly Study Hours
                    </label>
                    <input
                      type="range"
                      id="weekly_hours"
                      name="weekly_hours"
                      min="5"
                      max="40"
                      value={formData.weekly_hours}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
                      <span>5 hours</span>
                      <span className="font-medium text-[var(--text-primary)]">{formData.weekly_hours} hours</span>
                      <span>40 hours</span>
                    </div>
                    {errors.weekly_hours && (
                      <p className="text-red-600 text-xs mt-1">{errors.weekly_hours}</p>
                    )}
                  </div>
                </div>

                {/* Focus Subjects */}
                {childSubjects.length > 0 && (
                  <div className="border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--background-main)]">
                    <h4 className="text-md font-medium text-[var(--text-primary)] mb-3">
                      Focus Subjects (Optional)
                    </h4>
                    
                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                      Select subjects to prioritize in the schedule. If none selected, all subjects will be included equally.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {childSubjects.map(subject => (
                        <label key={subject.child_subject_id} className="flex items-center gap-2 p-2 rounded hover:bg-[var(--background-card)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.focus_subjects.includes(subject.name)}
                            onChange={() => handleSubjectChange(subject.name)}
                            className="rounded border-[var(--border-input)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                          />
                          <span className="text-sm text-[var(--text-primary)]">{subject.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Session Duration Preference */}
                <div className="border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--background-main)]">
                  <h4 className="text-md font-medium text-[var(--text-primary)] mb-3">
                    Session Duration Preference
                  </h4>
                  
                  <div className="space-y-2">
                    {sessionDurationOptions.map(option => (
                      <label key={option.value} className="flex items-start gap-3 p-3 rounded border border-transparent hover:border-[var(--border-input)] cursor-pointer">
                        <input
                          type="radio"
                          name="session_duration"
                          value={option.value}
                          checked={formData.session_duration === option.value}
                          onChange={handleInputChange}
                          className="mt-0.5 text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                        />
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)]">{option.label}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Priority Mode */}
                <div className="border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--background-main)]">
                  <h4 className="text-md font-medium text-[var(--text-primary)] mb-3">
                    Priority Mode
                  </h4>
                  
                  <div className="space-y-2">
                    {priorityModeOptions.map(option => (
                      <label key={option.value} className="flex items-start gap-3 p-3 rounded border border-transparent hover:border-[var(--border-input)] cursor-pointer">
                        <input
                          type="radio"
                          name="priority_mode"
                          value={option.value}
                          checked={formData.priority_mode === option.value}
                          onChange={handleInputChange}
                          className="mt-0.5 text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                        />
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)]">{option.label}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Submit Error */}
                {errors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{errors.submit}</p>
                  </div>
                )}
              </div>
            </form>
          )}

          {currentStep === 'results' && aiScheduleResults && (
            <div className="p-6 bg-white">
              {/* AI Reasoning */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-md font-medium text-blue-900 mb-2">AI Reasoning</h4>
                <p className="text-sm text-blue-800">{aiScheduleResults.reasoning}</p>
                <div className="mt-2">
                  <span className="text-xs text-blue-600">
                    Confidence: {Math.round((aiScheduleResults.confidence || 0) * 100)}%
                  </span>
                </div>
              </div>

              {/* Schedule Preview */}
              <div className="space-y-3">
                <h4 className="text-md font-medium text-[var(--text-primary)]">
                  Suggested Schedule ({aiScheduleResults.suggestions?.length || 0} sessions)
                </h4>
                
                {aiScheduleResults.suggestions?.map((suggestion, index) => (
                  <div key={index} className="border border-[var(--border-subtle)] rounded-lg p-4 hover:bg-[var(--background-main)] transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium text-[var(--text-primary)]">
                          {suggestion.subject_name}
                        </h5>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                          {suggestion.notes}
                        </p>
                      </div>
                      <div className="text-right text-sm text-[var(--text-secondary)]">
                        <div>{format(new Date(suggestion.scheduled_date), 'MMM d, yyyy')}</div>
                        <div>{suggestion.start_time} • {suggestion.duration_minutes}min</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-[var(--border-subtle)] bg-[var(--background-card)]">
          <div className="flex gap-3">
            {currentStep === 'results' && (
              <button
                type="button"
                onClick={() => setCurrentStep('parameters')}
                className="btn-secondary"
              >
                ← Back to Parameters
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isGenerating || isApplying}
            >
              Close
            </button>
            
            {currentStep === 'parameters' && (
              <button
                type="submit"
                onClick={handleGenerate}
                className="btn-primary flex items-center gap-2"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <ClockIcon className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4" />
                    Generate AI Schedule
                  </>
                )}
              </button>
            )}
            
            {currentStep === 'results' && (
              <button
                type="button"
                onClick={handleApply}
                className="btn-primary flex items-center gap-2"
                disabled={isApplying}
              >
                {isApplying ? (
                  <>
                    <ClockIcon className="h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Apply Schedule
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}