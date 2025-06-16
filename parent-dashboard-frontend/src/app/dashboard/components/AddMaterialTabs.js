// app/dashboard/components/AddMaterialTabs.js
'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { 
  PhotoIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
import AddMaterialForm from './AddMaterialForm';
import ManualMaterialForm from './ManualMaterialForm';

export default function AddMaterialTabs(props) {
  const {
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
    onManualSubmit,
  } = props;

  const [activeTab, setActiveTab] = useState('upload');
  const [manualFormSelectedUnitId, setManualFormSelectedUnitId] = useState('');

  const tabStyles = "flex-1 text-center px-1 py-3 text-sm font-medium transition-colors duration-200 ease-in-out border-b-2 focus:outline-none focus:ring-2 focus:ring-accent-yellow-darker-for-border focus:ring-offset-2";
  const activeTabStyles = "text-text-primary border-accent-yellow-darker-for-border font-semibold";
  const inactiveTabStyles = "text-text-secondary border-transparent hover:text-text-primary hover:border-gray-200";


  const lessonContainersForManualForm = useMemo(() => {
    if (!manualFormSelectedUnitId || !lessonsByUnit) return [];
    return lessonsByUnit[manualFormSelectedUnitId] || [];
  }, [manualFormSelectedUnitId, lessonsByUnit]);

  const handleManualFormUnitChange = useCallback(async (unitId) => {
    const previousUnitId = manualFormSelectedUnitId;
    setManualFormSelectedUnitId(unitId);
    
    if (unitId && (!lessonsByUnit[unitId] || !Array.isArray(lessonsByUnit[unitId]))) {
      try {
        const api = (await import('../../../utils/api')).default;
        const lessonsRes = await api.get(`/lesson-containers/unit/${unitId}`);
        const lessonContainers = lessonsRes.data || [];
        
        if (setLessonsByUnit) {
          setLessonsByUnit(prev => ({
            ...prev,
            [unitId]: lessonContainers
          }));
        }
      } catch (error) {
        if (setLessonsByUnit) {
          setLessonsByUnit(prev => ({
            ...prev,
            [unitId]: []
          }));
        }
      }
    }
    
    if (unitId !== previousUnitId && onLessonContainerChange) {
        onLessonContainerChange({ target: { value: '' } }); 
    }
  }, [onLessonContainerChange, setLessonsByUnit, manualFormSelectedUnitId, lessonsByUnit]);

  return (
    <div className="space-y-4">
      <div className="flex border-b border-border-subtle">
        <button
          onClick={() => setActiveTab('upload')}
          className={`${tabStyles} ${activeTab === 'upload' ? activeTabStyles : inactiveTabStyles}`}
        >
          <PhotoIcon className="h-4 w-4 mr-2 inline-block" />
          Upload Files
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`${tabStyles} ${activeTab === 'manual' ? activeTabStyles : inactiveTabStyles}`}
        >
          <DocumentPlusIcon className="h-4 w-4 mr-2 inline-block" />
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
