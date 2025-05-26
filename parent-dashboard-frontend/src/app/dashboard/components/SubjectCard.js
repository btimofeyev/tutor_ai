// app/dashboard/components/SubjectCard.js
'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CogIcon, ChevronDownIcon, ChevronUpIcon, FolderOpenIcon, PlusCircleIcon, ListBulletIcon, ClockIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import MaterialListItem from './MaterialListItem';
import CompletionPieChart from './charts/CompletionPieChart';

const ITEMS_TO_SHOW_INITIALLY_PER_UNIT = 3;

export default function SubjectCard({ 
    subject, 
    lessons = [], 
    units = [], 
    lessonsByUnit = {}, // New: lesson containers grouped by unit
    subjectStats, 
    onOpenEditModal, 
    onManageUnits,
    onToggleComplete
}) {
  const [expandedUnits, setExpandedUnits] = useState({});
  const [expandedLessonContainers, setExpandedLessonContainers] = useState({});
  const [completingItems, setCompletingItems] = useState(new Set());

  if (!subject.child_subject_id) { 
    return (
        <div className="bg-yellow-100 rounded-xl p-4 shadow">
            <div className="font-semibold mb-2">{subject.name}</div>
            <div className="text-sm text-yellow-800">
                <b>Warning:</b> This subject is not fully configured for this student.
            </div>
        </div>
    );
  }
  
  const currentSubjectStats = subjectStats;

  // Get next 3 upcoming due items for quick overview
  const upcomingDueItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return lessons
      .filter(lesson => !lesson.completed_at && lesson.due_date)
      .map(lesson => ({
        ...lesson,
        dueDateObj: new Date(lesson.due_date + 'T00:00:00Z')
      }))
      .filter(lesson => lesson.dueDateObj >= today)
      .sort((a, b) => a.dueDateObj - b.dueDateObj)
      .slice(0, 3);
  }, [lessons]);

  // Group materials that don't belong to any lesson container (uncategorized/general materials)
  const generalMaterials = useMemo(() => {
    return lessons.filter(lesson => !lesson.lesson_id);
  }, [lessons]);

  const toggleUnitExpansion = (unitId) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const toggleLessonContainerExpansion = (lessonContainerId) => {
    setExpandedLessonContainers(prev => ({ ...prev, [lessonContainerId]: !prev[lessonContainerId] }));
  };

  // Render materials for a lesson container
  const renderLessonContainerMaterials = (lessonContainer, materials) => {
    const isExpanded = !!expandedLessonContainers[lessonContainer.id];
    const materialCount = materials.length;
    
    if (materialCount === 0) return null;

    return (
      <div key={lessonContainer.id} className="ml-4 mt-2 border-l-2 border-gray-200 pl-3">
        <div 
          className="flex justify-between items-center py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2 group"
          onClick={() => toggleLessonContainerExpansion(lessonContainer.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleLessonContainerExpansion(lessonContainer.id)}
          aria-expanded={isExpanded}
          aria-controls={`lesson-content-${lessonContainer.id}`}
        >
          <h5 className="text-sm font-medium text-gray-600 flex items-center">
            <ListBulletIcon className="h-4 w-4 mr-2 text-gray-400 group-hover:text-blue-500 transition-colors"/>
            {lessonContainer.title}
            <span className="ml-2 text-xs text-gray-500 font-normal">({materialCount} material{materialCount === 1 ? '' : 's'})</span>
          </h5>
          {isExpanded ? <ChevronUpIcon className="h-4 w-4 text-gray-500"/> : <ChevronDownIcon className="h-4 w-4 text-gray-500"/>}
        </div>
        
        <div id={`lesson-content-${lessonContainer.id}`} className={`${isExpanded ? 'block' : 'hidden'} mt-1`}>
          <ul className="text-sm text-gray-700 space-y-1.5">
            {materials.map(material => (
              <MaterialListItem 
                key={material.id} 
                lesson={material} 
                onOpenEditModal={onOpenEditModal}
                onToggleComplete={onToggleComplete}
              />
            ))}
          </ul>
        </div>
      </div>
    );
  };

  // Render a unit with its lesson containers
  const renderUnitSection = (unit) => {
    const lessonContainers = lessonsByUnit[unit.id] || [];
    const isExpanded = !!expandedUnits[unit.id];
    
    // Get all materials for this unit to count them
    const allUnitMaterials = lessonContainers.reduce((acc, container) => {
      const containerMaterials = lessons.filter(lesson => lesson.lesson_id === container.id);
      return acc + containerMaterials.length;
    }, 0);
    
    if (lessonContainers.length === 0 && allUnitMaterials === 0) return null;

    return (
      <div key={unit.id} className="mt-4 pt-4 border-t border-gray-200 first:mt-0 first:pt-0 first:border-t-0">
        <div 
          className="flex justify-between items-center py-2 cursor-pointer hover:bg-gray-100 rounded-md px-3 group"
          onClick={() => toggleUnitExpansion(unit.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleUnitExpansion(unit.id)}
          aria-expanded={isExpanded}
          aria-controls={`unit-content-${unit.id}`}
        >
          <h4 className="text-base font-semibold text-gray-800 flex items-center">
            <FolderOpenIcon className="h-5 w-5 mr-2 text-gray-500 group-hover:text-blue-600 transition-colors"/>
            {unit.name}
            <span className="ml-2 text-sm text-gray-500 font-normal">({lessonContainers.length} lesson{lessonContainers.length === 1 ? '' : 's'}, {allUnitMaterials} material{allUnitMaterials === 1 ? '' : 's'})</span>
          </h4>
          {isExpanded ? <ChevronUpIcon className="h-5 w-5 text-gray-600"/> : <ChevronDownIcon className="h-5 w-5 text-gray-600"/>}
        </div>
        
        <div id={`unit-content-${unit.id}`} className={`${isExpanded ? 'block' : 'hidden'} mt-2`}>
          {lessonContainers.length === 0 ? (
            <div className="text-xs italic text-gray-400 ml-6 py-2">No lesson containers in this unit yet.</div>
          ) : (
            lessonContainers
              .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.title.localeCompare(b.title))
              .map(container => {
                const containerMaterials = lessons.filter(lesson => lesson.lesson_id === container.id);
                return renderLessonContainerMaterials(container, containerMaterials);
              })
          )}
        </div>
      </div>
    );
  };

  // Render general materials (not assigned to any unit)
  const renderGeneralMaterials = () => {
    if (generalMaterials.length === 0) return null;

    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-base font-semibold text-gray-800 flex items-center px-3 py-2">
          <ListBulletIcon className="h-5 w-5 mr-2 text-gray-500"/>
          General Materials
          <span className="ml-2 text-sm text-gray-500 font-normal">({generalMaterials.length} item{generalMaterials.length === 1 ? '' : 's'})</span>
        </h4>
        <ul className="text-sm text-gray-700 space-y-1.5 mt-2 px-3">
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
    <div className="bg-white rounded-xl p-4 sm:p-5 shadow-lg border border-gray-100">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-3 pb-3 border-b border-gray-200">
        <div className="mb-2 sm:mb-0">
          <h3 className="text-xl font-bold text-gray-800">{subject.name}</h3>
          {currentSubjectStats && (
            <div className="text-xs text-gray-500 mt-1 space-x-3">
              <span><ListBulletIcon className="h-3 w-3 inline-block mr-1 text-gray-400"/>{currentSubjectStats.total} items</span>
              <span><span className="text-green-500 font-semibold">{currentSubjectStats.completed}</span> done</span>
              {currentSubjectStats.avgGradePercent !== null && (
                <span>Avg Grade: <span className="font-semibold">{currentSubjectStats.avgGradePercent}%</span> <span className="text-gray-400">(W)</span></span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            {currentSubjectStats && currentSubjectStats.total > 0 && (
              <div className="flex-shrink-0 w-[80px] h-[80px] sm:w-[90px] sm:h-[90px]">
                <CompletionPieChart completed={currentSubjectStats.completed} total={currentSubjectStats.total} />
              </div>
            )}
            <div className="flex sm:flex-col space-x-2 sm:space-x-0 sm:space-y-1.5 w-full sm:w-auto justify-around sm:justify-start">
                <button 
                    onClick={onManageUnits} 
                    title="Manage Units" 
                    className="flex items-center text-xs px-2.5 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md font-medium transition-colors w-full sm:w-auto justify-center"
                >
                    <PlusCircleIcon className="h-4 w-4 mr-1.5"/> Manage Units
                </button>
                <Link href={`/subject-settings/${subject.child_subject_id}`} legacyBehavior>
                    <a title="Subject Settings & Weights" className="flex items-center text-xs px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-medium transition-colors w-full sm:w-auto justify-center">
                        <CogIcon className="h-4 w-4 mr-1.5" /> Settings
                    </a>
                </Link>
            </div>
        </div>
      </div>
      
      {/* Quick Overview: Next 3 Due Items */}
      {upcomingDueItems.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
            <ClockIcon className="h-4 w-4 mr-1"/>
            Coming Up Next
          </h4>
          <ul className="space-y-2">
            {upcomingDueItems.map(item => {
              const isOverdue = item.dueDateObj < new Date();
              const isDueSoon = item.dueDateObj <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
              return (
                <li key={item.id} className="flex justify-between items-center text-xs bg-white rounded-md p-2 shadow-sm border">
                  <div className="flex items-center min-w-0 flex-1">
                    {/* Quick Complete Button */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setCompletingItems(prev => new Set([...prev, item.id]));
                        await onToggleComplete(item.id, !item.completed_at);
                        setCompletingItems(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(item.id);
                          return newSet;
                        });
                      }}
                      className="mr-2 p-1 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0"
                      title={item.completed_at ? "Mark as Incomplete" : "Mark as Complete"}
                      disabled={completingItems.has(item.id)}
                    >
                      {completingItems.has(item.id) ? (
                        <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                      ) : item.completed_at ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 border-2 border-gray-300 rounded-full hover:border-green-500 transition-colors"></div>
                      )}
                    </button>
                    <span className="truncate font-medium text-gray-800 cursor-pointer" onClick={() => onOpenEditModal(item)}>
                      {item.title}
                    </span>
                  </div>
                  <span className={`whitespace-nowrap ml-2 text-xs ${
                    isOverdue ? 'text-red-600 font-semibold' : 
                    isDueSoon ? 'text-yellow-600 font-semibold' : 'text-blue-600'
                  }`}>
                    {item.dueDateObj.toLocaleDateString()}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      {/* Hierarchical Content */}
      {lessons.length > 0 || (units || []).length > 0 ? (
        <div className="mt-1">
          {/* Render Units with Lesson Containers */}
          {(units || [])
            .sort((a,b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.name.localeCompare(b.name))
            .map(unit => renderUnitSection(unit))
          }
          
          {/* Render General Materials */}
          {renderGeneralMaterials()}
        </div>
      ) : (
        <div className="italic text-gray-400 text-sm p-3 text-center bg-gray-50 rounded-md">
            No materials or units added for this subject yet.
        </div>
      )}
    </div>
  );
}