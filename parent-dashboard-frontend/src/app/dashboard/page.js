// app/dashboard/page.js
"use client";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import api from "../../utils/api";

// Main subscription hook
import { useSubscription } from "../../hooks/useSubscription";

// Extracted hooks and utilities
import { useChildrenData } from "../../hooks/useChildrenData";
import { useMaterialManagement } from "../../hooks/useMaterialManagement";
import { useFiltersAndSorting } from "../../hooks/useFiltersAndSorting";
import { useToast } from "../../hooks/useToast";
import { PRICE_IDS } from "../../utils/subscriptionConstants";
import { 
  APP_CONTENT_TYPES,
  APP_GRADABLE_CONTENT_TYPES,
  formInputStyles, 
  formLabelStyles 
} from "../../utils/dashboardConstants";

// Shared styles and utilities
import { 
  modalBackdropStyles, 
  modalContainerStyles,
  modalCloseButtonStyles,
  formInputStyles as sharedFormInputStyles,
  formLabelStyles as sharedFormLabelStyles
} from "../../utils/dashboardStyles";
import { handleApiError, createSuccessResponse, validatePin, validateUsername } from "../../utils/commonHelpers";

// Components
import StudentSidebar from "./components/StudentSidebar";
import StudentHeader from "./components/StudentHeader";
import SubjectCard from "./components/SubjectCard";
import AddMaterialTabs from "./components/AddMaterialTabs";
import EditMaterialModal from "./components/EditMaterialModal";
import MaterialDeleteModal from "./components/MaterialDeleteModal";
import ChildAccountDeleteModal from "./components/ChildAccountDeleteModal";
import ChildLoginSettingsModal from "./components/ChildLoginSettingsModal";
import GradeInputModal from "./components/GradeInputModal";
import QuickAccessSection from "./components/QuickAccessSection";
import UnitManagementModal from "./components/UnitManagementModal";
import DashboardFilters from "./components/DashboardFilters";
import UpgradePrompt from "../../components/UpgradePrompt";
import Button from "../../components/ui/Button";
import { CurriculumSkeletonLoader } from "../../components/ui/SkeletonLoader";
import { DashboardErrorBoundary, ModalErrorBoundary } from "../../components/ErrorBoundary";

import {
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  ListBulletIcon
} from "@heroicons/react/24/outline";


