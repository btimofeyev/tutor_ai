// parent-dashboard-frontend/src/hooks/useMaterialManagement.js
import { useState, useCallback } from 'react';
import api from '../utils/api';
import { APP_CONTENT_TYPES } from '../utils/dashboardConstants';

export function useMaterialManagement(refreshChildData, invalidateChildCache) {
  const [addLessonSubject, setAddLessonSubject] = useState("");
  const [addLessonFile, setAddLessonFile] = useState(null);
  const [addLessonUserContentType, setAddLessonUserContentType] = useState(APP_CONTENT_TYPES[0]);
  const [lessonJsonForApproval, setLessonJsonForApproval] = useState(null);
  const [lessonTitleForApproval, setLessonTitleForApproval] = useState("");
  const [lessonContentTypeForApproval, setLessonContentTypeForApproval] = useState(APP_CONTENT_TYPES[0]);
  const [lessonMaxPointsForApproval, setLessonMaxPointsForApproval] = useState("");
  const [lessonDueDateForApproval, setLessonDueDateForApproval] = useState("");
  const [lessonCompletedForApproval, setLessonCompletedForApproval] = useState(false);
  const [selectedLessonContainer, setSelectedLessonContainer] = useState("");
  const [editingLesson, setEditingLesson] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleLessonUpload = useCallback(async (formData) => {
    setUploading(true);
    try {
      const response = await api.post('/materials/upload', formData);
      setLessonJsonForApproval(response.data?.lesson_json || null);
      setLessonTitleForApproval(response.data?.lesson_json?.title || "");
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Upload failed" };
    } finally {
      setUploading(false);
    }
  }, []);

  const handleManualMaterialCreation = useCallback(async (materialData) => {
    setSavingLesson(true);
    try {
      const response = await api.post('/materials/create-manual', materialData);
      if (response.data.success) {
        setAddLessonSubject("");
        setSelectedLessonContainer("");
        if (refreshChildData) await refreshChildData();
        return { success: true, message: 'Material added successfully!', material: response.data.material };
      } else {
        return { success: false, error: 'Failed to create material' };
      }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Failed to create material" };
    } finally {
      setSavingLesson(false);
    }
  }, [refreshChildData]);

  const handleSaveLesson = useCallback(async (childId) => {
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
      setLessonJsonForApproval(null);
      setLessonTitleForApproval("");
      setLessonContentTypeForApproval(APP_CONTENT_TYPES[0]);
      setLessonMaxPointsForApproval("");
      setLessonDueDateForApproval("");
      setLessonCompletedForApproval(false);
      setAddLessonFile(null);
      setAddLessonSubject("");
      setSelectedLessonContainer("");
      if (invalidateChildCache && childId) invalidateChildCache(childId);
      if (refreshChildData) await refreshChildData(true);
      return { success: true, message: 'Material created successfully.' };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Failed to save lesson" };
    } finally {
      setSavingLesson(false);
    }
  }, [lessonJsonForApproval, selectedLessonContainer, lessonTitleForApproval, lessonContentTypeForApproval, lessonMaxPointsForApproval, lessonDueDateForApproval, lessonCompletedForApproval, refreshChildData, invalidateChildCache]);

  const updateLessonApprovalField = useCallback((fieldName, value) => {
    setLessonJsonForApproval((prevJson) => ({ ...(prevJson || {}), [fieldName]: value }));
  }, []);

  const startEditingLesson = useCallback((lesson) => {
    setEditingLesson(lesson);
    setEditForm({
      id: lesson.id,
      child_subject_id: lesson.child_subject_id,
      lesson_id: lesson.lesson_id,
      title: lesson.title || "",
      content_type: lesson.content_type || APP_CONTENT_TYPES[0],
      grade_value: lesson.grade_value ?? "",
      grade_max_value: lesson.grade_max_value ?? "",
      grading_notes: lesson.grading_notes || "",
      completed_at: lesson.completed_at,
      due_date: lesson.due_date ? new Date(lesson.due_date).toISOString().split('T')[0] : "",
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
        ...editForm,
        grade_value: editForm.grade_value === '' ? null : editForm.grade_value,
        grade_max_value: editForm.grade_max_value === '' ? null : editForm.grade_max_value,
        lesson_json: lesson_json_parsed 
      };
      delete payload.lesson_json_string;


      await api.put(`/materials/${editingLesson.id}`, payload);
      setEditingLesson(null);
      setEditForm({});
      if (refreshChildData) await refreshChildData();
      return { success: true, message: 'Changes saved successfully!' };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Failed to update lesson" };
    } finally {
      setIsSavingEdit(false);
    }
  }, [editingLesson, editForm, refreshChildData]);

  const toggleLessonCompletion = useCallback(async (materialId, isComplete, gradeValue = null) => {
    try {
      const payload = { is_complete: isComplete };
      if (gradeValue !== null) {
        payload.grade = gradeValue;
      }
      
      const response = await api.put(`/materials/${materialId}/toggle-complete`, payload);
      
      // Force refresh to get updated data
      if (refreshChildData) await refreshChildData(true);
      if (invalidateChildCache) {
        // Get child ID from the response or use a workaround
        // For now, we'll invalidate cache in the dashboard
      }
      
      return { success: true, message: response.data.message || 'Status updated.', syncedEntries: response.data.synced_schedule_entries || 0 };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Failed to toggle completion" };
    }
  }, [refreshChildData, invalidateChildCache]);

  const deleteLesson = useCallback(async (materialId) => {
    try {
      await api.delete(`/materials/${materialId}`);
      if (refreshChildData) await refreshChildData();
      return { success: true, message: 'Material deleted.' };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Failed to delete lesson" };
    }
  }, [refreshChildData]);
  
  const createNewUnit = useCallback(async (name, childSubjectId) => {
    if (!name.trim() || !childSubjectId) return { success: false, error: 'Name and subject are required.' };
    try {
        const { data } = await api.post('/units', { name, child_subject_id: childSubjectId });
        if(refreshChildData) await refreshChildData();
        return { success: true, data, message: "Unit created!" };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || "Could not create unit." };
    }
  }, [refreshChildData]);
  
  const createNewLessonContainer = useCallback(async (title, unitId) => {
    if (!title.trim() || !unitId) return { success: false, error: 'Title and unit are required.' };
    try {
        const { data } = await api.post('/lesson-containers', { title, unit_id: unitId });
        if(refreshChildData) await refreshChildData();
        return { success: true, data, message: "Lesson group created!" };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || "Could not create lesson group." };
    }
  }, [refreshChildData]);
  
  const updateUnit = useCallback(async (unit) => {
    try {
        const { data } = await api.put(`/units/${unit.id}`, { name: unit.name, description: unit.description });
        if(refreshChildData) await refreshChildData();
        return { success: true, data, message: "Unit updated." };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || "Could not update unit." };
    }
  }, [refreshChildData]);
  
  const deleteUnit = useCallback(async (unitId) => {
    try {
        await api.delete(`/units/${unitId}`);
        if(refreshChildData) await refreshChildData();
        return { success: true, message: "Unit deleted." };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || "Could not delete unit." };
    }
  }, [refreshChildData]);

  return {
    addLessonSubject, setAddLessonSubject,
    addLessonFile, setAddLessonFile,
    addLessonUserContentType, setAddLessonUserContentType,
    lessonJsonForApproval, setLessonJsonForApproval,
    lessonTitleForApproval, setLessonTitleForApproval,
    lessonContentTypeForApproval, setLessonContentTypeForApproval,
    lessonMaxPointsForApproval, setLessonMaxPointsForApproval,
    lessonDueDateForApproval, setLessonDueDateForApproval,
    lessonCompletedForApproval, setLessonCompletedForApproval,
    selectedLessonContainer, setSelectedLessonContainer,
    editingLesson, editForm, setEditForm,
    uploading, savingLesson, isSavingEdit,
    handleLessonUpload, handleManualMaterialCreation, handleSaveLesson,
    updateLessonApprovalField, startEditingLesson, cancelEditingLesson,
    saveEditedLesson, toggleLessonCompletion, deleteLesson,
    createNewUnit, createNewLessonContainer, updateUnit, deleteUnit,
  };
}
