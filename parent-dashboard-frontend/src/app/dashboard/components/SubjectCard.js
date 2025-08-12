'use client';
import React, { useState, useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import Image from 'next/image'; // For the custom folder icon
import {
    ChevronDownIcon,
    PlusCircleIcon,
    ListBulletIcon,
    ClockIcon,
    AdjustmentsHorizontalIcon,
    PlusIcon,
    EyeIcon,
    PencilIcon,
    TrashIcon,
    CheckCircleIcon
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

const SubjectCard = memo(function SubjectCard({
    subject,
    lessons = [],
    units = [],
    lessonsByUnit = {},
    subjectStats,
    onOpenEditModal,
    onManageUnits,
    onToggleComplete,
    onDeleteMaterial,
    onCreateLessonGroup,
    onAddMaterial
}) {
    const [isSubjectExpanded, setIsSubjectExpanded] = useState(false); // Subject card collapsible state
    const [expandedUnits, setExpandedUnits] = useState({});
    const [expandedLessonContainers, setExpandedLessonContainers] = useState({});
    const [expandedLessons, setExpandedLessons] = useState({}); // Track which lessons are expanded
    const [creatingLessonGroupForUnit, setCreatingLessonGroupForUnit] = useState(null);
    const [newLessonGroupTitle, setNewLessonGroupTitle] = useState("");
    const [bulkLessonGroupCount, setBulkLessonGroupCount] = useState(1);

    const upcomingDueItems = useMemo(() => {
        if (!subject.child_subject_id) return [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return lessons
            .filter(lesson => !lesson.completed_at && lesson.due_date)
            .map(lesson => ({ ...lesson, dueDateObj: new Date(lesson.due_date + 'T00:00:00') }))
            .filter(lesson => lesson.dueDateObj >= today)
            .sort((a, b) => a.dueDateObj - b.dueDateObj)
            .slice(0, 3);
    }, [lessons, subject.child_subject_id]);

    const generalMaterials = useMemo(() => {
        if (!subject.child_subject_id) return [];
        return lessons.filter(lesson => !lesson.lesson_id);
    }, [lessons, subject.child_subject_id]);

    // Get next 3 incomplete lessons grouped by chapter
    const nextThreeByChapter = useMemo(() => {
        if (!subject.child_subject_id || !units.length) return [];

        const allLessonContainers = [];

        // Collect all lesson containers from all units, sorted by sequence
        for (const unit of units.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.name.localeCompare(b.name))) {
            const lessonContainers = (lessonsByUnit[unit.id] || [])
                .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.title.localeCompare(b.title))
                .map((container, index) => ({
                    ...container,
                    unitName: unit.name,
                    unitId: unit.id,
                    lessonNumber: index + 1,
                    globalOrder: (unit.sequence_order || 0) * 1000 + (container.sequence_order || 0)
                }));

            allLessonContainers.push(...lessonContainers);
        }

        // Sort all lessons globally
        const sortedLessons = allLessonContainers
            .sort((a, b) => a.globalOrder - b.globalOrder);

        // Filter out 100% completed lessons and take the first 3 incomplete ones
        const incompleteLessons = [];

        for (const lesson of sortedLessons) {
            const allMaterials = lessons.filter(material => material.lesson_id === lesson.id);

            // Skip empty lessons (no materials)
            if (allMaterials.length === 0) continue;

            const completedMaterials = allMaterials.filter(m => m.completed_at).length;
            const completionPercent = Math.round((completedMaterials / allMaterials.length) * 100);

            // Only include lessons that are not 100% complete
            if (completionPercent < 100) {
                // Categorize materials by content type
                const materialsByType = {
                    lessons: allMaterials.filter(m => m.content_type === 'lesson' || m.content_type === 'reading'),
                    worksheets: allMaterials.filter(m => m.content_type === 'worksheet' || m.content_type === 'assignment'),
                    quizzes: allMaterials.filter(m => m.content_type === 'quiz' || m.content_type === 'test'),
                    videos: allMaterials.filter(m => m.content_type === 'video'),
                    other: allMaterials.filter(m => !['lesson', 'reading', 'worksheet', 'assignment', 'quiz', 'test', 'video'].includes(m.content_type))
                };

                const enrichedLesson = {
                    ...lesson,
                    materialsByType,
                    totalMaterials: allMaterials.length,
                    completedMaterials,
                    completionPercent
                };

                incompleteLessons.push(enrichedLesson);

                // Stop when we have 3 incomplete lessons
                if (incompleteLessons.length >= 3) break;
            }
        }

        // Group lessons by chapter
        const chapterGroups = {};

        incompleteLessons.forEach(lesson => {
            if (!chapterGroups[lesson.unitId]) {
                chapterGroups[lesson.unitId] = {
                    unitId: lesson.unitId,
                    unitName: lesson.unitName,
                    lessons: []
                };
            }
            chapterGroups[lesson.unitId].lessons.push(lesson);
        });

        return Object.values(chapterGroups);
    }, [lessons, subject.child_subject_id, units, lessonsByUnit]);

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
    const toggleLessonExpansion = (lessonId) => setExpandedLessons(prev => ({ ...prev, [lessonId]: !prev[lessonId] }));

    const handleCreateLessonGroup = async (unitId) => {
        if (!newLessonGroupTitle.trim()) return;

        if (bulkLessonGroupCount === 1) {
            // Single lesson group creation
            const result = await onCreateLessonGroup(unitId, newLessonGroupTitle.trim());
            if (result.success) {
                setNewLessonGroupTitle("");
                setCreatingLessonGroupForUnit(null);
                setBulkLessonGroupCount(1);
            }
        } else {
            // Bulk lesson group creation
            try {
                const baseName = newLessonGroupTitle.trim();
                let successCount = 0;

                for (let i = 1; i <= bulkLessonGroupCount; i++) {
                    const title = `${baseName} ${i}`;
                    try {
                        const result = await onCreateLessonGroup(unitId, title);
                        if (result.success) {
                            successCount++;
                        }
                        // Add small delay between requests to prevent overwhelming the server
                        if (i < bulkLessonGroupCount) {
                            await new Promise(resolve => setTimeout(resolve, 200));
                        }
                    } catch (error) {
                        console.error(`Error creating lesson group "${title}":`, error);
                        // Continue with next lesson group even if one fails
                    }
                }

                if (successCount === bulkLessonGroupCount) {
                    // All succeeded
                    setNewLessonGroupTitle("");
                    setCreatingLessonGroupForUnit(null);
                    setBulkLessonGroupCount(1);
                } else if (successCount > 0) {
                    // Partial success
                    setNewLessonGroupTitle("");
                    setCreatingLessonGroupForUnit(null);
                    setBulkLessonGroupCount(1);
                } else {
                    // All failed - don't reset form so user can try again
                    console.error('Failed to create any lesson groups');
                }
            } catch (error) {
                console.error('Error in bulk lesson group creation:', error);
            }
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
                                        <h5 className="text-sm font-semibold text-green-800 mb-3">Create Lesson Groups for {unit.name}</h5>

                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-green-700 mb-1">
                                                        Base Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newLessonGroupTitle}
                                                        onChange={(e) => setNewLessonGroupTitle(e.target.value)}
                                                        placeholder="Lesson, Section, Topic, etc."
                                                        className="w-full px-3 py-2 text-sm border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                                        autoFocus
                                                        onKeyPress={(e) => e.key === 'Enter' && handleCreateLessonGroup(unit.id)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-green-700 mb-1">
                                                        How Many?
                                                    </label>
                                                    <select
                                                        value={bulkLessonGroupCount}
                                                        onChange={(e) => setBulkLessonGroupCount(parseInt(e.target.value))}
                                                        className="w-full px-3 py-2 text-sm border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                                    >
                                                        <option value={1}>1 (Single)</option>
                                                        <option value={5}>5 Lesson Groups</option>
                                                        <option value={10}>10 Lesson Groups</option>
                                                        <option value={15}>15 Lesson Groups</option>
                                                        <option value={20}>20 Lesson Groups</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {bulkLessonGroupCount > 1 && (
                                                <div className="bg-green-100 border border-green-300 rounded-lg p-2">
                                                    <p className="text-xs text-green-800 mb-1">
                                                        <strong>Preview:</strong> This will create {bulkLessonGroupCount} lesson groups:
                                                    </p>
                                                    <div className="text-xs text-green-700 space-y-0.5 max-h-16 overflow-y-auto">
                                                        {Array.from({ length: Math.min(bulkLessonGroupCount, 5) }, (_, i) => (
                                                            <div key={i}>• {newLessonGroupTitle || 'Lesson'} {i + 1}</div>
                                                        ))}
                                                        {bulkLessonGroupCount > 5 && (
                                                            <div className="text-green-600">... and {bulkLessonGroupCount - 5} more</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleCreateLessonGroup(unit.id)}
                                                    className="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                                >
                                                    Create {bulkLessonGroupCount === 1 ? 'Lesson Group' : `${bulkLessonGroupCount} Groups`}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setCreatingLessonGroupForUnit(null);
                                                        setNewLessonGroupTitle("");
                                                        setBulkLessonGroupCount(1);
                                                    }}
                                                    className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
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
                    {/* Left Side: Title and Stats - Clickable to expand/collapse */}
                    <button
                        className="flex-1 min-w-[200px] text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg -m-2 p-2"
                        onClick={() => setIsSubjectExpanded(!isSubjectExpanded)}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{subject.name}</h3>
                            <div className={`transition-transform duration-200 ${isSubjectExpanded ? 'rotate-180' : ''}`}>
                                <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                            </div>
                        </div>
                        {subjectStats && (
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <span className="text-gray-600">{subjectStats.total} assignments</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-gray-600">{subjectStats.completed} completed</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                        <span className="text-gray-600">
                                            {subjectStats.total > 0 ? Math.round((subjectStats.completed / subjectStats.total) * 100) : 0}% done
                                        </span>
                                    </div>
                                </div>
                                {subjectStats.avgGradePercent !== null && subjectStats.gradableItemsCount > 0 && (
                                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                        <span className="text-indigo-800 font-semibold text-sm">
                                            Grade Average: {subjectStats.avgGradePercent}%
                                            <span className="text-indigo-600 font-normal ml-1">
                                                ({subjectStats.gradableItemsCount} graded)
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </button>

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

            {/* Content Section - Collapsible */}
            <div className={`transition-all duration-300 ease-in-out ${isSubjectExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="p-4 sm:p-6">
                {/* Next Lessons Grouped by Chapter */}
                {nextThreeByChapter.length > 0 ? (
                    <div className="space-y-4">
                        {nextThreeByChapter.map((chapter, chapterIndex) => (
                            <div key={chapter.unitId} className="space-y-3">
                                {/* Chapter Header with View All Button */}
                                <div className="flex items-center justify-between">
                                    <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <ClockIcon className="h-5 w-5 text-blue-500" />
                                        {chapter.unitName.toLowerCase().startsWith('chapter') ?
                                            chapter.unitName :
                                            `Chapter ${chapterIndex + 1}: ${chapter.unitName}`
                                        }
                                    </h4>
                                    {chapterIndex === 0 && (
                                        <Link
                                            href={`/subject/${subject.child_subject_id}`}
                                            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <EyeIcon className="h-4 w-4" />
                                            View All
                                        </Link>
                                    )}
                                </div>

                                    {/* Lessons in Chapter */}
                                    <div className="space-y-3">
                                        {chapter.lessons.map((lesson) => {
                                            const isExpanded = !!expandedLessons[lesson.id];
                                            return (
                                                <div key={lesson.id} className="bg-gray-50 rounded-md border border-gray-200 overflow-hidden">
                                                    {/* Lesson Header - Clickable to expand */}
                                                    <button
                                                        onClick={() => toggleLessonExpansion(lesson.id)}
                                                        className="w-full p-3 text-left hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between">
                                                                    <h5 className="text-sm font-semibold text-gray-900 truncate mr-4">
                                                                        {lesson.title}
                                                                    </h5>
                                                                    <div className="flex items-center gap-3 text-xs text-gray-600 flex-shrink-0">
                                                                        <span>{lesson.totalMaterials} items</span>
                                                                        {lesson.totalMaterials > 0 && (
                                                                            <span className="text-green-600 font-medium">
                                                                                {lesson.completionPercent}%
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 ml-3">
                                                                {lesson.totalMaterials > 0 && (
                                                                    <div className="w-6 h-6 relative">
                                                                        <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 36 36">
                                                                            <path
                                                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                                                className="stroke-gray-200"
                                                                                fill="none"
                                                                                strokeWidth="4"
                                                                            />
                                                                            <path
                                                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                                                className="stroke-green-500"
                                                                                fill="none"
                                                                                strokeWidth="4"
                                                                                strokeDasharray={`${lesson.completionPercent}, 100`}
                                                                            />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                                <ChevronIcon isExpanded={isExpanded} />
                                                            </div>
                                                        </div>
                                                    </button>

                                        {/* Expandable Content */}
                                        <div className={`transition-all duration-300 ease-in-out ${
                                            isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                                        } overflow-hidden`}>
                                            {isExpanded && (
                                                <div className="px-3 pb-3 space-y-2">
                                                    {/* Materials organized by type */}
                                                    {Object.entries(lesson.materialsByType).map(([type, materials]) => {
                                                        if (materials.length === 0) return null;

                                                        const typeConfig = {
                                                            lessons: { label: 'Lessons', icon: '📖', color: 'blue' },
                                                            worksheets: { label: 'Assignments', icon: '📝', color: 'green' },
                                                            quizzes: { label: 'Quizzes', icon: '📊', color: 'red' },
                                                            videos: { label: 'Videos', icon: '🎥', color: 'purple' },
                                                            other: { label: 'Other', icon: '📁', color: 'gray' }
                                                        };

                                                        const config = typeConfig[type] || typeConfig.other;

                                                        return (
                                                            <div key={type} className="bg-white rounded-md border border-gray-100 p-2">
                                                                <h6 className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                                                                    <span className="text-sm">{config.icon}</span>
                                                                    {config.label} ({materials.length})
                                                                </h6>
                                                                <div className="space-y-1">
                                                                    {materials.map(material => (
                                                                        <MaterialListItem
                                                                            key={material.id}
                                                                            lesson={material}
                                                                            onOpenEditModal={onOpenEditModal}
                                                                            onToggleComplete={onToggleComplete}
                                                                            onDeleteMaterial={onDeleteMaterial}
                                                                            isCompact={true}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {lesson.totalMaterials === 0 && (
                                                        <div className="text-center py-3 text-gray-500 text-sm">
                                                            <span className="text-lg mb-1 block">📝</span>
                                                            No materials yet
                                                            <button
                                                                onClick={onAddMaterial}
                                                                className="block mx-auto mt-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
                                                            >
                                                                Add Materials
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                    </div>
                ) : lessons.length > 0 ? (
                    // Fallback to simple list if no structured lessons
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <ClockIcon className="h-5 w-5 text-blue-500" />
                                All Materials
                            </h4>
                            <Link
                                href={`/subject/${subject.child_subject_id}`}
                                className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <EyeIcon className="h-4 w-4" />
                                View All
                            </Link>
                        </div>

                        <div className="space-y-2">
                            {lessons.slice(0, 5).map(lesson => (
                                <MaterialListItem
                                    key={lesson.id}
                                    lesson={lesson}
                                    onOpenEditModal={onOpenEditModal}
                                    onToggleComplete={onToggleComplete}
                                    onDeleteMaterial={onDeleteMaterial}
                                    isCompact={true}
                                />
                            ))}
                        </div>

                        {lessons.length > 5 && (
                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-sm text-gray-500 text-center">
                                    + {lessons.length - 5} more materials
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        {lessons.length > 0 ? (
                            <div className="space-y-3">
                                <div className="text-gray-400">
                                    <svg className="h-8 w-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-gray-700 text-sm font-medium">No upcoming work</p>
                                    <Link
                                        href={`/subject/${subject.child_subject_id}`}
                                        className="inline-flex items-center gap-1 mt-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                        View All Materials
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <ListBulletIcon className="h-8 w-8 mx-auto text-gray-300" />
                                <p className="text-gray-500 text-sm">No materials yet</p>
                                <button
                                    onClick={onAddMaterial}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-sm text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    Get Started
                                </button>
                            </div>
                        )}
                    </div>
                )}
                </div>
            </div>
        </div>
    );
});

// Add the Skeleton component after the main component declaration
SubjectCard.Skeleton = ({ count = 1 }) => Array.from({ length: count }).map((_, i) => <Skeleton key={i} />);

SubjectCard.propTypes = {
  subject: PropTypes.shape({
    child_subject_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string.isRequired
  }).isRequired,
  lessons: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    completed_at: PropTypes.string,
    due_date: PropTypes.string,
    lesson_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  })),
  units: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    sequence_order: PropTypes.number
  })),
  lessonsByUnit: PropTypes.object,
  subjectStats: PropTypes.shape({
    total: PropTypes.number.isRequired,
    completed: PropTypes.number.isRequired,
    avgGradePercent: PropTypes.number
  }),
  onOpenEditModal: PropTypes.func.isRequired,
  onManageUnits: PropTypes.func.isRequired,
  onToggleComplete: PropTypes.func.isRequired,
  onDeleteMaterial: PropTypes.func.isRequired,
  onCreateLessonGroup: PropTypes.func.isRequired,
  onAddMaterial: PropTypes.func.isRequired
};

SubjectCard.defaultProps = {
  lessons: [],
  units: [],
  lessonsByUnit: {}
};

export default SubjectCard;
