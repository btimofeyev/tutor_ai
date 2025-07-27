'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  DocumentIcon,
  PhotoIcon,
  CalendarIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import Button from '../../../components/ui/Button';
import api from '../../../utils/api';

// Material type configuration with descriptions
const MATERIAL_TYPES = {
  lesson: {
    label: 'Lesson',
    description: 'Teaching materials, presentations, instructional content',
    icon: '📖',
    color: 'blue',
    isGradable: false
  },
  worksheet: {
    label: 'Worksheet',
    description: 'Practice problems, exercises, homework assignments',
    icon: '✏️',
    color: 'green',
    isGradable: true
  },
  quiz: {
    label: 'Quiz',
    description: 'Short assessments, quick checks for understanding',
    icon: '📝',
    color: 'yellow',
    isGradable: true
  },
  test: {
    label: 'Test',
    description: 'Major assessments, exams, unit tests',
    icon: '📋',
    color: 'red',
    isGradable: true
  },
  reading_material: {
    label: 'Reading',
    description: 'Books, articles, reference materials',
    icon: '📚',
    color: 'purple',
    isGradable: false
  },
  other: {
    label: 'Other',
    description: 'Any other type of educational material',
    icon: '📎',
    color: 'gray',
    isGradable: false
  }
};

export default function QuickUploadImproved({
  childSubjects,
  selectedChild,
  onComplete,
  subscriptionPermissions
}) {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [unitsBySubject, setUnitsBySubject] = useState({});
  const [loadingUnits, setLoadingUnits] = useState({});
  
  // Bulk action states
  const [bulkSubject, setBulkSubject] = useState('');
  const [bulkUnit, setBulkUnit] = useState('');
  const [bulkMaterialType, setBulkMaterialType] = useState('');
  const [bulkDueDate, setBulkDueDate] = useState('');

  // Fetch units when a subject is selected
  const fetchUnitsForSubject = useCallback(async (subjectId) => {
    if (!subjectId || unitsBySubject[subjectId]) return;
    
    setLoadingUnits(prev => ({ ...prev, [subjectId]: true }));
    try {
      const response = await api.get(`/units/subject/${subjectId}`);
      const units = response.data || [];
      
      // Sort units by sequence order and name for better display
      const sortedUnits = units.sort((a, b) => {
        if (a.sequence_order !== b.sequence_order) {
          return (a.sequence_order || 0) - (b.sequence_order || 0);
        }
        return a.name.localeCompare(b.name);
      });
      
      setUnitsBySubject(prev => ({ ...prev, [subjectId]: sortedUnits }));
    } catch (error) {
      console.error('Error fetching units:', error);
      setUnitsBySubject(prev => ({ ...prev, [subjectId]: [] }));
    } finally {
      setLoadingUnits(prev => ({ ...prev, [subjectId]: false }));
    }
  }, [unitsBySubject]);

  // File type to icon mapping
  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return <PhotoIcon className="h-5 w-5 text-blue-500" />;
    return <DocumentIcon className="h-5 w-5 text-gray-500" />;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles) => {
    const newFiles = acceptedFiles.map((file, index) => ({
      id: Date.now() + index,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'processing',
      subject: detectSubjectFromFilename(file.name),
      subjectId: null,
      unit: null,
      materialType: detectMaterialType(file.name),
      dueDate: suggestDueDate(file.name),
      lessonContainer: null,
      error: null
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Simulate processing
    setTimeout(() => {
      setUploadedFiles(prev => 
        prev.map(f => 
          newFiles.find(nf => nf.id === f.id) 
            ? { ...f, status: 'ready' }
            : f
        )
      );
    }, 1500);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc', '.docx'],
      'text/plain': ['.txt'],
      'application/vnd.ms-powerpoint': ['.ppt', '.pptx']
    },
    multiple: true,
    maxFiles: subscriptionPermissions?.maxFilesPerUpload || 10
  });

  // Smart detection functions
  const detectSubjectFromFilename = (filename) => {
    const lower = filename.toLowerCase();
    
    // Try to match against available subjects
    for (const subject of childSubjects || []) {
      if (lower.includes(subject.name.toLowerCase())) {
        return subject.name;
      }
    }
    
    // Common subject keywords
    if (lower.includes('math')) return 'Math';
    if (lower.includes('english') || lower.includes('spelling') || lower.includes('reading')) return 'English';
    if (lower.includes('science')) return 'Science';
    if (lower.includes('history') || lower.includes('social')) return 'History';
    return '';
  };

  const detectMaterialType = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.includes('lesson') || lower.includes('teach') || lower.includes('presentation')) return 'lesson';
    if (lower.includes('worksheet') || lower.includes('practice') || lower.includes('homework')) return 'worksheet';
    if (lower.includes('quiz')) return 'quiz';
    if (lower.includes('test') || lower.includes('exam')) return 'test';
    if (lower.includes('read') || lower.includes('book')) return 'reading_material';
    return 'worksheet'; // Default to worksheet as it's most common
  };

  const suggestDueDate = (filename) => {
    const lower = filename.toLowerCase();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Tests/quizzes typically due at end of week
    if (lower.includes('test') || lower.includes('quiz')) {
      const friday = new Date(today);
      const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
      friday.setDate(today.getDate() + daysUntilFriday);
      return friday.toISOString().split('T')[0];
    }
    
    // Default to tomorrow for worksheets
    return tomorrow.toISOString().split('T')[0];
  };

  // Update file field
  const updateFile = async (fileId, field, value) => {
    // Handle creating new chapter
    if (field === 'unit' && value === 'create_new') {
      const file = uploadedFiles.find(f => f.id === fileId);
      if (file && file.subjectId) {
        try {
          const currentUnits = unitsBySubject[file.subjectId] || [];
          const nextChapterNumber = currentUnits.length + 1;
          
          const response = await api.post('/units', {
            child_subject_id: file.subjectId,
            name: `Chapter ${nextChapterNumber}`,
            description: `Auto-created chapter for new materials`
          });
          
          const newUnit = response.data;
          
          // Update local units cache
          setUnitsBySubject(prev => ({
            ...prev,
            [file.subjectId]: [...(prev[file.subjectId] || []), newUnit].sort((a, b) => 
              (a.sequence_order || 0) - (b.sequence_order || 0) || a.name.localeCompare(b.name)
            )
          }));
          
          // Set the new unit for this file
          setUploadedFiles(prev =>
            prev.map(f => f.id === fileId ? { ...f, unit: newUnit.id } : f)
          );
          
          return; // Exit early after handling chapter creation
        } catch (error) {
          console.error('Error creating new chapter:', error);
          // Fall through to regular update logic
        }
      }
    }
    
    setUploadedFiles(prev =>
      prev.map(f => {
        if (f.id === fileId) {
          const updated = { ...f, [field]: value };
          
          // Handle subject change - fetch units and clear unit selection
          if (field === 'subject') {
            const subject = childSubjects.find(s => s.name === value);
            if (subject) {
              updated.subjectId = subject.child_subject_id;
              fetchUnitsForSubject(subject.child_subject_id);
            }
            updated.unit = null; // Clear unit when subject changes
          }
          
          return updated;
        }
        return f;
      })
    );
  };

  // Remove file
  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  };

  // Toggle file selection
  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  // Select all files
  const selectAllFiles = () => {
    if (selectedFiles.size === uploadedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(uploadedFiles.map(f => f.id)));
    }
  };

  // Apply bulk changes
  const applyBulkChanges = () => {
    if (selectedFiles.size === 0) return;

    setUploadedFiles(prev =>
      prev.map(f => {
        if (selectedFiles.has(f.id)) {
          const updated = { ...f };
          
          if (bulkSubject) {
            updated.subject = bulkSubject;
            const subject = childSubjects.find(s => s.name === bulkSubject);
            if (subject) {
              updated.subjectId = subject.child_subject_id;
              fetchUnitsForSubject(subject.child_subject_id);
            }
          }
          
          if (bulkUnit) updated.unit = bulkUnit;
          if (bulkMaterialType) updated.materialType = bulkMaterialType;
          if (bulkDueDate) updated.dueDate = bulkDueDate;
          
          return updated;
        }
        return f;
      })
    );

    // Clear selections
    setSelectedFiles(new Set());
    setBulkSubject('');
    setBulkUnit('');
    setBulkMaterialType('');
    setBulkDueDate('');
  };

  // Check if ready to submit
  const readyFiles = uploadedFiles.filter(f => 
    f.status === 'ready' && f.subject && f.materialType
  );
  const isReadyToSubmit = readyFiles.length > 0;

  // Group files by material type
  const filesByType = useMemo(() => {
    const grouped = {};
    readyFiles.forEach(file => {
      const type = MATERIAL_TYPES[file.materialType] || MATERIAL_TYPES.other;
      if (!grouped[file.materialType]) {
        grouped[file.materialType] = {
          type: type,
          files: []
        };
      }
      grouped[file.materialType].files.push(file);
    });
    return grouped;
  }, [readyFiles]);

  // Handle final submission
  const handleSubmit = async () => {
    setProcessing(true);
    try {
      await onComplete(readyFiles);
      setUploadedFiles([]);
    } catch (error) {
      console.error('Error submitting files:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Material Type Legend */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
          <InformationCircleIcon className="h-5 w-5" />
          Material Types Guide
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(MATERIAL_TYPES).map(([key, type]) => (
            <div key={key} className="flex items-start gap-2 text-sm">
              <span className="text-lg">{type.icon}</span>
              <div>
                <div className="font-medium text-gray-900">{type.label}</div>
                <div className="text-xs text-gray-600">{type.description}</div>
                {type.isGradable && (
                  <div className="text-xs text-blue-600 font-medium">Gradable</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <div className="text-4xl">📚</div>
          <h3 className="text-lg font-medium text-gray-900">
            Drop {selectedChild?.name}'s schoolwork here
          </h3>
          <p className="text-sm text-gray-600">
            Supports: PDFs, Images, Word docs, PowerPoints, Text files
          </p>
          <p className="text-xs text-gray-500 mt-2">
            or click to browse files (max {subscriptionPermissions?.maxFilesPerUpload || 10} files)
          </p>
        </div>
      </div>

      {/* Files Table */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Bulk Actions */}
          {selectedFiles.size > 0 && (
            <div className="p-4 bg-blue-50 border-b border-blue-200">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedFiles.size} files selected
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <select
                    value={bulkSubject}
                    onChange={(e) => setBulkSubject(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md"
                  >
                    <option value="">Set Subject...</option>
                    {childSubjects && childSubjects.map(subject => (
                      <option key={subject.child_subject_id} value={subject.name}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={bulkMaterialType}
                    onChange={(e) => setBulkMaterialType(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md"
                  >
                    <option value="">Set Type...</option>
                    {Object.entries(MATERIAL_TYPES).map(([key, type]) => (
                      <option key={key} value={key}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                  
                  <input
                    type="date"
                    value={bulkDueDate}
                    onChange={(e) => setBulkDueDate(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md"
                    placeholder="Set Due Date"
                  />
                  
                  <Button
                    onClick={applyBulkChanges}
                    variant="secondary"
                    size="sm"
                    disabled={!bulkSubject && !bulkMaterialType && !bulkDueDate}
                  >
                    Apply to Selected
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 text-sm font-medium text-gray-700">
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                checked={selectedFiles.size === uploadedFiles.length && uploadedFiles.length > 0}
                onChange={selectAllFiles}
                className="rounded border-gray-300"
              />
            </div>
            <div className="col-span-3">File</div>
            <div className="col-span-2">Subject</div>
            <div className="col-span-2">Chapter</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Due Date</div>
          </div>

          {/* File Rows */}
          <div className="divide-y divide-gray-200">
            {uploadedFiles.map(file => (
              <div key={file.id} className="p-4">
                {/* Mobile layout */}
                <div className="md:hidden space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="rounded border-gray-300"
                      />
                      {getFileIcon(file)}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{file.name}</div>
                        <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                      disabled={file.status === 'processing'}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={file.subject}
                      onChange={(e) => updateFile(file.id, 'subject', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      disabled={file.status === 'processing'}
                    >
                      <option value="">Select Subject...</option>
                      {childSubjects && childSubjects.map(subject => (
                        <option key={subject.child_subject_id} value={subject.name}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                    
                    <select
                      value={file.unit || ''}
                      onChange={(e) => updateFile(file.id, 'unit', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      disabled={file.status === 'processing' || !file.subjectId}
                    >
                      <option value="">Select Chapter...</option>
                      {file.subjectId && unitsBySubject[file.subjectId] && 
                        unitsBySubject[file.subjectId].map(unit => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name}
                          </option>
                        ))
                      }
                      {file.subjectId && unitsBySubject[file.subjectId] && (
                        <option value="create_new" className="font-medium text-blue-600">
                          📁 Create Chapter {(unitsBySubject[file.subjectId]?.length || 0) + 1}
                        </option>
                      )}
                    </select>
                    
                    <select
                      value={file.materialType}
                      onChange={(e) => updateFile(file.id, 'materialType', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      disabled={file.status === 'processing'}
                    >
                      {Object.entries(MATERIAL_TYPES).map(([key, type]) => (
                        <option key={key} value={key}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                    
                    <input
                      type="date"
                      value={file.dueDate}
                      onChange={(e) => updateFile(file.id, 'dueDate', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      disabled={file.status === 'processing'}
                    />
                  </div>
                  
                  {file.status === 'processing' && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Processing...
                    </div>
                  )}
                </div>

                {/* Desktop layout */}
                <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => toggleFileSelection(file.id)}
                      className="rounded border-gray-300"
                    />
                  </div>
                  
                  <div className="col-span-3 flex items-center gap-2">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                    {file.status === 'processing' && (
                      <ArrowPathIcon className="h-4 w-4 text-blue-500 animate-spin" />
                    )}
                    {file.status === 'ready' && (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    )}
                  </div>

                  <div className="col-span-2">
                    <select
                      value={file.subject}
                      onChange={(e) => updateFile(file.id, 'subject', e.target.value)}
                      className={`w-full px-2 py-1 text-sm border rounded-md ${
                        !file.subject ? 'border-red-300' : 'border-gray-300'
                      }`}
                      disabled={file.status === 'processing'}
                    >
                      <option value="">Select...</option>
                      {childSubjects && childSubjects.map(subject => (
                        <option key={subject.child_subject_id} value={subject.name}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <select
                      value={file.unit || ''}
                      onChange={(e) => updateFile(file.id, 'unit', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      disabled={file.status === 'processing' || !file.subjectId || loadingUnits[file.subjectId]}
                    >
                      <option value="">Select Chapter...</option>
                      {loadingUnits[file.subjectId] && <option disabled>Loading chapters...</option>}
                      {file.subjectId && unitsBySubject[file.subjectId] && 
                        unitsBySubject[file.subjectId].map(unit => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name}
                          </option>
                        ))
                      }
                      {file.subjectId && unitsBySubject[file.subjectId] && (
                        <option value="create_new" className="font-medium text-blue-600">
                          📁 Create Chapter {(unitsBySubject[file.subjectId]?.length || 0) + 1}
                        </option>
                      )}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <select
                      value={file.materialType}
                      onChange={(e) => updateFile(file.id, 'materialType', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                      disabled={file.status === 'processing'}
                    >
                      {Object.entries(MATERIAL_TYPES).map(([key, type]) => (
                        <option key={key} value={key}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="date"
                        value={file.dueDate}
                        onChange={(e) => updateFile(file.id, 'dueDate', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                        disabled={file.status === 'processing'}
                      />
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                      disabled={file.status === 'processing'}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Section */}
      {isReadyToSubmit && (
        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-medium text-green-900">
                {readyFiles.length} materials ready to add
              </h3>
            </div>
            
            {/* Summary by type */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(filesByType).map(([typeKey, data]) => (
                <div key={typeKey} className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{data.type.icon}</span>
                    <span className="font-medium text-gray-900">{data.type.label}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {data.files.length} {data.files.length === 1 ? 'item' : 'items'}
                  </div>
                  {data.type.isGradable && (
                    <div className="text-xs text-blue-600 font-medium mt-1">
                      Gradable content
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-sm text-gray-600 bg-white rounded-lg p-3">
              <p className="font-medium mb-1">Organization tip:</p>
              <p>Materials will be grouped by type within each unit. Lessons appear first, followed by worksheets, quizzes, and tests.</p>
            </div>

            <Button
              onClick={handleSubmit}
              variant="primary"
              size="lg"
              disabled={processing}
              className="w-full"
            >
              {processing ? 'Adding Materials...' : `Add ${readyFiles.length} Materials`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}