// app/dashboard/components/SubjectCard.js
'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CogIcon, ChevronDownIcon, ChevronUpIcon, FolderOpenIcon, PlusCircleIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import MaterialListItem from './MaterialListItem';
import CompletionPieChart from './charts/CompletionPieChart';

const ITEMS_TO_SHOW_INITIALLY_PER_UNIT = 3;

export default function SubjectCard({ 
    subject, 
    lessons = [], 
    units = [], 
    subjectStats, 
    onOpenEditModal, 
    onManageUnits,
    onToggleComplete // Make sure this prop is accepted from DashboardPage
}) {
  const [expandedUnits, setExpandedUnits] = useState({});

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

  const lessonsByUnitId = useMemo(() => {
    const grouped = { 'uncategorized': [] };
    (units || []).forEach(unit => {
        if(unit && unit.id) grouped[unit.id] = [];
    });
    (lessons || []).forEach(lesson => {
      if (lesson.unit_id && grouped[lesson.unit_id]) {
        grouped[lesson.unit_id].push(lesson);
      } else {
        grouped['uncategorized'].push(lesson);
      }
    });
    return grouped;
  }, [lessons, units]);

  const toggleUnitExpansion = (unitId) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const renderUnitSection = (unitId, unitName, unitLessons) => {
    if (!unitLessons || unitLessons.length === 0) return null;
    
    const isExpanded = !!expandedUnits[unitId];
    const displayedLessons = isExpanded ? unitLessons : unitLessons.slice(0, ITEMS_TO_SHOW_INITIALLY_PER_UNIT);
    const actualUnitName = unitName || "General Materials";

    return (
      <div key={unitId} className="mt-3 pt-3 border-t border-gray-200 first:mt-0 first:pt-0 first:border-t-0">
        <div 
          className={`flex justify-between items-center py-1.5 ${unitName ? 'cursor-pointer hover:bg-gray-100 rounded-md px-2 group' : 'px-2'}`}
          onClick={() => unitName && toggleUnitExpansion(unitId)} 
          role={unitName ? "button" : undefined}
          tabIndex={unitName ? 0 : undefined}
          onKeyDown={(e) => unitName && (e.key === 'Enter' || e.key === ' ') && toggleUnitExpansion(unitId)}
          aria-expanded={unitName ? isExpanded : undefined}
          aria-controls={unitName ? `unit-content-${unitId}`: undefined}
        >
          <h4 className="text-sm font-semibold text-gray-700 flex items-center">
              <FolderOpenIcon className="h-5 w-5 mr-2 text-gray-400 group-hover:text-blue-600 transition-colors"/>
              {actualUnitName} 
              <span className="ml-2 text-xs text-gray-500 font-normal">({unitLessons.length} item{unitLessons.length === 1 ? '' : 's'})</span>
          </h4>
          {unitName && unitLessons.length > ITEMS_TO_SHOW_INITIALLY_PER_UNIT && (
            isExpanded ? <ChevronUpIcon className="h-5 w-5 text-gray-500"/> : <ChevronDownIcon className="h-5 w-5 text-gray-500"/>
          )}
        </div>
        
        <div id={unitName ? `unit-content-${unitId}`: undefined} className={`${(isExpanded || !unitName) ? 'block' : 'hidden'}`}>
            <ul className="text-sm text-gray-700 space-y-1.5 mt-1.5 pl-2">
            {displayedLessons.length === 0 && unitName && <li className="text-xs italic text-gray-400 pl-3 py-1">No materials here (check filters).</li>}
            {displayedLessons.map(lesson => (
                <MaterialListItem 
                    key={lesson.id} 
                    lesson={lesson} 
                    onOpenEditModal={onOpenEditModal}
                    onToggleComplete={onToggleComplete} // <-- *** THIS LINE WAS MISSING THE PROP ***
                />
            ))}
            </ul>
            {unitName && unitLessons.length > ITEMS_TO_SHOW_INITIALLY_PER_UNIT && !isExpanded && (
                 <button
                  onClick={() => toggleUnitExpansion(unitId)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center w-full justify-center py-1.5 px-2 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors"
                  aria-label={`Show more materials for ${actualUnitName}`}
                >
                    Show All ({unitLessons.length}) <ChevronDownIcon className="ml-1 h-4 w-4" />
                </button>
            )}
        </div>
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
      
      {lessons.length > 0 || (units || []).length > 0 ? (
        <div className="mt-1">
          {(units || []).sort((a,b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.name.localeCompare(b.name)).map(unit => 
            renderUnitSection(unit.id, unit.name, lessonsByUnitId[unit.id] || [])
          )}
          {lessonsByUnitId['uncategorized'] && lessonsByUnitId['uncategorized'].length > 0 && (
            renderUnitSection('uncategorized', null, lessonsByUnitId['uncategorized'])
          )}
        </div>
      ) : (
        <div className="italic text-gray-400 text-sm p-3 text-center bg-gray-50 rounded-md">
            No materials or units added for this subject yet.
        </div>
      )}
    </div>
  );
}