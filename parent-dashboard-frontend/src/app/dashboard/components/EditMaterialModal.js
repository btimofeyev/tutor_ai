// app/dashboard/components/EditMaterialModal.js
'use client';
import React from 'react';

// Assuming APP_CONTENT_TYPES and APP_GRADABLE_CONTENT_TYPES are passed as props
// or imported from a central constants file.
// For this example, we'll assume they are passed as props.

export default function EditMaterialModal({
  editingLesson,
  editForm,
  onFormChange,
  onSave,
  onClose,
  isSaving,
  unitsForSubject = [], // Units for the current lesson's subject
  appContentTypes = [],
  appGradableContentTypes = [],
}) {
  if (!editingLesson || !editForm) return null;

  // Helper for array fields, assuming editForm stores them as newline-separated strings for textareas
  const handleJsonArrayFieldChangeInModal = (e, fieldName) => {
    const newArray = e.target.value.split('\n').map(item => item.trim()).filter(item => item);
    // This needs to update the lesson_json_string in editForm, or a new way to handle structured lesson_json in editForm
    // For simplicity here, we'll assume a more advanced onFormChange or direct manipulation of lesson_json_string
    // For now, this specific helper might not be directly usable if lesson_json_string is the sole source of truth for JSON.
    // A better approach would be to have structured fields in editForm for lesson_json parts.
    
    // If editForm has structured fields for lesson_json:
    // onFormChange({ target: { name: fieldName, value: newArray, type: 'json_array_field' } });
    
    // If only editing lesson_json_string, this is more complex:
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
        currentJson[fieldName] = e.target.value; // Or Number(e.target.value) if appropriate
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
            <input type="text" name="title" id="edit-title" value={editForm.title || ''} onChange={onFormChange} className="w-full border rounded px-3 py-2 text-sm" required/>
          </div>
          <div>
            <label htmlFor="edit-content_type" className="block text-sm font-medium text-gray-700 mb-1">Content Type*</label>
            <select name="content_type" id="edit-content_type" value={editForm.content_type || appContentTypes[0]} onChange={onFormChange} className="w-full border rounded px-3 py-2 text-sm h-[38px]" required>
                {appContentTypes.map(type => ( <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')}</option> ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-unit_id" className="block text-sm font-medium text-gray-700 mb-1">Unit (Optional)</label>
            <select name="unit_id" id="edit-unit_id" value={editForm.unit_id || ''} onChange={onFormChange} className="w-full border rounded px-3 py-2 text-sm h-[38px]" disabled={unitsForSubject.length === 0}>
                <option value="">-- Select a Unit --</option>
                {unitsForSubject.map(unit => ( <option key={unit.id} value={unit.id}>{unit.name}</option> ))}
            </select>
            {unitsForSubject.length === 0 && <p className="text-xs text-gray-400 italic mt-0.5">No units available for this subject.</p>}
          </div>
          <div>
            <label htmlFor="edit-due_date" className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" name="due_date" id="edit-due_date" value={editForm.due_date || ''} onChange={onFormChange} className="w-full border rounded px-3 py-2 text-sm"/>
          </div>

          {appGradableContentTypes.includes(editForm.content_type) && (
            <div className="p-3 border rounded-md bg-gray-50 space-y-3">
              <h3 className="text-md font-semibold text-gray-800">Grading</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="edit-grade_value" className="block text-xs font-medium text-gray-600 mb-0.5">Grade</label>
                    <input type="text" name="grade_value" id="edit-grade_value" value={editForm.grade_value || ''} onChange={onFormChange} placeholder="e.g., A, 95" className="w-full border rounded px-3 py-1.5 text-sm"/>
                </div>
                <div>
                    <label htmlFor="edit-grade_max_value" className="block text-xs font-medium text-gray-600 mb-0.5">Max Score</label>
                    <input type="text" name="grade_max_value" id="edit-grade_max_value" value={editForm.grade_max_value || ''} onChange={onFormChange} placeholder="e.g., 100" className="w-full border rounded px-3 py-1.5 text-sm"/>
                </div>
              </div>
              <div>
                <label htmlFor="edit-grading_notes" className="block text-xs font-medium text-gray-600 mb-0.5">Grading Notes</label>
                <textarea name="grading_notes" id="edit-grading_notes" value={editForm.grading_notes || ''} onChange={onFormChange} rows="2" className="w-full border rounded px-3 py-1.5 text-sm"></textarea>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-3 border rounded-md">
            <label htmlFor="edit-completed_toggle" className="text-sm font-medium text-gray-700">Mark as Complete</label>
            <input type="checkbox" name="completed_toggle" id="edit-completed_toggle" checked={!!editForm.completed_at} onChange={onFormChange} className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
          </div>
          
          {/* Simplified display of some lesson_json fields, not directly editable here without more complex state in parent */}
          {/* For more direct editing, parent would need to manage structured lesson_json in editForm */}
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-black">View AI Extracted Details (Read-only)</summary>
            <div className="mt-2 p-3 bg-gray-50 rounded text-xs space-y-1 border">
                <p><strong>Lesson Number:</strong> {JSON.parse(editForm.lesson_json_string || '{}').lesson_number_if_applicable || 'N/A'}</p>
                <p><strong>Objectives:</strong> {(JSON.parse(editForm.lesson_json_string || '{}').learning_objectives || []).join(', ') || 'N/A'}</p>
                {/* Add more fields as needed */}
            </div>
          </details>

          <div>
            <label htmlFor="edit-lesson_json_string" className="block text-sm font-medium text-gray-700 mb-1">Advanced: Raw Extracted Data (JSON)</label>
            <textarea name="lesson_json_string" id="edit-lesson_json_string" value={editForm.lesson_json_string || ''} onChange={onFormChange} rows="6" className="w-full border rounded px-3 py-2 font-mono text-xs"></textarea>
          </div>
        
            <div className="flex gap-3 mt-auto pt-4 border-t"> {/* Ensure buttons are at the bottom */}
            <button type="submit" className="bg-black hover:bg-gray-800 text-white rounded px-5 py-2 font-medium text-sm" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="bg-gray-100 hover:bg-gray-200 rounded px-4 py-2 text-sm text-gray-700"
                onClick={() => { navigator.clipboard.writeText(JSON.stringify(editingLesson, null, 2)); alert('Original JSON copied!'); }}>
                Copy Original JSON
            </button>
            <button type="button" className="ml-auto text-red-500 hover:text-red-700 font-medium text-sm" onClick={onClose}>
                Cancel
            </button>
            </div>
        </form>
      </div>
    </div>
  );
}