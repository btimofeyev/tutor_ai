// Container for all dashboard modals with consistent error boundaries
'use client';
import React from 'react';
import PropTypes from 'prop-types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ModalErrorBoundary } from '../../../components/ErrorBoundary';
import AddMaterialTabs from './AddMaterialTabs';
import EditMaterialModal from './EditMaterialModal';
import MaterialDeleteModal from './MaterialDeleteModal';
import ChildAccountDeleteModal from './ChildAccountDeleteModal';
import ChildLoginSettingsModal from './ChildLoginSettingsModal';
import GradeInputModal from './GradeInputModal';
import UnitManagementModal from './UnitManagementModal';
import BatchEditModal from './BatchEditModal';
import UpgradePrompt from '../../../components/UpgradePrompt';
import { 
  modalBackdropStyles, 
  modalContainerStyles,
  modalCloseButtonStyles
} from '../../../utils/dashboardStyles';

export default function DashboardModals({
  // Modal states
  modalManagement,
  materialManagement,
  childrenData,
  
  // Data
  assignedSubjects,
  currentUnitsForAddFormSubject,
  currentLessonContainersForUnit,
  editingMaterialLessonContainers,
  subscription,
  subscriptionPermissions,
  
  // Constants
  APP_CONTENT_TYPES,
  APP_GRADABLE_CONTENT_TYPES,
  
  // Handlers
  onAddLessonFormSubmit,
  onApproveNewLesson,
  onManualMaterialSubmit,
  onUpdateLessonJsonForApprovalField,
  onLessonContainerChange,
  onCreateNewUnit,
  onCreateNewLessonContainer,
  onEditModalFormChange,
  onSaveLessonEdit,
  onCloseChildLoginSettingsModal,
  onSetChildUsername,
  onSetChildPin,
  onGenericUpgrade,
  onGradeSubmit,
  onGradeModalClose,
  onConfirmDeleteMaterial,
  onCloseDeleteMaterialModal,
  onConfirmDeleteChild,
  onCloseDeleteChildModal,
  onAddUnit,
  onBulkAddUnits,
  onUpdateUnit,
  onDeleteUnit,
  onCreateLessonGroupInModal,
  onBatchSave,
  clearCredentialMessages,
  
  // Toast functions
  showSuccess,
  showError,
  
  // Batch selection
  selectedMaterials
}) {
  return (
    <>
      {/* Add Material Modal */}
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
                  childSubjectsForSelectedChild={assignedSubjects}
                  onFormSubmit={onAddLessonFormSubmit}
                  onApprove={onApproveNewLesson}
                  onManualSubmit={onManualMaterialSubmit}
                  
                  uploading={materialManagement.uploading}
                  savingLesson={materialManagement.savingLesson}
                  
                  lessonJsonForApproval={materialManagement.lessonJsonForApproval}
                  onUpdateLessonJsonField={onUpdateLessonJsonForApprovalField}
                  
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
                  onCreateNewUnit={onCreateNewUnit}
                  lessonContainersForSelectedUnit={currentLessonContainersForUnit}
                  lessonsByUnit={childrenData.lessonsByUnit}
                  setLessonsByUnit={childrenData.setLessonsByUnit}
                  selectedLessonContainer={materialManagement.selectedLessonContainer}
                  onLessonContainerChange={onLessonContainerChange}
                  onCreateNewLessonContainer={onCreateNewLessonContainer}
                  subscriptionPermissions={subscriptionPermissions}
                />
              </div>
            </div>
          </div>
        </ModalErrorBoundary>
      )}

      {/* Unit Management Modal */}
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
          onAddUnit={onAddUnit}
          onBulkAddUnits={onBulkAddUnits}
          onUpdateUnit={onUpdateUnit}
          onDeleteUnit={onDeleteUnit}
          onCreateLessonGroupInModal={onCreateLessonGroupInModal}
          childrenData={childrenData}
          showSuccess={showSuccess}
          showError={showError}
        />
      </ModalErrorBoundary>

      {/* Edit Material Modal */}
      {materialManagement.editingLesson && (
        <EditMaterialModal
          editingLesson={materialManagement.editingLesson}
          editForm={materialManagement.editForm}
          onFormChange={onEditModalFormChange}
          onSave={onSaveLessonEdit}
          onClose={materialManagement.cancelEditingLesson}
          isSaving={materialManagement.isSavingEdit}
          appContentTypes={APP_CONTENT_TYPES}
          appGradableContentTypes={APP_GRADABLE_CONTENT_TYPES}
          unitsForSubject={childrenData.unitsBySubject[materialManagement.editForm?.child_subject_id] || []}
          lessonContainersForSubject={editingMaterialLessonContainers}
        />
      )}

      {/* Child Login Settings Modal */}
      {modalManagement.isChildLoginSettingsModalOpen && modalManagement.editingChildCredentials && (
        <ChildLoginSettingsModal
          isOpen={modalManagement.isChildLoginSettingsModalOpen}
          onClose={onCloseChildLoginSettingsModal}
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
          onSetUsername={onSetChildUsername}
          onSetPin={onSetChildPin}
          formError={modalManagement.credentialFormError}
          formSuccess={modalManagement.credentialFormSuccess}
          isSaving={modalManagement.isSavingCredentials}
        />
      )}
      
      {/* Upgrade Prompt Modal */}
      {modalManagement.showUpgradePrompt && (
        <UpgradePrompt
          isOpen={modalManagement.showUpgradePrompt}
          onClose={modalManagement.closeUpgradePrompt}
          feature={modalManagement.upgradeFeature}
          currentPlan={subscription?.plan_type || 'free'}
          onUpgrade={onGenericUpgrade}
          isLoading={modalManagement.upgrading}
        />
      )}

      {/* Grade Input Modal */}
      {modalManagement.showGradeModal && (
        <GradeInputModal
          isOpen={modalManagement.showGradeModal}
          onClose={onGradeModalClose}
          onSubmit={onGradeSubmit}
          lesson={modalManagement.gradingLesson}
          isLoading={modalManagement.isSubmittingGrade}
        />
      )}

      {/* Material Delete Modal */}
      <MaterialDeleteModal
        isOpen={modalManagement.showDeleteMaterialModal}
        onClose={onCloseDeleteMaterialModal}
        onConfirm={onConfirmDeleteMaterial}
        material={modalManagement.deletingMaterial}
        isDeleting={modalManagement.isDeletingMaterial}
      />

      {/* Child Account Delete Modal */}
      <ChildAccountDeleteModal
        isOpen={modalManagement.showDeleteChildModal}
        onClose={onCloseDeleteChildModal}
        onConfirm={onConfirmDeleteChild}
        child={modalManagement.deletingChild}
        isDeleting={modalManagement.isDeletingChild}
      />

      {/* Batch Edit Modal */}
      <BatchEditModal
        isOpen={modalManagement.showBatchEditModal}
        onClose={modalManagement.closeBatchEditModal}
        selectedItems={Array.from(selectedMaterials).map(id => 
          Object.values(childrenData.lessonsBySubject).flat().find(lesson => lesson.id === parseInt(id))
        ).filter(Boolean)}
        onSave={onBatchSave}
        isLoading={modalManagement.isBatchProcessing}
      />
    </>
  );
}

