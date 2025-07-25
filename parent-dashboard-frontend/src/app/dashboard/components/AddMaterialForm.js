// app/dashboard/components/AddMaterialForm.js
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  DocumentArrowUpIcon, 
  CheckCircleIcon as CheckSolidIcon, 
  ArrowPathIcon, 
  PlusIcon, 
  BookOpenIcon 
} from '@heroicons/react/24/outline';
import Button from '../../../components/ui/Button';

function formatContentTypeName(contentType) {
    if (!contentType) return '';
    return contentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default function AddMaterialForm({
  childSubjectsForSelectedChild,
  currentAddLessonSubject, 
  onAddLessonSubjectChange, 

  unitsForSelectedSubject,  
  onCreateNewUnit,
  
  selectedLessonContainer, 
  onLessonContainerChange, 

  onCreateNewLessonContainer, 

  appContentTypes = [],
  appGradableContentTypes = [],
  
  onFormSubmit,
  uploading,
  currentAddLessonUserContentType,
  onAddLessonUserContentTypeChange,
  onAddLessonFileChange,
  currentAddLessonFile,
  
  onApprove,
  savingLesson,
  lessonJsonForApproval, 
  onUpdateLessonJsonField,
  lessonTitleForApproval,
  onLessonTitleForApprovalChange,
  lessonContentTypeForApproval,
  onLessonContentTypeForApprovalChange,
  lessonMaxPointsForApproval,
  onLessonMaxPointsForApprovalChange,
  lessonDueDateForApproval,
  onLessonDueDateForApprovalChange,
  lessonCompletedForApproval,
  onLessonCompletedForApprovalChange,

  lessonContainersForSelectedUnit,
  
  // New props for pre-upload unit/lesson selection
  lessonsByUnit,
  setLessonsByUnit,
}) {

  // Removed newLessonGroupTitle, isCreatingLessonGroup, newUnitName, isCreatingUnit 
  // since unit and lesson group are now pre-selected before upload
  
  // Pre-upload unit and lesson container selection
  const [preUploadSelectedUnit, setPreUploadSelectedUnit] = useState('');
  const [preUploadSelectedLessonContainer, setPreUploadSelectedLessonContainer] = useState('');
  const [preUploadLessonContainers, setPreUploadLessonContainers] = useState([]);
  const [preUploadSelectedUnitName, setPreUploadSelectedUnitName] = useState('');
  const [preUploadSelectedLessonContainerName, setPreUploadSelectedLessonContainerName] = useState('');
  const hasSyncedPreUploadSelections = useRef(false);

  // Unit in this approval form is driven by lessonJsonForApproval.unit_id
  const unitIdInApprovalForm = lessonJsonForApproval?.unit_id || '';

  // Note: Unit and lesson container management removed since they're pre-selected
  
  // Effect to reset pre-upload selections when subject changes
  useEffect(() => {
    setPreUploadSelectedUnit('');
    setPreUploadSelectedLessonContainer('');
    setPreUploadSelectedUnitName('');
    setPreUploadSelectedLessonContainerName('');
    hasSyncedPreUploadSelections.current = false; // Reset sync flag
  }, [currentAddLessonSubject]);
  
  // Effect to reset pre-upload lesson container when unit changes
  useEffect(() => {
    setPreUploadSelectedLessonContainer('');
    setPreUploadSelectedLessonContainerName('');
  }, [preUploadSelectedUnit]);
  
  // Effect to sync pre-upload selections to approval form when file is uploaded
  useEffect(() => {
    // Reset sync flag when starting fresh (no lesson JSON)
    if (!lessonJsonForApproval) {
      hasSyncedPreUploadSelections.current = false;
      return;
    }
    
    if (lessonJsonForApproval && !hasSyncedPreUploadSelections.current) {
      // Set the unit in the approval form to match pre-upload selection
      if (preUploadSelectedUnit && onUpdateLessonJsonField) {
        onUpdateLessonJsonField('unit_id', preUploadSelectedUnit);
      }
      
      // Use a timeout to ensure unit is set before setting lesson container
      setTimeout(() => {
        if (preUploadSelectedLessonContainer && onLessonContainerChange) {
          onLessonContainerChange({ target: { value: preUploadSelectedLessonContainer } });
        }
      }, 100);
      
      // Mark as synced to prevent re-running
      hasSyncedPreUploadSelections.current = true;
    }
  }, [lessonJsonForApproval, preUploadSelectedUnit, preUploadSelectedLessonContainer, onLessonContainerChange, onUpdateLessonJsonField]);
  
  // Note: Removed unit and lesson group creation logic since they're pre-selected before upload

  const handleJsonFieldChange = (e, fieldName) => {
    if(onUpdateLessonJsonField) onUpdateLessonJsonField(fieldName, e.target.value);
  }
  const handleJsonArrayFieldChange = (e, fieldName) => {
    const newArray = e.target.value.split('\n').map(item => item.trim()).filter(item => item);
    if(onUpdateLessonJsonField) onUpdateLessonJsonField(fieldName, newArray);
  };
  
  const json = lessonJsonForApproval || {};

  const commonInputClasses = "w-full border-border-input rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-accent-blue focus:border-accent-blue placeholder-text-tertiary shadow-sm";
  const commonLabelClasses = "block text-xs font-medium text-text-secondary mb-1";
  const commonSelectClasses = `${commonInputClasses} h-10`;

  // Note: Removed unit and lesson group creation handlers since they're handled before upload
  
  // Handler for pre-upload unit selection
  const handlePreUploadUnitChange = async (e) => {
    const unitId = e.target.value;
    setPreUploadSelectedUnit(unitId);
    
    // Store the unit name for display
    const selectedUnit = unitsForSelectedSubject?.find(u => u.id === unitId);
    setPreUploadSelectedUnitName(selectedUnit?.name || '');
    
    // Fetch lesson containers for this unit if not already loaded
    if (unitId && (!lessonsByUnit[unitId] || !Array.isArray(lessonsByUnit[unitId]))) {
      try {
        const api = (await import('../../../utils/api')).default;
        const lessonsRes = await api.get(`/lesson-containers/unit/${unitId}`);
        const lessonContainers = lessonsRes.data || [];
        
        if (setLessonsByUnit) {
          setLessonsByUnit(prev => ({
            ...prev,
            [unitId]: lessonContainers
          }));
        }
        // Update local state as well
        setPreUploadLessonContainers(lessonContainers);
      } catch (error) {
        console.error('Failed to fetch lesson containers:', error);
        if (setLessonsByUnit) {
          setLessonsByUnit(prev => ({
            ...prev,
            [unitId]: []
          }));
        }
        // Update local state as well
        setPreUploadLessonContainers([]);
      }
    }
  };
  
  // Update preUploadLessonContainers when unit selection changes
  useEffect(() => {
    if (preUploadSelectedUnit && lessonsByUnit[preUploadSelectedUnit]) {
      setPreUploadLessonContainers(lessonsByUnit[preUploadSelectedUnit] || []);
    } else {
      setPreUploadLessonContainers([]);
    }
  }, [preUploadSelectedUnit, lessonsByUnit]);

  return (
    <div className="space-y-6"> 
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-1">Add New Material</h3>
        <p className="text-sm text-text-secondary mb-4">Upload files and let Klio AI structure them for you.</p>
      </div>
      <form onSubmit={onFormSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label htmlFor="add-lesson-subject" className={commonLabelClasses}>Subject *</label>
            <select id="add-lesson-subject" value={currentAddLessonSubject || ''} onChange={onAddLessonSubjectChange} className={commonSelectClasses} required>
              <option value="">Select subject…</option>
              {(childSubjectsForSelectedChild || []).filter(s => s.child_subject_id).map(subject => (
                <option key={subject.child_subject_id} value={subject.child_subject_id}>{subject.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="add-lesson-content-type" className={commonLabelClasses}>Content Type (Initial Hint) *</label>
            <select id="add-lesson-content-type" value={currentAddLessonUserContentType || ''} onChange={onAddLessonUserContentTypeChange} className={commonSelectClasses} required>
              {(appContentTypes || []).map(type => (
                <option key={type} value={type}>{formatContentTypeName(type)}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Pre-upload unit and lesson group selection */}
        {currentAddLessonSubject && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="pre-upload-unit" className={commonLabelClasses}>
                Unit <span className="text-text-tertiary">(Optional - to group with existing lessons)</span>
              </label>
              <select 
                id="pre-upload-unit" 
                value={preUploadSelectedUnit} 
                onChange={handlePreUploadUnitChange} 
                className={commonSelectClasses}
              >
                <option value="">Select unit to see lesson groups...</option>
                {(unitsForSelectedSubject || []).map(unit => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pre-upload-lesson-container" className={commonLabelClasses}>
                Group with Previous Lesson <span className="text-text-tertiary">(Optional)</span>
              </label>
              <select 
                id="pre-upload-lesson-container" 
                value={preUploadSelectedLessonContainer} 
                onChange={(e) => {
                  const lessonId = e.target.value;
                  setPreUploadSelectedLessonContainer(lessonId);
                  // Store the lesson container name for display
                  const selectedLesson = preUploadLessonContainers.find(l => l.id === lessonId);
                  setPreUploadSelectedLessonContainerName(selectedLesson?.title || '');
                }}
                className={commonSelectClasses}
                disabled={!preUploadSelectedUnit}
              >
                <option value="">Create new lesson group...</option>
                {preUploadLessonContainers.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                ))}
              </select>
              {!preUploadSelectedUnit && (
                <p className="text-xs text-text-tertiary italic mt-0.5">Select a unit first to see lesson groups.</p>
              )}
            </div>
          </div>
        )}
        
        {/* Show selected organization info when lesson group is selected */}
        {preUploadSelectedLessonContainer && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-green-800 mb-2">📁 Organization Selected</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Unit:</span>
                <span className="font-medium text-green-900">{preUploadSelectedUnitName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Lesson Group:</span>
                <span className="font-medium text-green-900">{preUploadSelectedLessonContainerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Content Type:</span>
                <span className="font-medium text-green-900">{formatContentTypeName(currentAddLessonUserContentType)}</span>
              </div>
            </div>
          </div>
        )}
        
        <div>
            <label htmlFor="lesson-file-input-main" className={commonLabelClasses}>File(s) *</label>
            <input 
              id="lesson-file-input-main" 
              type="file" 
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.md"
              multiple
              onChange={onAddLessonFileChange} 
              required 
              className="block w-full text-sm text-text-secondary file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-text-secondary hover:file:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue"
            />
        </div>

        {currentAddLessonFile && currentAddLessonFile.length > 0 && (
            <div className="mt-2 text-xs text-text-secondary bg-gray-50 p-2.5 rounded-md border border-border-subtle">
                <p className="font-medium text-text-primary mb-1">Selected files ({currentAddLessonFile.length}):</p>
                <ul className="list-disc list-inside max-h-24 overflow-y-auto space-y-0.5">
                    {Array.from(currentAddLessonFile).map((file, index) => (
                        <li key={index} className="truncate text-text-secondary" title={file.name}>{file.name} ({Math.round(file.size / 1024)} KB)</li>
                    ))}
                </ul>
            </div>
        )}
        
        <div className="flex justify-end">
            <Button 
            type="submit" 
            variant="primary"
            size="md"
            disabled={uploading || !currentAddLessonSubject || !currentAddLessonFile || currentAddLessonFile?.length === 0 || !currentAddLessonUserContentType || !(childSubjectsForSelectedChild || []).find(s => s.child_subject_id === currentAddLessonSubject)} 
            className="min-w-[180px]"
            >
            {uploading ? (
                <><ArrowPathIcon className="h-5 w-5 mr-2 animate-spin"/>Analyzing...</>
            ) : (
                <><DocumentArrowUpIcon className="h-5 w-5 mr-2"/>Upload & Analyze</>
            )}
            </Button>
        </div>
      </form>

      {lessonJsonForApproval && (
        <div className="mt-4 border-t border-border-subtle pt-4 space-y-3 animate-fade-in">
          <div>
            <h3 className="text-md font-semibold text-text-primary mb-1">Review & Approve</h3>
            <p className="text-sm text-text-secondary mb-3">Confirm or adjust the details extracted by Klio AI.</p>
          </div>
          
          {json.error && <div className="text-accent-red bg-red-50 p-3 rounded-md mb-4 border border-red-200 text-sm">Analysis Error: {json.error} <br/>{json.raw_response && <span className="text-xs">Raw: {json.raw_response}</span>}</div>}
          
          <div className="space-y-3 p-4 border border-blue-100 rounded-lg bg-blue-50/30">
            <h4 className="text-sm font-semibold text-accent-blue mb-2 flex items-center">
                <BookOpenIcon className="h-4 w-4 mr-1.5"/> Material Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2">
              <div>
                <label htmlFor="lesson-title-approval" className={commonLabelClasses}>Title *</label>
                <input id="lesson-title-approval" value={lessonTitleForApproval || ''} onChange={onLessonTitleForApprovalChange} className={commonInputClasses} required/>
              </div>
              <div>
                <label className={commonLabelClasses}>Content Type</label>
                <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 text-sm">
                  {formatContentTypeName(currentAddLessonUserContentType)} 
                  <span className="text-gray-500 ml-2">(selected before upload)</span>
                </div>
              </div>
              {(appGradableContentTypes || []).includes(currentAddLessonUserContentType) && (
                <div>
                    <label htmlFor="lesson-max-points-approval" className={commonLabelClasses}>Max Score</label>
                    <input type="number" id="lesson-max-points-approval" value={lessonMaxPointsForApproval || ''} onChange={onLessonMaxPointsForApprovalChange} className={commonInputClasses} placeholder="e.g., 100"/>
                    {json.total_possible_points_suggestion !== null && json.total_possible_points_suggestion !== undefined && String(json.total_possible_points_suggestion) !== lessonMaxPointsForApproval && (
                        <p className="text-xs text-text-tertiary mt-0.5">AI Suggestion: {json.total_possible_points_suggestion}</p>
                    )}
                </div>
              )}
               <div>
                    <label htmlFor="lesson-due-date-approval" className={commonLabelClasses}>Due Date</label>
                    <input type="date" id="lesson-due-date-approval" value={lessonDueDateForApproval || ''} onChange={onLessonDueDateForApprovalChange} className={commonInputClasses}/>
                </div>
            </div>
            {/* Unit and Lesson Group are pre-selected during upload, so we show them as read-only info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-green-800 mb-2">Assignment Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Unit:</span>
                  <span className="font-medium text-green-900">
                    {preUploadSelectedUnitName || unitsForSelectedSubject?.find(u => u.id === unitIdInApprovalForm)?.name || 'Selected Unit'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Lesson Group:</span>
                  <span className="font-medium text-green-900">
                    {preUploadSelectedLessonContainerName || 
                     (unitIdInApprovalForm && lessonsByUnit[unitIdInApprovalForm]?.find(l => l.id === selectedLessonContainer)?.title) || 
                     lessonContainersForSelectedUnit?.find(l => l.id === selectedLessonContainer)?.title || 
                     (selectedLessonContainer ? 'Selected Lesson Group' : 'New Lesson Group')}
                  </span>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2 italic">
                These were selected before upload. To change them, cancel and start over.
              </p>
            </div>

            <div className="flex items-center pt-2">
                <input type="checkbox" id="lesson-completed-approval" checked={lessonCompletedForApproval} onChange={onLessonCompletedForApprovalChange} className="h-4 w-4 text-accent-blue border-border-input rounded focus:ring-accent-blue"/>
                <label htmlFor="lesson-completed-approval" className="ml-2 block text-sm font-medium text-text-primary">Mark as Complete</label>
            </div>
          </div>
          
          {!json.error && (
             <div className="space-y-3">
                <h4 className="text-sm font-semibold text-text-primary mb-2 border-b border-border-subtle pb-1.5">Additional Extracted Details (Editable)</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className={commonLabelClasses}>Lesson/Assignment Number</label>
                        <input type="text" value={json.lesson_number_if_applicable || ''} onChange={(e) => handleJsonFieldChange(e, 'lesson_number_if_applicable')} className={commonInputClasses} placeholder="e.g., 1.2, Assignment 3" />
                    </div>
                    <div>
                        <label className={commonLabelClasses}>Grade Level Suggestion</label>
                        <input type="text" value={json.grade_level_suggestion || ''} onChange={(e) => handleJsonFieldChange(e, 'grade_level_suggestion')} className={commonInputClasses} placeholder="e.g., Grade 3" />
                    </div>
                </div>
                <div>
                    <label className={commonLabelClasses}>Learning Objectives (one per line)</label>
                    <textarea value={(json.learning_objectives || []).join('\n')} onChange={(e) => handleJsonArrayFieldChange(e, 'learning_objectives')} rows="2" className={commonInputClasses} placeholder="What will the student learn?" />
                </div>
                <div>
                    <label className={commonLabelClasses}>Description/Summary</label>
                    <textarea value={json.main_content_summary_or_extract || ''} onChange={(e) => handleJsonFieldChange(e, 'main_content_summary_or_extract')} rows="3" className={commonInputClasses} placeholder="Brief description of this material..." />
                </div>
                <div>
                    <label className={commonLabelClasses}>Key Tasks/Questions (one per line)</label>
                    <textarea value={(json.tasks_or_questions || []).join('\n')} onChange={(e) => handleJsonArrayFieldChange(e, 'tasks_or_questions')} rows="3" className={commonInputClasses} placeholder="Main tasks or questions" />
                </div>
                
                <details className="border border-border-subtle rounded-md">
                    <summary className="cursor-pointer p-3 bg-gray-50 text-sm font-medium text-text-secondary hover:bg-gray-100 rounded-t-md">
                        Optional Fields
                    </summary>
                    <div className="p-3 space-y-3 border-t border-border-subtle">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className={commonLabelClasses}>Est. Time (minutes)</label>
                                <input type="number" value={json.estimated_completion_time_minutes || ''} onChange={(e) => handleJsonFieldChange(e, 'estimated_completion_time_minutes')} className={commonInputClasses} placeholder="30" />
                            </div>
                            <div>
                                <label className={commonLabelClasses}>Length Indicator</label>
                                <input type="text" value={json.page_count_or_length_indicator || ''} onChange={(e) => handleJsonFieldChange(e, 'page_count_or_length_indicator')} className={commonInputClasses} placeholder="e.g., 3 pages, Short video" />
                            </div>
                        </div>
                        <div>
                            <label className={commonLabelClasses}>Topics/Keywords (comma-separated)</label>
                            <input type="text" value={(json.subject_keywords_or_subtopics || []).join(', ')} 
                                   onChange={(e) => onUpdateLessonJsonField('subject_keywords_or_subtopics', e.target.value.split(',').map(s=>s.trim()).filter(s=>s))} 
                                   className={commonInputClasses} placeholder="algebra, fractions, word problems" />
                        </div>
                    </div>
                </details>
            </div>
          )}
          
          <Button 
            onClick={() => onApprove({
              // Simplified - no material relationship needed since we infer from content type
            })} 
            variant="primary" 
            size="md"
            className="w-full !bg-[#ABEBC6] !text-green-900 !border-b-[#7DCEA0] hover:!bg-[#A2E4B9] hover:!border-b-[#68C38B] active:!bg-[#7DCEA0] focus:!ring-[#7DCEA0]"
            disabled={savingLesson || !lessonTitleForApproval || !currentAddLessonUserContentType || !selectedLessonContainer || (selectedLessonContainer === '__create_new__') || (json && json.error) || !unitIdInApprovalForm || (unitIdInApprovalForm === '__create_new__') }>
            {savingLesson ? (
                <><ArrowPathIcon className="h-5 w-5 mr-2 animate-spin"/>Saving...</>
            ) : (
                <><CheckSolidIcon className="h-5 w-5 mr-2"/>Approve & Save Material</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}