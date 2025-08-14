// app/dashboard/page.js
"use client";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import api from "../../utils/api";

// Main subscription hook
import { useSubscription } from "../../hooks/useSubscription";

// Extracted hooks and utilities
import { useChildrenData } from "../../hooks/useChildrenData";
import { useMaterialManagement } from "../../hooks/useMaterialManagement";
import { useFiltersAndSorting } from "../../hooks/useFiltersAndSorting";
import { useToast } from "../../hooks/useToast";
import { useModalManagement } from "../../hooks/useModalManagement";
import { useDashboardHandlers } from "../../hooks/useDashboardHandlers";
import { PRICE_IDS } from "../../utils/subscriptionConstants";
import {
  APP_CONTENT_TYPES,
  APP_GRADABLE_CONTENT_TYPES
} from "../../utils/dashboardConstants";

// Shared styles and utilities
import {
  modalBackdropStyles,
  modalContainerStyles,
  modalCloseButtonStyles,
  formInputStyles,
  formLabelStyles
} from "../../utils/dashboardStyles";
import { handleApiError, createSuccessResponse, validatePin, validateUsername } from "../../utils/commonHelpers";
import { checkAndClearRefreshSignal, shouldRefreshBasedOnTime, isComingFromDataModifyingPage } from "../../utils/dashboardRefresh";

// Components
import StudentSidebar from "./components/StudentSidebar";
import StudentHeader from "./components/StudentHeader";
import ParentNotesSection from "./components/ParentNotesSection";
import SubjectCard from "./components/SubjectCard";
import TodayOverview from "./components/TodayOverview";
import NeedsGradingSection from "./components/NeedsGradingSection";
import DashboardFilters from "./components/DashboardFilters";
import BatchActionsBar from "./components/BatchActionsBar";
import Button from "../../components/ui/Button";
import { CurriculumSkeletonLoader } from "../../components/ui/SkeletonLoader";
import { DashboardErrorBoundary, ModalErrorBoundary } from "../../components/ErrorBoundary";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import StreamlinedAddAssignment from "./components/StreamlinedAddAssignment";

// Layout Components
import DashboardHeader from "./components/DashboardHeader";
import { LoadingStateCard, NoChildSelectedCard, NoSubjectsCard } from "./components/EmptyStateCard";
import DashboardContentHeader from "./components/DashboardContentHeader";
import SubjectsList from "./components/SubjectsList";

// Modal Components
import UnitManagementModal from "./components/UnitManagementModal";
import EditMaterialModal from "./components/EditMaterialModal";
import ChildLoginSettingsModal from "./components/ChildLoginSettingsModal";
import GradeInputModal from "./components/GradeInputModal";
import MaterialDeleteModal from "./components/MaterialDeleteModal";
import ChildAccountDeleteModal from "./components/ChildAccountDeleteModal";
import BatchEditModal from "./components/BatchEditModal";
import UpgradePrompt from "../../components/UpgradePrompt";

import {
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
  ListBulletIcon
} from "@heroicons/react/24/outline";