export default function DashboardPage() {
  const session = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Subscription hook
  const {
    subscription,
    loading: subscriptionLoading,
    refetch: refetchSubscription,
    permissions: subscriptionPermissions,
  } = useSubscription();

  // Custom hooks
  const childrenData = useChildrenData(session);
  const materialManagement = useMaterialManagement(childrenData.refreshChildSpecificData, childrenData.invalidateChildCache);
  const filtersAndSorting = useFiltersAndSorting(
    childrenData.lessonsBySubject, 
    childrenData.gradeWeights, 
    childrenData.childSubjects, 
    childrenData.selectedChild
  );
  const { showSuccess, showError, showWarning } = useToast();
  
  // State for modals
  const [isManageUnitsModalOpen, setIsManageUnitsModalOpen] = useState(false);
  const [managingUnitsForSubject, setManagingUnitsForSubject] = useState(null);
  const [currentSubjectUnitsInModal, setCurrentSubjectUnitsInModal] = useState([]);
  const [newUnitNameModalState, setNewUnitNameModalState] = useState("");
  const [bulkUnitCount, setBulkUnitCount] = useState(1);
  const [editingUnit, setEditingUnit] = useState(null);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  
  // Lesson group management state
  const [expandedUnitsInModal, setExpandedUnitsInModal] = useState({});
  const [creatingLessonGroupForUnit, setCreatingLessonGroupForUnit] = useState(null);
  const [newLessonGroupTitle, setNewLessonGroupTitle] = useState("");

  // Child credentials modal state
  const [isChildLoginSettingsModalOpen, setIsChildLoginSettingsModalOpen] = useState(false);
  const [editingChildCredentials, setEditingChildCredentials] = useState(null);
  const [childUsernameInput, setChildUsernameInput] = useState("");
  const [childPinInput, setChildPinInput] = useState("");
  const [childPinConfirmInput, setChildPinConfirmInput] = useState("");
  const [credentialFormError, setCredentialFormError] = useState("");
  const [credentialFormSuccess, setCredentialFormSuccess] = useState("");
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);

  // Upgrade prompt state
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const [upgrading, setUpgrading] = useState(false);

  // Grade input modal state
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradingLesson, setGradingLesson] = useState(null);
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  // Material delete modal state
  const [showDeleteMaterialModal, setShowDeleteMaterialModal] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

  // Child account delete modal state
  const [showDeleteChildModal, setShowDeleteChildModal] = useState(false);
  const [deletingChild, setDeletingChild] = useState(null);
  const [isDeletingChild, setIsDeletingChild] = useState(false);

  const { assignedSubjectsForCurrentChild } = childrenData;
  const { totalStats } = filtersAndSorting;

  const currentLessonContainersForUnit = useMemo(() => {
    const selectedUnitId = materialManagement.lessonJsonForApproval?.unit_id;
    if (!selectedUnitId) return [];
    return childrenData.lessonsByUnit[selectedUnitId] || [];
  }, [materialManagement.lessonJsonForApproval?.unit_id, childrenData.lessonsByUnit]);

  // Find lesson containers for the editing material
  const editingMaterialLessonContainers = useMemo(() => {
    if (!materialManagement.editingLesson || !materialManagement.editForm) return [];
    
    // Get all lesson containers for the material's subject
    const subjectId = materialManagement.editForm.child_subject_id;
    if (subjectId) {
      const allLessonContainers = [];
      const subjectUnits = childrenData.unitsBySubject[subjectId] || [];
      
      // Collect all lesson containers from all units in this subject
      for (const unit of subjectUnits) {
        const unitLessonContainers = childrenData.lessonsByUnit[unit.id] || [];
        // Add unit info to each lesson container for better display
        const containersWithUnitInfo = unitLessonContainers.map(lc => ({
          ...lc,
          unitName: unit.name,
          unitId: unit.id
        }));
        allLessonContainers.push(...containersWithUnitInfo);
      }
      
      // Sort by unit name then lesson container title
      allLessonContainers.sort((a, b) => {
        const unitCompare = a.unitName.localeCompare(b.unitName);
        if (unitCompare !== 0) return unitCompare;
        return a.title.localeCompare(b.title);
      });
      
      return allLessonContainers;
    }
    
    return [];
  }, [materialManagement.editingLesson, materialManagement.editForm, childrenData.lessonsByUnit, childrenData.unitsBySubject]);

  useEffect(() => {
    if (session === false) {
      router.replace("/login");
    }
  }, [session, router]);

  useEffect(() => {
    const upgraded = searchParams.get('upgraded');
    const success = searchParams.get('success');
    if (upgraded === 'true' || success === 'true') {
      refetchSubscription();
      if (typeof window !== 'undefined') {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [searchParams, refetchSubscription]);

  // Invalidate cache when returning from subject management page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && childrenData.selectedChild?.id) {
        // Invalidate cache and force refresh when page becomes visible
        childrenData.invalidateChildCache(childrenData.selectedChild.id);
        childrenData.refreshChildSpecificData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [childrenData.selectedChild?.id, childrenData.invalidateChildCache, childrenData.refreshChildSpecificData]);


  useEffect(() => {
    materialManagement.setSelectedLessonContainer("");
  }, [materialManagement.lessonJsonForApproval?.unit_id, materialManagement.setSelectedLessonContainer]);

  const handleAddLessonFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!materialManagement.addLessonSubject || !materialManagement.addLessonFile || materialManagement.addLessonFile.length === 0 || !materialManagement.addLessonUserContentType) {
      showWarning("Please select subject, at least one file, and an initial content type.");
      return;
    }

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
  };

  const handleManualMaterialSubmit = async (materialDataFromForm) => {
    const result = await materialManagement.handleManualMaterialCreation(materialDataFromForm);
    
    if (result.success) {
      showSuccess('Material added successfully!');
      setIsAddMaterialModalOpen(false);
      return { success: true };
    } else {
      showError(result.error || 'Failed to create material');
      return { 
        success: false, 
        error: result.error || 'Failed to create material' 
      };
    }
  };

  const handleAddChildSubmit = async (e) => {
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
        setUpgradeFeature('children');
        setShowUpgradePrompt(true);
      } else {
        alert(result.error);
      }
    }
  };

  const handleGenericUpgrade = async (targetPlanKey) => {
    setUpgrading(true);
    try {
      if (!PRICE_IDS[targetPlanKey]) {
        alert('Invalid plan selected for upgrade.');
        setUpgrading(false);
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
      setUpgrading(false);
    }
  };

  const handleUpdateLessonJsonForApprovalField = (fieldName, value) => {
    materialManagement.updateLessonApprovalField(fieldName, value);
  };

  const handleToggleLessonComplete = async (lessonId, isCompleting = true) => {
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
      setGradingLesson(lesson);
      setShowGradeModal(true);
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
      }
    }
  };

  const handleDeleteMaterial = (material) => {
    setDeletingMaterial(material);
    setShowDeleteMaterialModal(true);
  };

  const handleConfirmDeleteMaterial = async (materialId) => {
    setIsDeletingMaterial(true);
    try {
      const result = await materialManagement.deleteLesson(materialId);
      if (result.success) {
        showSuccess(result.message || 'Material deleted successfully');
        setShowDeleteMaterialModal(false);
        setDeletingMaterial(null);
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
      setIsDeletingMaterial(false);
    }
  };

  const handleCloseDeleteMaterialModal = () => {
    setShowDeleteMaterialModal(false);
    setDeletingMaterial(null);
  };

  const handleDeleteChild = (child) => {
    setDeletingChild(child);
    setShowDeleteChildModal(true);
  };

  const handleConfirmDeleteChild = async (childId) => {
    setIsDeletingChild(true);
    try {
      const result = await childrenData.deleteChild(childId);
      if (result.success) {
        showSuccess(result.message || 'Child account deleted successfully');
        setShowDeleteChildModal(false);
        setDeletingChild(null);
      } else {
        showError(result.error || 'Failed to delete child account');
      }
    } catch (error) {
      showError('Failed to delete child account');
    } finally {
      setIsDeletingChild(false);
    }
  };

  const handleCloseDeleteChildModal = () => {
    setShowDeleteChildModal(false);
    setDeletingChild(null);
  };

  const handleGradeSubmit = async (gradeValue) => {
    if (!gradingLesson) return;
    
    setIsSubmittingGrade(true);
    try {
      
      // Invalidate cache before the API call to ensure fresh data
      if (childrenData.selectedChild?.id) {
        childrenData.invalidateChildCache(childrenData.selectedChild.id);
      }
      
      const result = await materialManagement.toggleLessonCompletion(gradingLesson.id, true, gradeValue);
      
      if (result.success) {
        
        // Small delay to ensure backend processing is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Force refresh the child data to update the UI immediately
        if (childrenData.selectedChild?.id) {
          await childrenData.refreshChildSpecificData(true);
        }
        
        setShowGradeModal(false);
        setGradingLesson(null);
        if (result.syncedEntries > 0) {
          }
      } else {
        alert(result.error || "Could not update grade and completion status.");
      }
    } catch (error) {
      alert("Failed to save grade. Please try again.");
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const handleGradeModalClose = () => {
    if (!isSubmittingGrade) {
      setShowGradeModal(false);
      setGradingLesson(null);
    }
  };


  const handleApproveNewLesson = async (materialRelationshipData = {}) => {
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
      setIsAddMaterialModalOpen(false);
    } else {
      alert(result.error || "Lesson save failed.");
    }
  };

  const handleLessonContainerChange = (e) => {
    const value = e.target.value;
    materialManagement.setSelectedLessonContainer(value);
  };

  const handleCreateNewUnit = async (newUnitName, childSubjectId) => {
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
  };

  const handleCreateNewLessonContainer = async (newTitleFromForm, unitIdForCreation) => {
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
  };

  // Function to create lesson group from units modal
  const handleCreateLessonGroupInModal = async (unitId) => {
    if (!newLessonGroupTitle.trim()) {
      showError('Lesson group title cannot be empty.');
      return;
    }

    try {
      const response = await api.post('/lesson-containers', {
        unit_id: unitId,
        title: newLessonGroupTitle.trim()
      });
      
      // Update the lesson containers for this unit
      const lessonsRes = await api.get(`/lesson-containers/unit/${unitId}`);
      const updatedLessonContainers = lessonsRes.data || [];
      
      childrenData.setLessonsByUnit(prev => ({
        ...prev,
        [unitId]: updatedLessonContainers
      }));
      
      // Reset form
      setNewLessonGroupTitle("");
      setCreatingLessonGroupForUnit(null);
      
      showSuccess(`Lesson group "${newLessonGroupTitle.trim()}" created successfully!`);
    } catch (error) {
      console.error('Error creating lesson group:', error);
      showError(error.response?.data?.error || 'Failed to create lesson group.');
    }
  };

  // Handler for creating lesson groups from SubjectCard
  const handleCreateLessonGroupFromCard = async (unitId, title) => {
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
      console.error('Error creating lesson group:', error);
      showError(error.response?.data?.error || 'Failed to create lesson group.');
      return { success: false, error: error.response?.data?.error || 'Failed to create lesson group.' };
    }
  };

  const handleOpenEditModal = (lesson) => {
    materialManagement.startEditingLesson(lesson);
  };

  const handleEditModalFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "completed_toggle")
      materialManagement.setEditForm((prev) => ({
        ...prev,
        completed_at: checked ? new Date().toISOString() : null,
      }));
    else materialManagement.setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveLessonEdit = async () => {
    if (!materialManagement.editingLesson) return;
    
    const result = await materialManagement.saveEditedLesson();
    
    if (!result.success) {
      alert(result.error || "Failed to save changes.");
    }
  };

  const openManageUnitsModal = (subject) => {
    setManagingUnitsForSubject({
      id: subject.child_subject_id,
      name: subject.name,
    });
    setCurrentSubjectUnitsInModal(
      childrenData.unitsBySubject[subject.child_subject_id] || []
    );
    setNewUnitNameModalState("");
    setEditingUnit(null);
    setIsManageUnitsModalOpen(true);
  };

  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!newUnitNameModalState.trim() || !managingUnitsForSubject) return;

    try {
      const payload = {
        child_subject_id: managingUnitsForSubject.id,
        name: newUnitNameModalState.trim(),
      };
      const res = await api.post("/units", payload);
      const newUnit = res.data;

      const updatedUnitsForSubject = [
        ...(childrenData.unitsBySubject[managingUnitsForSubject.id] || []),
        newUnit,
      ].sort(
        (a, b) =>
          (a.sequence_order || 0) - (b.sequence_order || 0) ||
          a.name.localeCompare(b.name)
      );

      childrenData.setUnitsBySubject((prev) => ({
        ...prev,
        [managingUnitsForSubject.id]: updatedUnitsForSubject,
      }));
      setCurrentSubjectUnitsInModal(updatedUnitsForSubject);
      setNewUnitNameModalState("");
    } catch (error) {
      alert(error.response?.data?.error || "Could not add unit.");
    }
  };

  const handleBulkAddUnits = async () => {
    if (!newUnitNameModalState.trim() || !managingUnitsForSubject) return;

    try {
      const baseName = newUnitNameModalState.trim();
      const existingUnits = childrenData.unitsBySubject[managingUnitsForSubject.id] || [];
      const existingUnitNames = existingUnits.map(u => u.name.toLowerCase());
      
      // Parse the base name to extract existing number
      const match = baseName.match(/^(.+?)\s+(\d+)$/);
      let namePrefix, startingNumber;
      
      if (match) {
        // Base name contains a number (e.g., "Section 1")
        namePrefix = match[1]; // "Section"
        startingNumber = parseInt(match[2]); // 1
      } else {
        // Base name doesn't contain a number (e.g., "Chapter")
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
      for (let i = 0; i < bulkUnitCount; i++) {
        const unitName = `${namePrefix} ${startingNumber + i}`;
        
        // Double-check this name doesn't exist
        if (existingUnitNames.includes(unitName.toLowerCase())) {
          continue; // Skip if somehow already exists
        }
        
        try {
          const payload = {
            child_subject_id: managingUnitsForSubject.id,
            name: unitName,
          };
          const response = await api.post("/units", payload);
          newUnits.push(response.data);
          existingUnitNames.push(unitName.toLowerCase()); // Add to list to avoid duplicates in this batch
          createdCount++;
        } catch (unitError) {
          // If individual unit creation fails, continue with others
          console.warn(`Failed to create unit "${unitName}":`, unitError.response?.data?.error);
        }
      }

      if (createdCount === 0) {
        showError("No units were created. They may already exist.");
        return;
      }

      // Update the state with all new units
      const updatedUnitsForSubject = [
        ...existingUnits,
        ...newUnits,
      ].sort(
        (a, b) =>
          (a.sequence_order || 0) - (b.sequence_order || 0) ||
          a.name.localeCompare(b.name)
      );

      childrenData.setUnitsBySubject((prev) => ({
        ...prev,
        [managingUnitsForSubject.id]: updatedUnitsForSubject,
      }));
      setCurrentSubjectUnitsInModal(updatedUnitsForSubject);
      setNewUnitNameModalState("");
      setBulkUnitCount(1);
      
      if (createdCount === bulkUnitCount) {
        showSuccess(`Created ${createdCount} units successfully!`);
      } else {
        showWarning(`Created ${createdCount} out of ${bulkUnitCount} units. Some may have already existed.`);
      }
    } catch (error) {
      showError(error.response?.data?.error || "Could not create units.");
    }
  };

  const handleUpdateUnit = async (e) => {
    e.preventDefault();
    if (!editingUnit || !editingUnit.name.trim() || !managingUnitsForSubject)
      return;

    try {
      const payload = {
        name: editingUnit.name.trim(),
        description: editingUnit.description?.trim(),
      };
      const res = await api.put(`/units/${editingUnit.id}`, payload);
      const updatedUnit = res.data;

      const updatedUnitsList = (
        childrenData.unitsBySubject[managingUnitsForSubject.id] || []
      )
        .map((u) => (u.id === editingUnit.id ? updatedUnit : u))
        .sort(
          (a, b) =>
            (a.sequence_order || 0) - (b.sequence_order || 0) ||
            a.name.localeCompare(b.name)
        );

      childrenData.setUnitsBySubject((prev) => ({
        ...prev,
        [managingUnitsForSubject.id]: updatedUnitsList,
      }));
      setCurrentSubjectUnitsInModal(updatedUnitsList);
      setEditingUnit(null);
    } catch (error) {
      alert(error.response?.data?.error || "Could not update unit.");
    }
  };

  const handleDeleteUnit = async (unitId) => {
    if (
      !managingUnitsForSubject ||
      !confirm(
        `Are you sure you want to delete unit? Lessons will become uncategorized.`
      )
    )
      return;

    try {
      console.log('Attempting to delete unit:', unitId);
      await api.delete(`/units/${unitId}`);
      const updatedUnitsList = (
        childrenData.unitsBySubject[managingUnitsForSubject.id] || []
      ).filter((u) => u.id !== unitId);

      childrenData.setUnitsBySubject((prev) => ({
        ...prev,
        [managingUnitsForSubject.id]: updatedUnitsList,
      }));
      setCurrentSubjectUnitsInModal(updatedUnitsList);

      if (editingUnit?.id === unitId) setEditingUnit(null);
      await childrenData.refreshChildSpecificData();
      showSuccess("Unit deleted successfully.");
    } catch (error) {
      console.error("Error deleting unit:", error);
      const errorMessage = error.response?.data?.error || error.message || "Could not delete unit.";
      showError(`Failed to delete unit: ${errorMessage}`);
    }
  };

  const handleOpenChildLoginSettingsModal = (child) => {
    if (!subscriptionPermissions.hasChildLogin) {
        setUpgradeFeature('childLogin');
        setShowUpgradePrompt(true);
        return;
    }
    setEditingChildCredentials(child);
    setChildUsernameInput(child.child_username || "");
    setChildPinInput("");
    setChildPinConfirmInput("");
    setCredentialFormError("");
    setCredentialFormSuccess("");
    setIsChildLoginSettingsModalOpen(true);
  };
  const handleCloseChildLoginSettingsModal = () => {
    setIsChildLoginSettingsModalOpen(false);
    setEditingChildCredentials(null);
    setChildUsernameInput("");
    setChildPinInput("");
    setChildPinConfirmInput("");
    setCredentialFormError("");
    setCredentialFormSuccess("");
  };
  const clearCredentialMessages = () => {
    setCredentialFormError("");
    setCredentialFormSuccess("");
  };
  const handleSetChildUsername = async () => {
    if (!editingChildCredentials || !childUsernameInput.trim()) {
      setCredentialFormError("Username cannot be empty.");
      return;
    }
    if (childUsernameInput.trim().length < 3) {
      setCredentialFormError("Username must be at least 3 characters.");
      return;
    }
    setIsSavingCredentials(true);
    clearCredentialMessages();
    try {
      const res = await api.post(
        `/children/${editingChildCredentials.id}/username`,
        { username: childUsernameInput.trim() }
      );
      setCredentialFormSuccess(res.data.message || "Username updated!");
      const updatedUsername = childUsernameInput.trim();
      const updatedChildren = childrenData.children.map((c) =>
        c.id === editingChildCredentials.id
          ? { ...c, child_username: updatedUsername }
          : c
      );
      childrenData.setChildren(updatedChildren);
      if (childrenData.selectedChild?.id === editingChildCredentials.id)
        childrenData.setSelectedChild((prev) => ({
          ...prev,
          child_username: updatedUsername,
        }));
      setEditingChildCredentials((prev) => ({
        ...prev,
        child_username: updatedUsername,
      }));
    } catch (error) {
      setCredentialFormError(
        error.response?.data?.error || "Failed to update username."
      );
    } finally {
      setIsSavingCredentials(false);
    }
  };
  const handleSetChildPin = async () => {
    if (!editingChildCredentials || !childPinInput) {
      setCredentialFormError("PIN cannot be empty.");
      return;
    }
    if (!/^\d{4,6}$/.test(childPinInput)) {
      setCredentialFormError("PIN must be 4 to 6 digits.");
      return;
    }
    if (childPinInput !== childPinConfirmInput) {
      setCredentialFormError("PINs do not match.");
      return;
    }
    setIsSavingCredentials(true);
    clearCredentialMessages();
    try {
      const res = await api.post(
        `/children/${editingChildCredentials.id}/pin`,
        { pin: childPinInput }
      );
      setCredentialFormSuccess(res.data.message || "PIN updated successfully!");
      setChildPinInput("");
      setChildPinConfirmInput("");
      const updatedChildren = childrenData.children.map((c) =>
        c.id === editingChildCredentials.id
          ? { ...c, access_pin_hash: "set" }
          : c
      ); 
      childrenData.setChildren(updatedChildren);
      if (childrenData.selectedChild?.id === editingChildCredentials.id)
        childrenData.setSelectedChild((prev) => ({ ...prev, access_pin_hash: "set" }));
      setEditingChildCredentials((prev) => ({
        ...prev,
        access_pin_hash: "set",
      }));
    } catch (error) {
      setCredentialFormError(
        error.response?.data?.error || "Failed to update PIN."
      );
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const isLoading = session === undefined || subscriptionLoading || (childrenData.loadingInitial && childrenData.children.length === 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-main">
        <div className="text-xl text-text-secondary">Initializing Dashboard...</div>
      </div>
    );
  }
  if (!session) return null;

  const currentUnitsForAddFormSubject = materialManagement.addLessonSubject && childrenData.selectedChild && childrenData.childSubjects[childrenData.selectedChild.id]
    ? childrenData.unitsBySubject[materialManagement.addLessonSubject] || [] 
    : [];

  return (
    <div className="flex h-screen bg-background-main overflow-hidden">
      <div className="w-64 flex-shrink-0 bg-background-card border-r border-border-subtle shadow-lg">
        <StudentSidebar
          childrenList={childrenData.children}
          selectedChild={childrenData.selectedChild}
          onSelectChild={childrenData.setSelectedChild}
          showAddChild={childrenData.showAddChild}
          onToggleShowAddChild={childrenData.setShowAddChild}
          newChildName={childrenData.newChildName}
          onNewChildNameChange={(e) => childrenData.setNewChildName(e.target.value)}
          newChildGrade={childrenData.newChildGrade}
          onNewChildGradeChange={(e) => childrenData.setNewChildGrade(e.target.value)}
          onAddChildSubmit={handleAddChildSubmit}
          onOpenChildLoginSettings={handleOpenChildLoginSettingsModal}
          onDeleteChild={handleDeleteChild}
          subscription={subscription}
          canAddChild={subscriptionPermissions.maxChildren > childrenData.children.length}
          onUpgradeNeeded={(targetPlan) => {
            setUpgradeFeature('children');
            setShowUpgradePrompt(true);
          }}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto p-6 sm:p-8 lg:p-10">
        <StudentHeader
          selectedChild={childrenData.selectedChild}
          dashboardStats={totalStats}
        />
        {childrenData.loadingInitial && !childrenData.selectedChild && childrenData.children.length === 0 && !subscriptionLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xl text-text-secondary">Loading Student Data...</div>
          </div>
        )}
        {!childrenData.selectedChild && !childrenData.loadingInitial && !subscriptionLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-secondary italic text-xl text-center">
              {childrenData.children.length > 0
                ? "Select a student to get started."
                : "No students found. Please add a student to begin."}
            </div>
          </div>
        )}

        {childrenData.selectedChild && (
          <DashboardErrorBoundary>
            <QuickAccessSection
              lessonsBySubject={childrenData.lessonsBySubject}
              onToggleComplete={handleToggleLessonComplete}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteMaterial}
              maxItems={5}
            />
            
            <DashboardFilters
              filterStatus={filtersAndSorting.filterStatus}
              setFilterStatus={filtersAndSorting.setFilterStatus}
              filterContentType={filtersAndSorting.filterContentType}
              setFilterContentType={filtersAndSorting.setFilterContentType}
              sortBy={filtersAndSorting.sortBy}
              setSortBy={filtersAndSorting.setSortBy}
            />
            {childrenData.loadingChildData ? (
              <div className="space-y-4">
                <div className="text-center py-4 text-text-secondary">
                  Loading {childrenData.selectedChild.name}&apos;s curriculum...
                </div>
                <CurriculumSkeletonLoader />
              </div>
            ) : (
              <div className="mt-0">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-text-primary">
                    Curriculum Overview
                  </h2>
                   <Button
                    onClick={() => setIsAddMaterialModalOpen(true)}
                    variant="primary"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Material
                  </Button>
                </div>
                {assignedSubjectsForCurrentChild.length === 0 ? (
                  <div className="italic text-text-secondary p-4 bg-background-card rounded-lg shadow border border-border-subtle">
                    No subjects assigned to {childrenData.selectedChild.name}.
                    <button
                      onClick={() => router.push("/subject-management")}
                      className="ml-2 text-accent-blue hover:text-[var(--accent-blue-hover)] underline font-medium transition-colors"
                    >
                      Assign Subjects
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {assignedSubjectsForCurrentChild.map((subject) => (
                      <SubjectCard
                        key={subject.child_subject_id || subject.id}
                        subject={subject}
                        lessons={
                          filtersAndSorting.filteredAndSortedLessonsBySubject[
                            subject.child_subject_id
                          ] || []
                        }
                        units={childrenData.unitsBySubject[subject.child_subject_id] || []}
                        lessonsByUnit={childrenData.lessonsByUnit}
                        subjectStats={
                          subject.child_subject_id &&
                          filtersAndSorting.dashboardStats[subject.child_subject_id]
                            ? filtersAndSorting.dashboardStats[subject.child_subject_id]
                            : {
                                total: 0,
                                completed: 0,
                                avgGradePercent: null,
                                gradableItemsCount: 0,
                              }
                        }
                        onOpenEditModal={handleOpenEditModal}
                        onManageUnits={() => openManageUnitsModal(subject)}
                        onToggleComplete={handleToggleLessonComplete}
                        onDeleteMaterial={handleDeleteMaterial}
                        onCreateLessonGroup={handleCreateLessonGroupFromCard}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </DashboardErrorBoundary>
        )}
      </div>

      {isAddMaterialModalOpen && (
        <ModalErrorBoundary>
          <div className={modalBackdropStyles} onClick={() => setIsAddMaterialModalOpen(false)}>
            <div className={modalContainerStyles} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsAddMaterialModalOpen(false)}
              className={modalCloseButtonStyles}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <div className="p-6 overflow-y-auto flex-1">
               <AddMaterialTabs
                  childSubjectsForSelectedChild={assignedSubjectsForCurrentChild}
                  onFormSubmit={handleAddLessonFormSubmit}
                  onApprove={handleApproveNewLesson}
                  onManualSubmit={handleManualMaterialSubmit}
                  
                  uploading={materialManagement.uploading}
                  savingLesson={materialManagement.savingLesson}
                  
                  lessonJsonForApproval={materialManagement.lessonJsonForApproval}
                  onUpdateLessonJsonField={handleUpdateLessonJsonForApprovalField}
                  
                  lessonTitleForApproval={materialManagement.lessonTitleForApproval}
                  onLessonTitleForApprovalChange={(e) =>
                    materialManagement.setLessonTitleForApproval(e.target.value)
                  }
                  lessonMaxPointsForApproval={materialManagement.lessonMaxPointsForApproval}
                  onLessonMaxPointsForApprovalChange={(e) =>
                    materialManagement.setLessonMaxPointsForApproval(e.target.value)
                  }
                  lessonDueDateForApproval={materialManagement.lessonDueDateForApproval}
                  onLessonDueDateForApprovalChange={(e) =>
                    materialManagement.setLessonDueDateForApproval(e.target.value)
                  }
                  lessonCompletedForApproval={materialManagement.lessonCompletedForApproval}
                  onLessonCompletedForApprovalChange={(e) =>
                    materialManagement.setLessonCompletedForApproval(e.target.checked)
                  }
                  
                  currentAddLessonSubject={materialManagement.addLessonSubject}
                  onAddLessonSubjectChange={(e) =>
                    materialManagement.setAddLessonSubject(e.target.value)
                  }
                  currentAddLessonUserContentType={materialManagement.addLessonUserContentType}
                  onAddLessonUserContentTypeChange={(e) =>
                    materialManagement.setAddLessonUserContentType(e.target.value)
                  }
                  onAddLessonFileChange={(e) => materialManagement.setAddLessonFile(e.target.files)}
                  currentAddLessonFile={materialManagement.addLessonFile}
                  
                  appContentTypes={APP_CONTENT_TYPES}
                  appGradableContentTypes={APP_GRADABLE_CONTENT_TYPES}
                  unitsForSelectedSubject={currentUnitsForAddFormSubject}
                  onCreateNewUnit={handleCreateNewUnit}
                  lessonContainersForSelectedUnit={currentLessonContainersForUnit}
                  lessonsByUnit={childrenData.lessonsByUnit}
                  setLessonsByUnit={childrenData.setLessonsByUnit}
                  selectedLessonContainer={materialManagement.selectedLessonContainer}
                  onLessonContainerChange={handleLessonContainerChange}
                  onCreateNewLessonContainer={handleCreateNewLessonContainer}
                  subscriptionPermissions={subscriptionPermissions}
                />
            </div>
          </div>
          </div>
        </ModalErrorBoundary>
      )}

      <ModalErrorBoundary>
        <UnitManagementModal
          isOpen={isManageUnitsModalOpen}
          onClose={() => setIsManageUnitsModalOpen(false)}
          managingUnitsForSubject={managingUnitsForSubject}
          currentSubjectUnitsInModal={currentSubjectUnitsInModal}
          setCurrentSubjectUnitsInModal={setCurrentSubjectUnitsInModal}
          newUnitNameModalState={newUnitNameModalState}
          setNewUnitNameModalState={setNewUnitNameModalState}
          bulkUnitCount={bulkUnitCount}
          setBulkUnitCount={setBulkUnitCount}
          editingUnit={editingUnit}
          setEditingUnit={setEditingUnit}
          expandedUnitsInModal={expandedUnitsInModal}
          setExpandedUnitsInModal={setExpandedUnitsInModal}
          creatingLessonGroupForUnit={creatingLessonGroupForUnit}
          setCreatingLessonGroupForUnit={setCreatingLessonGroupForUnit}
          newLessonGroupTitle={newLessonGroupTitle}
          setNewLessonGroupTitle={setNewLessonGroupTitle}
          onAddUnit={handleAddUnit}
          onBulkAddUnits={handleBulkAddUnits}
          onUpdateUnit={handleUpdateUnit}
          onDeleteUnit={handleDeleteUnit}
          onCreateLessonGroupInModal={handleCreateLessonGroupInModal}
          childrenData={childrenData}
          showSuccess={showSuccess}
          showError={showError}
        />
      </ModalErrorBoundary>

      {materialManagement.editingLesson && (
        <EditMaterialModal
          editingLesson={materialManagement.editingLesson}
          editForm={materialManagement.editForm}
          onFormChange={handleEditModalFormChange}
          onSave={handleSaveLessonEdit}
          onClose={materialManagement.cancelEditingLesson}
          isSaving={materialManagement.isSavingEdit}
          appContentTypes={APP_CONTENT_TYPES}
          appGradableContentTypes={APP_GRADABLE_CONTENT_TYPES}
          unitsForSubject={childrenData.unitsBySubject[materialManagement.editForm?.child_subject_id] || []}
          lessonContainersForSubject={editingMaterialLessonContainers}
        />
      )}

      {isChildLoginSettingsModalOpen && editingChildCredentials && (
        <ChildLoginSettingsModal
          isOpen={isChildLoginSettingsModalOpen}
          onClose={handleCloseChildLoginSettingsModal}
          child={editingChildCredentials}
          usernameInput={childUsernameInput}
          onUsernameInputChange={(e) => {
            setChildUsernameInput(e.target.value);
            clearCredentialMessages();
          }}
          pinInput={childPinInput}
          onPinInputChange={(e) => {
            setChildPinInput(e.target.value);
            clearCredentialMessages();
          }}
          pinConfirmInput={childPinConfirmInput}
          onPinConfirmInputChange={(e) => {
            setChildPinConfirmInput(e.target.value);
            clearCredentialMessages();
          }}
          onSetUsername={handleSetChildUsername}
          onSetPin={handleSetChildPin}
          formError={credentialFormError}
          formSuccess={credentialFormSuccess}
          isSaving={isSavingCredentials}
        />
      )}
      
      {showUpgradePrompt && (
        <UpgradePrompt
          isOpen={showUpgradePrompt}
          onClose={() => setShowUpgradePrompt(false)}
          feature={upgradeFeature}
          currentPlan={subscription?.plan_type || 'free'}
          onUpgrade={handleGenericUpgrade}
          isLoading={upgrading}
        />
      )}

      {showGradeModal && (
        <GradeInputModal
          isOpen={showGradeModal}
          onClose={handleGradeModalClose}
          onSubmit={handleGradeSubmit}
          lesson={gradingLesson}
          isLoading={isSubmittingGrade}
        />
      )}

      <MaterialDeleteModal
        isOpen={showDeleteMaterialModal}
        onClose={handleCloseDeleteMaterialModal}
        onConfirm={handleConfirmDeleteMaterial}
        material={deletingMaterial}
        isDeleting={isDeletingMaterial}
      />

      <ChildAccountDeleteModal
        isOpen={showDeleteChildModal}
        onClose={handleCloseDeleteChildModal}
        onConfirm={handleConfirmDeleteChild}
        child={deletingChild}
        childStats={deletingChild ? {
          totalMaterials: Object.values(childrenData.lessonsBySubject).flat().length,
          totalSubjects: childrenData.assignedSubjectsForCurrentChild.length,
          completedMaterials: Object.values(childrenData.lessonsBySubject).flat().filter(m => m.completed_at).length
        } : null}
        isDeleting={isDeletingChild}
      />
    </div>
  );
}
