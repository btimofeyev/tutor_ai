// app/schedule/components/DraggableLessonContainer.js
"use client";
import {
  ClockIcon,
  CalendarDaysIcon,
  BookOpenIcon,
  ExclamationTriangleIcon,
  ArrowsUpDownIcon,
  PuzzlePieceIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function DraggableLessonContainer({
  lessonContainer,
  subject,
  index = 0,
  selectedLessonContainer = null,
  onLessonContainerSelect = () => {}
}) {
  const isSelected = selectedLessonContainer?.lessonContainer?.id === lessonContainer.id;

  const handleClick = () => {
    onLessonContainerSelect(lessonContainer, subject);
  };

  // Default lesson duration
  const defaultDuration = 30;

  // Determine urgency styling
  const getUrgencyBorder = () => {
    switch (lessonContainer.priority) {
      case 1: return 'border-l-4 border-l-red-500'; // Overdue
      case 2: return 'border-l-4 border-l-orange-500'; // Due soon
      case 3: return 'border-l-4 border-l-yellow-500'; // This week
      default: return 'border-l-4 border-l-blue-500'; // Default
    }
  };

  const getUrgencyTextColor = () => {
    switch (lessonContainer.priority) {
      case 1: return 'text-red-600';
      case 2: return 'text-orange-600';
      case 3: return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="group relative">
      <div
        onClick={handleClick}
        className={`
          bg-white border border-gray-200 rounded-lg p-3 cursor-pointer transition-all duration-300 transform
          hover:shadow-xl hover:scale-[1.03] active:scale-95 hover:-translate-y-1
          ${getUrgencyBorder()}
          ${isSelected ? 'shadow-2xl ring-4 ring-blue-400/50 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 animate-pulse' : 'shadow-sm hover:shadow-lg'}
        `}
      >
        {/* Enhanced selection indicator with pulse animation */}
        {isSelected && (
          <div className="absolute top-2 right-2 animate-pulse">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-lg animate-ping opacity-75"></div>
              <div className="relative p-1.5 bg-blue-500 rounded-lg shadow-lg">
                <CheckCircleIcon className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Lesson container header */}
        <div className="flex items-start gap-2 mb-2 pr-6">
          <div className="text-lg flex-shrink-0 mt-0.5">
            📚
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">
              {lessonContainer.title}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                Lesson Container
              </div>
              {lessonContainer.unitTitle && (
                <div className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                  {lessonContainer.unitTitle}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress and metadata */}
        <div className="space-y-1 text-xs text-gray-600">
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${lessonContainer.progressPercentage}%` }}
              />
            </div>
            <span className="text-xs font-medium">
              {lessonContainer.completedMaterials}/{lessonContainer.totalMaterials}
            </span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            <span>{defaultDuration}min suggested lesson time</span>
          </div>

          {/* Due date */}
          {lessonContainer.dueDateFormatted && (
            <div className="flex items-center gap-1">
              <CalendarDaysIcon className="h-3 w-3" />
              <span className={getUrgencyTextColor()}>
                Due {lessonContainer.dueDateFormatted}
                {lessonContainer.priority === 1 && ' (Overdue)'}
                {lessonContainer.priority === 2 && ' (Soon)'}
              </span>
            </div>
          )}

          {/* Urgency indicator for items without due dates */}
          {!lessonContainer.dueDateFormatted && lessonContainer.urgencyLabel && (
            <div className="flex items-center gap-1">
              <ExclamationTriangleIcon className="h-3 w-3" />
              <span className={getUrgencyTextColor()}>
                {lessonContainer.urgencyLabel}
              </span>
            </div>
          )}

          {/* Materials count */}
          <div className="flex items-center gap-1 text-gray-500">
            <PuzzlePieceIcon className="h-3 w-3" />
            <span>
              {lessonContainer.totalMaterials} materials
              {lessonContainer.completedMaterials > 0 && (
                <span className="text-green-600 ml-1">
                  ({lessonContainer.completedMaterials} completed)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Completion status */}
        {lessonContainer.progressPercentage === 100 && (
          <div className="absolute top-2 left-2">
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
          </div>
        )}

        {/* Enhanced click instruction overlay */}
        <div className={`
          absolute inset-0 rounded-lg border-2 transition-all duration-300 transform
          flex items-center justify-center pointer-events-none
          ${isSelected
            ? 'bg-green-500/20 border-green-500 border-dashed opacity-100 animate-pulse'
            : 'bg-blue-500/10 border-blue-500 border-dashed opacity-0 group-hover:opacity-100'}
        `}>
          <div className={`text-white text-xs px-3 py-2 rounded-lg font-medium shadow-lg animate-bounce ${
            isSelected
              ? 'bg-green-600 border-green-500 border'
              : 'bg-blue-500'
          }`}>
            <div className="flex items-center gap-1">
              {isSelected ? (
                <>
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                  <span>Now click calendar slot!</span>
                  <span className="text-lg">📅</span>
                </>
              ) : (
                <>
                  <span>Click to select</span>
                  <span className="text-lg">👆</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
