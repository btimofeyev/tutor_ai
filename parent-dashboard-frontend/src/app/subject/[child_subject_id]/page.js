'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckIcon,
  XMarkIcon,
  PlusCircleIcon,
  AdjustmentsHorizontalIcon,
  BookOpenIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useSession } from "@supabase/auth-helpers-react";
import { useChildrenData } from "../../../hooks/useChildrenData";
import { useMaterialManagement } from "../../../hooks/useMaterialManagement";
import { useModalManagement } from "../../../hooks/useModalManagement";
import { useToast } from "../../../hooks/useToast";
import { useDashboardHandlers } from "../../../hooks/useDashboardHandlers";
import MaterialListItem from "../../dashboard/components/MaterialListItem";
import LessonGroupedMaterials from "../../dashboard/components/LessonGroupedMaterials";
import CompletionPieChart from "../../dashboard/components/charts/CompletionPieChart";
import Breadcrumbs from "../../../components/ui/Breadcrumbs";
import { signalDashboardRefresh } from "../../../utils/dashboardRefresh";
import StreamlinedAddAssignment from "../../dashboard/components/StreamlinedAddAssignment";
import EditMaterialModal from "../../dashboard/components/EditMaterialModal";
import MaterialDeleteModal from "../../dashboard/components/MaterialDeleteModal";
import {
  modalBackdropStyles,
  modalContainerStyles,
  modalCloseButtonStyles
} from '../../../utils/dashboardStyles';
import {
  APP_CONTENT_TYPES,
  APP_GRADABLE_CONTENT_TYPES
} from '../../../utils/dashboardConstants';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Materials', icon: '📚' },
  { value: 'upcoming', label: 'Upcoming', icon: '⏰' },
  { value: 'overdue', label: 'Overdue', icon: '🚨' },
  { value: 'completed', label: 'Completed', icon: '✅' },
  { value: 'no-due-date', label: 'No Due Date', icon: '📝' }
];

