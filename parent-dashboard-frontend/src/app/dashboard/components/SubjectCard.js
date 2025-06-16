// app/dashboard/components/SubjectCard.js
'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, ChevronUpIcon, FolderOpenIcon, PlusCircleIcon, ListBulletIcon, ClockIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import MaterialListItem from './MaterialListItem';
import CompletionPieChart from './charts/CompletionPieChart';
import Button from '../../../components/ui/Button';

// Skeleton Loader Component
const Skeleton = () => (
  <div className="card p-4 sm:p-5 animate-pulse">
    <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-200">
      <div className="space-y-2">
        <div className="h-6 bg-gray-200 rounded w-48"></div>
        <div className="h-4 bg-gray-200 rounded w-64"></div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
        <div className="space-y-2">
          <div className="h-7 bg-gray-200 rounded w-24"></div>
          <div className="h-7 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    </div>
    <div className="space-y-3 mt-4">
      <div className="h-5 bg-gray-200 rounded w-1/3"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
  </div>
);

SubjectCard.Skeleton = ({ count = 1 }) => Array.from({ length: count }).map((_, i) => <Skeleton key={i} />);


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

  // Always call hooks at the top level
  const upcomingDueItems = useMemo(() => {
    if (!subject.child_subject_id) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return lessons
      .filter(lesson => !lesson.completed_at && lesson.due_date)
      .map(lesson => ({ ...lesson, dueDateObj: new Date(lesson.due_date + 'T00:00:00Z') }))
      .filter(lesson => lesson.dueDateObj >= today)
      .sort((a, b) => a.dueDateObj - b.dueDateObj)
      .slice(0, 3);
  }, [lessons, subject.child_subject_id]);

  const generalMaterials = useMemo(() => {
    if (!subject.child_subject_id) return [];
    return lessons.filter(lesson => !lesson.lesson_id);
  }, [lessons, subject.child_subject_id]);

  if (!subject.child_subject_id) {
    return (
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 shadow-sm text-yellow-800">
            <div className="font-semibold mb-1">{subject.name}</div>
            <div className="text-sm ">
                <b>Configuration Incomplete:</b> This subject needs to be fully set up for this student.
            </div>
        </div>
    );
  }

  const toggleUnitExpansion = (unitId) => setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  const toggleLessonContainerExpansion = (lcId) => setExpandedLessonContainers(prev => ({ ...prev, [lcId]: !prev[lcId] }));

  const renderLessonContainerMaterials = (lessonContainer, materials) => {
    if (materials.length === 0) return null;
    const isExpanded = !!expandedLessonContainers[lessonContainer.id];
    return (
      <div key={lessonContainer.id} className="ml-4 mt-1.5 pl-3 border-l-2 border-gray-100">
        <div className="flex justify-between items-center py-1.5 cursor-pointer hover:bg-gray-50 rounded-md px-2 group" onClick={() => toggleLessonContainerExpansion(lessonContainer.id)}>
          <h5 className="text-sm font-medium text-text-secondary flex items-center">
            <ListBulletIcon className="h-4 w-4 mr-2 text-text-tertiary group-hover:text-accent-blue-darker-for-border transition-colors"/>
            {lessonContainer.title}
            <span className="ml-2 text-xs text-text-tertiary font-normal">({materials.length})</span>
          </h5>
          <ChevronIcon isExpanded={isExpanded} />
        </div>
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-screen' : 'max-h-0'}`}>
            <div className="mt-1.5 pl-1 space-y-1.5 pt-1">
                {materials.map(material => <MaterialListItem key={material.id} lesson={material} onOpenEditModal={onOpenEditModal} onToggleComplete={onToggleComplete} />)}
            </div>
        </div>
      </div>
    );
  };
  
  const renderUnitSection = (unit) => {
    const lessonContainersInUnit = (lessonsByUnit[unit.id] || []).sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.title.localeCompare(b.title));
    const isExpanded = !!expandedUnits[unit.id];
    const allUnitMaterialsCount = lessonContainersInUnit.reduce((acc, c) => acc + lessons.filter(l => l.lesson_id === c.id).length, 0);

    if (lessonContainersInUnit.length === 0 && allUnitMaterialsCount === 0) return null;

    return (
      <div key={unit.id} className="mt-3 pt-3 border-t border-border-subtle first:mt-0 first:pt-0 first:border-t-0">
        <div className="flex justify-between items-center py-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2.5 group" onClick={() => toggleUnitExpansion(unit.id)}>
          <h4 className="text-base font-semibold text-text-primary flex items-center">
            <FolderOpenIcon className="h-5 w-5 mr-2 text-text-secondary group-hover:text-accent-blue-darker-for-border transition-colors"/>
            {unit.name}
            <span className="ml-2 text-xs text-text-tertiary font-normal">({lessonContainersInUnit.length} groups, {allUnitMaterialsCount} items)</span>
          </h4>
          <ChevronIcon isExpanded={isExpanded} />
        </div>
         <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-screen' : 'max-h-0'}`}>
            <div className="mt-1.5 pl-2 pt-1">
              {lessonContainersInUnit.length === 0 ? <div className="text-xs italic text-text-tertiary ml-6 py-2">No lesson groups.</div> : lessonContainersInUnit.map(c => renderLessonContainerMaterials(c, lessons.filter(l => l.lesson_id === c.id)))}
            </div>
        </div>
      </div>
    );
  };
  
  const ChevronIcon = ({ isExpanded }) => isExpanded ? <ChevronUpIcon className="h-5 w-5 text-text-secondary"/> : <ChevronDownIcon className="h-5 w-5 text-text-secondary"/>;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-3 pb-3 border-b border-border-subtle">
        <div className="mb-2 sm:mb-0 flex-grow">
          <h3 className="text-xl font-semibold text-text-primary">{subject.name}</h3>
          {subjectStats && (
            <div className="text-xs text-text-secondary mt-1 space-x-3">
              <span>{subjectStats.total} items</span>
              <span className="text-green-600">{subjectStats.completed} done</span>
              {subjectStats.avgGradePercent !== null && <span>Avg: {subjectStats.avgGradePercent}%</span>}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto mt-2 sm:mt-0">
            {subjectStats && subjectStats.total > 0 && (
              <div className="h-20 w-20 flex-shrink-0"><CompletionPieChart completed={subjectStats.completed} total={subjectStats.total} /></div>
            )}
            <div className="flex sm:flex-col space-x-2 sm:space-x-0 sm:space-y-1.5 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={onManageUnits} title="Manage Units & Lesson Groups" className="w-full sm:w-auto justify-center">
                    <PlusCircleIcon className="h-4 w-4 mr-1.5"/> Units
                </Button>
                <Button as="link" href={`/subject-settings/${subject.child_subject_id}`} variant="outline" size="sm" title="Subject Settings & Weights" className="w-full sm:w-auto justify-center">
                    <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1.5" /> Weights
                </Button>
            </div>
        </div>
      </div>
      {upcomingDueItems.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-800 mb-1.5 flex items-center"><ClockIcon className="h-4 w-4 mr-1.5"/> Upcoming</h4>
          <ul className="space-y-1.5">{upcomingDueItems.map(item => <MaterialListItem key={item.id} lesson={item} onOpenEditModal={onOpenEditModal} onToggleComplete={onToggleComplete} isCompact={true} />)}</ul>
        </div>
      )}
      {(units.length > 0 || generalMaterials.length > 0) ? (
        <div className="mt-1">{units.sort((a,b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.name.localeCompare(b.name)).map(renderUnitSection)}{generalMaterials.length > 0 && <div className="mt-3 pt-3 border-t border-border-subtle"><h4 className="text-base font-semibold text-text-primary px-2.5 py-2">General</h4><ul className="space-y-1.5 mt-1.5 px-2.5">{generalMaterials.map(m => <MaterialListItem key={m.id} lesson={m} onOpenEditModal={onOpenEditModal} onToggleComplete={onToggleComplete} />)}</ul></div>}</div>
      ) : (
        <div className="text-center italic text-text-tertiary text-sm p-3 bg-gray-50 rounded-md">No materials or units for this subject yet.</div>
      )}
    </div>
  );
}
