// app/schedule/components/AIScheduleConfigModal.js
"use client";
import { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  SparklesIcon,
  CalendarDaysIcon,
  ClockIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { format, addDays, startOfWeek, addWeeks, isSameDay } from 'date-fns';

export default function AIScheduleConfigModal({ 
  isOpen, 
  onClose, 
  onGenerate, 
  childSubjects = [],
  selectedChildrenIds = [],
  allChildren = [],
  isGenerating = false
}) {
  // Configuration state
  const [config, setConfig] = useState({
    startDate: '',
    startDayOption: 'next_monday', // 'today', 'tomorrow', 'next_monday', 'next_week', 'custom'
    schedulingPeriod: 'week', // 'week', '2weeks', 'month'
    weekdaysOnly: true,
    subjectFrequencies: {},
    studyIntensity: 'balanced', // 'light', 'balanced', 'intensive'
    prioritizeUrgent: true,
    difficultyDistribution: 'morning', // 'morning', 'afternoon', 'balanced'
    breakPreferences: 'moderate', // 'minimal', 'moderate', 'frequent'
    sessionLength: 'mixed', // 'short', 'medium', 'long', 'mixed'
    coordination: 'balanced' // 'sequential', 'parallel', 'balanced'
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    subjects: true,
    timing: false,
    advanced: false
  });

  // Initialize configuration when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultStartDate = calculateStartDate('next_monday');
      setConfig(prev => ({
        ...prev,
        startDate: defaultStartDate,
        startDayOption: 'next_monday',
        subjectFrequencies: initializeSubjectFrequencies()
      }));
    }
  }, [isOpen, childSubjects]);

  // Update start date when option changes
  useEffect(() => {
    if (config.startDayOption !== 'custom') {
      const newDate = calculateStartDate(config.startDayOption);
      setConfig(prev => ({ ...prev, startDate: newDate }));
    }
  }, [config.startDayOption]);

  // Calculate date based on start day option
  const calculateStartDate = (option) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    switch (option) {
      case 'today':
        return format(today, 'yyyy-MM-dd');
      
      case 'tomorrow':
        return format(addDays(today, 1), 'yyyy-MM-dd');
      
      case 'next_monday':
        const nextMonday = dayOfWeek === 1 ? today : addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
        return format(nextMonday, 'yyyy-MM-dd');
      
      case 'next_week':
        const nextWeekStart = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1);
        return format(nextWeekStart, 'yyyy-MM-dd');
      
      case 'custom':
        return config.startDate || format(today, 'yyyy-MM-dd');
      
      default:
        return format(today, 'yyyy-MM-dd');
    }
  };

  // Get display text for start day options
  const getStartDayOptionText = (option) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    switch (option) {
      case 'today':
        return `Today (${format(today, 'EEE, MMM d')})`;
      
      case 'tomorrow':
        return `Tomorrow (${format(addDays(today, 1), 'EEE, MMM d')})`;
      
      case 'next_monday':
        const nextMonday = dayOfWeek === 1 ? today : addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
        return `Next Monday (${format(nextMonday, 'MMM d')})`;
      
      case 'next_week':
        const nextWeekStart = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1);
        return `Next Week (${format(nextWeekStart, 'MMM d')})`;
      
      case 'custom':
        return 'Custom Date';
      
      default:
        return option;
    }
  };

  // Initialize subject frequencies based on available subjects
  const initializeSubjectFrequencies = () => {
    const frequencies = {};
    const uniqueSubjects = Array.from(new Set(
      childSubjects.map(subject => 
        subject.custom_subject_name_override || subject.name
      )
    ));

    uniqueSubjects.forEach(subject => {
      frequencies[subject] = getDefaultFrequency(subject);
    });

    return frequencies;
  };

  // Get smart default frequency based on subject type
  const getDefaultFrequency = (subjectName) => {
    const dailySubjects = ['math', 'mathematics', 'reading', 'english', 'language arts'];
    const regularSubjects = ['science', 'history', 'social studies', 'geography'];
    const weeklySubjects = ['art', 'music', 'pe', 'physical education'];

    const subject = subjectName.toLowerCase();
    
    if (dailySubjects.some(s => subject.includes(s))) return 5; // Daily
    if (regularSubjects.some(s => subject.includes(s))) return 3; // 3x per week
    if (weeklySubjects.some(s => subject.includes(s))) return 1; // 1x per week
    
    return 3; // Default to 3x per week
  };

  // Handle configuration changes
  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateSubjectFrequency = (subject, frequency) => {
    setConfig(prev => ({
      ...prev,
      subjectFrequencies: {
        ...prev.subjectFrequencies,
        [subject]: parseInt(frequency)
      }
    }));
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle form submission
  const handleGenerate = () => {
    const schedulingConfig = {
      ...config,
      totalDaysToSchedule: getPeriodDays(config.schedulingPeriod),
      childrenIds: selectedChildrenIds,
      subjectFrequencies: config.subjectFrequencies,
      actualScheduleDays: config.weekdaysOnly ? Math.floor(getPeriodDays(config.schedulingPeriod) * 5/7) : getPeriodDays(config.schedulingPeriod),
      startDayName: format(new Date(config.startDate), 'EEEE').toLowerCase(),
      smartScheduling: true
    };

    onGenerate(schedulingConfig);
  };

  // Get number of days for scheduling period
  const getPeriodDays = (period) => {
    switch (period) {
      case 'week': return 7;
      case '2weeks': return 14;
      case 'month': return 30;
      default: return 7;
    }
  };

  // Get period display name
  const getPeriodName = (period) => {
    switch (period) {
      case 'week': return 'This Week';
      case '2weeks': return '2 Weeks';
      case 'month': return '1 Month';
      default: return 'This Week';
    }
  };

  if (!isOpen) return null;

  const selectedChildrenNames = selectedChildrenIds.map(id => 
    allChildren.find(child => child.id === id)?.name
  ).filter(Boolean).join(', ');

  const uniqueSubjects = Array.from(new Set(
    childSubjects.map(subject => 
      subject.custom_subject_name_override || subject.name
    )
  ));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <SparklesIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Schedule Generator</h2>
              <p className="text-sm text-gray-500">
                Configure intelligent scheduling for {selectedChildrenNames}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Configuration Form */}
        <div className="p-6 space-y-6">
          
          {/* Basic Configuration */}
          <div className="space-y-4">
            {/* Start Day Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                When to Start Scheduling
              </label>
              <div className="space-y-2">
                <select
                  value={config.startDayOption}
                  onChange={(e) => updateConfig('startDayOption', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="today">Today - Start Immediately</option>
                  <option value="tomorrow">Tomorrow - Start Tomorrow</option>
                  <option value="next_monday">Next Monday - Start Fresh Week</option>
                  <option value="next_week">Next Week - Full Week Ahead</option>
                  <option value="custom">Custom Date - Pick Your Own</option>
                </select>
                
                {config.startDayOption === 'custom' && (
                  <input
                    type="date"
                    value={config.startDate}
                    onChange={(e) => updateConfig('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
                
                {config.startDayOption !== 'custom' && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    📅 Will start: <strong>{getStartDayOptionText(config.startDayOption)}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Scheduling Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ClockIcon className="h-4 w-4 inline mr-1" />
                  Schedule Duration
                </label>
                <select
                  value={config.schedulingPeriod}
                  onChange={(e) => updateConfig('schedulingPeriod', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="week">1 Week (5 school days)</option>
                  <option value="2weeks">2 Weeks (10 school days)</option>
                  <option value="month">1 Month (20+ school days)</option>
                </select>
              </div>

              {/* Weekdays Only Option */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduling Days
                </label>
                <div className="flex items-center gap-4 h-10">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.weekdaysOnly}
                      onChange={(e) => updateConfig('weekdaysOnly', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Weekdays only (Mon-Fri)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Study Intensity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Study Intensity
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'light', label: 'Light', desc: '1-2 subjects per day' },
                  { value: 'balanced', label: 'Balanced', desc: '2-3 subjects per day' },
                  { value: 'intensive', label: 'Intensive', desc: '3+ subjects per day' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateConfig('studyIntensity', option.value)}
                    className={`p-3 text-center border rounded-lg transition-all ${
                      config.studyIntensity === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subject Frequency Configuration */}
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('subjects')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AcademicCapIcon className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-900">Subject Frequency</span>
                <span className="text-sm text-gray-500">
                  ({uniqueSubjects.length} subjects)
                </span>
              </div>
              {expandedSections.subjects ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.subjects && (
              <div className="p-4 border-t border-gray-200 space-y-3">
                <div className="text-sm text-gray-600 mb-3">
                  Configure how many times per week each subject should be scheduled:
                </div>
                {uniqueSubjects.map(subject => (
                  <div key={subject} className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">{subject}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={config.subjectFrequencies[subject] || 3}
                        onChange={(e) => updateSubjectFrequency(subject, e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={1}>1x per week</option>
                        <option value={2}>2x per week</option>
                        <option value={3}>3x per week</option>
                        <option value={4}>4x per week</option>
                        <option value={5}>Daily</option>
                      </select>
                      <span className="text-sm text-gray-500">per week</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Configuration */}
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('advanced')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <InformationCircleIcon className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-900">Advanced Options</span>
              </div>
              {expandedSections.advanced ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.advanced && (
              <div className="p-4 border-t border-gray-200 space-y-4">
                
                {/* Difficulty Distribution */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficult Subject Timing
                  </label>
                  <select
                    value={config.difficultyDistribution}
                    onChange={(e) => updateConfig('difficultyDistribution', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="morning">Morning (when mind is fresh)</option>
                    <option value="afternoon">Afternoon (after warm-up)</option>
                    <option value="balanced">Balanced throughout day</option>
                  </select>
                </div>

                {/* Session Length Preference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Session Length
                  </label>
                  <select
                    value={config.sessionLength}
                    onChange={(e) => updateConfig('sessionLength', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="short">Short (30-45 min)</option>
                    <option value="medium">Medium (45-60 min)</option>
                    <option value="long">Long (60+ min)</option>
                    <option value="mixed">Mixed (AI decides)</option>
                  </select>
                </div>

                {/* Multi-child Coordination */}
                {selectedChildrenIds.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Multi-Child Coordination
                    </label>
                    <select
                      value={config.coordination}
                      onChange={(e) => updateConfig('coordination', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="sequential">Sequential (one after another)</option>
                      <option value="parallel">Parallel (same time, different subjects)</option>
                      <option value="balanced">Balanced (AI optimizes)</option>
                    </select>
                  </div>
                )}

                {/* Priority Options */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="prioritizeUrgent"
                    checked={config.prioritizeUrgent}
                    onChange={(e) => updateConfig('prioritizeUrgent', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="prioritizeUrgent" className="text-sm text-gray-700">
                    Prioritize materials with upcoming due dates
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* AI Generation Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-blue-900 mb-1">AI will generate:</div>
                <ul className="text-blue-700 space-y-1">
                  <li>• {getPeriodName(config.schedulingPeriod)} schedule starting {config.startDate ? format(new Date(config.startDate), 'EEE, MMM d') : 'selected date'}</li>
                  <li>• {Object.values(config.subjectFrequencies).reduce((sum, freq) => sum + freq, 0)} total subject sessions per week</li>
                  <li>• {config.studyIntensity.charAt(0).toUpperCase() + config.studyIntensity.slice(1)} intensity with {config.sessionLength} session lengths</li>
                  <li>• {config.weekdaysOnly ? 'Weekdays only' : 'All week days'} scheduling</li>
                  <li>• Optimized for {config.difficultyDistribution} cognitive load distribution</li>
                  {selectedChildrenIds.length > 1 && (
                    <li>• {config.coordination.charAt(0).toUpperCase() + config.coordination.slice(1)} multi-child coordination</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isGenerating}
          >
            Cancel
          </button>
          
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !config.startDate}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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
    </div>
  );
}