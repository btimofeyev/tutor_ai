// app/dashboard/components/AddMaterialForm.js
'use client';
import React from 'react';

function formatContentTypeName(contentType) {
    if (!contentType) return '';
    return contentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default function AddMaterialForm({
  childSubjectsForSelectedChild,
  onFormSubmit,
  onApprove,
  uploading,
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
  currentAddLessonSubject,
  onAddLessonSubjectChange,
  currentAddLessonUserContentType,
  onAddLessonUserContentTypeChange,
  onAddLessonFileChange,
  currentAddLessonFile,
  appContentTypes = [],
  appGradableContentTypes = [],
  unitsForSelectedSubject = [],
}) {

  const handleJsonFieldChange = (e, fieldName) => {
    onUpdateLessonJsonField(fieldName, e.target.value);
  };

  const handleJsonArrayFieldChange = (e, fieldName) => {
    const newArray = e.target.value.split('\n').map(item => item.trim()).filter(item => item);
    onUpdateLessonJsonField(fieldName, newArray);
  };
  
  const json = lessonJsonForApproval || {};

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100"> 
      <h2 className="text-lg font-bold mb-4">Add New Material</h2>
      <form onSubmit={onFormSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="flex flex-col">
            <label htmlFor="add-lesson-subject" className="text-sm font-medium mb-1">Subject</label>
            <select id="add-lesson-subject" value={currentAddLessonSubject} onChange={onAddLessonSubjectChange} className="border rounded px-3 py-2 h-10" required>
              <option value="">Pick a subject…</option>
              {/* FIXED: Use child_subject_id as the value instead of subject.id */}
              {(childSubjectsForSelectedChild || []).filter(s => s.child_subject_id).map(subject => (
                <option key={subject.child_subject_id} value={subject.child_subject_id}>{subject.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="add-lesson-content-type" className="text-sm font-medium mb-1">Content Type (Initial)</label>
            <select id="add-lesson-content-type" value={currentAddLessonUserContentType} onChange={onAddLessonUserContentTypeChange} className="border rounded px-3 py-2 h-10" required>
              {appContentTypes.map(type => (
                <option key={type} value={type}>{formatContentTypeName(type)}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col md:col-span-1">
            <label htmlFor="lesson-file-input-main" className="text-sm font-medium mb-1">File(s)</label>
            <input 
              id="lesson-file-input-main" 
              type="file" 
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.md"
              multiple
              onChange={onAddLessonFileChange} 
              required 
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
          </div>
        </div>
        {/* Display selected file names */}
        {currentAddLessonFile && currentAddLessonFile.length > 0 && (
            <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-md border">
                <p className="font-medium mb-1">Selected files ({currentAddLessonFile.length}):</p>
                <ul className="list-disc list-inside max-h-24 overflow-y-auto">
                    {Array.from(currentAddLessonFile).map((file, index) => (
                        <li key={index} className="truncate text-gray-700" title={file.name}>{file.name} ({Math.round(file.size / 1024)} KB)</li>
                    ))}
                </ul>
            </div>
        )}

        <button type="submit" disabled={uploading || !currentAddLessonSubject || !currentAddLessonFile || currentAddLessonFile?.length === 0 || !currentAddLessonUserContentType || !(childSubjectsForSelectedChild || []).find(s => s.child_subject_id === currentAddLessonSubject)} className="w-full sm:w-auto px-5 py-2 rounded-xl bg-black text-white font-medium hover:bg-gray-900 transition self-end">
          {uploading ? 'Analyzing...' : 'Upload & Analyze'}
        </button>
      </form>

      {lessonJsonForApproval && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-md font-semibold mb-3">Review & Approve Extracted Material</h3>
          {json.error && <p className="text-red-500 bg-red-50 p-3 rounded-md mb-4">Analysis Error: {json.error} <br/>{json.raw_response && <span className="text-xs">Raw: {json.raw_response}</span>}</p>}
          
          <div className="space-y-3 mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <h4 className="text-sm font-semibold text-blue-700 mb-2">Confirm or Adjust Primary Details:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label htmlFor="lesson-title-approval" className="block text-xs font-medium text-gray-700">Title*</label>
                <input id="lesson-title-approval" value={lessonTitleForApproval} onChange={onLessonTitleForApprovalChange} className="mt-1 border rounded w-full px-3 py-1.5 text-sm" required/>
              </div>
              <div>
                <label htmlFor="lesson-content-type-approval" className="block text-xs font-medium text-gray-700">Content Type*</label>
                <select id="lesson-content-type-approval" value={lessonContentTypeForApproval} onChange={onLessonContentTypeForApprovalChange} className="mt-1 border rounded w-full px-3 py-1.5 text-sm h-[34px]" required>
                  {appContentTypes.map(type => ( <option key={type} value={type}>{formatContentTypeName(type)}</option> ))}
                </select>
              </div>
              {appGradableContentTypes.includes(lessonContentTypeForApproval) && (
                <div>
                    <label htmlFor="lesson-max-points-approval" className="block text-xs font-medium text-gray-700">Max Score</label>
                    <input type="number" id="lesson-max-points-approval" value={lessonMaxPointsForApproval} onChange={onLessonMaxPointsForApprovalChange} className="mt-1 border rounded w-full px-3 py-1.5 text-sm" placeholder="e.g., 100"/>
                    {json.total_possible_points_suggestion !== null && json.total_possible_points_suggestion !== undefined && String(json.total_possible_points_suggestion) !== lessonMaxPointsForApproval && (
                        <p className="text-xs text-gray-500 mt-0.5">AI Suggestion: {json.total_possible_points_suggestion}</p>
                    )}
                </div>
              )}
               <div>
                    <label htmlFor="lesson-due-date-approval" className="block text-xs font-medium text-gray-700">Due Date</label>
                    <input type="date" id="lesson-due-date-approval" value={lessonDueDateForApproval} onChange={onLessonDueDateForApprovalChange} className="mt-1 border rounded w-full px-3 py-1.5 text-sm"/>
                </div>
            </div>
            <div>
                <label htmlFor="lesson-unit-approval" className="block text-xs font-medium text-gray-700 mt-2">Assign to Unit (Optional)</label>
                <select id="lesson-unit-approval" value={json.unit_id || ''} onChange={(e) => onUpdateLessonJsonField('unit_id', e.target.value || null)}
                    className="mt-1 border rounded w-full px-3 py-1.5 text-sm h-[34px]" disabled={unitsForSelectedSubject.length === 0}>
                    <option value="">-- Select a Unit --</option>
                    {unitsForSelectedSubject.map(unit => ( <option key={unit.id} value={unit.id}>{unit.name}</option> ))}
                </select>
                {unitsForSelectedSubject.length === 0 && <p className="text-xs text-gray-400 italic mt-0.5">No units for this subject. Add via "Manage Units".</p>}
            </div>
            <div className="flex items-center pt-2">
                <input type="checkbox" id="lesson-completed-approval" checked={lessonCompletedForApproval} onChange={onLessonCompletedForApprovalChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
                <label htmlFor="lesson-completed-approval" className="ml-2 block text-sm font-medium text-gray-700">Mark as Complete</label>
            </div>
          </div>
          
          {!json.error && (
            <div className="space-y-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Edit Extracted Details (from AI Analysis):</h4>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Lesson Number</label>
                    <input type="text" value={json.lesson_number_if_applicable || ''} onChange={(e) => handleJsonFieldChange(e, 'lesson_number_if_applicable')} className="mt-0.5 border rounded w-full md:w-1/2 px-3 py-1.5 text-sm" placeholder="e.g., 1.2, Unit 5" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Grade Level Suggestion</label>
                    <input type="text" value={json.grade_level_suggestion || ''} onChange={(e) => handleJsonFieldChange(e, 'grade_level_suggestion')} className="mt-0.5 border rounded w-full md:w-1/2 px-3 py-1.5 text-sm" placeholder="e.g., Grade 3" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Learning Objectives (one per line)</label>
                    <textarea value={(json.learning_objectives || []).join('\n')} onChange={(e) => handleJsonArrayFieldChange(e, 'learning_objectives')} rows="3" className="mt-0.5 border rounded w-full px-3 py-1.5 text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Main Content/Summary</label>
                    <textarea value={json.main_content_summary_or_extract || ''} onChange={(e) => handleJsonFieldChange(e, 'main_content_summary_or_extract')} rows="4" className="mt-0.5 border rounded w-full px-3 py-1.5 text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Tasks/Questions (one per line)</label>
                    <textarea value={(json.tasks_or_questions || []).join('\n')} onChange={(e) => handleJsonArrayFieldChange(e, 'tasks_or_questions')} rows="4" className="mt-0.5 border rounded w-full px-3 py-1.5 text-sm" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Est. Completion Time (minutes)</label>
                        <input type="number" value={json.estimated_completion_time_minutes || ''} onChange={(e) => handleJsonFieldChange(e, 'estimated_completion_time_minutes')} className="mt-0.5 border rounded w-full px-3 py-1.5 text-sm" placeholder="e.g., 30" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-0.5">Page Count/Length</label>
                        <input type="text" value={json.page_count_or_length_indicator || ''} onChange={(e) => handleJsonFieldChange(e, 'page_count_or_length_indicator')} className="mt-0.5 border rounded w-full px-3 py-1.5 text-sm" placeholder="e.g., 3 pages, short" />
                    </div>
                </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Subtopics (comma separated)</label>
                    <input type="text" value={(json.subject_keywords_or_subtopics || []).join(', ')} 
                           onChange={(e) => onUpdateLessonJsonField('subject_keywords_or_subtopics', e.target.value.split(',').map(s=>s.trim()).filter(s=>s))} 
                           className="mt-0.5 border rounded w-full px-3 py-1.5 text-sm" placeholder="e.g., algebra, history" />
                </div>
            </div>
          )}
          
          <button onClick={onApprove} className="w-full px-5 py-2.5 rounded-xl bg-black text-white font-medium hover:bg-gray-900 transition"
            disabled={savingLesson || !lessonTitleForApproval || !lessonContentTypeForApproval || (json && json.error) }>
            {savingLesson ? 'Saving...' : 'Approve & Save Material'}
          </button>
        </div>
      )}
    </div>
  );
}