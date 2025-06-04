// app/dashboard/components/AddMaterialTabs.js
'use client';
import React, { useState, useMemo, useCallback } from 'react'; // Added useCallback
import { 
  PhotoIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
import AddMaterialForm from './AddMaterialForm';
import ManualMaterialForm from './ManualMaterialForm';

export default function AddMaterialTabs(props) {
  const {
    // Props for both/shared
    childSubjectsForSelectedChild,
    currentAddLessonSubject, 
    onAddLessonSubjectChange, 
    unitsForSelectedSubject,  
    lessonsByUnit, 
    selectedLessonContainer,  
    onLessonContainerChange,  
    onCreateNewLessonContainer, 
    onCreateNewUnit,
    appContentTypes,
    appGradableContentTypes,

    // Props for AddMaterialForm (Upload/Approval)
    onFormSubmit,
    onApprove,
    uploading,
    savingLesson, 
    lessonJsonForApproval,
    onUpdateLessonJsonField,
    lessonTitleForApproval,
    onLessonTitleForApprovalChange,
    lessonContentTypeForApproval,
    onLessonContentTypeForApprovalChange,
    lessonMaxPointsForApproval,
    onLessonMaxPointsForApprovalChange,
    lessonDueDateForApproval,
    onLessonDueDateForApprovalChange,
    lessonCompletedForApproval,
    onLessonCompletedForApprovalChange,
    currentAddLessonUserContentType,
    onAddLessonUserContentTypeChange,
    onAddLessonFileChange,
    currentAddLessonFile,
    lessonContainersForApprovalForm, 

    // Props for ManualMaterialForm
    onManualSubmit,
  } = props;

  const [activeTab, setActiveTab] = useState('upload');
  const [manualFormSelectedUnitId, setManualFormSelectedUnitId] = useState('');

  const tabStyles = "flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors";
  const activeTabStyles = "bg-accent-blue text-text-primary";
  const inactiveTabStyles = "bg-gray-100 text-text-secondary hover:bg-gray-200";

  // Memoize the lesson containers for the Manual Form
  const lessonContainersForManualForm = useMemo(() => {
    if (!manualFormSelectedUnitId || !lessonsByUnit) return [];
    return lessonsByUnit[manualFormSelectedUnitId] || [];
  }, [manualFormSelectedUnitId, lessonsByUnit]);

  // Callback to update the manual form's selected unit ID
  // This function is passed to ManualMaterialForm
  const handleManualFormUnitChange = useCallback((unitId) => {
    console.log('AddMaterialTabs: Setting manualFormSelectedUnitId to:', unitId);
    setManualFormSelectedUnitId(unitId);
    // When manual form's unit changes, reset the global lesson container selection
    // as it's no longer relevant if it belonged to a different unit.
    if (onLessonContainerChange) { // Check if prop exists before calling
        onLessonContainerChange({ target: { value: '' } }); 
    }
  }, [onLessonContainerChange]); // Dependency: onLessonContainerChange prop

  // For debugging:
  // console.log("AddMaterialTabs rendering. manualFormSelectedUnitId:", manualFormSelectedUnitId);
  // console.log("AddMaterialTabs unitsForSelectedSubject:", unitsForSelectedSubject);
  // console.log("AddMaterialTabs lessonsByUnit:", lessonsByUnit);


  return (
    <div className="space-y-4">
      <div className="flex space-x-2 p-1 bg-gray-50 rounded-lg">
        <button
          onClick={() => setActiveTab('upload')}
          className={`${tabStyles} ${activeTab === 'upload' ? activeTabStyles : inactiveTabStyles} flex-1 justify-center`}
        >
          <PhotoIcon className="h-4 w-4 mr-2" />
          Upload Files
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`${tabStyles} ${activeTab === 'manual' ? activeTabStyles : inactiveTabStyles} flex-1 justify-center`}
        >
          <DocumentPlusIcon className="h-4 w-4 mr-2" />
          Quick Entry
        </button>
      </div>

      {activeTab === 'upload' && (
        <AddMaterialForm 
          childSubjectsForSelectedChild={childSubjectsForSelectedChild}
          currentAddLessonSubject={currentAddLessonSubject}
          onAddLessonSubjectChange={onAddLessonSubjectChange}
          unitsForSelectedSubject={unitsForSelectedSubject} 
          onCreateNewUnit={onCreateNewUnit}
          selectedLessonContainer={selectedLessonContainer}
          onLessonContainerChange={onLessonContainerChange}
          onCreateNewLessonContainer={(newTitle) => 
            onCreateNewLessonContainer(newTitle, lessonJsonForApproval?.unit_id)
          }
          appContentTypes={appContentTypes}
          appGradableContentTypes={appGradableContentTypes}
          onFormSubmit={onFormSubmit}
          onApprove={onApprove}
          uploading={uploading}
          savingLesson={savingLesson}
          lessonJsonForApproval={lessonJsonForApproval}
          onUpdateLessonJsonField={onUpdateLessonJsonField}
          lessonTitleForApproval={lessonTitleForApproval}
          onLessonTitleForApprovalChange={onLessonTitleForApprovalChange}
          lessonContentTypeForApproval={lessonContentTypeForApproval}
          onLessonContentTypeForApprovalChange={onLessonContentTypeForApprovalChange}
          lessonMaxPointsForApproval={lessonMaxPointsForApproval}
          onLessonMaxPointsForApprovalChange={onLessonMaxPointsForApprovalChange}
          lessonDueDateForApproval={lessonDueDateForApproval}
          onLessonDueDateForApprovalChange={onLessonDueDateForApprovalChange}
          lessonCompletedForApproval={lessonCompletedForApproval}
          onLessonCompletedForApprovalChange={onLessonCompletedForApprovalChange}
          currentAddLessonUserContentType={currentAddLessonUserContentType}
          onAddLessonUserContentTypeChange={onAddLessonUserContentTypeChange}
          onAddLessonFileChange={onAddLessonFileChange}
          currentAddLessonFile={currentAddLessonFile}
          lessonContainersForSelectedUnit={lessonContainersForApprovalForm} 
        />
      )}
      
      {activeTab === 'manual' && (
        <ManualMaterialForm 
          childSubjectsForSelectedChild={childSubjectsForSelectedChild}
          currentSubject={currentAddLessonSubject} 
          onSubjectChange={onAddLessonSubjectChange} 
          
          unitsForSelectedSubject={unitsForSelectedSubject} 
          onCreateNewUnit={onCreateNewUnit}
          
          selectedUnitInManualForm={manualFormSelectedUnitId}
          onManualFormUnitChange={handleManualFormUnitChange} 

          lessonContainersForSelectedUnit={lessonContainersForManualForm} 
          
          selectedLessonContainer={selectedLessonContainer} 
          onLessonContainerChange={onLessonContainerChange} 

          onCreateNewLessonContainer={(newTitle) => 
            onCreateNewLessonContainer(newTitle, manualFormSelectedUnitId)
          }
          
          onSubmit={onManualSubmit}
          savingMaterial={savingLesson} 
          appContentTypes={appContentTypes}
          appGradableContentTypes={appGradableContentTypes}
        />
      )}
    </div>
  );
}