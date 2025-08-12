// app/schedule/components/DraggableMaterialCard.js
"use client";
import {
  ClockIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ArrowsUpDownIcon,
  PuzzlePieceIcon
} from '@heroicons/react/24/outline';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { APP_CONTENT_TYPES } from '../../../utils/dashboardConstants';

// Content type icons and default durations
const CONTENT_TYPE_CONFIG = {
  lesson: {
    icon: '📖',
    defaultDuration: 45,
    color: 'bg-blue-100 text-blue-800',
    description: 'Lesson'
  },
  worksheet: {
    icon: '📝',
    defaultDuration: 30,
    color: 'bg-green-100 text-green-800',
    description: 'Worksheet'
  },
  assignment: {
    icon: '📋',
    defaultDuration: 60,
    color: 'bg-purple-100 text-purple-800',
    description: 'Assignment'
  },
  review: {
    icon: '🔍',
    defaultDuration: 30,
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Review'
  },
  test: {
    icon: '📊',
    defaultDuration: 60,
    color: 'bg-red-100 text-red-800',
    description: 'Test'
  },
  quiz: {
    icon: '❓',
    defaultDuration: 15,
    color: 'bg-orange-100 text-orange-800',
    description: 'Quiz'
  },
  notes: {
    icon: '📄',
    defaultDuration: 20,
    color: 'bg-gray-100 text-gray-800',
    description: 'Notes'
  },
  reading_material: {
    icon: '📚',
    defaultDuration: 30,
    color: 'bg-indigo-100 text-indigo-800',
    description: 'Reading'
  },
  other: {
    icon: '📦',
    defaultDuration: 30,
    color: 'bg-gray-100 text-gray-800',
    description: 'Other'
  }
};

export default function DraggableMaterialCard({
  material,
  subject,
  index = 0
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `material-${material.id}`,
    data: {
      type: 'material',
      material: material,
      subject: subject
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  // Get content type configuration
  const contentTypeConfig = CONTENT_TYPE_CONFIG[material.content_type] || CONTENT_TYPE_CONFIG.other;

  // Determine urgency styling
  const getUrgencyBorder = () => {
    switch (material.priority) {
      case 1: return 'border-l-4 border-l-red-500'; // Overdue
      case 2: return 'border-l-4 border-l-orange-500'; // Due soon
      case 3: return 'border-l-4 border-l-yellow-500'; // This week
      default: return 'border-l-4 border-l-blue-500'; // Default
    }
  };

  const getUrgencyTextColor = () => {
    switch (material.priority) {
      case 1: return 'text-red-600';
      case 2: return 'text-orange-600';
      case 3: return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${isDragging ? 'z-50' : ''}`}
      {...attributes}
    >
      <div
        className={`
          bg-white border border-gray-200 rounded-lg p-3 cursor-move transition-all duration-200
          hover:shadow-lg hover:scale-[1.02] active:scale-95
          ${getUrgencyBorder()}
          ${isDragging ? 'shadow-2xl ring-2 ring-blue-300 scale-105' : 'shadow-sm'}
        `}
        {...listeners}
      >
        {/* Drag handle indicator */}
        <div className={`absolute top-2 right-2 transition-all duration-200 ${
          isDragging ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <div className="p-1 bg-gray-100 rounded-md">
            <ArrowsUpDownIcon className="h-3 w-3 text-gray-600" />
          </div>
        </div>

        {/* Content type and title */}
        <div className="flex items-start gap-2 mb-2 pr-6">
          <div className="text-lg flex-shrink-0 mt-0.5">
            {contentTypeConfig.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">
              {material.title}
            </div>
            <div className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${contentTypeConfig.color}`}>
              {contentTypeConfig.description}
            </div>
          </div>
        </div>

        {/* Material metadata */}
        <div className="space-y-1 text-xs text-gray-600">
          {/* Duration */}
          <div className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            <span>{contentTypeConfig.defaultDuration}min suggested</span>
          </div>

          {/* Due date */}
          {material.dueDateFormatted && (
            <div className="flex items-center gap-1">
              <CalendarDaysIcon className="h-3 w-3" />
              <span className={getUrgencyTextColor()}>
                Due {material.dueDateFormatted}
                {material.priority === 1 && ' (Overdue)'}
                {material.priority === 2 && ' (Soon)'}
              </span>
            </div>
          )}

          {/* Urgency indicator for items without due dates */}
          {!material.dueDateFormatted && material.urgencyLabel && (
            <div className="flex items-center gap-1">
              <ExclamationTriangleIcon className="h-3 w-3" />
              <span className={getUrgencyTextColor()}>
                {material.urgencyLabel}
              </span>
            </div>
          )}

          {/* Lesson container info if available */}
          {material.lesson_container_title && (
            <div className="flex items-center gap-1 text-gray-500">
              <PuzzlePieceIcon className="h-3 w-3" />
              <span className="truncate">
                {material.lesson_container_title}
              </span>
            </div>
          )}
        </div>

        {/* Drag instruction overlay */}
        <div className={`
          absolute inset-0 bg-blue-500/10 rounded-lg border-2 border-blue-500 border-dashed
          flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200
          pointer-events-none
        `}>
          <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-md font-medium">
            Drag to schedule
          </div>
        </div>
      </div>
    </div>
  );
}
