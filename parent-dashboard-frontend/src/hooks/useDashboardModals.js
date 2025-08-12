// Custom hook for managing dashboard modal states
// Extracted to reduce state complexity in main dashboard component
import { useState, useCallback } from 'react';

export function useDashboardModals() {
  // Unit management modal state
  const [isManageUnitsModalOpen, setIsManageUnitsModalOpen] = useState(false);
  const [managingUnitsForSubject, setManagingUnitsForSubject] = useState(null);
  const [currentSubjectUnitsInModal, setCurrentSubjectUnitsInModal] = useState([]);
  const [newUnitNameModalState, setNewUnitNameModalState] = useState("");
  const [bulkUnitCount, setBulkUnitCount] = useState(1);
  const [editingUnit, setEditingUnit] = useState(null);

  // Lesson group management state
  const [expandedUnitsInModal, setExpandedUnitsInModal] = useState({});
  const [creatingLessonGroupForUnit, setCreatingLessonGroupForUnit] = useState(null);
  const [newLessonGroupTitle, setNewLessonGroupTitle] = useState("");

  // Add material modal state
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);

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

  // Helper functions for opening/closing modals
  const openManageUnitsModal = useCallback((subject, unitsBySubject) => {
    setManagingUnitsForSubject({
      id: subject.child_subject_id,
      name: subject.name,
    });
    setCurrentSubjectUnitsInModal(
      unitsBySubject[subject.child_subject_id] || []
    );
    setNewUnitNameModalState("");
    setEditingUnit(null);
    setIsManageUnitsModalOpen(true);
  }, []);

  const closeManageUnitsModal = useCallback(() => {
    setIsManageUnitsModalOpen(false);
    setManagingUnitsForSubject(null);
    setCurrentSubjectUnitsInModal([]);
    setNewUnitNameModalState("");
    setEditingUnit(null);
    setExpandedUnitsInModal({});
    setCreatingLessonGroupForUnit(null);
    setNewLessonGroupTitle("");
    setBulkUnitCount(1);
  }, []);

  const openChildLoginSettingsModal = useCallback((child) => {
    setEditingChildCredentials(child);
    setChildUsernameInput(child.child_username || "");
    setChildPinInput("");
    setChildPinConfirmInput("");
    setCredentialFormError("");
    setCredentialFormSuccess("");
    setIsChildLoginSettingsModalOpen(true);
  }, []);

  const closeChildLoginSettingsModal = useCallback(() => {
    setIsChildLoginSettingsModalOpen(false);
    setEditingChildCredentials(null);
    setChildUsernameInput("");
    setChildPinInput("");
    setChildPinConfirmInput("");
    setCredentialFormError("");
    setCredentialFormSuccess("");
  }, []);

  const clearCredentialMessages = useCallback(() => {
    setCredentialFormError("");
    setCredentialFormSuccess("");
  }, []);

  const openDeleteMaterialModal = useCallback((material) => {
    setDeletingMaterial(material);
    setShowDeleteMaterialModal(true);
  }, []);

  const closeDeleteMaterialModal = useCallback(() => {
    setShowDeleteMaterialModal(false);
    setDeletingMaterial(null);
  }, []);

  const openDeleteChildModal = useCallback((child) => {
    setDeletingChild(child);
    setShowDeleteChildModal(true);
  }, []);

  const closeDeleteChildModal = useCallback(() => {
    setShowDeleteChildModal(false);
    setDeletingChild(null);
  }, []);

  const openGradeModal = useCallback((lesson) => {
    setGradingLesson(lesson);
    setShowGradeModal(true);
  }, []);

  const closeGradeModal = useCallback(() => {
    if (!isSubmittingGrade) {
      setShowGradeModal(false);
      setGradingLesson(null);
    }
  }, [isSubmittingGrade]);

  const openUpgradePrompt = useCallback((feature) => {
    setUpgradeFeature(feature);
    setShowUpgradePrompt(true);
  }, []);

  const closeUpgradePrompt = useCallback(() => {
    setShowUpgradePrompt(false);
    setUpgradeFeature('');
  }, []);

  return {
    // Unit management modal
    isManageUnitsModalOpen,
    managingUnitsForSubject,
    currentSubjectUnitsInModal,
    setCurrentSubjectUnitsInModal,
    newUnitNameModalState,
    setNewUnitNameModalState,
    bulkUnitCount,
    setBulkUnitCount,
    editingUnit,
    setEditingUnit,
    expandedUnitsInModal,
    setExpandedUnitsInModal,
    creatingLessonGroupForUnit,
    setCreatingLessonGroupForUnit,
    newLessonGroupTitle,
    setNewLessonGroupTitle,
    openManageUnitsModal,
    closeManageUnitsModal,

    // Add material modal
    isAddMaterialModalOpen,
    setIsAddMaterialModalOpen,

    // Child credentials modal
    isChildLoginSettingsModalOpen,
    editingChildCredentials,
    childUsernameInput,
    setChildUsernameInput,
    childPinInput,
    setChildPinInput,
    childPinConfirmInput,
    setChildPinConfirmInput,
    credentialFormError,
    setCredentialFormError,
    credentialFormSuccess,
    setCredentialFormSuccess,
    isSavingCredentials,
    setIsSavingCredentials,
    openChildLoginSettingsModal,
    closeChildLoginSettingsModal,
    clearCredentialMessages,

    // Upgrade prompt
    showUpgradePrompt,
    upgradeFeature,
    upgrading,
    setUpgrading,
    openUpgradePrompt,
    closeUpgradePrompt,

    // Grade modal
    showGradeModal,
    gradingLesson,
    isSubmittingGrade,
    setIsSubmittingGrade,
    openGradeModal,
    closeGradeModal,

    // Delete modals
    showDeleteMaterialModal,
    deletingMaterial,
    isDeletingMaterial,
    setIsDeletingMaterial,
    openDeleteMaterialModal,
    closeDeleteMaterialModal,

    showDeleteChildModal,
    deletingChild,
    isDeletingChild,
    setIsDeletingChild,
    openDeleteChildModal,
    closeDeleteChildModal,
  };
}
