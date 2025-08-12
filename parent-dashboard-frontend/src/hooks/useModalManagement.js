// Custom hook for managing all modal states and operations
import { useState } from 'react';

export function useModalManagement() {
  // Units management modal state
  const [isManageUnitsModalOpen, setIsManageUnitsModalOpen] = useState(false);
  const [managingUnitsForSubject, setManagingUnitsForSubject] = useState(null);
  const [currentSubjectUnitsInModal, setCurrentSubjectUnitsInModal] = useState([]);
  const [newUnitNameModalState, setNewUnitNameModalState] = useState("");
  const [bulkUnitCount, setBulkUnitCount] = useState(1);
  const [editingUnit, setEditingUnit] = useState(null);

  // Material modals
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [showDeleteMaterialModal, setShowDeleteMaterialModal] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

  // Lesson view modal
  const [viewingLesson, setViewingLesson] = useState(null);

  // Lesson group management state
  const [expandedUnitsInModal, setExpandedUnitsInModal] = useState({});
  const [creatingLessonGroupForUnit, setCreatingLessonGroupForUnit] = useState(null);
  const [newLessonGroupTitle, setNewLessonGroupTitle] = useState("");

  // Child management modals
  const [isChildLoginSettingsModalOpen, setIsChildLoginSettingsModalOpen] = useState(false);
  const [editingChildCredentials, setEditingChildCredentials] = useState(null);
  const [childUsernameInput, setChildUsernameInput] = useState("");
  const [childPinInput, setChildPinInput] = useState("");
  const [childPinConfirmInput, setChildPinConfirmInput] = useState("");
  const [credentialFormError, setCredentialFormError] = useState("");
  const [credentialFormSuccess, setCredentialFormSuccess] = useState("");
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);

  // Child delete modal
  const [showDeleteChildModal, setShowDeleteChildModal] = useState(false);
  const [deletingChild, setDeletingChild] = useState(null);
  const [isDeletingChild, setIsDeletingChild] = useState(false);

  // Grade input modal
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradingLesson, setGradingLesson] = useState(null);
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  // Upgrade prompt modal
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const [upgrading, setUpgrading] = useState(false);

  // Batch operations modal
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Helper functions for managing modals
  const openManageUnitsModal = (subject) => {
    setManagingUnitsForSubject({
      id: subject.child_subject_id,
      name: subject.name,
    });
    setIsManageUnitsModalOpen(true);
  };

  const closeManageUnitsModal = () => {
    setIsManageUnitsModalOpen(false);
    setManagingUnitsForSubject(null);
    setCurrentSubjectUnitsInModal([]);
    setNewUnitNameModalState("");
    setEditingUnit(null);
  };

  const openAddMaterialModal = () => {
    setIsAddMaterialModalOpen(true);
  };

  const closeAddMaterialModal = () => {
    setIsAddMaterialModalOpen(false);
  };

  const openDeleteMaterialModal = (material) => {
    setDeletingMaterial(material);
    setShowDeleteMaterialModal(true);
  };

  const closeDeleteMaterialModal = () => {
    setShowDeleteMaterialModal(false);
    setDeletingMaterial(null);
    setIsDeletingMaterial(false);
  };

  const openViewLessonModal = (lesson) => {
    setViewingLesson(lesson);
  };

  const closeViewLessonModal = () => {
    setViewingLesson(null);
  };

  const openChildLoginSettingsModal = (child) => {
    setEditingChildCredentials(child);
    setChildUsernameInput(child.child_username || "");
    setChildPinInput("");
    setChildPinConfirmInput("");
    setCredentialFormError("");
    setCredentialFormSuccess("");
    setIsChildLoginSettingsModalOpen(true);
  };

  const closeChildLoginSettingsModal = () => {
    setIsChildLoginSettingsModalOpen(false);
    setEditingChildCredentials(null);
    setChildUsernameInput("");
    setChildPinInput("");
    setChildPinConfirmInput("");
    setCredentialFormError("");
    setCredentialFormSuccess("");
    setIsSavingCredentials(false);
  };

  const openDeleteChildModal = (child) => {
    setDeletingChild(child);
    setShowDeleteChildModal(true);
  };

  const closeDeleteChildModal = () => {
    setShowDeleteChildModal(false);
    setDeletingChild(null);
    setIsDeletingChild(false);
  };

  const openGradeModal = (lesson) => {
    setGradingLesson(lesson);
    setShowGradeModal(true);
  };

  const closeGradeModal = () => {
    setShowGradeModal(false);
    setGradingLesson(null);
    setIsSubmittingGrade(false);
  };

  const openUpgradePrompt = (feature) => {
    setUpgradeFeature(feature);
    setShowUpgradePrompt(true);
  };

  const closeUpgradePrompt = () => {
    setShowUpgradePrompt(false);
    setUpgradeFeature('');
    setUpgrading(false);
  };

  const openBatchEditModal = () => {
    setShowBatchEditModal(true);
  };

  const closeBatchEditModal = () => {
    setShowBatchEditModal(false);
    setIsBatchProcessing(false);
  };

  return {
    // Units modal state
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

    // Material modal state
    isAddMaterialModalOpen,
    showDeleteMaterialModal,
    deletingMaterial,
    isDeletingMaterial,
    setIsDeletingMaterial,

    // Lesson view modal state
    viewingLesson,

    // Child modal state
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
    showDeleteChildModal,
    deletingChild,
    isDeletingChild,
    setIsDeletingChild,

    // Grade modal state
    showGradeModal,
    gradingLesson,
    isSubmittingGrade,
    setIsSubmittingGrade,

    // Upgrade modal state
    showUpgradePrompt,
    upgradeFeature,
    upgrading,
    setUpgrading,

    // Batch modal state
    showBatchEditModal,
    isBatchProcessing,
    setIsBatchProcessing,

    // Helper functions
    openManageUnitsModal,
    closeManageUnitsModal,
    openAddMaterialModal,
    closeAddMaterialModal,
    openDeleteMaterialModal,
    closeDeleteMaterialModal,
    openViewLessonModal,
    closeViewLessonModal,
    openChildLoginSettingsModal,
    closeChildLoginSettingsModal,
    openDeleteChildModal,
    closeDeleteChildModal,
    openGradeModal,
    closeGradeModal,
    openUpgradePrompt,
    closeUpgradePrompt,
    openBatchEditModal,
    closeBatchEditModal,
  };
}
