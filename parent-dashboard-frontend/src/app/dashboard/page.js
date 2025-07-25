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
import SubjectCard from "./components/SubjectCard";
import TodayOverview from "./components/TodayOverview";
import DashboardFilters from "./components/DashboardFilters";
import BatchActionsBar from "./components/BatchActionsBar";
import Button from "../../components/ui/Button";
import { CurriculumSkeletonLoader } from "../../components/ui/SkeletonLoader";
import { DashboardErrorBoundary, ModalErrorBoundary } from "../../components/ErrorBoundary";
import Breadcrumbs from "../../components/ui/Breadcrumbs";

// Layout Components
import DashboardHeader from "./components/DashboardHeader";
import { LoadingStateCard, NoChildSelectedCard, NoSubjectsCard } from "./components/EmptyStateCard";
import DashboardContentHeader from "./components/DashboardContentHeader";
import SubjectsList from "./components/SubjectsList";
import DashboardModals from "./components/DashboardModals";

// Modal Components
import AddMaterialTabs from "./components/AddMaterialTabs";
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
  const [batchSelectionMode, setBatchSelectionMode] = useState(false);
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
    setBatchSelectionMode
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


  useEffect(() => {
    materialManagement.setSelectedLessonContainer("");
  }, [materialManagement.lessonJsonForApproval?.unit_id, materialManagement.setSelectedLessonContainer]);

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
                    const child = childrenData.children.find(c => c.id === parseInt(e.target.value));
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
            <TodayOverview
              lessonsBySubject={childrenData.lessonsBySubject}
              selectedChild={childrenData.selectedChild}
              onToggleComplete={handleToggleLessonComplete}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteMaterial}
              maxItems={6}
            />
            
            <DashboardFilters
              filterStatus={filtersAndSorting.filterStatus}
              setFilterStatus={filtersAndSorting.setFilterStatus}
              filterContentType={filtersAndSorting.filterContentType}
              setFilterContentType={filtersAndSorting.setFilterContentType}
              sortBy={filtersAndSorting.sortBy}
              setSortBy={filtersAndSorting.setSortBy}
              searchTerm={filtersAndSorting.searchTerm}
              setSearchTerm={filtersAndSorting.setSearchTerm}
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
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-text-primary">
                      {childrenData.selectedChild.name}&apos;s Learning Journey
                    </h2>
                    <p className="text-sm text-text-secondary mt-1">
                      Track assignments, view progress, and manage schoolwork
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {assignedSubjectsForCurrentChild.length > 0 && (
                      <Button
                        onClick={() => setBatchSelectionMode(!batchSelectionMode)}
                        variant={batchSelectionMode ? "secondary" : "outline"}
                        className="flex-shrink-0"
                      >
                        {batchSelectionMode ? '✓ Selecting' : '☐ Select Multiple'}
                      </Button>
                    )}
                    <Button
                      onClick={() => modalManagement.openAddMaterialModal()}
                      variant="primary"
                      className="flex-shrink-0"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Assignment
                    </Button>
                  </div>
                </div>
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
                      className="px-6 py-3 bg-accent-blue hover:bg-[var(--accent-blue-hover)] text-white rounded-lg font-medium transition-colors"
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
            <div className={modalContainerStyles} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => modalManagement.closeAddMaterialModal()}
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

      {/* Batch Operations */}
      <BatchActionsBar
        selectedItems={selectedMaterialsData}
        onClearSelection={handleClearBatchSelection}
        onBatchComplete={handleBatchComplete}
        onBatchDelete={handleBatchDelete}
        onBatchEdit={handleBatchEdit}
        isVisible={batchSelectionMode && selectedMaterials.size > 0}
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
