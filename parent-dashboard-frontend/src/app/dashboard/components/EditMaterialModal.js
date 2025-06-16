// app/dashboard/components/EditMaterialModal.js
'use client';
import React from 'react';

export default function EditMaterialModal({
  editingLesson,
  editForm,
  onFormChange,
  onSave,
  onClose,
  isSaving,
  unitsForSubject = [],
  lessonContainersForSubject = [],
  appContentTypes = [],
  appGradableContentTypes = [],
}) {
  if (!editingLesson || !editForm) return null;

  const handleJsonFieldChangeInModal = (e, fieldName) => {
    try {
      const currentJson = JSON.parse(editForm.lesson_json_string || '{}');
      currentJson[fieldName] = e.target.value;
      onFormChange({ target: { name: 'lesson_json_string', value: JSON.stringify(currentJson, null, 2) } });
    } catch (error) { console.error("Error updating field in JSON string", error); }
  };

  const handleJsonArrayFieldChangeInModal = (e, fieldName) => {
    try {
      const newArray = e.target.value.split('\n').map(item => item.trim()).filter(Boolean);
      const currentJson = JSON.parse(editForm.lesson_json_string || '{}');
      currentJson[fieldName] = newArray;
      onFormChange({ target: { name: 'lesson_json_string', value: JSON.stringify(currentJson, null, 2) } });
    } catch (error) { console.error("Error updating array field in JSON string", error); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 pb-3 border-b">
          <h2 className="text-2xl font-bold">Edit Material</h2>
          <button className="text-gray-400 hover:text-black text-3xl" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="flex-grow overflow-y-auto pr-2 space-y-4">
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
            <input type="text" name="title" id="edit-title" value={editForm.title || ''} onChange={onFormChange} className="w-full border rounded px-3 py-2 text-sm" required />
          </div>

          <div>
            <label htmlFor="edit-content_type" className="block text-sm font-medium text-gray-700 mb-1">Content Type*</label>
            <select name="content_type" id="edit-content_type" value={editForm.content_type || ''} onChange={onFormChange} className="w-full border rounded px-3 py-2 text-sm h-[38px]" required>
              {appContentTypes.map(type => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="edit-lesson_id" className="block text-sm font-medium text-gray-700 mb-1">Lesson Group</label>
            <select name="lesson_id" id="edit-lesson_id" value={editForm.lesson_id || ''} onChange={onFormChange} className="w-full border rounded px-3 py-2 text-sm h-[38px]">
              <option value="">-- No Group --</option>
              {lessonContainersForSubject.map(lc => <option key={lc.id} value={lc.id}>{lc.title}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="edit-due_date" className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" name="due_date" id="edit-due_date" value={editForm.due_date || ''} onChange={onFormChange} className="w-full border rounded px-3 py-2 text-sm" />
          </div>

          {appGradableContentTypes.includes(editForm.content_type) && (
            <div className="p-3 border rounded-md bg-gray-50 space-y-3">
              <h3 className="text-md font-semibold text-gray-800">Grading</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-grade_value" className="block text-xs font-medium text-gray-600 mb-0.5">Grade</label>
                  <input type="text" name="grade_value" id="edit-grade_value" value={editForm.grade_value || ''} onChange={onFormChange} placeholder="e.g., A, 95" className="w-full border rounded px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label htmlFor="edit-grade_max_value" className="block text-xs font-medium text-gray-600 mb-0.5">Max Score</label>
                  <input type="text" name="grade_max_value" id="edit-grade_max_value" value={editForm.grade_max_value || ''} onChange={onFormChange} placeholder="e.g., 100" className="w-full border rounded px-3 py-1.5 text-sm" />
                </div>
              </div>
              <div>
                <label htmlFor="edit-grading_notes" className="block text-xs font-medium text-gray-600 mb-0.5">Notes</label>
                <textarea name="grading_notes" id="edit-grading_notes" value={editForm.grading_notes || ''} onChange={onFormChange} rows="2" className="w-full border rounded px-3 py-1.5 text-sm"></textarea>
              </div>
            </div>
          )}

          <div className="p-3 border rounded-md">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-completed_toggle" className="text-sm font-medium">Mark as Complete</label>
              <input type="checkbox" name="completed_at" id="edit-completed_toggle" checked={!!editForm.completed_at} onChange={e => onFormChange({ target: { name: 'completed_at', value: e.target.checked ? new Date().toISOString() : null } })} className="h-5 w-5 text-blue-600 rounded" />
            </div>
          </div>
          
          <details className="text-sm border rounded-md">
            <summary className="cursor-pointer p-3 bg-gray-50">View Raw Data</summary>
            <div className="p-3">
              <textarea name="lesson_json_string" value={editForm.lesson_json_string || ''} onChange={onFormChange} rows="4" className="w-full border rounded p-2 font-mono text-xs bg-gray-100"></textarea>
            </div>
          </details>
        
          <div className="flex justify-end gap-3 mt-auto pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