DashboardModals.propTypes = {
  modalManagement: PropTypes.object.isRequired,
  materialManagement: PropTypes.object.isRequired,
  childrenData: PropTypes.object.isRequired,
  assignedSubjects: PropTypes.array.isRequired,
  currentUnitsForAddFormSubject: PropTypes.array.isRequired,
  currentLessonContainersForUnit: PropTypes.array.isRequired,
  editingMaterialLessonContainers: PropTypes.array.isRequired,
  subscription: PropTypes.object,
  subscriptionPermissions: PropTypes.object.isRequired,
  APP_CONTENT_TYPES: PropTypes.array.isRequired,
  APP_GRADABLE_CONTENT_TYPES: PropTypes.array.isRequired,
  selectedMaterials: PropTypes.object.isRequired,
  
  // Handler functions
  onAddLessonFormSubmit: PropTypes.func.isRequired,
  onApproveNewLesson: PropTypes.func.isRequired,
  onManualMaterialSubmit: PropTypes.func.isRequired,
  onUpdateLessonJsonForApprovalField: PropTypes.func.isRequired,
  onLessonContainerChange: PropTypes.func.isRequired,
  onCreateNewUnit: PropTypes.func.isRequired,
  onCreateNewLessonContainer: PropTypes.func.isRequired,
  onEditModalFormChange: PropTypes.func.isRequired,
  onSaveLessonEdit: PropTypes.func.isRequired,
  onCloseChildLoginSettingsModal: PropTypes.func.isRequired,
  onSetChildUsername: PropTypes.func.isRequired,
  onSetChildPin: PropTypes.func.isRequired,
  onGenericUpgrade: PropTypes.func.isRequired,
  onGradeSubmit: PropTypes.func.isRequired,
  onGradeModalClose: PropTypes.func.isRequired,
  onConfirmDeleteMaterial: PropTypes.func.isRequired,
  onCloseDeleteMaterialModal: PropTypes.func.isRequired,
  onConfirmDeleteChild: PropTypes.func.isRequired,
  onCloseDeleteChildModal: PropTypes.func.isRequired,
  onAddUnit: PropTypes.func.isRequired,
  onBulkAddUnits: PropTypes.func.isRequired,
  onUpdateUnit: PropTypes.func.isRequired,
  onDeleteUnit: PropTypes.func.isRequired,
  onCreateLessonGroupInModal: PropTypes.func.isRequired,
  onBatchSave: PropTypes.func.isRequired,
  clearCredentialMessages: PropTypes.func.isRequired,
  showSuccess: PropTypes.func.isRequired,
  showError: PropTypes.func.isRequired
};