export default function SubjectPage() {
  const session = useSession();
  const router = useRouter();
  const params = useParams();
  const childSubjectId = params.child_subject_id;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Custom hooks
  const childrenData = useChildrenData(session);
  const materialManagement = useMaterialManagement(childrenData.refreshChildSpecificData, childrenData.invalidateChildCache);
  const modalManagement = useModalManagement();
  const { showSuccess, showError } = useToast();

  const dashboardHandlers = useDashboardHandlers({
    childrenData,
    materialManagement,
    modalManagement,
    showSuccess,
    showError,
    subscriptionPermissions: { maxChildren: 999 }, // Assume unlimited for this page
    selectedMaterials: new Set(),
    setSelectedMaterials: () => {},
    setBatchSelectionMode: () => {}
  });

  // Find the current subject and child
  const currentSubject = useMemo(() => {
    if (!childrenData.selectedChild || !childSubjectId) return null;
    return childrenData.childSubjects[childrenData.selectedChild.id]?.find(
      subject => subject.child_subject_id === childSubjectId
    );
  }, [childrenData.selectedChild, childSubjectId, childrenData.childSubjects]);

  // Get all lessons/materials for this subject
  const subjectLessons = useMemo(() => {
    if (!childSubjectId) return [];
    return childrenData.lessonsBySubject[childSubjectId] || [];
  }, [childSubjectId, childrenData.lessonsBySubject]);

  // Get units for this subject
  const subjectUnits = useMemo(() => {
    if (!childSubjectId) return [];
    return childrenData.unitsBySubject[childSubjectId] || [];
  }, [childSubjectId, childrenData.unitsBySubject]);

  // Organize materials by chapters (units) and lessons (lesson containers)
  const organizedChapters = useMemo(() => {
    if (!childSubjectId || !subjectUnits.length) return [];

    // Debug logging - can be removed later
    const chaptersWithMaterials = subjectUnits
      .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.name.localeCompare(b.name))
      .map((unit, index) => {
        const lessonContainers = childrenData.lessonsByUnit[unit.id] || [];

        // Sort lesson containers and get materials for each
        const organizedLessons = lessonContainers
          .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0) || a.title.localeCompare(b.title))
          .map((lessonContainer, lessonIndex) => {
            // Get materials for this lesson container using lesson_id field
            const materialsForLesson = subjectLessons.filter(lesson =>
              lesson.lesson_id === lessonContainer.id
            );

            return {
              ...lessonContainer,
              materials: materialsForLesson.sort((a, b) => {
                // Sort by creation date or title
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB - dateA; // Most recent first
              })
            };
          });

        // Log organized lessons for this unit
        return {
          ...unit,
          chapterNumber: index + 1,
          lessons: organizedLessons,
          totalMaterials: organizedLessons.reduce((sum, lesson) => sum + lesson.materials.length, 0),
          completedMaterials: organizedLessons.reduce((sum, lesson) =>
            sum + lesson.materials.filter(material => material.completed_at).length, 0
          )
        };
      });

    return chaptersWithMaterials;
  }, [childSubjectId, subjectUnits, childrenData.lessonsByUnit, subjectLessons]);

  // Filter and search logic for chapter-based view
  const filteredChapters = useMemo(() => {
    if (!searchTerm && selectedFilter === 'all') {
      return organizedChapters;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return organizedChapters.map(chapter => {
      const filteredLessons = chapter.lessons.map(lesson => {
        let filteredMaterials = [...lesson.materials];

        // Apply filter
        switch (selectedFilter) {
          case 'upcoming':
            filteredMaterials = filteredMaterials.filter(material =>
              !material.completed_at &&
              material.due_date &&
              new Date(material.due_date + 'T00:00:00') >= today
            );
            break;
          case 'overdue':
            filteredMaterials = filteredMaterials.filter(material =>
              !material.completed_at &&
              material.due_date &&
              new Date(material.due_date + 'T00:00:00') < today
            );
            break;
          case 'completed':
            filteredMaterials = filteredMaterials.filter(material => material.completed_at);
            break;
          case 'no-due-date':
            filteredMaterials = filteredMaterials.filter(material => !material.due_date && !material.completed_at);
            break;
          case 'all':
          default:
            // No filtering
            break;
        }

        // Apply search
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filteredMaterials = filteredMaterials.filter(material =>
            material.title.toLowerCase().includes(term) ||
            material.description?.toLowerCase().includes(term) ||
            material.content_type?.toLowerCase().includes(term)
          );
        }

        return {
          ...lesson,
          materials: filteredMaterials
        };
      }).filter(lesson => lesson.materials.length > 0); // Only show lessons with materials

      return {
        ...chapter,
        lessons: filteredLessons,
        totalMaterials: filteredLessons.reduce((sum, lesson) => sum + lesson.materials.length, 0),
        completedMaterials: filteredLessons.reduce((sum, lesson) =>
          sum + lesson.materials.filter(material => material.completed_at).length, 0
        )
      };
    }).filter(chapter => chapter.lessons.length > 0); // Only show chapters with lessons
  }, [organizedChapters, selectedFilter, searchTerm]);

  // Legacy filter for fallback view
  const filteredLessons = useMemo(() => {
    let filtered = [...subjectLessons];

    // Apply filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (selectedFilter) {
      case 'upcoming':
        filtered = filtered.filter(lesson =>
          !lesson.completed_at &&
          lesson.due_date &&
          new Date(lesson.due_date + 'T00:00:00') >= today
        );
        break;
      case 'overdue':
        filtered = filtered.filter(lesson =>
          !lesson.completed_at &&
          lesson.due_date &&
          new Date(lesson.due_date + 'T00:00:00') < today
        );
        break;
      case 'completed':
        filtered = filtered.filter(lesson => lesson.completed_at);
        break;
      case 'no-due-date':
        filtered = filtered.filter(lesson => !lesson.due_date && !lesson.completed_at);
        break;
      case 'all':
      default:
        // No filtering
        break;
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(lesson =>
        lesson.title.toLowerCase().includes(term) ||
        lesson.description?.toLowerCase().includes(term) ||
        lesson.content_type?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [subjectLessons, selectedFilter, searchTerm]);

  // Subject statistics
  const subjectStats = useMemo(() => {
    if (subjectLessons.length === 0) return { total: 0, completed: 0, percentage: 0 };

    const completed = subjectLessons.filter(lesson => lesson.completed_at).length;
    const total = subjectLessons.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate grade average for gradable items with grades
    const gradableItems = subjectLessons.filter(lesson =>
      APP_GRADABLE_CONTENT_TYPES.includes(lesson.content_type) &&
      lesson.grade_value !== null &&
      lesson.grade_value !== undefined &&
      lesson.grade_value !== '' &&
      lesson.grade_max_value &&
      lesson.grade_max_value !== null &&
      lesson.grade_max_value !== undefined &&
      lesson.grade_max_value !== ''
    );

    let avgGradePercent = null;
    let gradableItemsCount = 0;

    if (gradableItems.length > 0) {
      let totalPercentage = 0;
      gradableItemsCount = gradableItems.length;

      gradableItems.forEach(item => {
        const gradePercent = (parseFloat(item.grade_value) / parseFloat(item.grade_max_value)) * 100;
        totalPercentage += gradePercent;
      });

      avgGradePercent = Math.round(totalPercentage / gradableItemsCount);
    }

    return { total, completed, percentage, avgGradePercent, gradableItemsCount };
  }, [subjectLessons]);

  // Redirect to dashboard if no session
  useEffect(() => {
    if (session !== undefined && !session?.user) {
      router.replace("/login");
    }
  }, [session, router]);

  // Set selected child based on subject
  useEffect(() => {
    if (!currentSubject || !childrenData.children.length) return;

    // Find the child that owns this subject
    const owningChild = childrenData.children.find(child => {
      const childSubjects = childrenData.childSubjects[child.id] || [];
      return childSubjects.some(subject => subject.child_subject_id === childSubjectId);
    });

    if (owningChild && (!childrenData.selectedChild || childrenData.selectedChild.id !== owningChild.id)) {
      childrenData.setSelectedChild(owningChild);
    }
  }, [currentSubject, childrenData.children, childSubjectId, childrenData.childSubjects, childrenData.selectedChild, childrenData.setSelectedChild]);

  // Loading state
  if (!session?.user || childrenData.loadingInitial) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subject...</p>
        </div>
      </div>
    );
  }

  // Subject not found
  if (!currentSubject) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Subject Not Found</h1>
          <p className="text-gray-600 mb-4">The subject you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <Breadcrumbs
              items={[
                { label: "Dashboard", href: "/dashboard" },
                { label: currentSubject.name }
              ]}
              className="mb-4"
            />

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </Link>

                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{currentSubject.name}</h1>
                  <p className="text-gray-600 mt-1">
                    {childrenData.selectedChild?.name}&apos;s Materials
                  </p>
                </div>

                {subjectStats.total > 0 && (
                  <div className="hidden sm:flex items-center h-16 w-16">
                    <CompletionPieChart
                      completed={subjectStats.completed}
                      total={subjectStats.total}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/subject-settings/${childSubjectId}`}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <AdjustmentsHorizontalIcon className="h-4 w-4" />
                  Settings
                </Link>

                <button
                  onClick={() => modalManagement.openAddMaterialModal()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusCircleIcon className="h-4 w-4" />
                  Add Material
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span className="text-gray-600">{subjectStats.total} total materials</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-gray-600">{subjectStats.completed} completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-indigo-500 rounded-full"></span>
              <span className="text-gray-600">{subjectStats.percentage}% done</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
              <span className="text-gray-600">{organizedChapters.length} chapters</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
              <span className="text-gray-600">
                {organizedChapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0)} lessons
              </span>
            </div>
            {subjectStats.avgGradePercent !== null && subjectStats.gradableItemsCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-indigo-500 rounded-full"></span>
                <span className="text-gray-600">
                  {subjectStats.avgGradePercent}% average grade ({subjectStats.gradableItemsCount} graded)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FunnelIcon className="h-4 w-4" />
              Filter
              {selectedFilter !== 'all' && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {FILTER_OPTIONS.find(f => f.value === selectedFilter)?.label}
                </span>
              )}
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {FILTER_OPTIONS.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => {
                      setSelectedFilter(filter.value);
                      setShowFilters(false);
                    }}
                    className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedFilter === filter.value
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{filter.icon}</span>
                    {filter.label}
                    {selectedFilter === filter.value && (
                      <CheckIcon className="h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chapter-Based Materials Organization */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {organizedChapters.length > 0 ? (
          <div className="space-y-8">
            {/* Show filtered results count */}
            {(searchTerm || selectedFilter !== 'all') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Showing {filteredChapters.length} chapters with{' '}
                  {filteredChapters.reduce((sum, chapter) => sum + chapter.totalMaterials, 0)} materials
                  {searchTerm && ` matching "${searchTerm}"`}
                  {selectedFilter !== 'all' && ` (${FILTER_OPTIONS.find(f => f.value === selectedFilter)?.label})`}
                </p>
                {filteredChapters.length === 0 && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedFilter('all');
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Clear filters to see all materials
                  </button>
                )}
              </div>
            )}

            {filteredChapters.map(chapter => (
              <div key={chapter.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Chapter Header */}
                <div className={`px-6 py-4 border-b border-gray-200 ${
                  chapter.isUnassigned
                    ? 'bg-gradient-to-r from-orange-50 to-amber-50'
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpenIcon className={`h-6 w-6 ${chapter.isUnassigned ? 'text-orange-600' : 'text-blue-600'}`} />
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {chapter.isUnassigned ? chapter.name :
                            chapter.name.toLowerCase().startsWith('chapter') ?
                              chapter.name :
                              `Chapter ${chapter.chapterNumber}: ${chapter.name}`
                          }
                        </h2>
                        {chapter.description && (
                          <p className="text-sm text-gray-600 mt-1">{chapter.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        {chapter.totalMaterials} materials
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {chapter.completedMaterials} completed
                      </span>
                      {chapter.totalMaterials > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {Math.round((chapter.completedMaterials / chapter.totalMaterials) * 100)}% done
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lessons in Chapter */}
                <div className="divide-y divide-gray-100">
                  {chapter.lessons.length > 0 ? (
                    chapter.lessons.map((lesson, lessonIndex) => (
                      <div key={lesson.id} className="p-6">
                        {/* Lesson Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <DocumentTextIcon className={`h-5 w-5 ${lesson.isUnassigned ? 'text-orange-600' : 'text-indigo-600'}`} />
                            <h3 className={`text-lg font-semibold ${lesson.isUnassigned ? 'text-orange-800' : 'text-gray-800'}`}>
                              {lesson.isUnassigned ? lesson.title :
                                lesson.title.toLowerCase().startsWith('lesson') ?
                                  lesson.title :
                                  `Lesson ${lessonIndex + 1}: ${lesson.title}`
                              }
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{lesson.materials.length} materials</span>
                            <span className="text-gray-400">•</span>
                            <span>
                              {lesson.materials.filter(m => m.completed_at).length} completed
                            </span>
                          </div>
                        </div>

                        {/* Materials in Lesson */}
                        {lesson.materials.length > 0 ? (
                          <div className="space-y-3">
                            {lesson.materials.map(material => (
                              <div key={material.id} className="bg-gray-50 rounded-lg border border-gray-200">
                                <MaterialListItem
                                  lesson={material}
                                  onOpenEditModal={dashboardHandlers.handleOpenEditModal}
                                  onToggleComplete={dashboardHandlers.handleToggleLessonCompleteEnhanced}
                                  onDeleteMaterial={dashboardHandlers.handleDeleteMaterial}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-500">
                            <div className="text-4xl mb-2">📝</div>
                            <p className="text-sm">No materials in this lesson yet</p>
                            <button
                              onClick={() => modalManagement.openAddMaterialModal()}
                              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Add Material
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      <div className="text-4xl mb-2">📖</div>
                      <p className="text-sm">No lessons in this chapter yet</p>
                      <p className="text-xs text-gray-400 mt-1">Lessons will be created automatically when you add materials</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : subjectLessons.length > 0 ? (
          // Fallback: Show materials without chapter organization if no units exist
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">All Materials</h2>
              <p className="text-sm text-gray-600 mt-1">Materials not organized into chapters</p>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredLessons.map(lesson => (
                <div key={lesson.id} className="bg-gray-50 rounded-lg border border-gray-200 m-3">
                  <MaterialListItem
                    lesson={lesson}
                    onOpenEditModal={dashboardHandlers.handleOpenEditModal}
                    onToggleComplete={dashboardHandlers.handleToggleLessonCompleteEnhanced}
                    onDeleteMaterial={dashboardHandlers.handleDeleteMaterial}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="space-y-3">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900">No materials yet</h3>
              <p className="text-gray-500">Get started by adding some materials to this subject</p>
              <button
                onClick={() => modalManagement.openAddMaterialModal()}
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors"
              >
                <PlusCircleIcon className="h-4 w-4" />
                Add First Material
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Material Modal */}
      {modalManagement.isAddMaterialModalOpen && (
        <div className={modalBackdropStyles} onClick={() => modalManagement.closeAddMaterialModal()}>
          <div className={modalContainerStyles} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => modalManagement.closeAddMaterialModal()}
              className={modalCloseButtonStyles}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <div className="p-6 overflow-y-auto flex-1">
              <StreamlinedAddAssignment
                childSubjects={childrenData.childSubjects[childrenData.selectedChild?.id] || []}
                selectedChild={childrenData.selectedChild}
                preSelectedSubject={currentSubject?.name}
                onComplete={async () => {
                  await childrenData.refreshChildSpecificData();
                  showSuccess('Material added successfully!');
                }}
                onClose={() => modalManagement.closeAddMaterialModal()}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {materialManagement.editingLesson && (
        <EditMaterialModal
          editingLesson={materialManagement.editingLesson}
          editForm={materialManagement.editForm}
          onFormChange={(e) => {
            const { name, value, type, checked } = e.target;
            if (name === "completed_toggle")
              materialManagement.setEditForm((prev) => ({
                ...prev,
                completed_at: checked ? new Date().toISOString() : null,
              }));
            else materialManagement.setEditForm((prev) => ({ ...prev, [name]: value }));
          }}
          onSave={async () => {
            const result = await materialManagement.saveEditedLesson();
            if (result.success) {
              showSuccess(result.message || 'Material updated successfully');
              await childrenData.refreshChildSpecificData(true);
            } else {
              showError(result.error || 'Failed to update material');
            }
          }}
          onClose={materialManagement.cancelEditingLesson}
          isSaving={materialManagement.isSavingEdit}
          appContentTypes={APP_CONTENT_TYPES}
          appGradableContentTypes={APP_GRADABLE_CONTENT_TYPES}
          unitsForSubject={childrenData.unitsBySubject[materialManagement.editForm?.child_subject_id] || []}
          lessonContainersForSubject={[]} // Will need to populate this if needed
          subjectId={materialManagement.editForm?.child_subject_id}
        />
      )}

      {/* Delete Material Modal */}
      <MaterialDeleteModal
        isOpen={modalManagement.showDeleteMaterialModal}
        onClose={() => modalManagement.closeDeleteMaterialModal()}
        onConfirm={async (materialId) => {
          modalManagement.setIsDeletingMaterial(true);
          try {
            const result = await materialManagement.deleteMaterial(materialId);
            if (result.success) {
              await childrenData.refreshChildSpecificData();
              modalManagement.closeDeleteMaterialModal();
              showSuccess("Material deleted successfully!");
            } else {
              showError(result.error || "Failed to delete material.");
            }
          } catch (error) {
            showError("Failed to delete material.");
          } finally {
            modalManagement.setIsDeletingMaterial(false);
          }
        }}
        material={modalManagement.deletingMaterial}
        isDeleting={modalManagement.isDeletingMaterial}
      />
    </div>
  );
}