function DashboardPageContent() {
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
  const modalManagement = useModalManagement();

  // Batch operations state (declare before hooks that need them)
  const [selectedMaterials, setSelectedMaterials] = useState(new Set());

  // Dashboard handlers hook
  const dashboardHandlers = useDashboardHandlers({
    childrenData,
    materialManagement,
    modalManagement,
    showSuccess,
    showError,
    showWarning,
    subscriptionPermissions,
    selectedMaterials,
    setSelectedMaterials,
    setBatchSelectionMode: () => {} // No-op function since we removed batch selection
  });

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
    // Check if session is explicitly null/false (not just undefined which means loading)
    // and no user is present
    if (session !== undefined && !session?.user) {
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

  // Only refresh data when returning from subject management or after long absence
  useEffect(() => {
    let lastVisibleTime = Date.now();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && childrenData.selectedChild?.id) {
        const timeSinceLastVisible = Date.now() - lastVisibleTime;
        const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

        // Only refresh if user was away for more than 5 minutes or if coming from data-modifying pages
        const needsTimeBasedRefresh = shouldRefreshBasedOnTime(lastVisibleTime, REFRESH_THRESHOLD);
        const needsSignalBasedRefresh = checkAndClearRefreshSignal();
        const comingFromDataModifyingPage = isComingFromDataModifyingPage();

        const shouldRefresh = needsTimeBasedRefresh || needsSignalBasedRefresh || comingFromDataModifyingPage;

        if (shouldRefresh) {
          childrenData.invalidateChildCache(childrenData.selectedChild.id);
          childrenData.refreshChildSpecificData(true);
        }
      } else if (document.visibilityState === 'hidden') {
        lastVisibleTime = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [childrenData.selectedChild?.id, childrenData.invalidateChildCache, childrenData.refreshChildSpecificData]);

  // Check for refresh signal on mount and when selected child changes
  useEffect(() => {
    if (childrenData.selectedChild?.id) {
      const needsRefresh = checkAndClearRefreshSignal();
      if (needsRefresh) {
        childrenData.invalidateChildCache(childrenData.selectedChild.id);
        childrenData.refreshChildSpecificData(true);
      }
    }
  }, [childrenData.selectedChild?.id]);

  useEffect(() => {
    materialManagement.setSelectedLessonContainer("");
  }, [materialManagement.lessonJsonForApproval?.unit_id, materialManagement.setSelectedLessonContainer]);

  // Listen for AI processing completion to refresh materials
  useEffect(() => {
    const handleProcessingComplete = (event) => {
      const { materialId, materialInfo } = event.detail;
      // Material processing completed for ${materialId}

      // Refresh child data to update materials list with new title
      if (childrenData.selectedChild?.id) {
        childrenData.invalidateChildCache(childrenData.selectedChild.id);
        childrenData.refreshChildSpecificData(true);
      }
    };

    window.addEventListener('materialProcessingComplete', handleProcessingComplete);

    return () => {
      window.removeEventListener('materialProcessingComplete', handleProcessingComplete);
    };
  }, [childrenData]);

  // Extract handlers from the hook
  const {
    handleAddLessonFormSubmit,
    handleManualMaterialSubmit,
    handleApproveNewLesson,
    handleToggleLessonCompleteEnhanced: handleToggleLessonComplete,
    handleConfirmDeleteMaterialEnhanced: handleConfirmDeleteMaterial,
    handleUpdateLessonJsonForApprovalField,
    handleCreateNewUnit,
    handleCreateNewLessonContainer,
    handleUpdateUnit,
    handleAddChildSubmit,
    handleConfirmDeleteChild,
    handleSetChildUsername,
    handleSetChildPin,
    handleOpenChildLoginSettingsModal,
    handleCloseChildLoginSettingsModal,
    handleGradeSubmit,
    handleGradeModalClose,
    handleMaterialSelection,
    handleClearBatchSelection,
    handleBatchComplete,
    handleBatchDelete,
    handleBatchEdit,
    handleBatchSave,
    handleGenericUpgrade,
    handleCloseDeleteMaterialModal,
    handleCloseDeleteChildModal,
    clearCredentialMessages,
    handleOpenEditModal,
    handleSaveLessonEdit,
    handleDeleteMaterial,
    handleDeleteChild,
    handleLessonContainerChange
  } = dashboardHandlers;

  // Keep some simplified handlers that need dashboard-specific logic
  const handleAddUnit = dashboardHandlers.handleAddUnit;
  const handleBulkAddUnits = dashboardHandlers.handleBulkAddUnits;
  const handleDeleteUnit = dashboardHandlers.handleDeleteUnit;
  const handleCreateLessonGroupInModal = dashboardHandlers.handleCreateLessonGroupInModal;
  const handleCreateLessonGroupFromCard = dashboardHandlers.handleCreateLessonGroupFromCard;

  // Simple handlers that call dashboard handler functions
  const openManageUnitsModal = (subject) => {
    modalManagement.openManageUnitsModal(subject);
    modalManagement.setCurrentSubjectUnitsInModal(
      childrenData.unitsBySubject[subject.child_subject_id] || []
    );
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

  // Computed data for the add form
  const currentUnitsForAddFormSubject = materialManagement.addLessonSubject && childrenData.selectedChild && childrenData.childSubjects[childrenData.selectedChild.id]
    ? childrenData.unitsBySubject[materialManagement.addLessonSubject] || []
    : [];

  // Get selected materials data
  const selectedMaterialsData = useMemo(() => {
    const allLessons = Object.values(childrenData.lessonsBySubject).flat();
    return allLessons.filter(lesson => selectedMaterials.has(lesson.id));
  }, [selectedMaterials, childrenData.lessonsBySubject]);

  // Filter lessons to show only the current child's lessons
  const currentChildLessonsBySubject = useMemo(() => {
    if (!childrenData.selectedChild) return {};

    // Get subjects for the current child
    const currentChildSubjects = childrenData.childSubjects[childrenData.selectedChild.id] || [];
    const currentChildSubjectIds = currentChildSubjects.map(subject => subject.child_subject_id);

    // Filter lessonsBySubject to include only current child's subjects
    const filteredLessons = {};
    currentChildSubjectIds.forEach(subjectId => {
      if (childrenData.lessonsBySubject[subjectId]) {
        filteredLessons[subjectId] = childrenData.lessonsBySubject[subjectId];
      }
    });

    return filteredLessons;
  }, [childrenData.selectedChild?.id, childrenData.childSubjects, childrenData.lessonsBySubject]);

  const isLoading = session === undefined || subscriptionLoading || (childrenData.loadingInitial && childrenData.children.length === 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-main">
        <div className="text-xl text-text-secondary">Initializing Dashboard...</div>
      </div>
    );
  }

  // If no session user, don't render anything (redirect will happen in useEffect)
  if (!session?.user) return null;

  return (
    <div className="flex h-screen bg-background-main overflow-hidden">
      {/* Mobile-responsive sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0 bg-background-card border-r border-border-subtle shadow-lg">
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
            modalManagement.openUpgradePrompt('children');
          }}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-6 lg:p-10">
        {/* Mobile Header - only visible on mobile/tablet */}
        <div className="lg:hidden mb-4">
          <DashboardHeader
            selectedChild={childrenData.selectedChild}
            childrenList={childrenData.children}
            onChildSelect={childrenData.setSelectedChild}
            showChildSelector={true}
          />
        </div>

        {/* Rest of mobile header content for backward compatibility */}
        <div className="lg:hidden mb-4 hidden">
          <div className="bg-background-card rounded-lg shadow-sm border border-border-subtle p-4">
            <div className="flex items-center justify-between mb-3">
              <Link href="/" className="flex items-center">
                <Image
                  src="/klio_logo.png"
                  alt="Klio AI"
                  width={24}
                  height={24}
                  className="mr-2"
                />
                <span className="text-lg font-bold text-accent-blue">Klio AI</span>
              </Link>
              <div className="flex gap-2">
                <Link
                  href="/schedule"
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                >
                  📅
                </Link>
                <Link
                  href="/logout"
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                >
                  ⬅️
                </Link>
              </div>
            </div>

            {/* Mobile Child Selector */}
            {childrenData.children.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Select Child
                </label>
                <select
                  value={childrenData.selectedChild?.id || ''}
                  onChange={(e) => {
                    const child = childrenData.children.find(c => c.id.toString() === e.target.value);
                    childrenData.setSelectedChild(child);
                  }}
                  className="w-full p-3 border border-border-subtle rounded-lg bg-white text-text-primary"
                >
                  <option value="">Choose a child...</option>
                  {childrenData.children.map(child => (
                    <option key={child.id} value={child.id}>
                      {child.name} (Grade {child.grade || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <StudentHeader
          selectedChild={childrenData.selectedChild}
          dashboardStats={totalStats}
          onAddMaterial={() => modalManagement.openAddMaterialModal()}
        />

        {childrenData.selectedChild && (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: `${childrenData.selectedChild.name}'s Learning` }
            ]}
          />
        )}
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

            {/* Combined Today's Focus, Needs Grading, and Quick Notes Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
              {/* Today's Focus - Takes up 1/3 on large screens */}
              <div className="xl:col-span-1">
                <TodayOverview
                  key={childrenData.selectedChild?.id}
                  lessonsBySubject={currentChildLessonsBySubject}
                  selectedChild={childrenData.selectedChild}
                  onToggleComplete={handleToggleLessonComplete}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteMaterial}
                  maxItems={6}
                />
              </div>

              {/* Needs Grading Section - Takes up 1/3 on large screens */}
              <div className="xl:col-span-1">
                <NeedsGradingSection
                  lessonsBySubject={currentChildLessonsBySubject}
                  onQuickGrade={handleGradeSubmit}
                  onOpenGradeModal={modalManagement.openGradeModal}
                  isGrading={modalManagement.isSubmittingGrade}
                />
              </div>

              {/* Quick Notes - Takes up 1/3 on large screens */}
              <div className="xl:col-span-1">
                <ParentNotesSection
                  selectedChild={childrenData.selectedChild}
                />
              </div>
            </div>

            {/* DashboardFilters removed for now */}
            {childrenData.loadingChildData ? (
              <div className="space-y-4">
                <div className="text-center py-4 text-text-secondary">
                  Loading {childrenData.selectedChild.name}&apos;s curriculum...
                </div>
                <CurriculumSkeletonLoader />
              </div>
            ) : (
              <div className="mt-0">
                <DashboardContentHeader
                  childName={childrenData.selectedChild.name}
                />
                {assignedSubjectsForCurrentChild.length === 0 ? (
                  <div className="text-center p-8 bg-background-card rounded-lg shadow border border-border-subtle">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      Let&apos;s Set Up {childrenData.selectedChild.name}&apos;s Subjects
                    </h3>
                    <p className="text-text-secondary mb-4">
                      Start by adding the subjects your child will be studying this year.
                    </p>
                    <button
                      onClick={() => router.push("/subject-management")}
                      className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors shadow-md"
                    >
                      Add Subjects
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
                        onAddMaterial={() => modalManagement.openAddMaterialModal()}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </DashboardErrorBoundary>
        )}
      </div>

      {modalManagement.isAddMaterialModalOpen && (
        <ModalErrorBoundary>
          <div className={modalBackdropStyles} onClick={() => modalManagement.closeAddMaterialModal()}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => modalManagement.closeAddMaterialModal()}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-2 transition-all duration-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              <div className="p-6 overflow-y-auto flex-1">
                <StreamlinedAddAssignment
                  childSubjects={assignedSubjectsForCurrentChild}
                  selectedChild={childrenData.selectedChild}
                  onComplete={async () => {
                    // Refresh child data to show new materials
                    childrenData.invalidateChildCache(childrenData.selectedChild.id);
                    await childrenData.refreshChildSpecificData(true);
                  }}
                  onClose={() => modalManagement.closeAddMaterialModal()}
                />
              </div>
            </div>
          </div>
        </ModalErrorBoundary>
      )}

      <ModalErrorBoundary>
        <UnitManagementModal
          isOpen={modalManagement.isManageUnitsModalOpen}
          onClose={modalManagement.closeManageUnitsModal}
          managingUnitsForSubject={modalManagement.managingUnitsForSubject}
          currentSubjectUnitsInModal={modalManagement.currentSubjectUnitsInModal}
          setCurrentSubjectUnitsInModal={modalManagement.setCurrentSubjectUnitsInModal}
          newUnitNameModalState={modalManagement.newUnitNameModalState}
          setNewUnitNameModalState={modalManagement.setNewUnitNameModalState}
          bulkUnitCount={modalManagement.bulkUnitCount}
          setBulkUnitCount={modalManagement.setBulkUnitCount}
          editingUnit={modalManagement.editingUnit}
          setEditingUnit={modalManagement.setEditingUnit}
          expandedUnitsInModal={modalManagement.expandedUnitsInModal}
          setExpandedUnitsInModal={modalManagement.setExpandedUnitsInModal}
          creatingLessonGroupForUnit={modalManagement.creatingLessonGroupForUnit}
          setCreatingLessonGroupForUnit={modalManagement.setCreatingLessonGroupForUnit}
          newLessonGroupTitle={modalManagement.newLessonGroupTitle}
          setNewLessonGroupTitle={modalManagement.setNewLessonGroupTitle}
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

      {modalManagement.isChildLoginSettingsModalOpen && modalManagement.editingChildCredentials && (
        <ChildLoginSettingsModal
          isOpen={modalManagement.isChildLoginSettingsModalOpen}
          onClose={handleCloseChildLoginSettingsModal}
          child={modalManagement.editingChildCredentials}
          usernameInput={modalManagement.childUsernameInput}
          onUsernameInputChange={(e) => {
            modalManagement.setChildUsernameInput(e.target.value);
            clearCredentialMessages();
          }}
          pinInput={modalManagement.childPinInput}
          onPinInputChange={(e) => {
            modalManagement.setChildPinInput(e.target.value);
            clearCredentialMessages();
          }}
          pinConfirmInput={modalManagement.childPinConfirmInput}
          onPinConfirmInputChange={(e) => {
            modalManagement.setChildPinConfirmInput(e.target.value);
            clearCredentialMessages();
          }}
          onSetUsername={handleSetChildUsername}
          onSetPin={handleSetChildPin}
          formError={modalManagement.credentialFormError}
          formSuccess={modalManagement.credentialFormSuccess}
          isSaving={modalManagement.isSavingCredentials}
        />
      )}

      {modalManagement.showUpgradePrompt && (
        <UpgradePrompt
          isOpen={modalManagement.showUpgradePrompt}
          onClose={modalManagement.closeUpgradePrompt}
          feature={modalManagement.upgradeFeature}
          currentPlan={subscription?.plan_type || 'free'}
          onUpgrade={handleGenericUpgrade}
          isLoading={modalManagement.upgrading}
        />
      )}

      {modalManagement.showGradeModal && (
        <GradeInputModal
          isOpen={modalManagement.showGradeModal}
          onClose={handleGradeModalClose}
          onSubmit={handleGradeSubmit}
          lesson={modalManagement.gradingLesson}
          isLoading={modalManagement.isSubmittingGrade}
        />
      )}

      <MaterialDeleteModal
        isOpen={modalManagement.showDeleteMaterialModal}
        onClose={handleCloseDeleteMaterialModal}
        onConfirm={handleConfirmDeleteMaterial}
        material={modalManagement.deletingMaterial}
        isDeleting={modalManagement.isDeletingMaterial}
      />

      <ChildAccountDeleteModal
        isOpen={modalManagement.showDeleteChildModal}
        onClose={handleCloseDeleteChildModal}
        onConfirm={handleConfirmDeleteChild}
        child={modalManagement.deletingChild}
        childStats={modalManagement.deletingChild ? {
          totalMaterials: Object.values(childrenData.lessonsBySubject).flat().length,
          totalSubjects: childrenData.assignedSubjectsForCurrentChild.length,
          completedMaterials: Object.values(childrenData.lessonsBySubject).flat().filter(m => m.completed_at).length
        } : null}
        isDeleting={modalManagement.isDeletingChild}
      />

      {/* Batch Operations - Hidden since we removed Select Multiple */}
      <BatchActionsBar
        selectedItems={selectedMaterialsData}
        onClearSelection={handleClearBatchSelection}
        onBatchComplete={handleBatchComplete}
        onBatchDelete={handleBatchDelete}
        onBatchEdit={handleBatchEdit}
        isVisible={false}
      />

      <BatchEditModal
        isOpen={modalManagement.showBatchEditModal}
        onClose={modalManagement.closeBatchEditModal}
        selectedItems={selectedMaterialsData}
        onSave={handleBatchSave}
        isLoading={modalManagement.isBatchProcessing}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background-main"><div className="text-xl text-text-secondary">Loading Dashboard...</div></div>}>
      <DashboardPageContent />
    </Suspense>
  );
}
