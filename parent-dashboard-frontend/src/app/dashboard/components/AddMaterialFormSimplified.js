'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  DocumentArrowUpIcon, 
  CheckCircleIcon as CheckSolidIcon, 
  ArrowPathIcon, 
  PlusIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import Button from '../../../components/ui/Button';
import api from '../../../utils/api';

// Material type configuration
const MATERIAL_TYPES = {
  lesson: {
    label: 'Lesson',
    description: 'Teaching materials, presentations',
    icon: '📖',
    isGradable: false
  },
  worksheet: {
    label: 'Worksheet', 
    description: 'Practice problems, homework',
    icon: '✏️',
    isGradable: true
  },
  quiz: {
    label: 'Quiz',
    description: 'Short assessments',
    icon: '📝',
    isGradable: true
  },
  test: {
    label: 'Test',
    description: 'Major assessments, exams',
    icon: '📋',
    isGradable: true
  },
  reading_material: {
    label: 'Reading',
    description: 'Books, articles',
    icon: '📚',
    isGradable: false
  },
  other: {
    label: 'Other',
    description: 'Other educational material',
    icon: '📎',
    isGradable: false
  }
};

export default function AddMaterialFormSimplified({
  childSubjects,
  selectedChild,
  onComplete,
  onClose
}) {
  const [step, setStep] = useState('selection'); // 'selection', 'upload', 'approval'
  const [formData, setFormData] = useState({
    subject: '',
    subjectId: null,
    chapter: '',
    chapterNumber: 1,
    lesson: '',
    lessonNumber: 1,
    materialType: 'worksheet',
    dueDate: '',
    files: []
  });
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);

  // Initialize due date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData(prev => ({
      ...prev,
      dueDate: tomorrow.toISOString().split('T')[0]
    }));
  }, []);

  // Fetch chapters when subject changes
  const fetchChapters = useCallback(async (subjectId) => {
    if (!subjectId) return;
    
    setLoadingChapters(true);
    try {
      const response = await api.get(`/units/subject/${subjectId}`);
      const units = response.data || [];
      
      // Sort by sequence order and name
      const sortedUnits = units.sort((a, b) => {
        if (a.sequence_order !== b.sequence_order) {
          return (a.sequence_order || 0) - (b.sequence_order || 0);
        }
        return a.name.localeCompare(b.name);
      });
      
      setChapters(sortedUnits);
      
      // Auto-select Chapter 1 if it exists
      if (sortedUnits.length > 0) {
        const chapter1 = sortedUnits.find(u => u.name.includes('1')) || sortedUnits[0];
        setFormData(prev => ({
          ...prev,
          chapter: chapter1.id,
          chapterNumber: extractNumberFromName(chapter1.name) || 1
        }));
        fetchLessons(chapter1.id);
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
      
      // Sort by sequence order and title
      const sortedLessons = lessonContainers.sort((a, b) => {
        if (a.sequence_order !== b.sequence_order) {
          return (a.sequence_order || 0) - (b.sequence_order || 0);
        }
        return a.title.localeCompare(b.title);
      });
      
      setLessons(sortedLessons);
      
      // Auto-select Lesson 1 if it exists
      if (sortedLessons.length > 0) {
        const lesson1 = sortedLessons.find(l => l.title.includes('1')) || sortedLessons[0];
        setFormData(prev => ({
          ...prev,
          lesson: lesson1.id,
          lessonNumber: extractNumberFromName(lesson1.title) || 1
        }));
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  }, []);

  // Helper function to extract number from name
  const extractNumberFromName = (name) => {
    const match = name.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  // Get next available chapter number
  const getNextChapterNumber = () => {
    if (chapters.length === 0) return 1;
    const numbers = chapters.map(c => extractNumberFromName(c.name)).filter(Boolean);
    return Math.max(...numbers, 0) + 1;
  };

  // Get next available lesson number
  const getNextLessonNumber = () => {
    if (lessons.length === 0) return 1;
    const numbers = lessons.map(l => extractNumberFromName(l.title)).filter(Boolean);
    return Math.max(...numbers, 0) + 1;
  };

  // Handle subject selection
  const handleSubjectChange = (e) => {
    const subjectName = e.target.value;
    const subject = childSubjects.find(s => s.name === subjectName);
    
    setFormData(prev => ({
      ...prev,
      subject: subjectName,
      subjectId: subject?.child_subject_id || null,
      chapter: '',
      lesson: ''
    }));
    
    if (subject?.child_subject_id) {
      fetchChapters(subject.child_subject_id);
    }
  };

  // Handle chapter selection/creation
  const handleChapterChange = async (e) => {
    const value = e.target.value;
    
    if (value === 'create_new') {
      // Create new chapter
      try {
        const nextChapterNumber = getNextChapterNumber();
        const response = await api.post('/units', {
          child_subject_id: formData.subjectId,
          name: `Chapter ${nextChapterNumber}`,
          description: `Auto-created chapter for new materials`,
          sequence_order: nextChapterNumber
        });
        
        const newChapter = response.data;
        setChapters(prev => [...prev, newChapter].sort((a, b) => 
          (a.sequence_order || 0) - (b.sequence_order || 0)
        ));
        
        setFormData(prev => ({
          ...prev,
          chapter: newChapter.id,
          chapterNumber: nextChapterNumber,
          lesson: '',
          lessonNumber: 1
        }));
        
        // Automatically create Lesson 1 in the new chapter
        const lessonResponse = await api.post('/lesson-containers', {
          unit_id: newChapter.id,
          title: 'Lesson 1',
          description: 'Auto-created lesson for new materials',
          sequence_order: 1
        });
        
        const newLesson = lessonResponse.data;
        setLessons([newLesson]);
        setFormData(prev => ({
          ...prev,
          lesson: newLesson.id,
          lessonNumber: 1
        }));
      } catch (error) {
        console.error('Error creating new chapter:', error);
      }
    } else {
      const selectedChapter = chapters.find(c => c.id === value);
      setFormData(prev => ({
        ...prev,
        chapter: value,
        chapterNumber: extractNumberFromName(selectedChapter?.name) || 1,
        lesson: '',
        lessonNumber: 1
      }));
      fetchLessons(value);
    }
  };

  // Handle lesson selection/creation
  const handleLessonChange = async (e) => {
    const value = e.target.value;
    
    if (value === 'create_new') {
      // Create new lesson
      try {
        const nextLessonNumber = getNextLessonNumber();
        const response = await api.post('/lesson-containers', {
          unit_id: formData.chapter,
          title: `Lesson ${nextLessonNumber}`,
          description: 'Auto-created lesson for new materials',
          sequence_order: nextLessonNumber
        });
        
        const newLesson = response.data;
        setLessons(prev => [...prev, newLesson].sort((a, b) => 
          (a.sequence_order || 0) - (b.sequence_order || 0)
        ));
        
        setFormData(prev => ({
          ...prev,
          lesson: newLesson.id,
          lessonNumber: nextLessonNumber
        }));
      } catch (error) {
        console.error('Error creating new lesson:', error);
      }
    } else {
      const selectedLesson = lessons.find(l => l.id === value);
      setFormData(prev => ({
        ...prev,
        lesson: value,
        lessonNumber: extractNumberFromName(selectedLesson?.title) || 1
      }));
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({ ...prev, files }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.chapter || !formData.lesson || formData.files.length === 0) {
      alert('Please fill in all required fields and select at least one file.');
      return;
    }
    
    setUploading(true);
    setStep('upload');
    
    try {
      const uploadFormData = new FormData();
      
      // Add files
      formData.files.forEach((file, index) => {
        uploadFormData.append('files', file);
        uploadFormData.append(`metadata_${index}`, JSON.stringify({
          subject: formData.subject,
          subjectId: formData.subjectId,
          chapter: formData.chapter,
          lesson: formData.lesson,
          materialType: formData.materialType,
          dueDate: formData.dueDate,
          originalName: file.name
        }));
      });
      
      uploadFormData.append('child_id', selectedChild.id);
      uploadFormData.append('fileCount', formData.files.length);
      
      const response = await api.post('/materials/quick-upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setAnalysisResults(response.data.results);
        setStep('approval');
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.response?.data?.message || 'Failed to upload files. Please try again.');
      setStep('selection');
    } finally {
      setUploading(false);
    }
  };

  // Handle approval
  const handleApprove = async () => {
    try {
      await onComplete();
      onClose();
    } catch (error) {
      console.error('Error completing upload:', error);
    }
  };

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
          Smart organization - just select subject, chapter, and lesson
        </p>
      </div>

      {step === 'selection' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject Selection */}
          <div>
            <label className={labelClasses}>Subject *</label>
            <select
              value={formData.subject}
              onChange={handleSubjectChange}
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
          {formData.subject && (
            <div>
              <label className={labelClasses}>Chapter *</label>
              <select
                value={formData.chapter}
                onChange={handleChapterChange}
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
                  📁 Create Chapter {getNextChapterNumber()}
                </option>
              </select>
            </div>
          )}

          {/* Lesson Selection */}
          {formData.chapter && (
            <div>
              <label className={labelClasses}>Lesson *</label>
              <select
                value={formData.lesson}
                onChange={handleLessonChange}
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
                  📝 Create Lesson {getNextLessonNumber()}
                </option>
              </select>
            </div>
          )}

          {/* Material Type */}
          <div>
            <label className={labelClasses}>Material Type *</label>
            <select
              value={formData.materialType}
              onChange={(e) => setFormData(prev => ({ ...prev, materialType: e.target.value }))}
              className={inputClasses}
              required
            >
              {Object.entries(MATERIAL_TYPES).map(([key, type]) => (
                <option key={key} value={key}>
                  {type.icon} {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className={labelClasses}>Due Date</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              className={inputClasses}
            />
          </div>

          {/* File Upload */}
          <div>
            <label className={labelClasses}>Files *</label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className={inputClasses}
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
              required
            />
            {formData.files.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                {formData.files.length} file(s) selected
              </p>
            )}
          </div>

          {/* Organization Preview */}
          {formData.subject && formData.chapter && formData.lesson && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                <InformationCircleIcon className="h-5 w-5" />
                Materials will be organized as:
              </h3>
              <div className="text-sm text-blue-800">
                <div>📚 {formData.subject}</div>
                <div className="ml-4">📖 Chapter {formData.chapterNumber}</div>
                <div className="ml-8">📝 Lesson {formData.lessonNumber}</div>
                <div className="ml-12">{MATERIAL_TYPES[formData.materialType].icon} {MATERIAL_TYPES[formData.materialType].label}</div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={!formData.subject || !formData.chapter || !formData.lesson || formData.files.length === 0}
          >
            <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
            Upload and Organize Materials
          </Button>
        </form>
      )}

      {step === 'upload' && (
        <div className="text-center py-8">
          <ArrowPathIcon className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Files</h3>
          <p className="text-sm text-gray-600">
            AI is analyzing your materials and organizing them...
          </p>
        </div>
      )}

      {step === 'approval' && analysisResults && (
        <div className="text-center py-8">
          <CheckSolidIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Materials Added Successfully!</h3>
          <p className="text-sm text-gray-600 mb-6">
            {analysisResults.created} materials have been organized in your curriculum.
          </p>
          <div className="space-y-3">
            <Button
              onClick={handleApprove}
              variant="primary"
              className="w-full"
            >
              View in Curriculum
            </Button>
            <Button
              onClick={onClose}
              variant="secondary"
              className="w-full"
            >
              Add More Materials
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}