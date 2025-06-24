'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // For the custom folder icon
import { 
    ChevronDownIcon, 
    PlusCircleIcon, 
    ListBulletIcon, 
    ClockIcon, 
    AdjustmentsHorizontalIcon,
    PlusIcon
} from '@heroicons/react/24/outline'; // For all other generic icons
import MaterialListItem from './MaterialListItem';
import LessonGroupedMaterials from './LessonGroupedMaterials';
import CompletionPieChart from './charts/CompletionPieChart';

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
    onToggleComplete,
    onDeleteMaterial,
    onCreateLessonGroup
}) {
    const [expandedUnits, setExpandedUnits] = useState({});
    const [expandedLessonContainers, setExpandedLessonContainers] = useState({});
    const [creatingLessonGroupForUnit, setCreatingLessonGroupForUnit] = useState(null);
    const [newLessonGroupTitle, setNewLessonGroupTitle] = useState("");

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
    
    const handleCreateLessonGroup = async (unitId) => {
        if (!newLessonGroupTitle.trim()) return;
        
        const result = await onCreateLessonGroup(unitId, newLessonGroupTitle.trim());
        if (result.success) {
            setNewLessonGroupTitle("");
            setCreatingLessonGroupForUnit(null);
        }
    };
    
    const ChevronIcon = ({ isExpanded }) => (
        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
             <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        </div>
    );
    
    const renderLessonContainerMaterials = (lessonContainer, materials) => {
        // Use the new LessonGroupedMaterials component that fetches grouped data
        return (
            <LessonGroupedMaterials
                key={lessonContainer.id}
                lessonContainer={lessonContainer}
                onOpenEditModal={onOpenEditModal}
                onToggleComplete={onToggleComplete}
                onDeleteMaterial={onDeleteMaterial}
            />
        );
    };

    const renderUnitSection = (unit) => {
        const lessonContainersInUnit = (lessonsByUnit[unit.id] || []).sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.title.localeCompare(b.title));
        const isExpanded = !!expandedUnits[unit.id];
        const allUnitMaterialsCount = lessonContainersInUnit.reduce((acc, c) => acc + lessons.filter(l => l.lesson_id === c.id).length, 0);

        // Always show units, even if they're empty - users need to see them to add lesson groups

        return (
            <div key={unit.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <button
                    className="w-full p-4 flex items-center text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                    onClick={() => toggleUnitExpansion(unit.id)}
                >
                    {/* CUSTOM ICON: This uses the Next.js Image component. Added rounded-md to soften the background edges. */}
                    <Image src="/icons/folder_icon.png" alt="Folder" width={24} height={24} className="mr-4 sm:mr-5 flex-shrink-0 rounded-md" />
                    <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-gray-900">{unit.name}</h4>
                        <p className="text-sm text-gray-500">
                            {lessonContainersInUnit.length === 0 
                                ? "Click to add lesson groups" 
                                : `${lessonContainersInUnit.length} groups • ${allUnitMaterialsCount} items`
                            }
                        </p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                        <ChevronIcon isExpanded={isExpanded} />
                    </div>
                </button>

                <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                    {isExpanded && (
                        <div className="p-4 pt-2 space-y-3">
                            {/* Add Lesson Group Section */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                {creatingLessonGroupForUnit === unit.id ? (
                                    <div>
                                        <h5 className="text-sm font-semibold text-green-800 mb-2">Create New Lesson Group</h5>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newLessonGroupTitle}
                                                onChange={(e) => setNewLessonGroupTitle(e.target.value)}
                                                placeholder="Lesson group title (e.g., Lesson 1, Chapter 1.1, etc.)"
                                                className="flex-1 px-3 py-2 text-sm border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                                autoFocus
                                                onKeyPress={(e) => e.key === 'Enter' && handleCreateLessonGroup(unit.id)}
                                            />
                                            <button
                                                onClick={() => handleCreateLessonGroup(unit.id)}
                                                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                Create
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setCreatingLessonGroupForUnit(null);
                                                    setNewLessonGroupTitle("");
                                                }}
                                                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setCreatingLessonGroupForUnit(unit.id)}
                                        className="w-full flex items-center justify-center gap-2 py-2 text-green-700 hover:text-green-800 transition-colors"
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                        <span className="text-sm font-medium">Add Lesson Groups to {unit.name}</span>
                                    </button>
                                )}
                            </div>
                            
                            {/* Existing Lesson Groups */}
                            {lessonContainersInUnit.length === 0 ? (
                                <div className="text-center py-4 text-gray-500 text-sm italic">
                                    No lesson groups in this unit yet. Click above to add some!
                                </div>
                            ) : (
                                lessonContainersInUnit.map(container =>
                                    renderLessonContainerMaterials(container, []) // Pass empty array since component fetches its own data
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header Section */}
            <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50/80 to-white">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
                    {/* Left Side: Title and Stats */}
                    <div className="flex-1 min-w-[200px]">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 truncate">{subject.name}</h3>
                        {subjectStats && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-gray-600">{subjectStats.total} total</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-gray-600">{subjectStats.completed} completed</span>
                                </div>
                                {subjectStats.avgGradePercent !== null && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                        <span className="text-gray-600">Avg: {subjectStats.avgGradePercent}%</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Side: Chart and Buttons */}
                    <div className="flex items-center gap-x-4 sm:gap-x-6">
                        {subjectStats && subjectStats.total > 0 && (
                            <div className="relative flex-shrink-0 h-14 w-14 sm:h-16 sm:w-16">
                                <CompletionPieChart completed={subjectStats.completed} total={subjectStats.total} />
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={onManageUnits}
                                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Manage Units & Lesson Groups"
                            >
                                <PlusCircleIcon className="h-5 w-5 mr-2 sm:mr-2.5" />
                                Units
                            </button>
                            <Link
                                href={`/subject-settings/${subject.child_subject_id}`}
                                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Subject Settings & Weights"
                            >
                                <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2 sm:mr-2.5" />
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
                            <ClockIcon className="h-4 w-4 mr-2 sm:mr-3" />
                            Upcoming Deadlines
                        </h4>
                        <ul className="space-y-2">
                            {upcomingDueItems.map(item => (
                                <MaterialListItem
                                    key={item.id}
                                    lesson={item}
                                    onOpenEditModal={onOpenEditModal}
                                    onToggleComplete={onToggleComplete}
                                    onDeleteMaterial={onDeleteMaterial}
                                    isCompact={true}
                                />
                            ))}
                        </ul>
                    </div>
                )}

                {(units.length > 0 || generalMaterials.length > 0) ? (
                    <div className="space-y-4">
                        {units
                            .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.name.localeCompare(b.name))
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
                                            onDeleteMaterial={onDeleteMaterial}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <ListBulletIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500 text-sm">No materials or units for this subject yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
