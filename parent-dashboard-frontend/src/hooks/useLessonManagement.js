// Custom hook for managing lesson operations
import { useState, useCallback } from 'react';
import api from '../utils/api';
import { APP_CONTENT_TYPES } from '../utils/dashboardConstants';
import { validateLessonData } from '../utils/dashboardHelpers';

export function useLessonManagement(refreshChildData) {
  // Lesson upload/approval state
  const [addLessonSubject, setAddLessonSubject] = useState("");
  const [addLessonFile, setAddLessonFile] = useState(null);
  const [addLessonUserContentType, setAddLessonUserContentType] = useState(APP_CONTENT_TYPES[0]);
  
  // Lesson approval state
  const [lessonJsonForApproval, setLessonJsonForApproval] = useState(null);
  const [lessonTitleForApproval, setLessonTitleForApproval] = useState("");
  const [lessonContentTypeForApproval, setLessonContentTypeForApproval] = useState(APP_CONTENT_TYPES[0]);
  const [lessonMaxPointsForApproval, setLessonMaxPointsForApproval] = useState("");
  const [lessonDueDateForApproval, setLessonDueDateForApproval] = useState("");
  const [lessonCompletedForApproval, setLessonCompletedForApproval] = useState(false);
  
  // Lesson container selection
  const [selectedLessonContainer, setSelectedLessonContainer] = useState("");
  
  // Edit lesson state
  const [editingLesson, setEditingLesson] = useState(null);
  const [editForm, setEditForm] = useState({});
  
  // Loading states
  const [uploading, setUploading] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Upload and process lesson files
  const handleLessonUpload = useCallback(async (formData) => {
    setUploading(true);
    try {
      const response = await api.post('/materials/upload', formData);
      setLessonJsonForApproval(response.data?.extracted_json || null);
      setLessonTitleForApproval(response.data?.extracted_json?.title || "");
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || "Upload failed" 
      };
    } finally {
      setUploading(false);
    }
  }, []);

  // Save approved lesson
  const handleSaveLesson = useCallback(async () => {
    if (!lessonJsonForApproval) return { success: false, error: "No lesson data to save" };
    
    const lessonData = {
      ...lessonJsonForApproval,
      title: lessonTitleForApproval,
      content_type: lessonContentTypeForApproval,
      grade_max_value: lessonMaxPointsForApproval || null,
      due_date: lessonDueDateForApproval || null,
      completed_at: lessonCompletedForApproval ? new Date().toISOString() : null,
    };

    const validation = validateLessonData(lessonData);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    setSavingLesson(true);
    try {
      await api.post('/materials/save', lessonData);
      
      // Reset form
      setLessonJsonForApproval(null);
      setLessonTitleForApproval("");
      setLessonContentTypeForApproval(APP_CONTENT_TYPES[0]);
      setLessonMaxPointsForApproval("");
      setLessonDueDateForApproval("");
      setLessonCompletedForApproval(false);
      setAddLessonFile(null);
      
      // Refresh data
      if (refreshChildData) {
        await refreshChildData();
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || "Failed to save lesson" 
      };
    } finally {
      setSavingLesson(false);
    }
  }, [
    lessonJsonForApproval,
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

  // Edit lesson
  const startEditingLesson = useCallback((lesson) => {
    setEditingLesson(lesson);
    setEditForm({
      title: lesson.title || "",
      content_type: lesson.content_type || APP_CONTENT_TYPES[0],
      max_points: lesson.grade_max_value || "",
      due_date: lesson.due_date || "",
      grade: lesson.grade_value || "",
    });
  }, []);

  const cancelEditingLesson = useCallback(() => {
    setEditingLesson(null);
    setEditForm({});
  }, []);

  const saveEditedLesson = useCallback(async () => {
    if (!editingLesson) return { success: false, error: "No lesson being edited" };

    const validation = validateLessonData(editForm);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    setIsSavingEdit(true);
    try {
      await api.put(`/materials/${editingLesson.material_id}`, editForm);
      
      setEditingLesson(null);
      setEditForm({});
      
      if (refreshChildData) {
        await refreshChildData();
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || "Failed to update lesson" 
      };
    } finally {
      setIsSavingEdit(false);
    }
  }, [editingLesson, editForm, refreshChildData]);

  // Toggle lesson completion
  const toggleLessonCompletion = useCallback(async (materialId) => {
    try {
      await api.put(`/materials/${materialId}/toggle-complete`);
      if (refreshChildData) {
        await refreshChildData();
      }
      return { success: true };
    } catch (error) {
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
    
    // Approval state
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
    
    // Lesson container selection
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
    handleSaveLesson,
    updateLessonApprovalField,
    startEditingLesson,
    cancelEditingLesson,
    saveEditedLesson,
    toggleLessonCompletion,
    deleteLesson,
  };
}