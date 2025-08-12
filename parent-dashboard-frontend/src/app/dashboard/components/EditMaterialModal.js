// app/dashboard/components/EditMaterialModal.js
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Button from '../../../components/ui/Button';
import MaterialAnalysisView from './MaterialAnalysisView';
import api from '../../../utils/api';
import {
  SparklesIcon,
  DocumentTextIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

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
  subjectId, // New prop to get custom categories for this subject
}) {
  const [activeTab, setActiveTab] = useState('analysis');
  const [customCategories, setCustomCategories] = useState([]);

  // Fetch custom categories when modal opens
  const fetchCustomCategories = useCallback(async () => {
    if (!subjectId) return;
    try {
      const response = await api.get(`/custom-categories/${subjectId}`);
      setCustomCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching custom categories:', error);
    }
  }, [subjectId]);

  useEffect(() => {
    if (editingLesson && subjectId) {
      fetchCustomCategories();
    }
  }, [editingLesson, subjectId, fetchCustomCategories]);

  // Create merged content types (standard + custom categories)
  const allContentTypes = useMemo(() => {
    const merged = [...appContentTypes];

    // Add custom categories with unique identifier
    customCategories.forEach(category => {
      merged.push(`custom_${category.id}`);
    });

    return merged;
  }, [appContentTypes, customCategories]);

  // Format content type names for display
  const formatContentTypeName = (contentType) => {
    if (contentType.startsWith('custom_')) {
      const categoryId = parseInt(contentType.replace('custom_', ''));
      const category = customCategories.find(cat => cat.id === categoryId);
      return category ? category.category_name : contentType;
    }
    return contentType.charAt(0).toUpperCase() + contentType.slice(1).replace(/_/g, ' ');
  };

  // Parse lesson JSON for analysis view
  const analysisData = useMemo(() => {
    if (!editForm?.lesson_json_string) return {};
    try {
      return JSON.parse(editForm.lesson_json_string || '{}');
    } catch {
      return {};
    }
  }, [editForm?.lesson_json_string]);

  // Check if material has rich AI analysis
  const hasRichAnalysis = useMemo(() => {
    const data = analysisData;
    return !!(
      data.learning_objectives?.length > 0 ||
      data.problems_with_context?.length > 0 ||
      data.tasks_or_questions?.length > 0 ||
      data.Objective?.length > 0 ||
      data.main_content_summary_or_extract
    );
  }, [analysisData]);

  if (!editingLesson || !editForm) return null;

  // Handle AI analysis data changes
  const handleAnalysisChange = (fieldName, newValue) => {
    try {
      const currentJson = { ...analysisData };
      currentJson[fieldName] = newValue;
      onFormChange({
        target: {
          name: 'lesson_json_string',
          value: JSON.stringify(currentJson, null, 2)
        }
      });

      // Also update the title field if title was changed
      if (fieldName === 'title') {
        onFormChange({ target: { name: 'title', value: newValue } });
      }
    } catch (error) {
      console.error('Error updating analysis data:', error);
    }
  };

  const handleJsonFieldChangeInModal = (e, fieldName) => {
    try {
      const currentJson = JSON.parse(editForm.lesson_json_string || '{}');
      currentJson[fieldName] = e.target.value;
      onFormChange({ target: { name: 'lesson_json_string', value: JSON.stringify(currentJson, null, 2) } });
    } catch (error) { }
  };

  const handleJsonArrayFieldChangeInModal = (e, fieldName) => {
    try {
      const newArray = e.target.value.split('\n').map(item => item.trim()).filter(Boolean);
      const currentJson = JSON.parse(editForm.lesson_json_string || '{}');
      currentJson[fieldName] = newArray;
      onFormChange({ target: { name: 'lesson_json_string', value: JSON.stringify(currentJson, null, 2) } });
    } catch (error) { }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-4 border-b">
          <div className="flex items-center">
            <h2 className="text-2xl font-bold mr-4">Edit Material</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {editingLesson.title}
            </span>
          </div>
          <button
            className="text-gray-400 hover:text-black text-3xl p-1"
            onClick={onClose}
            title="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {hasRichAnalysis && (
              <button
                onClick={() => setActiveTab('analysis')}
                className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'analysis'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                AI Analysis
              </button>
            )}
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'details'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Details & Settings
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden p-6">
          {activeTab === 'analysis' && hasRichAnalysis ? (
            /* AI Analysis Tab */
            <div className="h-full overflow-y-auto">
              <MaterialAnalysisView
                analysisData={analysisData}
                isEditable={true}
                onDataChange={handleAnalysisChange}
                className="bg-white border-0 p-0"
              />
            </div>
          ) : (
            /* Details Tab */
            <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="h-full overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
                  <input
                    type="text"
                    name="title"
                    id="edit-title"
                    value={editForm.title || ''}
                    onChange={onFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-content_type" className="block text-sm font-medium text-gray-700 mb-1">Content Type*</label>
                  <select
                    name="content_type"
                    id="edit-content_type"
                    value={editForm.content_type || ''}
                    onChange={onFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Content Type</option>
                    {/* Standard content types */}
                    {appContentTypes.map((type) => (
                      <option key={type} value={type}>
                        {formatContentTypeName(type)}
                      </option>
                    ))}
                    {/* Custom categories */}
                    {customCategories.length > 0 && (
                      <optgroup label="Custom Categories">
                        {customCategories.map((category) => (
                          <option
                            key={`custom_${category.id}`}
                            value={`custom_${category.id}`}
                            className="text-purple-600"
                          >
                            📝 {category.category_name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-due_date" className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    id="edit-due_date"
                    value={editForm.due_date || ''}
                    onChange={onFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit-lesson_id" className="block text-sm font-medium text-gray-700 mb-1">Lesson Container*</label>
                  <select
                    name="lesson_id"
                    id="edit-lesson_id"
                    value={editForm.lesson_id || ''}
                    onChange={onFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Lesson Container</option>
                    {lessonContainersForSubject.map((container) => (
                      <option key={container.id} value={container.id}>
                        {container.unitName ? `${container.unitName} - ${container.title}` : container.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grading Section */}
              {(appGradableContentTypes.includes(editForm.content_type) || editForm.content_type?.startsWith('custom_')) && (
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    📊 Grading & Assessment
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-grade_value" className="block text-sm font-medium text-gray-600 mb-1">Current Grade</label>
                      <input
                        type="text"
                        name="grade_value"
                        id="edit-grade_value"
                        value={editForm.grade_value || ''}
                        onChange={onFormChange}
                        placeholder="e.g., A, 95, 8.5"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-grade_max_value" className="block text-sm font-medium text-gray-600 mb-1">Max Score</label>
                      <input
                        type="text"
                        name="grade_max_value"
                        id="edit-grade_max_value"
                        value={editForm.grade_max_value || ''}
                        onChange={onFormChange}
                        placeholder="e.g., 100, 10"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="edit-grading_notes" className="block text-sm font-medium text-gray-600 mb-1">Grading Notes</label>
                    <textarea
                      name="grading_notes"
                      id="edit-grading_notes"
                      value={editForm.grading_notes || ''}
                      onChange={onFormChange}
                      rows="3"
                      placeholder="Notes about performance, areas for improvement, etc."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Completion Status */}
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">✅ Completion Status</h3>
                    <p className="text-sm text-gray-600 mt-1">Mark this material as completed</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="completed_at"
                      id="edit-completed_toggle"
                      checked={!!editForm.completed_at}
                      onChange={e => onFormChange({
                        target: {
                          name: 'completed_at',
                          value: e.target.checked ? new Date().toISOString() : null
                        }
                      })}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${!!editForm.completed_at ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  </label>
                </div>
              </div>

              {/* Advanced - Raw Data */}
              <details className="border border-gray-200 rounded-lg">
                <summary className="cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-medium">🔧 Advanced: Raw JSON Data</span>
                </summary>
                <div className="p-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">
                    Direct edit of the material&apos;s JSON data. Be careful when modifying this.
                  </p>
                  <textarea
                    name="lesson_json_string"
                    value={editForm.lesson_json_string || ''}
                    onChange={onFormChange}
                    rows="6"
                    className="w-full border border-gray-300 rounded-lg p-3 font-mono text-xs bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="JSON data will appear here..."
                  />
                </div>
              </details>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 pt-4 border-t bg-gray-50 rounded-b-xl">
          <div className="text-sm text-gray-500">
            {hasRichAnalysis ? (
              <span className="flex items-center">
                <SparklesIcon className="h-4 w-4 mr-1 text-blue-500" />
                AI-enhanced material
              </span>
            ) : (
              'Standard material'
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isSaving}
              onClick={onSave}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
