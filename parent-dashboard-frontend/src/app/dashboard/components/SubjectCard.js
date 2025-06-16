// app/dashboard/components/SubjectCard.js
'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, ChevronUpIcon, FolderOpenIcon, PlusCircleIcon, ListBulletIcon, ClockIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import MaterialListItem from './MaterialListItem';
import CompletionPieChart from './charts/CompletionPieChart';
import Button from '../../../components/ui/Button';

// Modern Skeleton Loader Component
const Skeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 animate-pulse hover:shadow-md transition-shadow duration-300">
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
      <div className="space-y-3 flex-1">
        <div className="h-6 sm:h-7 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg w-32 sm:w-40 animate-shimmer"></div>
        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg w-24 sm:w-32 animate-shimmer"></div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-shimmer"></div>
        <div className="flex space-x-2">
          <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg w-16 sm:w-20 animate-shimmer"></div>
          <div className="h-8 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg w-16 sm:w-20 animate-shimmer"></div>
        </div>
      </div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg w-1/4 animate-shimmer"></div>
      <div className="space-y-2">
        <div className="h-12 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg animate-shimmer"></div>
        <div className="h-12 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg animate-shimmer"></div>
      </div>
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
      <div key={lessonContainer.id} className="bg-gray-50/80 rounded-lg border border-gray-200 overflow-hidden">
        <button
          className="w-full px-4 py-3 flex items-center text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
          onClick={() => toggleLessonContainerExpansion(lessonContainer.id)}
        >
          <ListBulletIcon className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-gray-700">{lessonContainer.title}</span>
            <span className="ml-2 text-xs text-gray-500 font-normal">({materials.length})</span>
          </div>
          <div className="flex-shrink-0 ml-3">
            <ChevronIcon isExpanded={isExpanded} />
          </div>
        </button>
        
        <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
          {isExpanded && (
            <div className="px-4 pb-3 space-y-1">
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
      </div>
    );
  };
  
  const renderUnitSection = (unit) => {
    const lessonContainersInUnit = (lessonsByUnit[unit.id] || []).sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.title.localeCompare(b.title));
    const isExpanded = !!expandedUnits[unit.id];
    const allUnitMaterialsCount = lessonContainersInUnit.reduce((acc, c) => acc + lessons.filter(l => l.lesson_id === c.id).length, 0);

    if (lessonContainersInUnit.length === 0 && allUnitMaterialsCount === 0) return null;

    return (
      <div key={unit.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <button
          className="w-full p-4 flex items-center text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
          onClick={() => toggleUnitExpansion(unit.id)}
        >
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
            <FolderOpenIcon className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-gray-900">{unit.name}</h4>
            <p className="text-sm text-gray-500">{lessonContainersInUnit.length} groups • {allUnitMaterialsCount} items</p>
          </div>
          <div className="flex-shrink-0 ml-3">
            <ChevronIcon isExpanded={isExpanded} />
          </div>
        </button>
        
        <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
          {isExpanded && (
            <div className="p-4 pt-0 space-y-3 border-t border-gray-100">
              {lessonContainersInUnit.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm italic">
                  No lesson groups in this unit yet.
                </div>
              ) : (
                lessonContainersInUnit.map(container => 
                  renderLessonContainerMaterials(container, lessons.filter(l => l.lesson_id === container.id))
                )
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const ChevronIcon = ({ isExpanded }) => (
    <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header Section */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50/80 to-white">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 truncate">{subject.name}</h3>
            {subjectStats && (
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-600 whitespace-nowrap">{subjectStats.total} total</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-600 whitespace-nowrap">{subjectStats.completed} completed</span>
                </div>
                {subjectStats.avgGradePercent !== null && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                    <span className="text-gray-600 whitespace-nowrap">Avg: {subjectStats.avgGradePercent}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {subjectStats && subjectStats.total > 0 && (
              <div className="relative flex-shrink-0">
                <div className="h-12 w-12 sm:h-16 sm:w-16">
                  <CompletionPieChart completed={subjectStats.completed} total={subjectStats.total} />
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={onManageUnits}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Manage Units & Lesson Groups"
              >
                <PlusCircleIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
                Units
              </button>
              <Link
                href={`/subject-settings/${subject.child_subject_id}`}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Subject Settings & Weights"
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
                Weights
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="p-4 sm:p-6">
        {upcomingDueItems.length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-orange-200">
            <h4 className="text-sm font-semibold text-orange-800 mb-3 flex items-center">
              <ClockIcon className="h-4 w-4 mr-2" />
              Upcoming Deadlines
            </h4>
            <ul className="space-y-2">
              {upcomingDueItems.map(item => (
                <MaterialListItem 
                  key={item.id} 
                  lesson={item} 
                  onOpenEditModal={onOpenEditModal} 
                  onToggleComplete={onToggleComplete} 
                  isCompact={true} 
                />
              ))}
            </ul>
          </div>
        )}

        {(units.length > 0 || generalMaterials.length > 0) ? (
          <div className="space-y-4">
            {units
              .sort((a,b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.name.localeCompare(b.name))
              .map(renderUnitSection)
            }
            
            {generalMaterials.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">General Materials</h4>
                <div className="space-y-1">
                  {generalMaterials.map(material => (
                    <MaterialListItem 
                      key={material.id} 
                      lesson={material} 
                      onOpenEditModal={onOpenEditModal} 
                      onToggleComplete={onToggleComplete} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ListBulletIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">No materials or units for this subject yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
