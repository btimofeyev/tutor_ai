// List of subject cards with all necessary props
'use client';
import React from 'react';
import PropTypes from 'prop-types';
import SubjectCard from './SubjectCard';

export default function SubjectsList({
  subjects,
  filteredLessonsBySubject,
  unitsBySubject,
  lessonsByUnit,
  dashboardStats,
  batchSelectionMode,
  selectedMaterials,
  onEditMaterial,
  onManageUnits,
  onToggleComplete,
  onDeleteMaterial,
  onCreateLessonGroup,
  onMaterialSelection
}) {
  return (
    <div className="space-y-6">
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.child_subject_id || subject.id}
          subject={subject}
          lessons={filteredLessonsBySubject[subject.child_subject_id] || []}
          units={unitsBySubject[subject.child_subject_id] || []}
          lessonsByUnit={lessonsByUnit}
          subjectStats={
            subject.child_subject_id && dashboardStats[subject.child_subject_id]
              ? dashboardStats[subject.child_subject_id]
              : {
                  total: 0,
                  completed: 0,
                  avgGradePercent: null,
                  gradableItemsCount: 0,
                }
          }
          batchSelectionMode={batchSelectionMode}
          selectedMaterials={selectedMaterials}
          onOpenEditModal={onEditMaterial}
          onManageUnits={() => onManageUnits(subject)}
          onToggleComplete={onToggleComplete}
          onDeleteMaterial={onDeleteMaterial}
          onCreateLessonGroup={onCreateLessonGroup}
          onMaterialSelection={onMaterialSelection}
        />
      ))}
    </div>
  );
}

SubjectsList.propTypes = {
  subjects: PropTypes.array.isRequired,
  filteredLessonsBySubject: PropTypes.object.isRequired,
  unitsBySubject: PropTypes.object.isRequired,
  lessonsByUnit: PropTypes.object.isRequired,
  dashboardStats: PropTypes.object.isRequired,
  batchSelectionMode: PropTypes.bool.isRequired,
  selectedMaterials: PropTypes.object.isRequired,
  onEditMaterial: PropTypes.func.isRequired,
  onManageUnits: PropTypes.func.isRequired,
  onToggleComplete: PropTypes.func.isRequired,
  onDeleteMaterial: PropTypes.func.isRequired,
  onCreateLessonGroup: PropTypes.func.isRequired,
  onMaterialSelection: PropTypes.func.isRequired
};
