'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  XMarkIcon,
  SparklesIcon,
  PencilIcon,
  HashtagIcon,
  ClockIcon,
  CalendarIcon,
  CameraIcon
} from '@heroicons/react/24/outline';
import Button from '../../../components/ui/Button';
import api from '../../../utils/api';
import { useStreamlinedUpload } from '../../../hooks/useStreamlinedUpload';
import { useProcessingContext } from '../../../components/ProcessingNotificationProvider';

const CONTENT_TYPES = {
  lesson: {
    label: 'Lesson',
    description: 'Teaching materials & presentations',
    icon: '📖',
    color: 'blue',
    isGradable: false
  },
  worksheet: {
    label: 'Assignment',
    description: 'Practice problems & homework',
    icon: '✏️',
    color: 'green',
    isGradable: true
  },
  quiz: {
    label: 'Quiz',
    description: 'Short assessments',
    icon: '📝',
    color: 'yellow',
    isGradable: true
  },
  test: {
    label: 'Test',
    description: 'Major assessments & exams',
    icon: '📋',
    color: 'red',
    isGradable: true
  },
  review: {
    label: 'Review',
    description: 'Chapter or unit reviews',
    icon: '📑',
    color: 'indigo',
    isGradable: true
  },
  reading_material: {
    label: 'Reading',
    description: 'Books, articles & references',
    icon: '📚',
    color: 'purple',
    isGradable: false
  },
  other: {
    label: 'Other',
    description: 'Any other educational material',
    icon: '📎',
    color: 'gray',
    isGradable: false
  }
};

