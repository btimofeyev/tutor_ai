// app/dashboard/components/AddMaterialTabs.js
'use client';
import React, { useState, useMemo, useCallback } from 'react';
import {
  PhotoIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
import AddMaterialFormSimplified from './AddMaterialFormSimplified';
import ManualMaterialForm from './ManualMaterialForm';

export default function AddMaterialTabs(props) {
  const {
    childSubjectsForSelectedChild,
    selectedChild,
    onMaterialsAdded,
    onClose,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4">
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Add New Assignment
        </h2>
        <p className="text-sm text-text-secondary">
          Choose how you&apos;d like to add this assignment to your child&apos;s work
        </p>
      </div>

      {/* Improved Tabs */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setActiveTab('upload')}
          className={`p-6 rounded-lg border-2 transition-all text-left hover:shadow-sm ${
            activeTab === 'upload'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-3">
            <PhotoIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Upload Files</h3>
          <p className="text-sm text-gray-600">
            Upload worksheets, PDFs, or documents. AI will help organize them.
          </p>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`p-6 rounded-lg border-2 transition-all text-left hover:shadow-sm ${
            activeTab === 'manual'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-3">
            <DocumentPlusIcon className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Quick Entry</h3>
          <p className="text-sm text-gray-600">
            Manually enter assignment details like reading or practice time.
          </p>
        </button>
      </div>

      {activeTab === 'upload' && (
        <AddMaterialFormSimplified
          childSubjects={childSubjectsForSelectedChild}
          selectedChild={selectedChild}
          onComplete={onMaterialsAdded}
          onClose={onClose}
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
