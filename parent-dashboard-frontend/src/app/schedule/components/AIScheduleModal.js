// AI Schedule Modal - Simple interface for AI schedule generation
"use client";
import { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ClockIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function AIScheduleModal({
  isOpen,
  onClose,
  onGenerate,
  childName = 'Student',
  selectedChildrenIds = [],
  allChildren = [],
  childSubjects = [],
  schedulePreferences = {},
  isGenerating = false,
  generationResult = null
}) {
  // Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [schedulingMode, setSchedulingMode] = useState('balanced');
  const [focusSubjects, setFocusSubjects] = useState([]);
  const [maxDailySessions, setMaxDailySessions] = useState(4);
  const [sessionDuration, setSessionDuration] = useState(45);

  // Initialize dates when modal opens
  useEffect(() => {
    if (isOpen && !startDate) {
      const today = new Date();
      const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      
      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(twoWeeksFromNow.toISOString().split('T')[0]);
    }
  }, [isOpen, startDate]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFocusSubjects([]);
      setSchedulingMode('balanced');
      setMaxDailySessions(4);
      setSessionDuration(45);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    // Different options for single child vs family scheduling
    const options = selectedChildrenIds.length > 1 ? {
      // Family coordination options
      start_date: startDate,
      end_date: endDate,
      coordination_mode: schedulingMode,
      daily_hours: { start: '09:00', end: '15:00' },
      blocked_times: [{ start: '12:00', end: '13:00', reason: 'Lunch' }],
      session_duration: sessionDuration
    } : {
      // Single child options
      start_date: startDate,
      end_date: endDate,
      scheduling_mode: schedulingMode,
      focus_subjects: focusSubjects,
      max_daily_sessions: maxDailySessions,
      session_duration: sessionDuration
    };

    const result = await onGenerate(options);
    
    // Keep modal open to show results
    if (result.success) {
      // Modal will show success state
    }
  };

  const handleSubjectToggle = (subjectId, subjectName) => {
    setFocusSubjects(prev => {
      const isSelected = prev.includes(subjectName);
      if (isSelected) {
        return prev.filter(s => s !== subjectName);
      } else {
        return [...prev, subjectName];
      }
    });
  };

  const getAvailableSubjects = () => {
    return childSubjects.map(cs => ({
      id: cs.id,
      name: cs.custom_subject_name_override || cs.subject?.name || 'General Study'
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">AI Schedule Generator</h2>
                <p className="text-blue-100 text-sm">
                  {selectedChildrenIds.length > 1 
                    ? `Generate coordinated schedules for ${selectedChildrenIds.length} children`
                    : `Generate an optimized schedule for ${childName}`
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Show results if generation was successful */}
          {generationResult && generationResult.success ? (
            <div className="space-y-6">
              {/* Success Header */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-800">Schedule Generated Successfully!</h3>
                    <p className="text-green-600 text-sm">Your AI-optimized schedule is ready.</p>
                  </div>
                </div>
              </div>

              {/* Results Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-800">Sessions Created</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {generationResult.summary?.total_sessions || 0}
                  </p>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AcademicCapIcon className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-purple-800">Subjects Covered</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900 mt-1">
                    {generationResult.summary?.subjects_covered?.length || 0}
                  </p>
                </div>
              </div>

              {/* Subjects Covered */}
              {generationResult.summary?.subjects_covered && generationResult.summary.subjects_covered.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Subjects Included:</h4>
                  <div className="flex flex-wrap gap-2">
                    {generationResult.summary.subjects_covered.map((subject, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range */}
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Schedule Period:</h4>
                <p className="text-gray-600">
                  {new Date(generationResult.summary?.date_range?.start_date).toLocaleDateString()} - {' '}
                  {new Date(generationResult.summary?.date_range?.end_date).toLocaleDateString()}
                </p>
              </div>

              {/* AI Confidence */}
              {generationResult.summary?.ai_confidence && (
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">AI Optimization Score:</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(generationResult.summary.ai_confidence * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      {Math.round(generationResult.summary.ai_confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  className="btn-primary"
                >
                  View Schedule
                </button>
              </div>
            </div>
          ) : (
            /* Configuration Form */
            <div className="space-y-6">
              {/* Date Range */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                  Schedule Period
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Scheduling Mode */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-purple-600" />
                  {selectedChildrenIds.length > 1 ? 'Coordination Mode' : 'Scheduling Mode'}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {selectedChildrenIds.length > 1 ? [
                    { id: 'balanced', name: 'Balanced', desc: 'Balance individual needs with family harmony' },
                    { id: 'synchronized', name: 'Synchronized', desc: 'Align children for shared study time' },
                    { id: 'staggered', name: 'Staggered', desc: 'Offset schedules to minimize conflicts' }
                  ] : [
                    { id: 'balanced', name: 'Balanced', desc: 'Even distribution across days' },
                    { id: 'intensive', name: 'Intensive', desc: 'More sessions per day' },
                    { id: 'relaxed', name: 'Relaxed', desc: 'Fewer sessions per day' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setSchedulingMode(mode.id)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        schedulingMode === mode.id
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{mode.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Subjects - only show for single child */}
              {selectedChildrenIds.length <= 1 && getAvailableSubjects().length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <AcademicCapIcon className="h-5 w-5 text-green-600" />
                    Focus Subjects
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Select subjects to prioritize (leave empty to include all subjects)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {getAvailableSubjects().map((subject) => (
                      <label key={subject.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={focusSubjects.includes(subject.name)}
                          onChange={() => handleSubjectToggle(subject.id, subject.name)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{subject.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Session Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Session Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedChildrenIds.length <= 1 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Sessions Per Day
                      </label>
                      <select
                        value={maxDailySessions}
                        onChange={(e) => setMaxDailySessions(Number(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={2}>2 sessions</option>
                        <option value={3}>3 sessions</option>
                        <option value={4}>4 sessions</option>
                        <option value={5}>5 sessions</option>
                        <option value={6}>6 sessions</option>
                      </select>
                    </div>
                  )}
                  <div className={selectedChildrenIds.length > 1 ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Session Duration
                    </label>
                    <select
                      value={sessionDuration}
                      onChange={(e) => setSessionDuration(Number(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {generationResult && !generationResult.success && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                    <div>
                      <h3 className="font-semibold text-red-800">Generation Failed</h3>
                      <p className="text-red-600 text-sm">{generationResult.error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={onClose}
                  className="btn-secondary"
                  disabled={isGenerating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !startDate || !endDate}
                  className="btn-primary flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4" />
                      Generate AI Schedule
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}