export default function StreamlinedAddAssignment({
  childSubjects,
  selectedChild,
  onComplete,
  onClose,
  preSelectedSubject
}) {
  // Step management
  const [currentStep, setCurrentStep] = useState('hierarchy'); // 'hierarchy', 'details', 'processing', 'processing-started', 'complete'

  // Hierarchy selection state
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [selectedContentType, setSelectedContentType] = useState('');

  // Chapters and lessons data
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);

  // Custom categories state
  const [customCategories, setCustomCategories] = useState([]);

  // Details form state
  const [useAiMode, setUseAiMode] = useState(false);
  const [keyTermInput, setKeyTermInput] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    learningObjectives: [''],
    keyTerms: [],
    estimatedTime: 30,
    difficultyLevel: 'medium',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Initialize with tomorrow
    totalPoints: '',
    files: []
  });

  // Processing state
  const [aiAnalysisResults, setAiAnalysisResults] = useState(null);

  // Create merged content types including custom categories
  const allContentTypes = useMemo(() => {
    const merged = { ...CONTENT_TYPES };

    // Add custom categories with purple styling
    customCategories.forEach(category => {
      const categoryKey = `custom_${category.id}`;
      merged[categoryKey] = {
        label: category.category_name,
        description: 'Custom grade category',
        icon: '📝', // Custom categories get a default icon
        color: 'purple',
        isGradable: true, // Custom categories are always gradable
        isCustom: true,
        customId: category.id
      };
    });

    return merged;
  }, [customCategories]);

  // Helper function to get the actual content type value to send to API
  const getContentTypeValue = useCallback((selectedType) => {
    const typeConfig = allContentTypes[selectedType];
    if (typeConfig?.isCustom) {
      return typeConfig.label; // For custom categories, use the category name
    }
    return selectedType; // For standard types, use the key as-is
  }, [allContentTypes]);

  // Upload hook
  const {
    processUpload,
    approveAiAnalysis,
    isProcessing,
    error,
    clearError
  } = useStreamlinedUpload(selectedChild?.id, onComplete);

  // Processing notifications context
  const {
    addProcessingMaterial,
    processingMaterials,
    isProcessing: hasProcessingMaterials
  } = useProcessingContext();

  // Ensure formData is always properly controlled
  useEffect(() => {
    setFormData(prev => ({
      title: prev.title || '',
      learningObjectives: prev.learningObjectives || [''],
      keyTerms: prev.keyTerms || [],
      estimatedTime: prev.estimatedTime || 30,
      difficultyLevel: prev.difficultyLevel || 'medium',
      dueDate: prev.dueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      totalPoints: prev.totalPoints || '',
      files: prev.files || []
    }));
  }, [useAiMode]);

  // Fetch custom categories for the selected subject
  const fetchCustomCategories = useCallback(async (subjectId) => {
    if (!subjectId) {
      setCustomCategories([]);
      return;
    }

    try {
      const response = await api.get(`/custom-categories/${subjectId}`);
      setCustomCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching custom categories:', error);
      setCustomCategories([]);
    }
  }, []);

  // Fetch chapters when subject changes
  const fetchChapters = useCallback(async (subjectId) => {
    if (!subjectId) return;

    setLoadingChapters(true);
    try {
      const response = await api.get(`/units/subject/${subjectId}`);
      const units = response.data || [];

      const sortedUnits = units.sort((a, b) => {
        if (a.sequence_order !== b.sequence_order) {
          return (a.sequence_order || 0) - (b.sequence_order || 0);
        }
        return a.name.localeCompare(b.name);
      });

      setChapters(sortedUnits);

      // Auto-select first chapter if available
      if (sortedUnits.length > 0) {
        const firstChapter = sortedUnits[0];
        if (firstChapter?.id) {
          setSelectedChapter(String(firstChapter.id));
          fetchLessons(firstChapter.id);
        }
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
      setChapters([]);
    } finally {
      setLoadingChapters(false);
    }
  }, []);

  // Fetch lessons when chapter changes
  const fetchLessons = useCallback(async (chapterId) => {
    if (!chapterId) return;

    setLoadingLessons(true);
    try {
      const response = await api.get(`/lesson-containers/unit/${chapterId}`);
      const lessonContainers = response.data || [];

      const sortedLessons = lessonContainers.sort((a, b) => {
        if (a.sequence_order !== b.sequence_order) {
          return (a.sequence_order || 0) - (b.sequence_order || 0);
        }
        return a.title.localeCompare(b.title);
      });

      setLessons(sortedLessons);

      // Auto-select first lesson if available
      if (sortedLessons.length > 0) {
        const firstLesson = sortedLessons[0];
        if (firstLesson?.id) {
          setSelectedLesson(String(firstLesson.id));
        }
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  }, [setSelectedLesson]);

  // Pre-select subject if provided and available
  useEffect(() => {
    if (preSelectedSubject && childSubjects && childSubjects.length > 0 && !selectedSubject) {
      const subject = childSubjects.find(s => s.name === preSelectedSubject);
      if (subject) {
        setSelectedSubject(subject.name);
        setSelectedSubjectId(subject.child_subject_id);
        fetchChapters(subject.child_subject_id);
        fetchCustomCategories(subject.child_subject_id);
      }
    }
  }, [preSelectedSubject, childSubjects, selectedSubject, fetchChapters, fetchCustomCategories]);

  // Handle subject selection
  const handleSubjectChange = (subjectName) => {
    const subject = childSubjects.find(s => s.name === subjectName);
    setSelectedSubject(subjectName);
    setSelectedSubjectId(subject?.child_subject_id || null);
    setSelectedChapter('');
    setSelectedLesson('');

    if (subject?.child_subject_id) {
      fetchChapters(subject.child_subject_id);
      fetchCustomCategories(subject.child_subject_id);
    }
  };

  // Handle chapter change
  const handleChapterChange = async (chapterId) => {
    if (chapterId === 'create_new') {
      try {
        const nextChapterNumber = chapters.length + 1;
        const response = await api.post('/units', {
          child_subject_id: selectedSubjectId,
          name: `Chapter ${nextChapterNumber}`,
          description: `Auto-created chapter for new materials`,
          sequence_order: nextChapterNumber
        });

        const newChapter = response.data;
        setChapters(prev => [...prev, newChapter].sort((a, b) =>
          (a.sequence_order || 0) - (b.sequence_order || 0)
        ));

        setSelectedChapter((newChapter.id && String(newChapter.id)) || '');
        setSelectedLesson('');

        // Auto-create first lesson in new chapter
        const lessonResponse = await api.post('/lesson-containers', {
          unit_id: newChapter.id,
          title: 'Lesson 1',
          description: 'Auto-created lesson for new materials',
          sequence_order: 1
        });

        const newLesson = lessonResponse.data;
        setLessons([newLesson]);
        setSelectedLesson((newLesson.id && String(newLesson.id)) || '');
      } catch (error) {
        console.error('Error creating new chapter:', error);
      }
    } else {
      setSelectedChapter((chapterId && String(chapterId)) || '');
      setSelectedLesson('');
      fetchLessons(chapterId);
    }
  };

  // Handle lesson change
  const handleLessonChange = async (lessonId) => {
    if (lessonId === 'create_new') {
      try {
        const nextLessonNumber = lessons.length + 1;
        const response = await api.post('/lesson-containers', {
          unit_id: selectedChapter,
          title: `Lesson ${nextLessonNumber}`,
          description: 'Auto-created lesson for new materials',
          sequence_order: nextLessonNumber
        });

        const newLesson = response.data;
        setLessons(prev => [...prev, newLesson].sort((a, b) =>
          (a.sequence_order || 0) - (b.sequence_order || 0)
        ));

        setSelectedLesson((newLesson.id && String(newLesson.id)) || '');
      } catch (error) {
        console.error('Error creating new lesson:', error);
      }
    } else {
      setSelectedLesson((lessonId && String(lessonId)) || '');
    }
  };

  // Handle learning objective changes
  const updateLearningObjective = (index, value) => {
    setFormData(prev => ({
      ...prev,
      learningObjectives: prev.learningObjectives.map((obj, i) =>
        i === index ? (value || '') : (obj || '')
      )
    }));
  };

  const addLearningObjective = () => {
    setFormData(prev => ({
      ...prev,
      learningObjectives: [...(prev.learningObjectives || ['']), '']
    }));
  };

  const removeLearningObjective = (index) => {
    if ((formData.learningObjectives || ['']).length > 1) {
      setFormData(prev => ({
        ...prev,
        learningObjectives: (prev.learningObjectives || ['']).filter((_, i) => i !== index)
      }));
    }
  };

  // Handle key terms
  const addKeyTerm = (term) => {
    if (term && term.trim() && !(formData.keyTerms || []).includes(term.trim())) {
      setFormData(prev => ({
        ...prev,
        keyTerms: [...(prev.keyTerms || []), term.trim()]
      }));
    }
  };

  const removeKeyTerm = (term) => {
    setFormData(prev => ({
      ...prev,
      keyTerms: (prev.keyTerms || []).filter(t => t !== term)
    }));
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({ ...prev, files }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    setCurrentStep('processing');
    clearError();

    try {
      if (useAiMode && (formData.files || []).length > 0) {
        // AI Mode: Upload files for async analysis
        const uploadFormData = new FormData();

        // Add the file
        uploadFormData.append('files', formData.files[0]);

        // Add metadata
        const actualContentType = getContentTypeValue(selectedContentType);
        uploadFormData.append('child_subject_id', selectedSubjectId);
        uploadFormData.append('user_content_type', actualContentType);
        uploadFormData.append('lesson_id', selectedLesson);
        uploadFormData.append('title', formData.title || formData.files[0].name.split('.')[0]);
        uploadFormData.append('content_type', actualContentType);
        uploadFormData.append('due_date', formData.dueDate || '');

        // Use async upload endpoint (without problematic Content-Type header)
        const response = await api.post('/materials/upload-async', uploadFormData);

        if (response.data.success) {
          // Material created, AI processing in background
          const materialTitle = formData.title || formData.files[0].name.split('.')[0];
          addProcessingMaterial(response.data.material_id, materialTitle);
          setCurrentStep('processing-started');
        } else {
          throw new Error(response.data.message || 'Upload failed');
        }
      } else {
        // Manual Mode: Save with user-provided data
        const actualContentType = getContentTypeValue(selectedContentType);
        const materialData = {
          lesson_id: selectedLesson,
          child_subject_id: selectedSubjectId,
          title: formData.title,
          content_type: actualContentType,
          lesson_json: JSON.stringify({
            title: formData.title,
            content_type: actualContentType,
            learning_objectives: (formData.learningObjectives || ['']).filter(obj => (obj || '').trim()),
            key_terms: formData.keyTerms || [],
            estimated_time_minutes: formData.estimatedTime,
            difficulty_level: formData.difficultyLevel,
            problems: [],
            examples: []
          }),
          due_date: formData.dueDate,
          grade_max_value: allContentTypes[selectedContentType]?.isGradable ? parseInt(formData.totalPoints) : null,
          material_relationship: selectedContentType === 'lesson' ? null :
            (selectedContentType === 'worksheet' ? 'worksheet_for' :
             selectedContentType === 'quiz' || selectedContentType === 'test' ? 'assignment_for' : 'supplement_for'),
          is_primary_lesson: selectedContentType === 'lesson'
        };

        const response = await api.post('/materials/save', materialData);

        if (response.data) {
          setCurrentStep('complete');
        } else {
          throw new Error('Failed to save material');
        }
      }
    } catch (error) {
      console.error('Submission error:', error);
      setCurrentStep('details');
    }
  };

  // Handle AI analysis approval
  const handleAiApproval = async () => {
    // Check if this is the new structured format
    const isNewStructuredFormat = aiAnalysisResults.Objective && aiAnalysisResults.ai_model === 'gpt-4o-files-api';

    let title, contentType;

    if (isNewStructuredFormat) {
      // Extract title from new structured format
      title = aiAnalysisResults.Objective?.[0] || 'Educational Lesson';
      contentType = 'lesson'; // New structured format is always lesson type
    } else {
      // Use old format extraction
      title = aiAnalysisResults.title || 'Untitled Material';
      contentType = aiAnalysisResults.content_type || getContentTypeValue(selectedContentType);
    }

    const saveData = {
      lesson_id: selectedLesson,
      child_subject_id: selectedSubjectId,
      title: title,
      content_type: contentType,
      lesson_json: JSON.stringify(aiAnalysisResults),
      due_date: formData.dueDate,
      grade_max_value: allContentTypes[selectedContentType]?.isGradable ?
        parseInt(formData.totalPoints) || aiAnalysisResults?.total_possible_points_suggestion || null : null,
      material_relationship: selectedContentType === 'lesson' ? null :
        (selectedContentType === 'worksheet' ? 'worksheet_for' :
         selectedContentType === 'quiz' || selectedContentType === 'test' ? 'assignment_for' : 'supplement_for'),
      is_primary_lesson: selectedContentType === 'lesson'
    };

    // Saving AI analysis with validated data

    const result = await approveAiAnalysis(saveData);

    if (result.success) {
      setCurrentStep('complete');
    }
  };

  // Check if hierarchy step is complete
  const hierarchyComplete = selectedSubject && selectedChapter && selectedLesson && selectedContentType;

  // Check if details step is complete
  const detailsComplete = useAiMode ?
    ((formData.files || []).length > 0 &&
     (!allContentTypes[selectedContentType]?.isGradable || (formData.totalPoints || '').trim())) :
    ((formData.title || '').trim() &&
     (formData.learningObjectives || ['']).some(obj => (obj || '').trim()) &&
     (!allContentTypes[selectedContentType]?.isGradable || (formData.totalPoints || '').trim()));

  const inputClasses = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-2";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Add Assignment for {selectedChild?.name}
        </h2>
        <p className="text-sm text-gray-600">
          Create assignments quickly with smart organization
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center ${currentStep === 'hierarchy' ? 'text-blue-600' : currentStep === 'details' || currentStep === 'processing' || currentStep === 'processing-started' || currentStep === 'review' || currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${currentStep === 'hierarchy' ? 'border-blue-600 bg-blue-50' : currentStep === 'details' || currentStep === 'processing' || currentStep === 'processing-started' || currentStep === 'review' || currentStep === 'complete' ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
            {hierarchyComplete ? <CheckCircleIcon className="h-5 w-5" /> : '1'}
          </div>
          <span className="ml-2 text-sm font-medium">Organization</span>
        </div>

        <div className={`w-12 h-0.5 ${hierarchyComplete ? 'bg-green-600' : 'bg-gray-300'}`}></div>

        <div className={`flex items-center ${currentStep === 'details' ? 'text-blue-600' : currentStep === 'processing' || currentStep === 'processing-started' || currentStep === 'review' || currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${currentStep === 'details' ? 'border-blue-600 bg-blue-50' : currentStep === 'processing' || currentStep === 'processing-started' || currentStep === 'review' || currentStep === 'complete' ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
            {detailsComplete && (currentStep === 'processing' || currentStep === 'processing-started' || currentStep === 'review' || currentStep === 'complete') ? <CheckCircleIcon className="h-5 w-5" /> : '2'}
          </div>
          <span className="ml-2 text-sm font-medium">Details</span>
        </div>

        <div className={`w-12 h-0.5 ${(currentStep === 'processing' || currentStep === 'processing-started' || currentStep === 'review' || currentStep === 'complete') ? 'bg-green-600' : 'bg-gray-300'}`}></div>

        <div className={`flex items-center ${currentStep === 'complete' || currentStep === 'processing-started' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${currentStep === 'complete' || currentStep === 'processing-started' ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
            {currentStep === 'complete' || currentStep === 'processing-started' ? <CheckCircleIcon className="h-5 w-5" /> : '3'}
          </div>
          <span className="ml-2 text-sm font-medium">Complete</span>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'hierarchy' && (
        <div className="space-y-6">
          {/* Subject Selection */}
          <div>
            <label className={labelClasses}>Subject *</label>
            <select
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className={inputClasses}
              required
            >
              <option value="">Choose subject...</option>
              {childSubjects.map(subject => (
                <option key={subject.child_subject_id} value={subject.name}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Selection */}
          {selectedSubject && (
            <div>
              <label className={labelClasses}>Chapter *</label>
              <select
                value={selectedChapter}
                onChange={(e) => handleChapterChange(e.target.value)}
                className={inputClasses}
                disabled={loadingChapters}
                required
              >
                <option value="">
                  {loadingChapters ? 'Loading chapters...' : 'Choose chapter...'}
                </option>
                {chapters.map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </option>
                ))}
                <option value="create_new" className="font-medium text-blue-600">
                  📁 Create Chapter {chapters.length + 1}
                </option>
              </select>
            </div>
          )}

          {/* Lesson Selection */}
          {selectedChapter && (
            <div>
              <label className={labelClasses}>Lesson *</label>
              <select
                value={selectedLesson}
                onChange={(e) => handleLessonChange(e.target.value)}
                className={inputClasses}
                disabled={loadingLessons}
                required
              >
                <option value="">
                  {loadingLessons ? 'Loading lessons...' : 'Choose lesson...'}
                </option>
                {lessons.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
                <option value="create_new" className="font-medium text-green-600">
                  📝 Create Lesson {lessons.length + 1}
                </option>
              </select>
            </div>
          )}

          {/* Content Type Selection */}
          {selectedLesson && (
            <div>
              <label className={labelClasses}>What type of content is this? *</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(allContentTypes).map(([key, type]) => (
                  <div
                    key={key}
                    onClick={() => setSelectedContentType(key)}
                    className={`cursor-pointer rounded-lg border-2 p-4 text-center transition-all ${
                      selectedContentType === key
                        ? (type.isCustom ? 'border-purple-500 bg-purple-50' : 'border-blue-500 bg-blue-50')
                        : (type.isCustom ? 'border-purple-200 hover:border-purple-300 hover:bg-purple-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50')
                    }`}
                  >
                    <div className="text-2xl mb-2">
                      {type.icon}
                      {type.isCustom && <span className="ml-1 text-purple-600">✨</span>}
                    </div>
                    <div className="font-medium text-gray-900 mb-1">{type.label}</div>
                    <div className="text-xs text-gray-600">{type.description}</div>
                    {type.isGradable && (
                      <div className="text-xs text-green-600 font-medium mt-1">Gradable</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Continue Button */}
          {hierarchyComplete && (
            <div className="text-center pt-4">
              <Button
                onClick={() => setCurrentStep('details')}
                variant="primary"
                className="px-8"
              >
                Continue to Details
              </Button>
            </div>
          )}
        </div>
      )}

      {currentStep === 'details' && (
        <div className="space-y-6">
          {/* Back Button */}
          <Button
            onClick={() => setCurrentStep('hierarchy')}
            variant="secondary"
            size="sm"
          >
            ← Back to Organization
          </Button>

          {/* AI Mode Toggle */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">AI Mode</span>
              </div>
              <button
                onClick={() => {
                  setUseAiMode(!useAiMode);
                  // Reset form data to prevent controlled/uncontrolled issues
                  setFormData(prev => ({
                    ...prev,
                    title: prev.title || '',
                    totalPoints: prev.totalPoints || '',
                    dueDate: prev.dueDate || '',
                    estimatedTime: prev.estimatedTime || 30,
                    difficultyLevel: prev.difficultyLevel || 'medium',
                    files: []
                  }));
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useAiMode ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useAiMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-sm text-blue-700">
              {useAiMode
                ? 'Upload a file and let AI extract title, objectives, and key terms automatically'
                : 'Fill in the details manually for quick creation'
              }
            </p>
          </div>

          {useAiMode ? (
            /* AI Mode: File Upload */
            <div className="space-y-4">
              <div className="space-y-3">
                {/* Mobile Camera Button */}
                <div className="sm:hidden">
                  <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors bg-gray-50 hover:bg-gray-100">
                    <CameraIcon className="h-10 w-10 mb-3 text-gray-400" />
                    <span className="text-lg font-medium text-gray-900 mb-1">Take Photo</span>
                    <span className="text-sm text-gray-500">Capture assignment with camera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Desktop File Upload + Mobile Alternative */}
                <div>
                  <label className={labelClasses}>
                    <span className="hidden sm:inline">Upload Assignment File *</span>
                    <span className="sm:hidden">Or Choose File *</span>
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className={inputClasses}
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
                    required
                  />
                </div>

                {/* File Preview */}
                {(formData.files || []).length > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800 mb-1">
                      ✓ File Selected
                    </p>
                    <p className="text-sm text-green-700">
                      {(formData.files || [])[0]?.name}
                    </p>
                  </div>
                )}
              </div>

              {/* Total Points (for gradable content in AI mode) */}
              {allContentTypes[selectedContentType]?.isGradable && (
                <div>
                  <label className={labelClasses}>Total Points *</label>
                  <input
                    type="number"
                    value={formData.totalPoints}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalPoints: e.target.value }))}
                    className={inputClasses}
                    placeholder="AI will suggest, you can override"
                    min="1"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    AI will try to detect this from your worksheet, but you can set it manually
                  </p>
                </div>
              )}

              <div>
                <label className={labelClasses}>Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className={inputClasses}
                />
              </div>
            </div>
          ) : (
            /* Manual Mode: Form Fields */
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className={labelClasses}>Assignment Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={inputClasses}
                  placeholder="e.g., Addition Practice Problems"
                  required
                />
              </div>

              {/* Learning Objectives */}
              <div>
                <label className={labelClasses}>Learning Objectives *</label>
                <div className="space-y-2">
                  {(formData.learningObjectives || ['']).map((objective, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={objective}
                        onChange={(e) => updateLearningObjective(index, e.target.value)}
                        className={inputClasses}
                        placeholder="What will the student learn?"
                      />
                      {(formData.learningObjectives || ['']).length > 1 && (
                        <button
                          onClick={() => removeLearningObjective(index)}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addLearningObjective}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>Add objective</span>
                  </button>
                </div>
              </div>

              {/* Key Terms */}
              <div>
                <label className={labelClasses}>Key Terms</label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {(formData.keyTerms || []).map((term, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        <HashtagIcon className="h-3 w-3 mr-1" />
                        {term}
                        <button
                          onClick={() => removeKeyTerm(term)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={keyTermInput}
                    onChange={(e) => setKeyTermInput(e.target.value)}
                    className={inputClasses}
                    placeholder="Type a key term and press Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyTerm(keyTermInput);
                        setKeyTermInput('');
                      }
                    }}
                  />
                </div>
              </div>

              {/* Time and Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Estimated Time (minutes)</label>
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.estimatedTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) || 30 }))}
                      className={inputClasses}
                      min="5"
                      max="180"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>Difficulty Level</label>
                  <select
                    value={formData.difficultyLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, difficultyLevel: e.target.value }))}
                    className={inputClasses}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Total Points (for gradable content) */}
              {allContentTypes[selectedContentType]?.isGradable && (
                <div>
                  <label className={labelClasses}>Total Points *</label>
                  <input
                    type="number"
                    value={formData.totalPoints}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalPoints: e.target.value }))}
                    className={inputClasses}
                    placeholder="e.g., 100"
                    min="1"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    This will be used for grading when students complete the assignment
                  </p>
                </div>
              )}

              {/* Due Date */}
              <div>
                <label className={labelClasses}>Due Date</label>
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className={inputClasses}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          {detailsComplete && (
            <div className="text-center pt-4">
              <Button
                onClick={handleSubmit}
                variant="primary"
                className="px-8"
                disabled={isProcessing}
              >
                {useAiMode ? (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Analyze with AI
                  </>
                ) : (
                  <>
                    <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                    Create Assignment
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {currentStep === 'processing' && (
        <div className="text-center py-12">
          <ArrowPathIcon className="h-16 w-16 text-blue-500 mx-auto mb-6 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {useAiMode ? 'Uploading your file...' : 'Creating your assignment...'}
          </h3>
          <p className="text-sm text-gray-600">
            {useAiMode ? 'Please wait while we upload your file...' : 'Almost done!'}
          </p>
        </div>
      )}

      {currentStep === 'processing-started' && (
        <div className="text-center py-12">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Upload Started Successfully!
          </h3>
          <p className="text-gray-600 mb-8">
            Your material is being processed by AI in the background. You can continue with other tasks or upload more materials.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => {
                // Reset form for new upload
                setCurrentStep('hierarchy');
                setSelectedSubject('');
                setSelectedSubjectId(null);
                setSelectedChapter('');
                setSelectedLesson('');
                setSelectedContentType('');
                setKeyTermInput('');
                setFormData({
                  title: '',
                  learningObjectives: [''],
                  keyTerms: [],
                  estimatedTime: 30,
                  difficultyLevel: 'medium',
                  dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                  totalPoints: '',
                  files: []
                });
                setAiAnalysisResults(null);
                setUseAiMode(false);
              }}
              variant="primary"
              className="min-w-[200px]"
            >
              Upload Another Material
            </Button>
            <Button
              onClick={() => {
                onComplete?.();
                onClose?.();
              }}
              variant="secondary"
              className="min-w-[200px]"
            >
              View Curriculum
            </Button>
          </div>
          <div className="mt-6 text-sm text-gray-500">
            💡 You&apos;ll receive a notification when AI analysis completes
            {hasProcessingMaterials && (
              <div className="mt-2 flex items-center justify-center text-blue-600">
                <div className="animate-pulse flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                  AI processing {processingMaterials.length} material{processingMaterials.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {currentStep === 'review' && aiAnalysisResults && (
        <div className="space-y-6">
          <div className="text-center">
            <SparklesIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">AI Analysis Complete!</h3>
            <p className="text-sm text-gray-600">Review the extracted information and approve to save.</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
            <h4 className="font-semibold text-gray-900 mb-4">AI Analysis Results:</h4>
            <div className="space-y-4 text-sm">
              {/* Check if this is the new structured lesson format */}
              {aiAnalysisResults.Objective && aiAnalysisResults.ai_model === 'gpt-4o-files-api' ? (
                // New structured lesson format
                <div className="space-y-4">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div><strong>Title:</strong> {aiAnalysisResults.Objective?.[0] || 'Educational Lesson'}</div>
                    <div><strong>Content Type:</strong> Lesson</div>
                    <div><strong>Estimated Time:</strong> 45 minutes</div>
                    <div><strong>Format:</strong> Comprehensive Educational Structure</div>
                  </div>

                  {/* Learning Objectives */}
                  {aiAnalysisResults.Objective && aiAnalysisResults.Objective.length > 0 && (
                    <div>
                      <strong>Learning Objectives:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1">
                        {aiAnalysisResults.Objective.map((obj, index) => (
                          <li key={index}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Introduction */}
                  {aiAnalysisResults.Introduction && (
                    <div>
                      <strong>Lesson Introduction:</strong>
                      <div className="ml-4 mt-1 p-2 bg-gray-50 rounded">
                        {typeof aiAnalysisResults.Introduction === 'object' ?
                          aiAnalysisResults.Introduction.Overview || JSON.stringify(aiAnalysisResults.Introduction, null, 2) :
                          aiAnalysisResults.Introduction}
                      </div>
                    </div>
                  )}

                  {/* Theme Information */}
                  {aiAnalysisResults.ThemeInfo && (
                    <div>
                      <strong>Theme/Topic:</strong>
                      <div className="ml-4 mt-1 p-2 bg-blue-50 rounded">
                        {typeof aiAnalysisResults.ThemeInfo === 'object' ?
                          aiAnalysisResults.ThemeInfo.Discussion || JSON.stringify(aiAnalysisResults.ThemeInfo, null, 2) :
                          aiAnalysisResults.ThemeInfo}
                      </div>
                    </div>
                  )}

                  {/* Main Content */}
                  {aiAnalysisResults.TypesOfSentences && (
                    <div>
                      <strong>Main Content Concepts:</strong>
                      <div className="ml-4 mt-1 p-2 bg-green-50 rounded">
                        {Array.isArray(aiAnalysisResults.TypesOfSentences) ?
                          aiAnalysisResults.TypesOfSentences.map((item, index) => (
                            <div key={index} className="mb-2">
                              {typeof item === 'object' ?
                                Object.entries(item).map(([key, value]) => (
                                  <div key={key}><strong>{key}:</strong> {value}</div>
                                )) : item}
                            </div>
                          )) :
                          JSON.stringify(aiAnalysisResults.TypesOfSentences, null, 2)}
                      </div>
                    </div>
                  )}

                  {/* Guided Practice */}
                  {aiAnalysisResults.GuidedPractice && (
                    <div>
                      <strong>Guided Practice Exercises:</strong>
                      <div className="ml-4 mt-1 p-2 bg-yellow-50 rounded">
                        {aiAnalysisResults.GuidedPractice.Exercises ? (
                          <div>
                            <p className="mb-2 font-medium">Practice Sentences:</p>
                            {aiAnalysisResults.GuidedPractice.Exercises.map((exercise, index) => (
                              <div key={index} className="mb-1">
                                <span className="text-blue-600">&quot;{exercise.Sentence}&quot;</span> - <em>{exercise.Type}</em>
                              </div>
                            ))}
                          </div>
                        ) : (
                          JSON.stringify(aiAnalysisResults.GuidedPractice, null, 2)
                        )}
                      </div>
                    </div>
                  )}

                  {/* Independent Practice */}
                  {aiAnalysisResults.IndependentPractice && (
                    <div>
                      <strong>Independent Practice:</strong>
                      <div className="ml-4 mt-1 p-2 bg-purple-50 rounded">
                        {aiAnalysisResults.IndependentPractice.Exercises ? (
                          <div>
                            <p className="mb-2 font-medium">{aiAnalysisResults.IndependentPractice.Paragraph}</p>
                            <div className="space-y-1">
                              {aiAnalysisResults.IndependentPractice.Exercises.map((exercise, index) => (
                                <div key={index} className="text-sm">
                                  <span className="text-purple-600">&quot;{exercise.Sentence}&quot;</span> - <em>{exercise.Type}</em>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : aiAnalysisResults.IndependentPractice.Paragraph && typeof aiAnalysisResults.IndependentPractice.Paragraph === 'string' ? (
                          <div>
                            <p className="mb-2 font-medium">{aiAnalysisResults.IndependentPractice.Paragraph}</p>
                            {aiAnalysisResults.IndependentPractice.Exercises && (
                              <div className="space-y-1">
                                {aiAnalysisResults.IndependentPractice.Exercises.map((exercise, index) => (
                                  <div key={index} className="text-sm">
                                    <span className="text-purple-600">&quot;{exercise.Sentence}&quot;</span> - <em>{exercise.Type}</em>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm">
                            {typeof aiAnalysisResults.IndependentPractice === 'string'
                              ? aiAnalysisResults.IndependentPractice
                              : JSON.stringify(aiAnalysisResults.IndependentPractice, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Teacher Guidance */}
                  {aiAnalysisResults.TeacherForUnderstanding && (
                    <div>
                      <strong>Teaching Guidance:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1">
                        {Array.isArray(aiAnalysisResults.TeacherForUnderstanding) ?
                          aiAnalysisResults.TeacherForUnderstanding.map((guidance, index) => (
                            <li key={index}>{guidance}</li>
                          )) :
                          <li>{aiAnalysisResults.TeacherForUnderstanding}</li>}
                      </ul>
                    </div>
                  )}

                  {/* Assessment Questions */}
                  {aiAnalysisResults.Questions && aiAnalysisResults.Questions.length > 0 && (
                    <div>
                      <strong>Assessment Questions:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1">
                        {aiAnalysisResults.Questions.map((question, index) => (
                          <li key={index}>{question}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                // Original format
                <div>
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div><strong>Title:</strong> {aiAnalysisResults.title || 'Not specified'}</div>
                    <div><strong>Content Type:</strong> {aiAnalysisResults.content_type_suggestion || aiAnalysisResults.content_type || 'Not specified'}</div>
                    <div><strong>Estimated Time:</strong> {aiAnalysisResults.estimated_completion_time_minutes || aiAnalysisResults.estimated_time_minutes || 'Not specified'} minutes</div>
                    <div><strong>Difficulty:</strong> {aiAnalysisResults.difficulty_level || 'Not specified'}</div>
                    {aiAnalysisResults.grade_level_suggestion && (
                      <div><strong>Grade Level:</strong> {aiAnalysisResults.grade_level_suggestion}</div>
                    )}
                    {aiAnalysisResults?.total_possible_points_suggestion && (
                      <div><strong>Total Points:</strong> {aiAnalysisResults.total_possible_points_suggestion} <span className="text-green-600 text-xs">(detected by AI)</span></div>
                    )}
                  </div>

                  {/* Learning Objectives */}
                  {aiAnalysisResults.learning_objectives && aiAnalysisResults.learning_objectives.length > 0 && (
                    <div>
                      <strong>Learning Objectives:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1">
                        {aiAnalysisResults.learning_objectives.map((obj, index) => (
                          <li key={index}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Subject Keywords */}
              {aiAnalysisResults.subject_keywords_or_subtopics && aiAnalysisResults.subject_keywords_or_subtopics.length > 0 && (
                <div>
                  <strong>Topics Covered:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {aiAnalysisResults.subject_keywords_or_subtopics.map((topic, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Terms */}
              {aiAnalysisResults.key_terms && aiAnalysisResults.key_terms.length > 0 && (
                <div>
                  <strong>Key Terms:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {aiAnalysisResults.key_terms.map((term, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Content Summary */}
              {aiAnalysisResults.main_content_summary_or_extract && (
                <div>
                  <strong>Content Summary:</strong>
                  <p className="mt-1 text-gray-700">{aiAnalysisResults.main_content_summary_or_extract}</p>
                </div>
              )}

              {/* Problems with Context - This is the most important part! */}
              {aiAnalysisResults.problems_with_context && aiAnalysisResults.problems_with_context.length > 0 && (
                <div>
                  <strong>Problems Extracted ({aiAnalysisResults.problems_with_context.length} problems found):</strong>
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {aiAnalysisResults.problems_with_context.map((problem, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-blue-600">Problem {problem.problem_number}</span>
                          <div className="flex gap-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              problem.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {problem.difficulty}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                              {problem.problem_type}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-800 mb-2">{problem.problem_text}</p>
                        {problem.concepts && problem.concepts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {problem.concepts.map((concept, idx) => (
                              <span key={idx} className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                                {concept}
                              </span>
                            ))}
                          </div>
                        )}
                        {problem.visual_elements && (
                          <p className="text-xs text-gray-600"><strong>Visual:</strong> {problem.visual_elements}</p>
                        )}
                        {problem.solution_hint && (
                          <p className="text-xs text-gray-600"><strong>Hint:</strong> {problem.solution_hint}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks/Questions (fallback if problems_with_context not available) */}
              {(!aiAnalysisResults.problems_with_context || aiAnalysisResults.problems_with_context.length === 0) &&
               aiAnalysisResults.tasks_or_questions && aiAnalysisResults.tasks_or_questions.length > 0 && (
                <div>
                  <strong>Tasks/Questions ({aiAnalysisResults.tasks_or_questions.length} items found):</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 max-h-32 overflow-y-auto">
                    {aiAnalysisResults.tasks_or_questions.map((task, index) => (
                      <li key={index} className="mb-1">{task}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Teaching Methodology */}
              {aiAnalysisResults.teaching_methodology && (
                <div>
                  <strong>Teaching Approach:</strong> {aiAnalysisResults.teaching_methodology}
                </div>
              )}

              {/* Prerequisites */}
              {aiAnalysisResults.prerequisites && aiAnalysisResults.prerequisites.length > 0 && (
                <div>
                  <strong>Prerequisites:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    {aiAnalysisResults.prerequisites.map((prereq, index) => (
                      <li key={index}>{prereq}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Answer Key */}
              {aiAnalysisResults.answer_key && (
                <div>
                  <strong>Answer Key Found:</strong>
                  <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    {typeof aiAnalysisResults.answer_key === 'string' ?
                      aiAnalysisResults.answer_key :
                      JSON.stringify(aiAnalysisResults.answer_key)
                    }
                  </div>
                </div>
              )}

              {/* Debug: Show raw analysis if something seems wrong AND it's not the new structured format */}
              {!aiAnalysisResults.Objective &&
               !aiAnalysisResults.ai_model &&
               (!aiAnalysisResults.problems_with_context || aiAnalysisResults.problems_with_context.length === 0) &&
               (!aiAnalysisResults.tasks_or_questions || aiAnalysisResults.tasks_or_questions.length === 0) && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-red-600 font-medium">⚠️ Raw AI Response (Debug)</summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(aiAnalysisResults, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={handleAiApproval}
              variant="primary"
              className="flex-1"
            >
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Approve & Save
            </Button>
            <Button
              onClick={() => setCurrentStep('details')}
              variant="secondary"
              className="flex-1"
            >
              Back to Edit
            </Button>
          </div>
        </div>
      )}

      {currentStep === 'complete' && (
        <div className="text-center py-12">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Assignment Created Successfully!
          </h3>
          <p className="text-gray-600 mb-8">
            Your assignment has been organized in the curriculum and is ready for {selectedChild?.name}.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => {
                onComplete?.();
                onClose?.();
              }}
              variant="primary"
              className="min-w-[160px]"
            >
              View in Curriculum
            </Button>
            <Button
              onClick={() => {
                setCurrentStep('hierarchy');
                setSelectedSubject('');
                setSelectedSubjectId(null);
                setSelectedChapter('');
                setSelectedLesson('');
                setSelectedContentType('');
                setKeyTermInput('');
                setFormData({
                  title: '',
                  learningObjectives: [''],
                  keyTerms: [],
                  estimatedTime: 30,
                  difficultyLevel: 'medium',
                  dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                  totalPoints: '',
                  files: []
                });
                setAiAnalysisResults(null);
                setUseAiMode(false);
              }}
              variant="secondary"
              className="min-w-[160px]"
            >
              Create Another Assignment
            </Button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
