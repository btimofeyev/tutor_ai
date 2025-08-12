// app/schedule/components/SubjectSection.js
"use client";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { getSubjectColor, getSubjectIcon } from '../../../utils/subjectColors';
import DraggableLessonContainer from './DraggableLessonContainer';

export default function SubjectSection({
  subject,
  lessonContainers = [],
  totalIncomplete = 0,
  isExpanded = true,
  onToggle,
  selectedLessonContainer = null,
  onLessonContainerSelect = () => {}
}) {
  const subjectColors = getSubjectColor(subject.custom_subject_name_override || subject.name);
  const subjectIcon = getSubjectIcon(subject.custom_subject_name_override || subject.name);

  const urgentCount = lessonContainers.filter(c => c.priority <= 2).length;
  const overdueCount = lessonContainers.filter(c => c.priority === 1).length;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
      {/* Subject Header */}
      <button
        onClick={onToggle}
        className={`w-full p-3 text-left transition-colors ${
          isExpanded
            ? `${subjectColors.bg} ${subjectColors.text}`
            : 'bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="text-lg">
              {subjectIcon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {subject.custom_subject_name_override || subject.name}
              </div>
              <div className="flex items-center gap-2 text-xs opacity-80 mt-0.5">
                <span>{lessonContainers.length} lessons ready</span>
                {totalIncomplete > lessonContainers.length && (
                  <span>• {totalIncomplete - lessonContainers.length} more</span>
                )}
                {urgentCount > 0 && (
                  <span className="text-red-600 font-semibold">
                    • {urgentCount} urgent
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Priority indicators */}
            {overdueCount > 0 && (
              <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                {overdueCount}
              </div>
            )}
            {urgentCount > overdueCount && (
              <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                {urgentCount - overdueCount}
              </div>
            )}

            {/* Expand/collapse icon */}
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
          </div>
        </div>
      </button>

      {/* Lesson Containers List */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-white">
          {lessonContainers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              <div className="p-2 bg-gray-100 rounded-full w-fit mx-auto mb-2">
                <AcademicCapIcon className="h-5 w-5 text-gray-400" />
              </div>
              <p className="font-medium">No lessons ready</p>
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {lessonContainers.map((lessonContainer, index) => (
                <DraggableLessonContainer
                  key={lessonContainer.id}
                  lessonContainer={lessonContainer}
                  subject={subject}
                  index={index}
                  selectedLessonContainer={selectedLessonContainer}
                  onLessonContainerSelect={onLessonContainerSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
