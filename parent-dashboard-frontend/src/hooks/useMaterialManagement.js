// parent-dashboard-frontend/src/hooks/useMaterialManagement.js
import { useState, useCallback } from 'react';
import api from '../utils/api';
import { APP_CONTENT_TYPES } from '../utils/dashboardConstants';

export function useMaterialManagement(refreshChildData) {
  // Upload-based material state
  const [addLessonSubject, setAddLessonSubject] = useState("");
  const [addLessonFile, setAddLessonFile] = useState(null);
  const [addLessonUserContentType, setAddLessonUserContentType] = useState(APP_CONTENT_TYPES[0]);
  
  // Lesson approval state (for upload method)
  const [lessonJsonForApproval, setLessonJsonForApproval] = useState(null);
  const [lessonTitleForApproval, setLessonTitleForApproval] = useState("");
  const [lessonContentTypeForApproval, setLessonContentTypeForApproval] = useState(APP_CONTENT_TYPES[0]);
  const [lessonMaxPointsForApproval, setLessonMaxPointsForApproval] = useState("");
  const [lessonDueDateForApproval, setLessonDueDateForApproval] = useState("");
  const [lessonCompletedForApproval, setLessonCompletedForApproval] = useState(false);
  
  // Lesson container selection (shared between both methods)
  const [selectedLessonContainer, setSelectedLessonContainer] = useState("");
  
  // Edit lesson state
  const [editingLesson, setEditingLesson] = useState(null);
  const [editForm, setEditForm] = useState({});
  
  // Loading states
  const [uploading, setUploading] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Upload and process lesson files (existing method)
  const handleLessonUpload = useCallback(async (formData) => {
    setUploading(true);
    try {
      const response = await api.post('/materials/upload', formData);
      setLessonJsonForApproval(response.data?.lesson_json || null);
      setLessonTitleForApproval(response.data?.lesson_json?.title || "");
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Upload error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || "Upload failed" 
      };
    } finally {
      setUploading(false);
    }
  }, []);

  // Create material manually (new method)
  const handleManualMaterialCreation = useCallback(async (materialData) => {
    setSavingLesson(true);
    try {
      const response = await api.post('/materials/create-manual', materialData);
      
      if (response.data.success) {
        // Reset shared form state
        setAddLessonSubject("");
        setSelectedLessonContainer("");
        
        // Refresh data
        if (refreshChildData) {
          await refreshChildData();
        }
        
        return { success: true, material: response.data.material };
      } else {
        return { success: false, error: 'Failed to create material' };
      }
    } catch (error) {
      console.error('Manual material creation error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || "Failed to create material" 
      };
    } finally {
      setSavingLesson(false);
    }
  }, [refreshChildData]);

  // Save approved lesson (existing method)
  const handleSaveLesson = useCallback(async () => {
    if (!lessonJsonForApproval) return { success: false, error: "No lesson data to save" };
    
    setSavingLesson(true);
    try {
      const lessonData = {
        lesson_id: selectedLessonContainer,
        title: lessonTitleForApproval,
        content_type: lessonContentTypeForApproval,
        lesson_json: lessonJsonForApproval,
        grade_max_value: lessonMaxPointsForApproval || null,
        due_date: lessonDueDateForApproval || null,
        completed_at: lessonCompletedForApproval ? new Date().toISOString() : null,
      };

      await api.post('/materials/save', lessonData);
      
      // Reset form
      setLessonJsonForApproval(null);
      setLessonTitleForApproval("");
      setLessonContentTypeForApproval(APP_CONTENT_TYPES[0]);
      setLessonMaxPointsForApproval("");
      setLessonDueDateForApproval("");
      setLessonCompletedForApproval(false);
      setAddLessonFile(null);
      setAddLessonSubject("");
      setSelectedLessonContainer("");
      
      // Refresh data
      if (refreshChildData) {
        await refreshChildData();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Save lesson error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || "Failed to save lesson" 
      };
    } finally {
      setSavingLesson(false);
    }
  }, [
    lessonJsonForApproval,
    selectedLessonContainer,
    lessonTitleForApproval,
    lessonContentTypeForApproval,
    lessonMaxPointsForApproval,
    lessonDueDateForApproval,
    lessonCompletedForApproval,
    refreshChildData
  ]);

  // Update lesson approval field
  const updateLessonApprovalField = useCallback((fieldName, value) => {
    setLessonJsonForApproval((prevJson) => {
      const baseJson = prevJson && typeof prevJson === "object" && !prevJson.error ? prevJson : {};
      return { ...baseJson, [fieldName]: value };
    });
  }, []);

  // Edit lesson functionality (existing)
  const startEditingLesson = useCallback((lesson) => {
    setEditingLesson(lesson);
    setEditForm({
      title: lesson.title || "",
      content_type: lesson.content_type || APP_CONTENT_TYPES[0],
      grade_value: lesson.grade_value === null ? "" : String(lesson.grade_value),
      grade_max_value: lesson.grade_max_value === null ? "" : String(lesson.grade_max_value),
      grading_notes: lesson.grading_notes || "",
      completed_at: lesson.completed_at,
      due_date: lesson.due_date || "",
      lesson_json_string: JSON.stringify(lesson.lesson_json || {}, null, 2),
    });
  }, []);

  const cancelEditingLesson = useCallback(() => {
    setEditingLesson(null);
    setEditForm({});
  }, []);

  const saveEditedLesson = useCallback(async () => {
    if (!editingLesson) return { success: false, error: "No lesson being edited" };

    setIsSavingEdit(true);
    try {
      let lesson_json_parsed;
      try {
        lesson_json_parsed = JSON.parse(editForm.lesson_json_string);
      } catch (e) {
        return { success: false, error: "Invalid JSON in lesson data" };
      }

      const payload = {
        title: editForm.title,
        content_type: editForm.content_type,
        lesson_json: lesson_json_parsed,
        grade_value: editForm.grade_value.trim() === "" ? null : editForm.grade_value,
        grade_max_value: editForm.grade_max_value.trim() === "" ? null : editForm.grade_max_value,
        grading_notes: editForm.grading_notes.trim() === "" ? null : editForm.grading_notes,
        completed_at: editForm.completed_at,
        due_date: editForm.due_date.trim() === "" ? null : editForm.due_date,
      };

      await api.put(`/materials/${editingLesson.id}`, payload);
      
      setEditingLesson(null);
      setEditForm({});
      
      if (refreshChildData) {
        await refreshChildData();
      }
      
      return { success: true };
    } catch (error) {
      console.error('Edit lesson error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || "Failed to update lesson" 
      };
    } finally {
      setIsSavingEdit(false);
    }
  }, [editingLesson, editForm, refreshChildData]);

  // Toggle lesson completion with sync feedback
  const toggleLessonCompletion = useCallback(async (materialId, grade = null) => {
    try {
      const payload = grade !== null ? { grade } : {};
      const response = await api.put(`/materials/${materialId}/toggle-complete`, payload);
      
      // Show sync feedback if schedule entries were updated
      if (response.data?.synced_schedule_entries > 0) {
        console.log(`Material completion synced with ${response.data.synced_schedule_entries} schedule entry(s)`);
      }
      
      if (refreshChildData) {
        await refreshChildData();
      }
      
      return { 
        success: true, 
        syncedEntries: response.data?.synced_schedule_entries || 0,
        message: response.data?.message 
      };
    } catch (error) {
      console.error('Toggle completion error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || "Failed to toggle completion" 
      };
    }
  }, [refreshChildData]);

  // Delete lesson
  const deleteLesson = useCallback(async (materialId) => {
    try {
      await api.delete(`/materials/${materialId}`);
      if (refreshChildData) {
        await refreshChildData();
      }
      return { success: true };
    } catch (error) {
      console.error('Delete lesson error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || "Failed to delete lesson" 
      };
    }
  }, [refreshChildData]);

  return {
    // Upload form state
    addLessonSubject,
    setAddLessonSubject,
    addLessonFile,
    setAddLessonFile,
    addLessonUserContentType,
    setAddLessonUserContentType,
    
    // Approval state (for upload method)
    lessonJsonForApproval,
    setLessonJsonForApproval,
    lessonTitleForApproval,
    setLessonTitleForApproval,
    lessonContentTypeForApproval,
    setLessonContentTypeForApproval,
    lessonMaxPointsForApproval,
    setLessonMaxPointsForApproval,
    lessonDueDateForApproval,
    setLessonDueDateForApproval,
    lessonCompletedForApproval,
    setLessonCompletedForApproval,
    
    // Lesson container selection (shared)
    selectedLessonContainer,
    setSelectedLessonContainer,
    
    // Edit state
    editingLesson,
    editForm,
    setEditForm,
    
    // Loading states
    uploading,
    savingLesson,
    isSavingEdit,
    
    // Actions
    handleLessonUpload,
    handleManualMaterialCreation,
    handleSaveLesson,
    updateLessonApprovalField,
    startEditingLesson,
    cancelEditingLesson,
    saveEditedLesson,
    toggleLessonCompletion,
    deleteLesson,
  };
}

// Usage in dashboard:
// Replace useLessonManagement with useMaterialManagement and update handlers accordingly