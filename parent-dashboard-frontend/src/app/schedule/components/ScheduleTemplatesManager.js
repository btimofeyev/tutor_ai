// app/schedule/components/ScheduleTemplatesManager.js
"use client";
import { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  CheckIcon,
  XMarkIcon,
  StarIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { format, addDays, startOfWeek } from 'date-fns';

// Sample default templates
const DEFAULT_TEMPLATES = [
  {
    id: 'morning-focus',
    name: 'Morning Focus',
    description: 'High-cognitive subjects in the morning, lighter subjects in afternoon',
    category: 'weekly',
    isDefault: true,
    sessions: [
      { day: 'monday', time: '09:00', duration: 45, subject: 'Mathematics' },
      { day: 'monday', time: '10:00', duration: 45, subject: 'Science' },
      { day: 'monday', time: '14:00', duration: 30, subject: 'Art' },
      { day: 'tuesday', time: '09:00', duration: 45, subject: 'English Language Arts' },
      { day: 'tuesday', time: '10:00', duration: 45, subject: 'Mathematics' },
      { day: 'tuesday', time: '14:00', duration: 30, subject: 'Physical Education' },
      { day: 'wednesday', time: '09:00', duration: 45, subject: 'Science' },
      { day: 'wednesday', time: '10:00', duration: 45, subject: 'Mathematics' },
      { day: 'wednesday', time: '14:00', duration: 30, subject: 'Music' },
      { day: 'thursday', time: '09:00', duration: 45, subject: 'English Language Arts' },
      { day: 'thursday', time: '10:00', duration: 45, subject: 'Social Studies' },
      { day: 'thursday', time: '14:00', duration: 30, subject: 'Art' },
      { day: 'friday', time: '09:00', duration: 45, subject: 'Mathematics' },
      { day: 'friday', time: '10:00', duration: 45, subject: 'Science' },
      { day: 'friday', time: '14:00', duration: 30, subject: 'Physical Education' }
    ]
  },
  {
    id: 'balanced-daily',
    name: 'Balanced Daily',
    description: 'Evenly distributed subjects throughout the day',
    category: 'weekly',
    isDefault: true,
    sessions: [
      { day: 'monday', time: '09:00', duration: 30, subject: 'Mathematics' },
      { day: 'monday', time: '11:00', duration: 30, subject: 'English Language Arts' },
      { day: 'monday', time: '14:00', duration: 30, subject: 'Science' },
      { day: 'tuesday', time: '09:00', duration: 30, subject: 'Science' },
      { day: 'tuesday', time: '11:00', duration: 30, subject: 'Mathematics' },
      { day: 'tuesday', time: '14:00', duration: 30, subject: 'Social Studies' },
      { day: 'wednesday', time: '09:00', duration: 30, subject: 'English Language Arts' },
      { day: 'wednesday', time: '11:00', duration: 30, subject: 'Science' },
      { day: 'wednesday', time: '14:00', duration: 30, subject: 'Art' },
      { day: 'thursday', time: '09:00', duration: 30, subject: 'Mathematics' },
      { day: 'thursday', time: '11:00', duration: 30, subject: 'Social Studies' },
      { day: 'thursday', time: '14:00', duration: 30, subject: 'Music' },
      { day: 'friday', time: '09:00', duration: 30, subject: 'Science' },
      { day: 'friday', time: '11:00', duration: 30, subject: 'English Language Arts' },
      { day: 'friday', time: '14:00', duration: 30, subject: 'Physical Education' }
    ]
  },
  {
    id: 'math-intensive',
    name: 'Math Intensive',
    description: 'Extra focus on mathematics with supporting subjects',
    category: 'subject',
    isDefault: true,
    sessions: [
      { day: 'monday', time: '09:00', duration: 60, subject: 'Mathematics' },
      { day: 'monday', time: '11:00', duration: 30, subject: 'Science' },
      { day: 'tuesday', time: '09:00', duration: 60, subject: 'Mathematics' },
      { day: 'tuesday', time: '11:00', duration: 30, subject: 'English Language Arts' },
      { day: 'wednesday', time: '09:00', duration: 60, subject: 'Mathematics' },
      { day: 'wednesday', time: '11:00', duration: 30, subject: 'Science' },
      { day: 'thursday', time: '09:00', duration: 60, subject: 'Mathematics' },
      { day: 'thursday', time: '11:00', duration: 30, subject: 'Social Studies' },
      { day: 'friday', time: '09:00', duration: 45, subject: 'Mathematics' },
      { day: 'friday', time: '11:00', duration: 30, subject: 'Art' }
    ]
  },
  // Subject-Specific Templates
  {
    id: 'science-explorer',
    name: 'Science Explorer',
    description: 'Hands-on science experiments with related reading and math',
    category: 'subject',
    isDefault: true,
    sessions: [
      { day: 'monday', time: '09:00', duration: 60, subject: 'Science' },
      { day: 'monday', time: '11:00', duration: 30, subject: 'Mathematics' },
      { day: 'monday', time: '14:00', duration: 30, subject: 'Science Journal Writing' },
      { day: 'tuesday', time: '09:00', duration: 45, subject: 'Science' },
      { day: 'tuesday', time: '11:00', duration: 45, subject: 'English Language Arts' },
      { day: 'wednesday', time: '09:00', duration: 60, subject: 'Science Lab' },
      { day: 'wednesday', time: '11:00', duration: 30, subject: 'Mathematics' },
      { day: 'thursday', time: '09:00', duration: 45, subject: 'Science' },
      { day: 'thursday', time: '11:00', duration: 30, subject: 'Research Skills' },
      { day: 'friday', time: '09:00', duration: 45, subject: 'Science Review' },
      { day: 'friday', time: '11:00', duration: 30, subject: 'Art' }
    ]
  },
  {
    id: 'language-arts-intensive',
    name: 'Language Arts Focus',
    description: 'Reading, writing, and communication skills intensive',
    category: 'subject',
    isDefault: true,
    sessions: [
      { day: 'monday', time: '09:00', duration: 60, subject: 'English Language Arts' },
      { day: 'monday', time: '11:00', duration: 30, subject: 'Creative Writing' },
      { day: 'monday', time: '14:00', duration: 30, subject: 'Reading' },
      { day: 'tuesday', time: '09:00', duration: 45, subject: 'Grammar & Vocabulary' },
      { day: 'tuesday', time: '11:00', duration: 45, subject: 'Literature' },
      { day: 'wednesday', time: '09:00', duration: 60, subject: 'Writing Workshop' },
      { day: 'wednesday', time: '11:00', duration: 30, subject: 'Mathematics' },
      { day: 'thursday', time: '09:00', duration: 45, subject: 'Reading Comprehension' },
      { day: 'thursday', time: '11:00', duration: 30, subject: 'Public Speaking' },
      { day: 'friday', time: '09:00', duration: 45, subject: 'Language Arts Review' },
      { day: 'friday', time: '11:00', duration: 30, subject: 'Science' }
    ]
  },
  {
    id: 'stem-power-week',
    name: 'STEM Power Week',
    description: 'Science, Technology, Engineering, and Math combined focus',
    category: 'subject',
    isDefault: true,
    sessions: [
      { day: 'monday', time: '09:00', duration: 45, subject: 'Mathematics' },
      { day: 'monday', time: '10:00', duration: 45, subject: 'Science' },
      { day: 'monday', time: '14:00', duration: 30, subject: 'Engineering Design' },
      { day: 'tuesday', time: '09:00', duration: 45, subject: 'Science' },
      { day: 'tuesday', time: '10:00', duration: 45, subject: 'Mathematics' },
      { day: 'tuesday', time: '14:00', duration: 30, subject: 'Technology Skills' },
      { day: 'wednesday', time: '09:00', duration: 60, subject: 'STEM Project' },
      { day: 'wednesday', time: '11:00', duration: 30, subject: 'English Language Arts' },
      { day: 'thursday', time: '09:00', duration: 45, subject: 'Mathematics' },
      { day: 'thursday', time: '10:00', duration: 45, subject: 'Science Lab' },
      { day: 'friday', time: '09:00', duration: 60, subject: 'STEM Showcase' },
      { day: 'friday', time: '11:00', duration: 30, subject: 'Art' }
    ]
  },
  {
    id: 'arts-creativity',
    name: 'Arts & Creativity',
    description: 'Focus on creative expression, art, music, and creative writing',
    category: 'subject',
    isDefault: true,
    sessions: [
      { day: 'monday', time: '09:00', duration: 45, subject: 'Art' },
      { day: 'monday', time: '10:00', duration: 30, subject: 'Mathematics' },
      { day: 'monday', time: '14:00', duration: 45, subject: 'Creative Writing' },
      { day: 'tuesday', time: '09:00', duration: 60, subject: 'Music' },
      { day: 'tuesday', time: '11:00', duration: 30, subject: 'English Language Arts' },
      { day: 'wednesday', time: '09:00', duration: 45, subject: 'Drama & Theater' },
      { day: 'wednesday', time: '10:00', duration: 30, subject: 'Science' },
      { day: 'wednesday', time: '14:00', duration: 45, subject: 'Art History' },
      { day: 'thursday', time: '09:00', duration: 60, subject: 'Creative Project' },
      { day: 'thursday', time: '11:00', duration: 30, subject: 'Mathematics' },
      { day: 'friday', time: '09:00', duration: 45, subject: 'Art Showcase' },
      { day: 'friday', time: '10:00', duration: 30, subject: 'Physical Education' }
    ]
  },
  {
    id: 'history-deep-dive',
    name: 'History Deep Dive',
    description: 'Social studies intensive with timeline projects and research',
    category: 'subject',
    isDefault: true,
    sessions: [
      { day: 'monday', time: '09:00', duration: 60, subject: 'Social Studies' },
      { day: 'monday', time: '11:00', duration: 30, subject: 'Mathematics' },
      { day: 'monday', time: '14:00', duration: 30, subject: 'Geography' },
      { day: 'tuesday', time: '09:00', duration: 45, subject: 'History Research' },
      { day: 'tuesday', time: '10:00', duration: 45, subject: 'English Language Arts' },
      { day: 'wednesday', time: '09:00', duration: 60, subject: 'Historical Writing' },
      { day: 'wednesday', time: '11:00', duration: 30, subject: 'Science' },
      { day: 'thursday', time: '09:00', duration: 45, subject: 'Social Studies' },
      { day: 'thursday', time: '10:00', duration: 30, subject: 'Current Events' },
      { day: 'friday', time: '09:00', duration: 45, subject: 'History Presentation' },
      { day: 'friday', time: '10:00', duration: 30, subject: 'Art' }
    ]
  },
  // Seasonal Templates
  {
    id: 'back-to-school',
    name: 'Back to School Routine',
    description: 'Gentle start with gradually increasing intensity',
    category: 'seasonal',
    isDefault: true,
    sessions: [
      { day: 'monday', time: '09:00', duration: 30, subject: 'Mathematics' },
      { day: 'monday', time: '10:00', duration: 30, subject: 'English Language Arts' },
      { day: 'monday', time: '14:00', duration: 20, subject: 'Study Skills' },
      { day: 'tuesday', time: '09:00', duration: 30, subject: 'Science' },
      { day: 'tuesday', time: '10:00', duration: 30, subject: 'Mathematics' },
      { day: 'tuesday', time: '14:00', duration: 20, subject: 'Organization' },
      { day: 'wednesday', time: '09:00', duration: 30, subject: 'English Language Arts' },
      { day: 'wednesday', time: '10:00', duration: 30, subject: 'Social Studies' },
      { day: 'thursday', time: '09:00', duration: 30, subject: 'Mathematics' },
      { day: 'thursday', time: '10:00', duration: 30, subject: 'Science' },
      { day: 'friday', time: '09:00', duration: 30, subject: 'Review' },
      { day: 'friday', time: '10:00', duration: 30, subject: 'Fun Learning' }
    ]
  },
  {
    id: 'holiday-break-light',
    name: 'Holiday Break Light',
    description: 'Reduced intensity with fun educational activities',
    category: 'seasonal',
    isDefault: true,
    sessions: [
      { day: 'monday', time: '10:00', duration: 30, subject: 'Holiday Math Games' },
      { day: 'monday', time: '14:00', duration: 30, subject: 'Holiday Reading' },
      { day: 'tuesday', time: '10:00', duration: 30, subject: 'Science Experiments' },
      { day: 'tuesday', time: '14:00', duration: 30, subject: 'Creative Writing' },
      { day: 'wednesday', time: '10:00', duration: 30, subject: 'Cultural Studies' },
      { day: 'wednesday', time: '14:00', duration: 30, subject: 'Art & Crafts' },
      { day: 'thursday', time: '10:00', duration: 30, subject: 'Nature Study' },
      { day: 'thursday', time: '14:00', duration: 30, subject: 'Music' },
      { day: 'friday', time: '10:00', duration: 30, subject: 'Review Games' },
      { day: 'friday', time: '14:00', duration: 30, subject: 'Family Learning' }
    ]
  },
  {
    id: 'test-prep-week',
    name: 'Test Prep Week',
    description: 'Intensive review and practice for upcoming assessments',
    category: 'seasonal',
    isDefault: true,
    sessions: [
      { day: 'monday', time: '09:00', duration: 60, subject: 'Math Review' },
      { day: 'monday', time: '11:00', duration: 45, subject: 'Practice Test' },
      { day: 'monday', time: '14:00', duration: 30, subject: 'Test Strategy' },
      { day: 'tuesday', time: '09:00', duration: 60, subject: 'Language Arts Review' },
      { day: 'tuesday', time: '11:00', duration: 45, subject: 'Writing Practice' },
      { day: 'wednesday', time: '09:00', duration: 60, subject: 'Science Review' },
      { day: 'wednesday', time: '11:00', duration: 45, subject: 'Practice Questions' },
      { day: 'thursday', time: '09:00', duration: 60, subject: 'Social Studies Review' },
      { day: 'thursday', time: '11:00', duration: 45, subject: 'Mock Test' },
      { day: 'friday', time: '09:00', duration: 45, subject: 'Final Review' },
      { day: 'friday', time: '10:00', duration: 30, subject: 'Relaxation & Confidence' }
    ]
  },
  // Duration-Based Templates
  {
    id: 'quick-30min',
    name: '30-Minute Sessions',
    description: 'Shorter focused sessions perfect for younger children',
    category: 'duration',
    isDefault: true,
    sessions: [
      { day: 'monday', time: '09:00', duration: 30, subject: 'Mathematics' },
      { day: 'monday', time: '10:00', duration: 30, subject: 'English Language Arts' },
      { day: 'monday', time: '11:00', duration: 30, subject: 'Science' },
      { day: 'tuesday', time: '09:00', duration: 30, subject: 'English Language Arts' },
      { day: 'tuesday', time: '10:00', duration: 30, subject: 'Mathematics' },
      { day: 'tuesday', time: '11:00', duration: 30, subject: 'Art' },
      { day: 'wednesday', time: '09:00', duration: 30, subject: 'Science' },
      { day: 'wednesday', time: '10:00', duration: 30, subject: 'Social Studies' },
      { day: 'wednesday', time: '11:00', duration: 30, subject: 'Physical Education' },
      { day: 'thursday', time: '09:00', duration: 30, subject: 'Mathematics' },
      { day: 'thursday', time: '10:00', duration: 30, subject: 'English Language Arts' },
      { day: 'thursday', time: '11:00', duration: 30, subject: 'Music' },
      { day: 'friday', time: '09:00', duration: 30, subject: 'Review' },
      { day: 'friday', time: '10:00', duration: 30, subject: 'Free Choice Learning' }
    ]
  },
  {
    id: 'deep-focus-60min',
    name: '60-Minute Deep Focus',
    description: 'Extended sessions for complex subjects and older students',
    category: 'duration',
    isDefault: true,
    sessions: [
      { day: 'monday', time: '09:00', duration: 60, subject: 'Mathematics' },
      { day: 'monday', time: '11:00', duration: 60, subject: 'English Language Arts' },
      { day: 'tuesday', time: '09:00', duration: 60, subject: 'Science' },
      { day: 'tuesday', time: '11:00', duration: 60, subject: 'Social Studies' },
      { day: 'wednesday', time: '09:00', duration: 60, subject: 'Mathematics' },
      { day: 'wednesday', time: '11:00', duration: 60, subject: 'Research Project' },
      { day: 'thursday', time: '09:00', duration: 60, subject: 'English Language Arts' },
      { day: 'thursday', time: '11:00', duration: 60, subject: 'Science Lab' },
      { day: 'friday', time: '09:00', duration: 60, subject: 'Independent Study' },
      { day: 'friday', time: '11:00', duration: 60, subject: 'Creative Project' }
    ]
  }
];

export default function ScheduleTemplatesManager({
  isOpen,
  onClose,
  onApplyTemplate,
  childId,
  selectedChildrenIds = [],
  allChildren = [],
  childSubjects = [],
  schedulePreferences = {},
  inlineMode = false,
  isApplying = false
}) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'weekly',
    isPublic: false,
    sessions: []
  });
  const [previewWeek, setPreviewWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Template categories
  const TEMPLATE_CATEGORIES = {
    weekly: 'Weekly Routines',
    subject: 'Subject-Specific',
    seasonal: 'Seasonal Schedules',
    duration: 'Session Length',
    custom: 'Custom Templates'
  };

  const loadTemplates = useCallback(async () => {
    try {
      // In a real implementation, this would fetch from the API
      // For now, we'll use default templates plus any saved custom templates
      const savedTemplates = JSON.parse(localStorage.getItem(`schedule-templates-${childId}`) || '[]');
      setTemplates([...DEFAULT_TEMPLATES, ...savedTemplates]);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates(DEFAULT_TEMPLATES);
    }
  }, [childId]);

  // Load templates on component mount
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, loadTemplates]);

  const saveTemplate = async (template) => {
    try {
      const savedTemplates = JSON.parse(localStorage.getItem(`schedule-templates-${childId}`) || '[]');
      const newTemplate = {
        ...template,
        id: `custom-${Date.now()}`,
        isDefault: false,
        createdAt: new Date().toISOString()
      };

      const updatedTemplates = [...savedTemplates, newTemplate];
      localStorage.setItem(`schedule-templates-${childId}`, JSON.stringify(updatedTemplates));

      await loadTemplates();
      return newTemplate;
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  };

  const deleteTemplate = async (templateId) => {
    try {
      const savedTemplates = JSON.parse(localStorage.getItem(`schedule-templates-${childId}`) || '[]');
      const updatedTemplates = savedTemplates.filter(t => t.id !== templateId);
      localStorage.setItem(`schedule-templates-${childId}`, JSON.stringify(updatedTemplates));

      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  // Filter templates based on category and search term
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Quick action templates for easy access
  const quickActionTemplates = filteredTemplates.filter(t =>
    ['morning-focus', 'balanced-daily', 'math-intensive', 'science-explorer'].includes(t.id)
  ).slice(0, 3);

  // Quick Action Functions
  const copyLastWeekAsTemplate = async () => {
    try {
      // Get last week's date range
      const today = new Date();
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - 7);
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - 1);

      // This would normally fetch from API, but for now we'll simulate
      // In a real implementation, you'd call an API to get schedule entries for the date range
      const mockLastWeekSchedule = [
        // This would be populated with actual schedule entries
      ];

      if (mockLastWeekSchedule.length === 0) {
        alert('No schedule entries found for last week to copy.');
        return;
      }

      // Convert schedule entries to template format
      const templateSessions = mockLastWeekSchedule.map(entry => ({
        day: new Date(entry.scheduled_date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
        time: entry.start_time,
        duration: entry.duration_minutes,
        subject: entry.subject_name
      }));

      const template = {
        name: `Last Week Copy - ${new Date().toLocaleDateString()}`,
        description: 'Copy of last week\'s schedule',
        category: 'custom',
        sessions: templateSessions
      };

      await saveTemplate(template);
      alert('Last week\'s schedule has been saved as a template!');
    } catch (error) {
      console.error('Error copying last week:', error);
      alert('Failed to copy last week\'s schedule. Please try again.');
    }
  };

  const copyCurrentWeekAsTemplate = async () => {
    try {
      // Get current week's date range
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);

      // This would normally fetch current week's actual schedule
      const mockCurrentSchedule = [
        // This would be populated with actual schedule entries
      ];

      if (mockCurrentSchedule.length === 0) {
        alert('No schedule entries found for this week to copy.');
        return;
      }

      const templateSessions = mockCurrentSchedule.map(entry => ({
        day: new Date(entry.scheduled_date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
        time: entry.start_time,
        duration: entry.duration_minutes,
        subject: entry.subject_name
      }));

      const template = {
        name: `Current Week Copy - ${new Date().toLocaleDateString()}`,
        description: 'Copy of this week\'s schedule',
        category: 'custom',
        sessions: templateSessions
      };

      await saveTemplate(template);
      alert('This week\'s schedule has been saved as a template!');
    } catch (error) {
      console.error('Error copying current week:', error);
      alert('Failed to copy current week\'s schedule. Please try again.');
    }
  };

  const applyQuickTemplate = async (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template && onApplyTemplate) {
      const startDate = new Date().toISOString().split('T')[0];
      await onApplyTemplate(template, startDate);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) return;

    try {
      await saveTemplate(newTemplate);
      setNewTemplate({ name: '', description: '', category: 'weekly', isPublic: false, sessions: [] });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleApplyTemplate = async (template, startDate) => {
    if (!onApplyTemplate) return;

    try {
      await onApplyTemplate(template, startDate);
      onClose();
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  };

  const addSessionToNewTemplate = () => {
    setNewTemplate(prev => ({
      ...prev,
      sessions: [
        ...prev.sessions,
        { day: 'monday', time: '09:00', duration: 30, subject: '' }
      ]
    }));
  };

  const updateSessionInNewTemplate = (index, field, value) => {
    setNewTemplate(prev => ({
      ...prev,
      sessions: prev.sessions.map((session, i) =>
        i === index ? { ...session, [field]: value } : session
      )
    }));
  };

  const removeSessionFromNewTemplate = (index) => {
    setNewTemplate(prev => ({
      ...prev,
      sessions: prev.sessions.filter((_, i) => i !== index)
    }));
  };

  const getTemplateStats = (template) => {
    const totalMinutes = template.sessions.reduce((sum, session) => sum + session.duration, 0);
    const subjects = [...new Set(template.sessions.map(s => s.subject))].filter(Boolean);
    const days = [...new Set(template.sessions.map(s => s.day))];

    return {
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      subjects: subjects.length,
      days: days.length,
      sessions: template.sessions.length
    };
  };

  const renderTemplateCard = (template) => {
    const stats = getTemplateStats(template);

    return (
      <div
        key={template.id}
        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
          selectedTemplate?.id === template.id
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => setSelectedTemplate(template)}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{template.name}</h4>
            {template.isDefault && (
              <StarIcon className="h-4 w-4 text-yellow-500" />
            )}
          </div>
          {!template.isDefault && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTemplate(template.id);
              }}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-3">{template.description}</p>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {stats.totalHours}h/week
          </span>
          <span className="flex items-center gap-1">
            <BookOpenIcon className="h-3 w-3" />
            {stats.subjects} subjects
          </span>
          <span className="flex items-center gap-1">
            <CalendarDaysIcon className="h-3 w-3" />
            {stats.days} days
          </span>
        </div>
      </div>
    );
  };

  const renderTemplatePreview = () => {
    if (!selectedTemplate) return null;

    const stats = getTemplateStats(selectedTemplate);
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // Get the list of children this template will be applied to
    const targetChildren = selectedChildrenIds.length >= 1
      ? allChildren.filter(child => selectedChildrenIds.includes(child.id))
      : (childId ? allChildren.filter(child => child.id === childId) : []);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-gray-900">{selectedTemplate.name}</h4>
          <div className="flex gap-2">
            <button
              onClick={() => handleApplyTemplate(selectedTemplate, previewWeek)}
              disabled={isApplying}
              className={`btn-primary text-sm px-4 py-2 ${isApplying ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isApplying ? 'Applying...' : 'Apply Template'}
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600">{selectedTemplate.description}</p>

        {/* Show which children will be affected */}
        {targetChildren.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm font-medium text-blue-900 mb-1">
              This template will be applied to:
            </div>
            <div className="text-sm text-blue-700">
              {targetChildren.map(child => child.name).join(', ')}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {selectedTemplate.sessions.length} sessions × {targetChildren.length} children = {selectedTemplate.sessions.length * targetChildren.length} total schedule entries
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{stats.totalHours}h</div>
            <div className="text-xs text-gray-500">Total Hours</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{stats.sessions}</div>
            <div className="text-xs text-gray-500">Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">{stats.subjects}</div>
            <div className="text-xs text-gray-500">Subjects</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{stats.days}</div>
            <div className="text-xs text-gray-500">Days</div>
          </div>
        </div>

        <div className="space-y-2">
          <h5 className="font-medium text-gray-900">Weekly Schedule Preview</h5>
          <div className="grid gap-2">
            {days.map(day => {
              const daySessions = selectedTemplate.sessions.filter(s => s.day === day);
              if (daySessions.length === 0) return null;

              return (
                <div key={day} className="border border-gray-200 rounded p-3">
                  <div className="font-medium text-sm text-gray-700 mb-2 capitalize">
                    {day}
                  </div>
                  <div className="space-y-1">
                    {daySessions
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((session, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">
                          {session.time} - {session.subject}
                        </span>
                        <span className="text-gray-500">
                          {session.duration}min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderCreateForm = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-gray-900">Create New Template</h4>
          <button
            onClick={() => setShowCreateForm(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="e.g., Morning Intensive"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={newTemplate.description}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={2}
              placeholder="Describe when and how this template should be used"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={newTemplate.category}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {Object.entries(TEMPLATE_CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h5 className="font-medium text-gray-900">Sessions</h5>
            <button
              onClick={addSessionToNewTemplate}
              className="btn-secondary text-sm px-3 py-1"
            >
              <PlusIcon className="h-4 w-4 inline mr-1" />
              Add Session
            </button>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {newTemplate.sessions.map((session, index) => (
              <div key={index} className="grid grid-cols-5 gap-2 items-center">
                <select
                  value={session.day}
                  onChange={(e) => updateSessionInNewTemplate(index, 'day', e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="monday">Mon</option>
                  <option value="tuesday">Tue</option>
                  <option value="wednesday">Wed</option>
                  <option value="thursday">Thu</option>
                  <option value="friday">Fri</option>
                  <option value="saturday">Sat</option>
                  <option value="sunday">Sun</option>
                </select>

                <input
                  type="time"
                  value={session.time}
                  onChange={(e) => updateSessionInNewTemplate(index, 'time', e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                />

                <input
                  type="number"
                  value={session.duration}
                  onChange={(e) => updateSessionInNewTemplate(index, 'duration', parseInt(e.target.value) || 30)}
                  min="15"
                  max="180"
                  step="15"
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                  placeholder="30"
                />

                <input
                  type="text"
                  value={session.subject}
                  onChange={(e) => updateSessionInNewTemplate(index, 'subject', e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                  placeholder="Subject"
                />

                <button
                  onClick={() => removeSessionFromNewTemplate(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowCreateForm(false)}
            className="btn-secondary text-sm px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateTemplate}
            disabled={!newTemplate.name.trim() || newTemplate.sessions.length === 0}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
          >
            Create Template
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen && !inlineMode) return null;

  // Render inline version for template view
  if (inlineMode) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FolderIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Schedule Templates</h3>
              <p className="text-sm text-gray-600">Save time with pre-built schedule templates</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary text-sm px-4 py-2"
          >
            <PlusIcon className="h-4 w-4 inline mr-1" />
            Create Template
          </button>
        </div>

        {/* Content */}
        {showCreateForm ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {renderCreateForm()}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Templates List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Available Templates</h4>
                <span className="text-sm text-gray-500">{filteredTemplates.length} templates</span>
              </div>

              {/* Quick Actions Bar */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h5 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
                  ⚡ Quick Actions
                </h5>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={copyLastWeekAsTemplate}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    <DocumentDuplicateIcon className="h-3 w-3 mr-1" />
                    Copy Last Week
                  </button>
                  <button
                    onClick={copyCurrentWeekAsTemplate}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
                  >
                    <CalendarDaysIcon className="h-3 w-3 mr-1" />
                    Copy This Week
                  </button>
                  {quickActionTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => applyQuickTemplate(template.id)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50 transition-colors"
                    >
                      <CheckIcon className="h-3 w-3 mr-1" />
                      Apply {template.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search and Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setFilterCategory('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      filterCategory === 'all'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {Object.entries(TEMPLATE_CATEGORIES).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setFilterCategory(key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        filterCategory === key
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates by Category */}
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🔍</div>
                  <p className="text-sm">No templates found</p>
                  <p className="text-xs">Try adjusting your search or filter</p>
                </div>
              ) : (
                Object.entries(TEMPLATE_CATEGORIES).map(([category, label]) => {
                  const categoryTemplates = filteredTemplates.filter(t => t.category === category);
                  if (categoryTemplates.length === 0) return null;

                  return (
                    <div key={category}>
                      <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        {label}
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                          {categoryTemplates.length}
                        </span>
                      </h5>
                      <div className="space-y-2">
                        {categoryTemplates.map(renderTemplateCard)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Template Preview */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Template Preview</h4>
              {selectedTemplate ? (
                renderTemplatePreview()
              ) : (
                <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <FolderIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Select a template to preview</p>
                  <p className="text-sm">Choose from the templates on the left to see details and apply</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render modal version
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FolderIcon className="h-5 w-5" />
              Schedule Templates
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-secondary text-sm px-4 py-2"
              >
                <PlusIcon className="h-4 w-4 inline mr-1" />
                Create Template
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {showCreateForm ? (
            renderCreateForm()
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Templates List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Available Templates</h4>
                  <span className="text-sm text-gray-500">{filteredTemplates.length} templates</span>
                </div>

                {/* Quick Actions Bar */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h5 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
                    ⚡ Quick Actions
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={copyLastWeekAsTemplate}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      <DocumentDuplicateIcon className="h-3 w-3 mr-1" />
                      Copy Last Week
                    </button>
                    <button
                      onClick={copyCurrentWeekAsTemplate}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      <CalendarDaysIcon className="h-3 w-3 mr-1" />
                      Copy This Week
                    </button>
                    {quickActionTemplates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => applyQuickTemplate(template.id)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-white border border-green-300 rounded-md hover:bg-green-50 transition-colors"
                      >
                        <CheckIcon className="h-3 w-3 mr-1" />
                        Apply {template.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setFilterCategory('all')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        filterCategory === 'all'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    {Object.entries(TEMPLATE_CATEGORIES).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setFilterCategory(key)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          filterCategory === key
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Templates by Category */}
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-sm">No templates found</p>
                    <p className="text-xs">Try adjusting your search or filter</p>
                  </div>
                ) : (
                  Object.entries(TEMPLATE_CATEGORIES).map(([category, label]) => {
                    const categoryTemplates = filteredTemplates.filter(t => t.category === category);
                    if (categoryTemplates.length === 0) return null;

                    return (
                      <div key={category}>
                        <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          {label}
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                            {categoryTemplates.length}
                          </span>
                        </h5>
                        <div className="space-y-2">
                          {categoryTemplates.map(renderTemplateCard)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Template Preview */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Template Preview</h4>
                {selectedTemplate ? (
                  renderTemplatePreview()
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    <FolderIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Select a template to preview</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
