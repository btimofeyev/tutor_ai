// app/dashboard/components/EditMaterialModal.js
'use client';
import React from 'react';

export default function EditMaterialModal({
  editingLesson, // This is actually a material now
  editForm,
  onFormChange,
  onSave,
  onClose,
  isSaving,
  unitsForSubject = [],
  lessonContainersForSubject = [], // NEW: All lesson containers for this subject
  appContentTypes = [],
  appGradableContentTypes = [],
}) {
  if (!editingLesson || !editForm) return null;

  // Helper for array fields
  const handleJsonArrayFieldChangeInModal = (e, fieldName) => {
    const newArray = e.target.value.split('\n').map(item => item.trim()).filter(item => item);
    try {
      const currentJson = JSON.parse(editForm.lesson_json_string || '{}');
      currentJson[fieldName] = newArray;
      onFormChange({ target: { name: 'lesson_json_string', value: JSON.stringify(currentJson, null, 2) } });
    } catch (error) {
      console.error("Error updating array field in JSON string", error);
    }
  };
  
  const handleJsonFieldChangeInModal = (e, fieldName) => {
    try {
      const currentJson = JSON.parse(editForm.lesson_json_string || '{}');
      currentJson[fieldName] = e.target.value;
      onFormChange({ target: { name: 'lesson_json_string', value: JSON.stringify(currentJson, null, 2) } });
    } catch (error) {
      console.error("Error updating field in JSON string", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border p-6 sm:p-8 w-full max-w-lg relative max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-3 border-b">
          <h2 className="text-2xl font-bold">Edit Material Details</h2>
          <button className="text-gray-400 hover:text-black text-3xl" onClick={onClose} aria-label="Close">×</button>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="flex-grow overflow-y-auto pr-2 space-y-4">
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
            <input 
              type="text" 
              name="title" 
              id="edit-title" 
              value={editForm.title || ''} 
              onChange={onFormChange} 
              className="w-full border rounded px-3 py-2 text-sm" 
              required
            />
          </div>

          <div>
            <label htmlFor="edit-content_type" className="block text-sm font-medium text-gray-700 mb-1">Content Type*</label>
            <select 
              name="content_type" 
              id="edit-content_type" 
              value={editForm.content_type || appContentTypes[0]} 
              onChange={onFormChange} 
              className="w-full border rounded px-3 py-2 text-sm h-[38px]" 
              required
            >
              {appContentTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson/Assignment Group Selection */}
          <div>
            <label htmlFor="edit-lesson_id" className="block text-sm font-medium text-gray-700 mb-1">Lesson/Assignment Group</label>
            <select 
              name="lesson_id" 
              id="edit-lesson_id" 
              value={editForm.lesson_id || ''} 
              onChange={onFormChange} 
              className="w-full border rounded px-3 py-2 text-sm h-[38px]"
              disabled={lessonContainersForSubject.length === 0}
            >
              <option value="">-- Select a lesson group --</option>
              {lessonContainersForSubject.map(lesson => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.lesson_number ? `${lesson.lesson_number}: ` : ''}{lesson.title}
                </option>
              ))}
            </select>
            {lessonContainersForSubject.length === 0 && (
              <p className="text-xs text-gray-400 italic mt-0.5">
                No lesson groups available for this subject.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="edit-due_date" className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input 
              type="date" 
              name="due_date" 
              id="edit-due_date" 
              value={editForm.due_date || ''} 
              onChange={onFormChange} 
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          {/* Grading Section - Only show for gradable content types */}
          {appGradableContentTypes.includes(editForm.content_type) && (
            <div className="p-3 border rounded-md bg-gray-50 space-y-3">
              <h3 className="text-md font-semibold text-gray-800">Grading</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-grade_value" className="block text-xs font-medium text-gray-600 mb-0.5">Grade</label>
                  <input 
                    type="text" 
                    name="grade_value" 
                    id="edit-grade_value" 
                    value={editForm.grade_value || ''} 
                    onChange={onFormChange} 
                    placeholder="e.g., A, 95" 
                    className="w-full border rounded px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="edit-grade_max_value" className="block text-xs font-medium text-gray-600 mb-0.5">Max Score</label>
                  <input 
                    type="text" 
                    name="grade_max_value" 
                    id="edit-grade_max_value" 
                    value={editForm.grade_max_value || ''} 
                    onChange={onFormChange} 
                    placeholder="e.g., 100" 
                    className="w-full border rounded px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="edit-grading_notes" className="block text-xs font-medium text-gray-600 mb-0.5">Grading Notes</label>
                <textarea 
                  name="grading_notes" 
                  id="edit-grading_notes" 
                  value={editForm.grading_notes || ''} 
                  onChange={onFormChange} 
                  rows="2" 
                  className="w-full border rounded px-3 py-1.5 text-sm"
                ></textarea>
              </div>
            </div>
          )}

          {/* Completion Status */}
          <div className="p-3 border rounded-md">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-completed_toggle" className="text-sm font-medium text-gray-700">
                {appGradableContentTypes.includes(editForm.content_type) && editForm.grade_max_value && !editForm.grade_value ? 
                  'Mark as Complete (add grade first)' : 'Mark as Complete'}
              </label>
              <input 
                type="checkbox" 
                name="completed_toggle" 
                id="edit-completed_toggle" 
                checked={!!editForm.completed_at} 
                onChange={onFormChange} 
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            {appGradableContentTypes.includes(editForm.content_type) && editForm.grade_max_value && !editForm.grade_value && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ This {editForm.content_type} has a max score but no grade. Consider adding a grade before marking complete.
              </p>
            )}
          </div>
          
          {/* Additional Details from AI Analysis */}
          <details className="text-sm border rounded-md">
            <summary className="cursor-pointer p-3 bg-gray-50 text-gray-700 hover:bg-gray-100">View Additional Details</summary>
            <div className="p-3 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-600">Lesson Number:</span>
                  <p className="text-gray-800">{JSON.parse(editForm.lesson_json_string || '{}').lesson_number_if_applicable || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Grade Level:</span>
                  <p className="text-gray-800">{JSON.parse(editForm.lesson_json_string || '{}').grade_level_suggestion || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Est. Time:</span>
                  <p className="text-gray-800">{JSON.parse(editForm.lesson_json_string || '{}').estimated_completion_time_minutes ? `${JSON.parse(editForm.lesson_json_string || '{}').estimated_completion_time_minutes} minutes` : 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Length:</span>
                  <p className="text-gray-800">{JSON.parse(editForm.lesson_json_string || '{}').page_count_or_length_indicator || 'Not specified'}</p>
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Learning Objectives:</span>
                <p className="text-gray-800">{(JSON.parse(editForm.lesson_json_string || '{}').learning_objectives || []).join(', ') || 'None specified'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Description:</span>
                <p className="text-gray-800">{JSON.parse(editForm.lesson_json_string || '{}').main_content_summary_or_extract || 'No description available'}</p>
              </div>
            </div>
          </details>

          {/* Advanced JSON Editing - Hidden by default */}
          <details className="text-sm">
            <summary className="cursor-pointer text-red-600 hover:text-red-800 text-xs">⚠️ Advanced: Edit Raw Data (Developers Only)</summary>
            <div className="mt-2">
              <textarea 
                name="lesson_json_string" 
                id="edit-lesson_json_string" 
                value={editForm.lesson_json_string || ''} 
                onChange={onFormChange} 
                rows="4" 
                className="w-full border rounded px-3 py-2 font-mono text-xs bg-gray-50"
                placeholder="Raw JSON data..."
              ></textarea>
              <p className="text-xs text-red-500 mt-1">⚠️ Only edit if you know what you&apos;re doing. Invalid JSON will cause errors.</p>
            </div>
          </details>
        
          {/* Action Buttons */}
          <div className="flex gap-3 mt-auto pt-4 border-t">
            <button 
              type="submit" 
              className="bg-black hover:bg-gray-800 text-white rounded px-5 py-2 font-medium text-sm" 
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            
            <button 
              type="button" 
              className="bg-gray-100 hover:bg-gray-200 rounded px-4 py-2 text-sm text-gray-700"
              onClick={() => { 
                navigator.clipboard.writeText(JSON.stringify(editingLesson, null, 2)); 
                alert('Original JSON copied!'); 
              }}
            >
              Copy Original JSON
            </button>
            
            <button 
              type="button" 
              className="ml-auto text-red-500 hover:text-red-700 font-medium text-sm" 
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}