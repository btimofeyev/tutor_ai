'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  DocumentIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import Button from '../../../components/ui/Button';

export default function QuickUpload({
  childSubjects,
  selectedChild,
  onComplete,
  subscriptionPermissions
}) {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [bulkSubject, setBulkSubject] = useState('');
  const [bulkChapter, setBulkChapter] = useState('');
  const [selectedFiles, setSelectedFiles] = useState(new Set());

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
      chapter: detectChapterFromFilename(file.name),
      materialType: detectMaterialType(file.name),
      dueDate: suggestDueDate(file.name),
      error: null
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Simulate processing (in real implementation, this would analyze files)
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
    multiple: true
  });

  // Smart detection functions
  const detectSubjectFromFilename = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.includes('math')) return 'Math';
    if (lower.includes('english') || lower.includes('spelling') || lower.includes('reading')) return 'English';
    if (lower.includes('science')) return 'Science';
    if (lower.includes('history') || lower.includes('social')) return 'History';
    return '';
  };

  const detectChapterFromFilename = (filename) => {
    const match = filename.match(/chapter[\s_-]?(\d+)|ch[\s_-]?(\d+)|unit[\s_-]?(\d+)|week[\s_-]?(\d+)/i);
    if (match) {
      const num = match[1] || match[2] || match[3] || match[4];
      return `Chapter ${num}`;
    }
    return 'Chapter 1';
  };

  const detectMaterialType = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.includes('lesson') || lower.includes('teach')) return 'Lesson';
    if (lower.includes('practice') || lower.includes('worksheet') || lower.includes('exercise')) return 'Practice';
    if (lower.includes('test') || lower.includes('quiz') || lower.includes('exam')) return 'Test';
    if (lower.includes('read')) return 'Reading';
    return 'Lesson';
  };

  const suggestDueDate = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.includes('test') || lower.includes('quiz')) return 'Friday';
    return 'Tomorrow';
  };

  // Update file field
  const updateFile = (fileId, field, value) => {
    setUploadedFiles(prev =>
      prev.map(f => f.id === fileId ? { ...f, [field]: value } : f)
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
          return {
            ...f,
            ...(bulkSubject && { subject: bulkSubject }),
            ...(bulkChapter && { chapter: bulkChapter })
          };
        }
        return f;
      })
    );

    // Clear selections
    setSelectedFiles(new Set());
    setBulkSubject('');
    setBulkChapter('');
  };

  // Check if ready to submit
  const readyFiles = uploadedFiles.filter(f => f.status === 'ready' && f.subject);
  const isReadyToSubmit = readyFiles.length > 0;

  // Group files by subject
  const filesBySubject = useMemo(() => {
    const grouped = {};
    readyFiles.forEach(file => {
      if (!grouped[file.subject]) {
        grouped[file.subject] = [];
      }
      grouped[file.subject].push(file);
    });
    return grouped;
  }, [readyFiles]);

  // Handle final submission
  const handleSubmit = async () => {
    setProcessing(true);
    try {
      await onComplete(uploadedFiles.filter(f => f.status === 'ready'));
      setUploadedFiles([]);
    } catch (error) {
      console.error('Error submitting files:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
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
            Drop your child&apos;s schoolwork here
          </h3>
          <p className="text-sm text-gray-600">
            PDFs • Photos • Word docs • Any file
          </p>
          <p className="text-xs text-gray-500 mt-2">
            or click to choose files
          </p>
        </div>
      </div>

      {/* Files Table */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Bulk Actions */}
          {selectedFiles.size > 0 && (
            <div className="p-4 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedFiles.size} files selected
                </span>
                <select
                  value={bulkSubject}
                  onChange={(e) => setBulkSubject(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md"
                >
                  <option value="">Change Subject...</option>
                  {childSubjects && childSubjects.map(subject => (
                    <option key={subject.id} value={subject.name}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <select
                  value={bulkChapter}
                  onChange={(e) => setBulkChapter(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md"
                >
                  <option value="">Change Chapter...</option>
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={`Chapter ${num}`}>
                      Chapter {num}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={applyBulkChanges}
                  variant="secondary"
                  size="sm"
                  disabled={!bulkSubject && !bulkChapter}
                >
                  Apply
                </Button>
              </div>
            </div>
          )}

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 text-sm font-medium text-gray-700">
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
              <div key={file.id} className="grid grid-cols-12 gap-4 p-4 items-center">
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
                  {file.status === 'error' && (
                    <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
                  )}
                </div>

                <div className="col-span-2">
                  <select
                    value={file.subject}
                    onChange={(e) => updateFile(file.id, 'subject', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                    disabled={file.status === 'processing'}
                  >
                    <option value="">Select...</option>
                    {childSubjects && childSubjects.map(subject => (
                      <option key={subject.id} value={subject.name}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <select
                    value={file.chapter}
                    onChange={(e) => updateFile(file.id, 'chapter', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                    disabled={file.status === 'processing'}
                  >
                    {[1, 2, 3, 4, 5].map(num => (
                      <option key={num} value={`Chapter ${num}`}>
                        Chapter {num}
                      </option>
                    ))}
                    <option value="New Chapter">+ New Chapter</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <select
                    value={file.materialType}
                    onChange={(e) => updateFile(file.id, 'materialType', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                    disabled={file.status === 'processing'}
                  >
                    <option value="Lesson">Lesson</option>
                    <option value="Practice">Practice</option>
                    <option value="Test">Test</option>
                    <option value="Reading">Reading</option>
                  </select>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <select
                    value={file.dueDate}
                    onChange={(e) => updateFile(file.id, 'dueDate', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
                    disabled={file.status === 'processing'}
                  >
                    <option value="Today">Today</option>
                    <option value="Tomorrow">Tomorrow</option>
                    <option value="This Week">This Week</option>
                    <option value="Next Week">Next Week</option>
                    <option value="Friday">Friday</option>
                  </select>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                    disabled={file.status === 'processing'}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
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
                {readyFiles.length} assignments ready to add
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              {Object.entries(filesBySubject).map(([subject, files]) => (
                <div key={subject} className="text-gray-700">
                  {subject}: {files.length} items
                </div>
              ))}
            </div>

            <Button
              onClick={handleSubmit}
              variant="primary"
              size="lg"
              disabled={processing}
              className="w-full"
            >
              {processing ? 'Adding to Schedule...' : 'Add to Schedule'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}