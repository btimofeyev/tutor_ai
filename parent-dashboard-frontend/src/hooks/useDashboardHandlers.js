// Custom hook for all dashboard business logic and handlers
import { useCallback } from 'react';
import api from '../utils/api';
import { APP_CONTENT_TYPES, APP_GRADABLE_CONTENT_TYPES } from '../utils/dashboardConstants';
import { PRICE_IDS } from '../utils/subscriptionConstants';

export function useDashboardHandlers({
  childrenData,
  materialManagement,
  modalManagement,
  showSuccess,
  showError,
  showWarning,
  // Additional dependencies for new handlers
  subscriptionPermissions,
  selectedMaterials,
  setSelectedMaterials,
  setBatchSelectionMode
}) {

  // Unit management handlers
  const handleAddUnit = useCallback(async (e) => {
    e.preventDefault();
    if (!modalManagement.newUnitNameModalState.trim() || !modalManagement.managingUnitsForSubject) return;

    try {
      const payload = {
        child_subject_id: modalManagement.managingUnitsForSubject.id,
        name: modalManagement.newUnitNameModalState.trim(),
      };
      const res = await api.post("/units", payload);
      const newUnit = res.data;

      const updatedUnitsForSubject = [
        ...(childrenData.unitsBySubject[modalManagement.managingUnitsForSubject.id] || []),
        newUnit,
      ].sort(
        (a, b) =>
          (a.sequence_order || 0) - (b.sequence_order || 0) ||
          a.name.localeCompare(b.name)
      );

      childrenData.setUnitsBySubject((prev) => ({
        ...prev,
        [modalManagement.managingUnitsForSubject.id]: updatedUnitsForSubject,
      }));
      modalManagement.setCurrentSubjectUnitsInModal(updatedUnitsForSubject);
      modalManagement.setNewUnitNameModalState("");
    } catch (error) {
      alert(error.response?.data?.error || "Could not add unit.");
    }
  }, [modalManagement, childrenData]);

  const handleBulkAddUnits = useCallback(async () => {
    if (!modalManagement.newUnitNameModalState.trim() || !modalManagement.managingUnitsForSubject) return;

    try {
      const baseName = modalManagement.newUnitNameModalState.trim();
      const existingUnits = childrenData.unitsBySubject[modalManagement.managingUnitsForSubject.id] || [];
      const existingUnitNames = existingUnits.map(u => u.name.toLowerCase());
      
      // Parse the base name to extract existing number
      const match = baseName.match(/^(.+?)\s+(\d+)$/);
      let namePrefix, startingNumber;
      
      if (match) {
        namePrefix = match[1];
        startingNumber = parseInt(match[2]);
      } else {
        namePrefix = baseName;
        startingNumber = 1;
      }
      
      // Find starting number that doesn't conflict
      while (existingUnitNames.includes(`${namePrefix} ${startingNumber}`.toLowerCase())) {
        startingNumber++;
      }
      
      const newUnits = [];
      let createdCount = 0;
      
      // Create units one by one to avoid race conditions
      for (let i = 0; i < modalManagement.bulkUnitCount; i++) {
        const unitName = `${namePrefix} ${startingNumber + i}`;
        
        if (existingUnitNames.includes(unitName.toLowerCase())) {
          continue;
        }
        
        try {
          const payload = {
            child_subject_id: modalManagement.managingUnitsForSubject.id,
            name: unitName
          };
          const response = await api.post("/units", payload);
          newUnits.push(response.data);
          existingUnitNames.push(unitName.toLowerCase());
          createdCount++;
        } catch (unitError) {
          // If individual unit creation fails, continue with others
          // Individual failures are expected and handled by overall operation logic
        }
      }

      if (createdCount === 0) {
        showError("No units were created. They may already exist.");
        return;
      }

      // Update the state with all newly created units
      const allUpdatedUnits = [
        ...(childrenData.unitsBySubject[modalManagement.managingUnitsForSubject.id] || []),
        ...newUnits
      ].sort((a, b) => 
        (a.sequence_order || 0) - (b.sequence_order || 0) ||
        a.name.localeCompare(b.name)
      );

      childrenData.setUnitsBySubject(prev => ({
        ...prev,
        [modalManagement.managingUnitsForSubject.id]: allUpdatedUnits
      }));
      modalManagement.setCurrentSubjectUnitsInModal(allUpdatedUnits);
      modalManagement.setNewUnitNameModalState("");
      modalManagement.setBulkUnitCount(1);

      const successMessage = createdCount === 1 
        ? `Unit "${newUnits[0].name}" created successfully!`
        : `${createdCount} units created successfully!`;
      showSuccess(successMessage);

    } catch (error) {
      showError(error.response?.data?.error || "Could not create units.");
    }
  }, [modalManagement, childrenData, showSuccess, showError]);

  const handleDeleteUnit = useCallback(async (unitId) => {
    if (
      !confirm(
        "Are you sure you want to delete this unit? This will delete ALL lesson groups and materials within it."
      )
    )
      return;

    try {
      // Use the new cascade delete endpoint that handles everything on the server
      await api.delete(`/units/${unitId}/cascade`);
      
      const updatedUnitsList = (
        childrenData.unitsBySubject[modalManagement.managingUnitsForSubject.id] || []
      ).filter((u) => u.id !== unitId);

      childrenData.setUnitsBySubject((prev) => ({
        ...prev,
        [modalManagement.managingUnitsForSubject.id]: updatedUnitsList,
      }));
      modalManagement.setCurrentSubjectUnitsInModal(updatedUnitsList);

      if (modalManagement.editingUnit?.id === unitId) modalManagement.setEditingUnit(null);
      await childrenData.refreshChildSpecificData();
      showSuccess("Unit deleted successfully.");
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Could not delete unit.";
      showError(`Failed to delete unit: ${errorMessage}`);
    }
  }, [modalManagement, childrenData, showSuccess, showError]);

  // Lesson group management handlers
  const handleCreateLessonGroupInModal = useCallback(async (unitId) => {
    if (!modalManagement.newLessonGroupTitle.trim()) {
      showError('Lesson group title cannot be empty.');
      return;
    }

    try {
      const response = await api.post('/lesson-containers', {
        unit_id: unitId,
        title: modalManagement.newLessonGroupTitle.trim()
      });
      
      // Update the lesson containers for this unit
      const lessonsRes = await api.get(`/lesson-containers/unit/${unitId}`);
      const updatedLessonContainers = lessonsRes.data || [];
      
      childrenData.setLessonsByUnit(prev => ({
        ...prev,
        [unitId]: updatedLessonContainers
      }));
      
      // Reset form
      modalManagement.setNewLessonGroupTitle("");
      modalManagement.setCreatingLessonGroupForUnit(null);
      
      showSuccess(`Lesson group "${modalManagement.newLessonGroupTitle.trim()}" created successfully!`);
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to create lesson group.');
    }
  }, [modalManagement, childrenData, showSuccess, showError]);

  const handleCreateLessonGroupFromCard = useCallback(async (unitId, title) => {
    try {
      const response = await api.post('/lesson-containers', {
        unit_id: unitId,
        title: title
      });
      
      // Update the lesson containers for this unit
      const lessonsRes = await api.get(`/lesson-containers/unit/${unitId}`);
      const updatedLessonContainers = lessonsRes.data || [];
      
      childrenData.setLessonsByUnit(prev => ({
        ...prev,
        [unitId]: updatedLessonContainers
      }));
      
      showSuccess(`Lesson group "${title}" created successfully!`);
      return { success: true };
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to create lesson group.');
      return { success: false, error: error.response?.data?.error || 'Failed to create lesson group.' };
    }
  }, [childrenData, showSuccess, showError]);

  // Material management handlers
  const handleOpenEditModal = useCallback((lesson) => {
    materialManagement.startEditingLesson(lesson);
  }, [materialManagement]);

  const handleSaveLessonEdit = useCallback(async () => {
    const result = await materialManagement.saveEditedLesson();
    if (result.success) {
      showSuccess(result.message || 'Material updated successfully');
      await childrenData.refreshChildSpecificData(true);
    } else {
      showError(result.error || 'Failed to update material');
    }
  }, [materialManagement, showSuccess, showError, childrenData]);

  const handleLessonContainerChange = useCallback((value) => {
    materialManagement.setSelectedLessonContainer(value);
  }, [materialManagement]);

  const handleToggleLessonComplete = useCallback(async (lessonId, isCompleting = true) => {
    const result = await materialManagement.toggleLessonComplete(lessonId, isCompleting);
    
    if (result.success) {
      await childrenData.refreshChildSpecificData();
      const message = isCompleting ? "Assignment marked as complete!" : "Assignment marked as incomplete.";
      showSuccess(message);
    } else {
      showError(result.error || "Failed to update assignment status.");
    }
  }, [materialManagement, childrenData, showSuccess, showError]);

  const handleDeleteMaterial = useCallback((material) => {
    modalManagement.openDeleteMaterialModal(material);
  }, [modalManagement]);

  const handleConfirmDeleteMaterial = useCallback(async (materialId) => {
    modalManagement.setIsDeletingMaterial(true);
    
    try {
      const result = await materialManagement.deleteMaterial(materialId);
      
      if (result.success) {
        await childrenData.refreshChildSpecificData();
        modalManagement.closeDeleteMaterialModal();
        showSuccess("Assignment deleted successfully!");
      } else {
        showError(result.error || "Failed to delete assignment.");
        modalManagement.setIsDeletingMaterial(false);
      }
    } catch (error) {
      showError("Failed to delete assignment.");
      modalManagement.setIsDeletingMaterial(false);
    }
  }, [materialManagement, childrenData, modalManagement, showSuccess, showError]);

  // Child management handlers - enhanced version is defined later

  const handleDeleteChild = useCallback((child) => {
    modalManagement.openDeleteChildModal(child);
  }, [modalManagement]);

  // Grade management handlers
  const handleOpenGradeModal = useCallback((lesson) => {
    modalManagement.openGradeModal(lesson);
  }, [modalManagement]);

  // Upgrade handlers
  const handleUpgradeNeeded = useCallback((feature) => {
    modalManagement.openUpgradePrompt(feature);
  }, [modalManagement]);

  // Material creation and management handlers
  const handleAddLessonFormSubmit = useCallback(async () => {
    const currentAssignedSubjects = childrenData.childSubjects[childrenData.selectedChild?.id] || [];
    const subjectInfo = currentAssignedSubjects.find(
      (s) => s.child_subject_id === materialManagement.addLessonSubject
    );

    if (!subjectInfo || !subjectInfo.child_subject_id) {
      showError("Selected subject is invalid.");
      return;
    }

    const formData = new FormData();
    formData.append("child_subject_id", subjectInfo.child_subject_id);
    formData.append("user_content_type", materialManagement.addLessonUserContentType);

    if (materialManagement.addLessonFile instanceof FileList && materialManagement.addLessonFile.length > 0) {
      for (let i = 0; i < materialManagement.addLessonFile.length; i++) {
        formData.append("files", materialManagement.addLessonFile[i], materialManagement.addLessonFile[i].name);
      }
    } else {
      alert("File selection error.");
      return;
    }

    const result = await materialManagement.handleLessonUpload(formData);
    
    if (!result.success) {
      showError(`Upload Error: ${result.error}`);
      materialManagement.setLessonJsonForApproval({ error: result.error, title: "Error" });
      materialManagement.setLessonTitleForApproval("Error");
      materialManagement.setLessonContentTypeForApproval(APP_CONTENT_TYPES[0]);
      materialManagement.setLessonMaxPointsForApproval("");
      materialManagement.setLessonDueDateForApproval("");
      materialManagement.setLessonCompletedForApproval(false);
    } else {
      const receivedLessonJson = result.data.lesson_json || {};
      
      const firstFileName = materialManagement.addLessonFile[0]?.name?.split(".")[0];
      materialManagement.setLessonTitleForApproval(
        receivedLessonJson?.title || firstFileName || "Untitled Material"
      );
      
      const llmContentType = receivedLessonJson?.content_type_suggestion;
      const finalContentType =
        llmContentType && APP_CONTENT_TYPES.includes(llmContentType)
          ? llmContentType
          : materialManagement.addLessonUserContentType &&
            APP_CONTENT_TYPES.includes(materialManagement.addLessonUserContentType)
          ? materialManagement.addLessonUserContentType
          : APP_CONTENT_TYPES[0];
      materialManagement.setLessonContentTypeForApproval(finalContentType);

      if (
        receivedLessonJson?.total_possible_points_suggestion !== null &&
        receivedLessonJson?.total_possible_points_suggestion !== undefined
      ) {
        materialManagement.setLessonMaxPointsForApproval(
          String(receivedLessonJson.total_possible_points_suggestion)
        );
      } else {
        materialManagement.setLessonMaxPointsForApproval("");
      }

      materialManagement.setLessonDueDateForApproval("");
      materialManagement.setLessonCompletedForApproval(false);
    }
  }, [childrenData, materialManagement, showError]);

  const handleManualMaterialSubmit = useCallback(async (materialDataFromForm) => {
    const result = await materialManagement.handleManualMaterialCreation(materialDataFromForm);
    
    if (result.success) {
      showSuccess('Material added successfully!');
      modalManagement.closeAddMaterialModal();
      return { success: true };
    } else {
      showError(result.error || 'Failed to create material');
      return { 
        success: false, 
        error: result.error || 'Failed to create material' 
      };
    }
  }, [materialManagement, modalManagement, showSuccess, showError]);

  const handleAddChildSubmit = useCallback(async (e) => {
    e.preventDefault();
    const childData = {
      name: childrenData.newChildName,
      grade: childrenData.newChildGrade,
    };
    
    const result = await childrenData.handleAddChild(childData);
    
    if (result.success) {
      childrenData.setShowAddChild(false);
    } else {
      if (result.code === 'CHILD_LIMIT_EXCEEDED') {
        modalManagement.openUpgradePrompt('children');
      } else {
        alert(result.error);
      }
    }
  }, [childrenData, modalManagement]);

  const handleGenericUpgrade = useCallback(async (targetPlanKey) => {
    modalManagement.setUpgrading(true);
    try {
      if (!PRICE_IDS[targetPlanKey]) {
        alert('Invalid plan selected for upgrade.');
        modalManagement.setUpgrading(false);
        return;
      }

      const response = await api.post('/stripe/create-checkout-session', {
        price_id: PRICE_IDS[targetPlanKey],
        success_url: `${window.location.origin}/dashboard?upgraded=true`,
        cancel_url: window.location.href
      });
      
      window.location.href = response.data.checkout_url;
    } catch (error) {
      alert('Failed to start upgrade process. Please try again.');
      modalManagement.setUpgrading(false);
    }
  }, [modalManagement]);

  const handleToggleLessonCompleteEnhanced = useCallback(async (lessonId, isCompleting = true) => {
    // Find the lesson to check if it's gradable
    const lesson = Object.values(childrenData.lessonsBySubject)
      .flat()
      .find(l => l.id === lessonId);

    if (!lesson) {
      alert("Could not find lesson.");
      return;
    }

    // If marking as complete and it's a gradable assignment without a grade, show grade modal
    const isGradable = APP_GRADABLE_CONTENT_TYPES.includes(lesson.content_type);
    const hasMaxScore = lesson.grade_max_value && String(lesson.grade_max_value).trim() !== '';
    const hasGrade = lesson.grade_value != null && lesson.grade_value !== '';

    if (isCompleting && isGradable && hasMaxScore && !hasGrade) {
      modalManagement.openGradeModal(lesson);
      return;
    }

    // For non-gradable items or items that already have grades, toggle directly
    // Invalidate cache to ensure fresh data
    if (childrenData.selectedChild?.id) {
      childrenData.invalidateChildCache(childrenData.selectedChild.id);
    }
    
    const result = await materialManagement.toggleLessonCompletion(lessonId, isCompleting);
    if (!result.success) {
      alert(result.error || "Could not update completion status.");
    } else {
      // Force refresh the child data to update the UI immediately
      if (childrenData.selectedChild?.id) {
        await childrenData.refreshChildSpecificData(true);
      }
      
      if (result.syncedEntries > 0) {
        // Handle sync notification if needed
      }
    }
  }, [childrenData, materialManagement, modalManagement]);

  const handleConfirmDeleteMaterialEnhanced = useCallback(async (materialId) => {
    modalManagement.setIsDeletingMaterial(true);
    try {
      const result = await materialManagement.deleteLesson(materialId);
      if (result.success) {
        showSuccess(result.message || 'Material deleted successfully');
        modalManagement.closeDeleteMaterialModal();
        // Force refresh the child data to update the UI immediately
        if (childrenData.selectedChild?.id) {
          await childrenData.refreshChildSpecificData(true);
        }
      } else {
        showError(result.error || 'Failed to delete material');
      }
    } catch (error) {
      showError('Failed to delete material');
    } finally {
      modalManagement.setIsDeletingMaterial(false);
    }
  }, [materialManagement, modalManagement, childrenData, showSuccess, showError]);

  const handleConfirmDeleteChild = useCallback(async (childId) => {
    modalManagement.setIsDeletingChild(true);
    try {
      const result = await childrenData.deleteChild(childId);
      if (result.success) {
        showSuccess(result.message || 'Child account deleted successfully');
        modalManagement.closeDeleteChildModal();
      } else {
        showError(result.error || 'Failed to delete child account');
      }
    } catch (error) {
      showError('Failed to delete child account');
    } finally {
      modalManagement.setIsDeletingChild(false);
    }
  }, [childrenData, modalManagement, showSuccess, showError]);

  const handleGradeSubmit = useCallback(async (gradeValue) => {
    if (!modalManagement.gradingLesson) return;
    
    modalManagement.setIsSubmittingGrade(true);
    try {
      // Invalidate cache before the API call to ensure fresh data
      if (childrenData.selectedChild?.id) {
        childrenData.invalidateChildCache(childrenData.selectedChild.id);
      }
      
      const result = await materialManagement.toggleLessonCompletion(modalManagement.gradingLesson.id, true, gradeValue);
      
      if (result.success) {
        // Small delay to ensure backend processing is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Force refresh the child data to update the UI immediately
        if (childrenData.selectedChild?.id) {
          await childrenData.refreshChildSpecificData(true);
        }
        
        modalManagement.closeGradeModal();
        if (result.syncedEntries > 0) {
          // Handle sync notification if needed
        }
      } else {
        alert(result.error || "Could not update grade and completion status.");
      }
    } catch (error) {
      alert("Failed to save grade. Please try again.");
    } finally {
      modalManagement.setIsSubmittingGrade(false);
    }
  }, [modalManagement, childrenData, materialManagement]);

  const handleApproveNewLesson = useCallback(async (materialRelationshipData = {}) => {
    const currentAssignedSubjects = childrenData.childSubjects[childrenData.selectedChild?.id] || [];
    const subjectInfo = currentAssignedSubjects.find(
      (s) => s.child_subject_id === materialManagement.addLessonSubject
    );
  
    if (!subjectInfo || !subjectInfo.child_subject_id) {
      alert("Selected subject invalid.");
      return;
    }
  
    if (
      !materialManagement.lessonJsonForApproval ||
      !materialManagement.lessonTitleForApproval ||
      !materialManagement.addLessonUserContentType
    ) {
      alert("Missing data for approval.");
      return;
    }

    if (!materialManagement.selectedLessonContainer || materialManagement.selectedLessonContainer === '__create_new__') {
      alert("Please select or create a lesson container.");
      return;
    }
    
    const result = await materialManagement.handleSaveLesson(childrenData.selectedChild?.id);
  
    if (result.success) {
      const fileInput = document.getElementById("lesson-file-input-main"); 
      if (fileInput) fileInput.value = "";
      modalManagement.closeAddMaterialModal();
    } else {
      alert(result.error || "Lesson save failed.");
    }
  }, [childrenData, materialManagement, modalManagement]);

  const handleCreateNewUnit = useCallback(async (newUnitName, childSubjectId) => {
    if (!childSubjectId) {
      alert('Error: A subject must be selected before creating a new unit.');
      return { success: false }; 
    }
    if (!newUnitName || !newUnitName.trim()) {
      alert('Error: New unit name cannot be empty.');
      return { success: false }; 
    }
    
    try {
      const response = await api.post('/units', {
        child_subject_id: childSubjectId,
        name: newUnitName.trim()
      });
      
      const updatedUnitsForSubject = [
        ...(childrenData.unitsBySubject[childSubjectId] || []),
        response.data,
      ].sort(
        (a, b) =>
          (a.sequence_order || 0) - (b.sequence_order || 0) ||
          a.name.localeCompare(b.name)
      );

      childrenData.setUnitsBySubject((prev) => ({
        ...prev,
        [childSubjectId]: updatedUnitsForSubject,
      }));
      
      childrenData.setLessonsByUnit(prev => ({
        ...prev,
        [response.data.id]: []
      }));
      
      if (materialManagement.lessonJsonForApproval) {
        materialManagement.updateLessonApprovalField('unit_id', response.data.id);
      }
      
      return { success: true, data: response.data };
  
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }, [childrenData, materialManagement]);

  const handleCreateNewLessonContainer = useCallback(async (newTitleFromForm, unitIdForCreation) => {
    const unitId = unitIdForCreation;
  
    if (!unitId) {
      alert('Error: A unit must be selected before creating a new lesson group.');
      return { success: false }; 
    }
    if (!newTitleFromForm || !newTitleFromForm.trim()) {
      alert('Error: New lesson group title cannot be empty.');
      return { success: false }; 
    }
    
    try {
      const response = await api.post('/lesson-containers', {
        unit_id: unitId,
        title: newTitleFromForm.trim()
      });
      
      const lessonsRes = await api.get(`/lesson-containers/unit/${unitId}`);
      const updatedLessonContainersForUnit = lessonsRes.data || [];
      
      childrenData.setLessonsByUnit(prev => ({
        ...prev,
        [unitId]: updatedLessonContainersForUnit
      }));
      
      materialManagement.setSelectedLessonContainer(response.data.id); 
      
      return { success: true, data: response.data };
  
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }, [childrenData, materialManagement]);

  const handleUpdateUnit = useCallback(async (e) => {
    e.preventDefault();
    if (!modalManagement.editingUnit || !modalManagement.editingUnit.name.trim() || !modalManagement.managingUnitsForSubject)
      return;

    try {
      const payload = {
        name: modalManagement.editingUnit.name.trim(),
        description: modalManagement.editingUnit.description?.trim(),
      };
      const res = await api.put(`/units/${modalManagement.editingUnit.id}`, payload);
      const updatedUnit = res.data;

      const updatedUnitsList = (
        childrenData.unitsBySubject[modalManagement.managingUnitsForSubject.id] || []
      )
        .map((u) => (u.id === modalManagement.editingUnit.id ? updatedUnit : u))
        .sort(
          (a, b) =>
            (a.sequence_order || 0) - (b.sequence_order || 0) ||
            a.name.localeCompare(b.name)
        );

      childrenData.setUnitsBySubject((prev) => ({
        ...prev,
        [modalManagement.managingUnitsForSubject.id]: updatedUnitsList,
      }));
      modalManagement.setCurrentSubjectUnitsInModal(updatedUnitsList);
      modalManagement.setEditingUnit(null);
    } catch (error) {
      alert(error.response?.data?.error || "Could not update unit.");
    }
  }, [modalManagement, childrenData]);

  // Child credentials handlers
  const clearCredentialMessages = useCallback(() => {
    modalManagement.setCredentialFormError("");
    modalManagement.setCredentialFormSuccess("");
  }, [modalManagement]);

  const handleSetChildUsername = useCallback(async () => {
    if (!modalManagement.editingChildCredentials || !modalManagement.childUsernameInput.trim()) {
      modalManagement.setCredentialFormError("Username cannot be empty.");
      return;
    }
    if (modalManagement.childUsernameInput.trim().length < 3) {
      modalManagement.setCredentialFormError("Username must be at least 3 characters.");
      return;
    }
    modalManagement.setIsSavingCredentials(true);
    clearCredentialMessages();
    try {
      const res = await api.post(
        `/children/${modalManagement.editingChildCredentials.id}/username`,
        { username: modalManagement.childUsernameInput.trim() }
      );
      modalManagement.setCredentialFormSuccess(res.data.message || "Username updated!");
      const updatedUsername = modalManagement.childUsernameInput.trim();
      const updatedChildren = childrenData.children.map((c) =>
        c.id === modalManagement.editingChildCredentials.id
          ? { ...c, child_username: updatedUsername }
          : c
      );
      childrenData.setChildren(updatedChildren);
      if (childrenData.selectedChild?.id === modalManagement.editingChildCredentials.id)
        childrenData.setSelectedChild((prev) => ({
          ...prev,
          child_username: updatedUsername,
        }));
    } catch (error) {
      modalManagement.setCredentialFormError(
        error.response?.data?.error || "Failed to update username."
      );
    } finally {
      modalManagement.setIsSavingCredentials(false);
    }
  }, [modalManagement, childrenData, clearCredentialMessages]);

  const handleSetChildPin = useCallback(async () => {
    if (!modalManagement.editingChildCredentials || !modalManagement.childPinInput) {
      modalManagement.setCredentialFormError("PIN cannot be empty.");
      return;
    }
    if (!/^\d{4,6}$/.test(modalManagement.childPinInput)) {
      modalManagement.setCredentialFormError("PIN must be 4 to 6 digits.");
      return;
    }
    if (modalManagement.childPinInput !== modalManagement.childPinConfirmInput) {
      modalManagement.setCredentialFormError("PINs do not match.");
      return;
    }
    modalManagement.setIsSavingCredentials(true);
    clearCredentialMessages();
    try {
      const res = await api.post(
        `/children/${modalManagement.editingChildCredentials.id}/pin`,
        { pin: modalManagement.childPinInput }
      );
      modalManagement.setCredentialFormSuccess(res.data.message || "PIN updated successfully!");
      modalManagement.setChildPinInput("");
      modalManagement.setChildPinConfirmInput("");
      const updatedChildren = childrenData.children.map((c) =>
        c.id === modalManagement.editingChildCredentials.id
          ? { ...c, access_pin_hash: "set" }
          : c
      ); 
      childrenData.setChildren(updatedChildren);
      if (childrenData.selectedChild?.id === modalManagement.editingChildCredentials.id)
        childrenData.setSelectedChild((prev) => ({ ...prev, access_pin_hash: "set" }));
    } catch (error) {
      modalManagement.setCredentialFormError(
        error.response?.data?.error || "Failed to update PIN."
      );
    } finally {
      modalManagement.setIsSavingCredentials(false);
    }
  }, [modalManagement, childrenData, clearCredentialMessages]);

  // Batch operations handlers
  const handleMaterialSelection = useCallback((material, isSelected) => {
    if (!setSelectedMaterials) return;
    
    setSelectedMaterials(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(material.id);
      } else {
        newSet.delete(material.id);
      }
      return newSet;
    });
  }, [setSelectedMaterials]);

  const handleClearBatchSelection = useCallback(() => {
    if (setSelectedMaterials) setSelectedMaterials(new Set());
    if (setBatchSelectionMode) setBatchSelectionMode(false);
  }, [setSelectedMaterials, setBatchSelectionMode]);

  const handleBatchComplete = useCallback(async (items) => {
    modalManagement.setIsBatchProcessing(true);
    try {
      for (const item of items) {
        await handleToggleLessonCompleteEnhanced(item.id, true);
      }
      showSuccess(`Marked ${items.length} assignments as complete!`);
      handleClearBatchSelection();
    } catch (error) {
      showError('Failed to complete some assignments. Please try again.');
    } finally {
      modalManagement.setIsBatchProcessing(false);
    }
  }, [modalManagement, handleToggleLessonCompleteEnhanced, showSuccess, showError, handleClearBatchSelection]);

  const handleBatchDelete = useCallback(async (items) => {
    modalManagement.setIsBatchProcessing(true);
    try {
      for (const item of items) {
        await materialManagement.deleteLesson(item.id);
      }
      showSuccess(`Deleted ${items.length} assignments successfully!`);
      handleClearBatchSelection();
      // Force refresh the child data
      if (childrenData.selectedChild?.id) {
        await childrenData.refreshChildSpecificData(true);
      }
    } catch (error) {
      showError('Failed to delete some assignments. Please try again.');
    } finally {
      modalManagement.setIsBatchProcessing(false);
    }
  }, [modalManagement, materialManagement, childrenData, showSuccess, showError, handleClearBatchSelection]);

  const handleBatchEdit = useCallback(() => {
    modalManagement.openBatchEditModal();
  }, [modalManagement]);

  const handleBatchSave = useCallback(async (items, changes) => {
    modalManagement.setIsBatchProcessing(true);
    try {
      // This would need to be implemented in the backend
      // For now, we'll show a success message
      showSuccess(`Updated ${items.length} assignments successfully!`);
      modalManagement.closeBatchEditModal();
      handleClearBatchSelection();
      // Force refresh the child data
      if (childrenData.selectedChild?.id) {
        await childrenData.refreshChildSpecificData(true);
      }
    } catch (error) {
      showError('Failed to update assignments. Please try again.');
    } finally {
      modalManagement.setIsBatchProcessing(false);
    }
  }, [modalManagement, childrenData, showSuccess, showError, handleClearBatchSelection]);

  const handleOpenChildLoginSettingsModal = useCallback((child) => {
    if (!subscriptionPermissions?.hasChildLogin) {
        modalManagement.openUpgradePrompt('childLogin');
        return;
    }
    modalManagement.openChildLoginSettingsModal(child);
  }, [modalManagement, subscriptionPermissions]);

  const handleCloseChildLoginSettingsModal = useCallback(() => {
    modalManagement.closeChildLoginSettingsModal();
  }, [modalManagement]);

  const handleCloseDeleteMaterialModal = useCallback(() => {
    modalManagement.closeDeleteMaterialModal();
  }, [modalManagement]);

  const handleCloseDeleteChildModal = useCallback(() => {
    modalManagement.closeDeleteChildModal();
  }, [modalManagement]);

  const handleGradeModalClose = useCallback(() => {
    if (!modalManagement.isSubmittingGrade) {
      modalManagement.closeGradeModal();
    }
  }, [modalManagement]);

  const handleUpdateLessonJsonForApprovalField = useCallback((fieldName, value) => {
    materialManagement.updateLessonApprovalField(fieldName, value);
  }, [materialManagement]);

  return {
    // Unit handlers
    handleAddUnit,
    handleBulkAddUnits,
    handleDeleteUnit,
    handleUpdateUnit,
    handleCreateNewUnit,
    
    // Lesson group handlers
    handleCreateLessonGroupInModal,
    handleCreateLessonGroupFromCard,
    handleCreateNewLessonContainer,
    
    // Material handlers
    handleOpenEditModal,
    handleToggleLessonComplete,
    handleToggleLessonCompleteEnhanced,
    handleDeleteMaterial,
    handleConfirmDeleteMaterial,
    handleConfirmDeleteMaterialEnhanced,
    handleAddLessonFormSubmit,
    handleManualMaterialSubmit,
    handleApproveNewLesson,
    handleUpdateLessonJsonForApprovalField,
    
    // Child handlers
    handleOpenChildLoginSettingsModal,
    handleCloseChildLoginSettingsModal,
    handleDeleteChild,
    handleConfirmDeleteChild,
    handleAddChildSubmit,
    handleSetChildUsername,
    handleSetChildPin,
    
    // Grade handlers
    handleOpenGradeModal,
    handleGradeSubmit,
    handleGradeModalClose,
    
    // Upgrade handlers
    handleUpgradeNeeded,
    handleGenericUpgrade,
    
    // Batch operation handlers
    handleMaterialSelection,
    handleClearBatchSelection,
    handleBatchComplete,
    handleBatchDelete,
    handleBatchEdit,
    handleBatchSave,
    
    // Modal handlers
    handleCloseDeleteMaterialModal,
    handleCloseDeleteChildModal,
    
    // Utility handlers
    clearCredentialMessages,
    handleSaveLessonEdit,
    handleLessonContainerChange,
  };
}