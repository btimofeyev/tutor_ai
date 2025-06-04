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
    setLessonsByUnit,
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
    console.log('AddMaterialTabs: Computing lesson containers for unit:', manualFormSelectedUnitId);
    console.log('AddMaterialTabs: lessonsByUnit object:', lessonsByUnit);
    console.log('AddMaterialTabs: lessonsByUnit[unitId]:', lessonsByUnit[manualFormSelectedUnitId]);
    if (!manualFormSelectedUnitId || !lessonsByUnit) return [];
    return lessonsByUnit[manualFormSelectedUnitId] || [];
  }, [manualFormSelectedUnitId, lessonsByUnit]);

  // Callback to update the manual form's selected unit ID
  // This function is passed to ManualMaterialForm
  const handleManualFormUnitChange = useCallback(async (unitId) => {
    console.log('AddMaterialTabs: Setting manualFormSelectedUnitId to:', unitId);
    const previousUnitId = manualFormSelectedUnitId;
    setManualFormSelectedUnitId(unitId);
    
    // If this unit doesn't have lesson containers loaded, fetch them
    if (unitId && (!lessonsByUnit[unitId] || !Array.isArray(lessonsByUnit[unitId]))) {
      console.log('AddMaterialTabs: Fetching lesson containers for unit:', unitId);
      try {
        const api = (await import('../../../utils/api')).default;
        const lessonsRes = await api.get(`/lesson-containers/unit/${unitId}`);
        const lessonContainers = lessonsRes.data || [];
        console.log('AddMaterialTabs: Fetched lesson containers:', lessonContainers);
        
        // Update lesson containers for this unit
        if (setLessonsByUnit) {
          setLessonsByUnit(prev => ({
            ...prev,
            [unitId]: lessonContainers
          }));
          console.log('AddMaterialTabs: Updated lessonsByUnit for unit:', unitId);
        }
      } catch (error) {
        console.error('Error fetching lesson containers for unit:', error);
        // Initialize empty array on error
        if (setLessonsByUnit) {
          setLessonsByUnit(prev => ({
            ...prev,
            [unitId]: []
          }));
        }
      }
    }
    
    // Only reset lesson container selection if the unit actually changed
    if (unitId !== previousUnitId && onLessonContainerChange) {
        console.log('AddMaterialTabs: Unit changed from', previousUnitId, 'to', unitId, '- resetting lesson container selection');
        onLessonContainerChange({ target: { value: '' } }); 
    }
  }, [onLessonContainerChange, setLessonsByUnit, manualFormSelectedUnitId, lessonsByUnit]);

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