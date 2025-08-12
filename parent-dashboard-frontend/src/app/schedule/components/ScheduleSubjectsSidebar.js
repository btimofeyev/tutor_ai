// app/schedule/components/ScheduleSubjectsSidebar.js
"use client";
import { useState, useMemo } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  AcademicCapIcon,
  ClockIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import SubjectSection from './SubjectSection';
import { getSubjectColor, getSubjectIcon } from '../../../utils/subjectColors';

export default function ScheduleSubjectsSidebar({
  selectedChild,
  childSubjects = [],
  lessonsBySubject = {},
  unitsBySubject = {},
  lessonsByUnit = {},
  scheduleEntries = [],
  isVisible = true,
  onToggle,
  selectedLessonContainer = null,
  onLessonContainerSelect = () => {},
  className = ""
}) {
  const [expandedSubjects, setExpandedSubjects] = useState(
    // Start with all subjects expanded
    childSubjects.reduce((acc, subject) => {
      acc[subject.id] = true;
      return acc;
    }, {})
  );

  // Filter and organize lesson containers for display
  const organizedLessons = useMemo(() => {
    if (!selectedChild || !childSubjects.length) return {};

    const today = new Date();
    const oneWeekFromNow = addDays(today, 7);

    // Get list of already scheduled lesson container IDs
    const scheduledLessonContainerIds = new Set(
      scheduleEntries
        .map(entry => {
          // Check if lesson_container_id is directly available
          if (entry.lesson_container_id) {
            return entry.lesson_container_id;
          }

          // Otherwise, try to extract it from the notes field
          if (entry.notes) {
            try {
              const notesData = JSON.parse(entry.notes);
              if (notesData.lesson_container_id) {
                return notesData.lesson_container_id;
              }
            } catch (e) {
              // If notes parsing fails, continue
            }
          }

          return null;
        })
        .filter(id => id !== null)
    );

    // Debug logging removed for production

    return childSubjects.reduce((acc, subject) => {
      const subjectUnits = unitsBySubject[subject.child_subject_id] || [];
      const subjectMaterials = lessonsBySubject[subject.child_subject_id] || [];

      // Get all lesson containers from all units in this subject
      const allLessonContainers = [];

      subjectUnits.forEach(unit => {
        const unitLessons = lessonsByUnit[unit.id] || [];

        unitLessons.forEach(lesson => {
          // Find materials for this lesson container
          const lessonMaterials = subjectMaterials.filter(material =>
            material.lesson_id === lesson.id
          );

          if (lessonMaterials.length > 0) {
            const completedMaterials = lessonMaterials.filter(m => m.completed_at).length;
            const totalMaterials = lessonMaterials.length;

            // Only include if not all materials are completed AND not already scheduled
            if (completedMaterials < totalMaterials && !scheduledLessonContainerIds.has(lesson.id)) {
              // Check for urgency
              let hasOverdue = false;
              let hasDueSoon = false;
              let earliestDueDate = null;
              let priority = 3;

              lessonMaterials.forEach(material => {
                if (material.due_date && !material.completed_at) {
                  const dueDate = parseISO(material.due_date + 'T00:00:00');

                  if (!earliestDueDate || isBefore(dueDate, earliestDueDate)) {
                    earliestDueDate = dueDate;
                  }

                  if (isBefore(dueDate, today)) {
                    hasOverdue = true;
                    priority = 1;
                  } else if (isBefore(dueDate, addDays(today, 3)) && priority > 2) {
                    hasDueSoon = true;
                    priority = 2;
                  }
                }
              });

              allLessonContainers.push({
                id: lesson.id,
                title: lesson.title,
                unitTitle: unit.name,
                materials: lessonMaterials,
                totalMaterials,
                completedMaterials,
                progressPercentage: Math.round((completedMaterials / totalMaterials) * 100),
                hasOverdue,
                hasDueSoon,
                earliestDueDate,
                priority,
                urgencyLabel: hasOverdue ? 'Overdue' :
                             hasDueSoon ? 'Due Soon' :
                             earliestDueDate ? 'This Week' : 'Upcoming',
                urgencyColor: hasOverdue ? 'text-red-600' :
                             hasDueSoon ? 'text-orange-600' :
                             earliestDueDate ? 'text-yellow-600' : 'text-blue-600',
                dueDateFormatted: earliestDueDate
                  ? format(earliestDueDate, 'MMM d')
                  : null
              });
            }
          }
        });
      });

      // Sort and limit lesson containers
      const sortedLessonContainers = allLessonContainers
        .sort((a, b) => {
          // Sort by priority first (1 = highest priority)
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          // Then by earliest due date
          if (a.earliestDueDate && b.earliestDueDate) {
            return a.earliestDueDate - b.earliestDueDate;
          }
          if (a.earliestDueDate && !b.earliestDueDate) return -1;
          if (!a.earliestDueDate && b.earliestDueDate) return 1;
          // Finally by title
          return a.title.localeCompare(b.title);
        })
        .slice(0, 5); // Show top 5 lesson containers per subject

      if (sortedLessonContainers.length > 0) {
        acc[subject.id] = {
          subject,
          lessonContainers: sortedLessonContainers,
          totalIncomplete: sortedLessonContainers.length
        };
      }

      return acc;
    }, {});

    return result;
  }, [selectedChild, childSubjects, lessonsBySubject, unitsBySubject, lessonsByUnit, scheduleEntries]);

  const toggleSubject = (subjectId) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  if (!isVisible) {
    return null;
  }

  if (!selectedChild) {
    return (
      <div className="w-80 bg-gray-50 border-l border-gray-200 p-4 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <AcademicCapIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Select a student to view subjects</p>
        </div>
      </div>
    );
  }

  const subjectsWithLessons = Object.values(organizedLessons);

  return (
    <div className={`w-64 bg-white border-l border-gray-200 flex flex-col shadow-sm ${className}`}>
      {/* Clean Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AcademicCapIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Lessons</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Click to select • Top 5 each
              </p>
            </div>
          </div>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Hide sidebar"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {subjectsWithLessons.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
              <CalendarDaysIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No lessons ready</p>
            <p className="text-xs text-gray-500">
              Complete materials to unlock lesson containers
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {subjectsWithLessons.map(({ subject, lessonContainers, totalIncomplete }) => (
              <SubjectSection
                key={subject.id}
                subject={subject}
                lessonContainers={lessonContainers}
                totalIncomplete={totalIncomplete}
                isExpanded={expandedSubjects[subject.id]}
                onToggle={() => toggleSubject(subject.id)}
                selectedLessonContainer={selectedLessonContainer}
                onLessonContainerSelect={onLessonContainerSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <p className="font-medium text-gray-700 mb-2">Quick Guide:</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>Select lesson → Click time slot</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span>Red = overdue • Orange = due soon</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
