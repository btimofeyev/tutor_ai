// app/dashboard/components/SubjectCard.js
'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CogIcon, ChevronDownIcon, ChevronUpIcon, FolderOpenIcon, PlusCircleIcon, ListBulletIcon, ClockIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import MaterialListItem from './MaterialListItem'; // Ensure this is styled
import CompletionPieChart from './charts/CompletionPieChart'; // Ensure this is styled

// Constants moved from MaterialListItem to be accessible here if needed
const GRADABLE_CONTENT_TYPES = ['worksheet', 'assignment', 'test', 'quiz'];

export default function SubjectCard({ 
    subject, 
    lessons = [], 
    units = [], 
    lessonsByUnit = {},
    subjectStats, 
    onOpenEditModal, 
    onManageUnits,
    onToggleComplete
}) {
  const [expandedUnits, setExpandedUnits] = useState({});
  const [expandedLessonContainers, setExpandedLessonContainers] = useState({});
  
  if (!subject.child_subject_id) { 
    return (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 shadow-sm">
            <div className="font-semibold text-text-primary mb-1">{subject.name}</div>
            <div className="text-sm text-orange-700">
                <b>Configuration Incomplete:</b> This subject needs to be fully set up for this student.
            </div>
        </div>
    );
  }
  
  const currentSubjectStats = subjectStats;

  const upcomingDueItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return lessons
      .filter(lesson => !lesson.completed_at && lesson.due_date)
      .map(lesson => ({
        ...lesson,
        dueDateObj: new Date(lesson.due_date + 'T00:00:00Z') // Ensure UTC context for due date
      }))
      .filter(lesson => lesson.dueDateObj >= today)
      .sort((a, b) => a.dueDateObj - b.dueDateObj)
      .slice(0, 3);
  }, [lessons]);

  const generalMaterials = useMemo(() => {
    return lessons.filter(lesson => !lesson.lesson_id); // Materials not in any lesson container
  }, [lessons]);

  const toggleUnitExpansion = (unitId) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const toggleLessonContainerExpansion = (lessonContainerId) => {
    setExpandedLessonContainers(prev => ({ ...prev, [lessonContainerId]: !prev[lessonContainerId] }));
  };

  const commonButtonStyles = "flex items-center text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1";
  const primaryButtonStyles = `${commonButtonStyles} bg-accent-blue text-text-on-accent hover:bg-accent-blue-hover focus:ring-accent-blue`;
  const secondaryButtonStyles = `${commonButtonStyles} bg-gray-100 text-text-secondary hover:bg-gray-200 focus:ring-accent-blue`;


  const renderLessonContainerMaterials = (lessonContainer, materials) => {
    const isExpanded = !!expandedLessonContainers[lessonContainer.id];
    const materialCount = materials.length;
    
    if (materialCount === 0) return null;

    return (
      <div key={lessonContainer.id} className="ml-4 mt-1.5 pl-3"> {/* Removed border for cleaner look, rely on indentation */}
        <div 
          className="flex justify-between items-center py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2 group"
          onClick={() => toggleLessonContainerExpansion(lessonContainer.id)}
          role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleLessonContainerExpansion(lessonContainer.id)}
          aria-expanded={isExpanded} aria-controls={`lesson-content-${lessonContainer.id}`}
        >
          <h5 className="text-sm font-medium text-text-secondary flex items-center">
            <ListBulletIcon className="h-4 w-4 mr-1.5 text-text-tertiary group-hover:text-accent-blue transition-colors"/>
            {lessonContainer.title}
            <span className="ml-1.5 text-xs text-text-tertiary font-normal">({materialCount})</span>
          </h5>
          {isExpanded ? <ChevronUpIcon className="h-4 w-4 text-text-tertiary"/> : <ChevronDownIcon className="h-4 w-4 text-text-tertiary"/>}
        </div>
        
        {isExpanded && (
            <div id={`lesson-content-${lessonContainer.id}`} className="mt-1.5 pl-1 space-y-1.5">
                {materials.map(material => (
                <MaterialListItem 
                    key={material.id} 
                    lesson={material} 
                    onOpenEditModal={onOpenEditModal}
                    onToggleComplete={onToggleComplete}
                />
                ))}
            </div>
        )}
      </div>
    );
  };

  const renderUnitSection = (unit) => {
    const lessonContainersInUnit = (lessonsByUnit[unit.id] || [])
      .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.title.localeCompare(b.title));
      
    const isExpanded = !!expandedUnits[unit.id];
    
    const allUnitMaterialsCount = lessonContainersInUnit.reduce((acc, container) => {
      const containerMaterials = lessons.filter(lesson => lesson.lesson_id === container.id);
      return acc + containerMaterials.length;
    }, 0);
    
    // Don't render unit if it has no lesson containers AND no materials within those containers
    if (lessonContainersInUnit.length === 0 && allUnitMaterialsCount === 0) return null;

    return (
      <div key={unit.id} className="mt-3 pt-3 border-t border-border-subtle first:mt-0 first:pt-0 first:border-t-0">
        <div 
          className="flex justify-between items-center py-2 cursor-pointer hover:bg-gray-100 rounded-md px-2.5 group"
          onClick={() => toggleUnitExpansion(unit.id)}
          role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleUnitExpansion(unit.id)}
          aria-expanded={isExpanded} aria-controls={`unit-content-${unit.id}`}
        >
          <h4 className="text-base font-semibold text-text-primary flex items-center">
            <FolderOpenIcon className="h-5 w-5 mr-2 text-text-secondary group-hover:text-accent-blue transition-colors"/>
            {unit.name}
            <span className="ml-2 text-xs text-text-tertiary font-normal">
              ({lessonContainersInUnit.length} lesson groups, {allUnitMaterialsCount} materials)
            </span>
          </h4>
          {isExpanded ? <ChevronUpIcon className="h-5 w-5 text-text-secondary"/> : <ChevronDownIcon className="h-5 w-5 text-text-secondary"/>}
        </div>
        
        {isExpanded && (
            <div id={`unit-content-${unit.id}`} className="mt-1.5 pl-2">
            {lessonContainersInUnit.length === 0 ? (
                <div className="text-xs italic text-text-tertiary ml-6 py-2">No lesson groups in this unit yet.</div>
            ) : (
                lessonContainersInUnit.map(container => {
                const containerMaterials = lessons.filter(lesson => lesson.lesson_id === container.id);
                return renderLessonContainerMaterials(container, containerMaterials);
                })
            )}
            </div>
        )}
      </div>
    );
  };

  const renderGeneralMaterialsSection = () => {
    if (generalMaterials.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t border-border-subtle">
        <h4 className="text-base font-semibold text-text-primary flex items-center px-2.5 py-2">
          <ListBulletIcon className="h-5 w-5 mr-2 text-text-secondary"/>
          General Materials
          <span className="ml-2 text-xs text-text-tertiary font-normal">({generalMaterials.length})</span>
        </h4>
        <ul className="space-y-1.5 mt-1.5 px-2.5">
          {generalMaterials.map(material => (
            <MaterialListItem 
              key={material.id} 
              lesson={material} 
              onOpenEditModal={onOpenEditModal}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="bg-background-card rounded-lg p-4 sm:p-5 shadow-sm border border-border-subtle">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-3 pb-3 border-b border-border-subtle">
        <div className="mb-2 sm:mb-0 flex-grow">
          <h3 className="text-xl font-semibold text-text-primary">{subject.name}</h3>
          {currentSubjectStats && (
            <div className="text-xs text-text-secondary mt-1 space-x-3">
              <span><ListBulletIcon className="h-3.5 w-3.5 inline-block mr-1 text-text-tertiary align-text-bottom"/>{currentSubjectStats.total} items</span>
              <span><span className="text-accent-green font-medium">{currentSubjectStats.completed}</span> done</span>
              {currentSubjectStats.avgGradePercent !== null && (
                <span>Avg Grade: <span className="font-medium">{currentSubjectStats.avgGradePercent}%</span></span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto mt-2 sm:mt-0">
            {currentSubjectStats && currentSubjectStats.total > 0 && (
              <div className="flex-shrink-0 w-[70px] h-[70px] sm:w-[80px] sm:h-[80px] mr-2">
                <CompletionPieChart completed={currentSubjectStats.completed} total={currentSubjectStats.total} />
              </div>
            )}
            <div className="flex sm:flex-col space-x-2 sm:space-x-0 sm:space-y-1.5 w-full sm:w-auto justify-around sm:justify-start">
                <button 
                    onClick={onManageUnits} 
                    title="Manage Units & Lesson Groups" 
                    className={`${secondaryButtonStyles} w-full sm:w-auto justify-center`}
                >
                    <PlusCircleIcon className="h-4 w-4 mr-1.5"/> Units & Groups
                </button>
                <Link href={`/subject-settings/${subject.child_subject_id}`} legacyBehavior>
                    <a title="Subject Settings & Weights" className={`${secondaryButtonStyles} w-full sm:w-auto justify-center`}>
                        <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1.5" /> Weights
                    </a>
                </Link>
            </div>
        </div>
      </div>
      
      {upcomingDueItems.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50/50 rounded-md border border-blue-100"> {/* Lighter blue */}
          <h4 className="text-sm font-medium text-accent-blue mb-1.5 flex items-center">
            <ClockIcon className="h-4 w-4 mr-1.5"/>
            Upcoming
          </h4>
          <ul className="space-y-1.5">
            {upcomingDueItems.map(item => (
              <MaterialListItem 
                key={item.id} 
                lesson={item} 
                onOpenEditModal={onOpenEditModal}
                onToggleComplete={onToggleComplete}
                isCompact={true} // You might add a prop for a more compact version if needed
              />
            ))}
          </ul>
        </div>
      )}
      
      {lessons.length > 0 || (units || []).length > 0 ? (
        <div className="mt-1">
          {(units || [])
            .sort((a,b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.name.localeCompare(b.name))
            .map(unit => renderUnitSection(unit))
          }
          {renderGeneralMaterialsSection()}
        </div>
      ) : (
        <div className="italic text-text-tertiary text-sm p-3 text-center bg-gray-50 rounded-md">
            No materials or units added for this subject yet.
        </div>
      )}
    </div>
  );
}