// app/schedule/components/DragDropScheduleCalendar.js
"use client";
import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  format, 
  addDays, 
  startOfWeek, 
  isSameDay, 
  parseISO,
  addMinutes,
  differenceInMinutes
} from 'date-fns';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  PlusIcon, 
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowsUpDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useScheduleManagement } from '../../../hooks/useScheduleManagement';
import { getSubjectColor, getSubjectDarkBgColor, getSubjectTextColor } from '../../../utils/subjectColors';

// Draggable Schedule Event Component
function DraggableScheduleEvent({ 
  event, 
  onEdit, 
  childSubjects = [],
  isOverlay = false,
  onResize = null,
  selectedChildrenIds = [],
  allChildren = []
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: event.id,
    data: {
      type: 'schedule-event',
      event: event
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const subject = event.subject_name || event.title || 'Study';
  const duration = event.duration || event.duration_minutes || 30;
  const height = Math.ceil(duration / 30);
  
  // Get child name if multiple children are selected
  const childName = selectedChildrenIds.length > 1 ? 
    allChildren.find(child => child.id === event.child_id)?.name || '' : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isOverlay ? 'z-50' : ''}`}
      {...attributes}
    >
      <div
        className={`relative rounded-md p-2 cursor-move transition-all hover:shadow-md border-2 ${
          isDragging ? 'border-blue-400 shadow-lg' : 'border-transparent'
        } ${getSubjectDarkBgColor(subject, childSubjects)} ${getSubjectTextColor(subject, childSubjects)}`}
        style={{ minHeight: `${height * 48 - 8}px` }}
        {...listeners}
      >
        {/* Drag handle */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowsUpDownIcon className="h-3 w-3" />
        </div>

        {/* Event content */}
        <div className="pr-4 pb-4 relative">
          <div className="text-xs font-medium truncate">{event.title || subject}</div>
          {childName && (
            <div className="text-xs opacity-90 font-medium">{childName}</div>
          )}
          {/* Duration positioned at bottom right */}
          <div className="absolute bottom-0 right-0 text-xs opacity-75">
            {duration}m
          </div>
        </div>

        {/* Status indicator */}
        {event.status === 'completed' && (
          <CheckIcon className="h-3 w-3 absolute bottom-1 right-1" />
        )}

        {/* Edit button */}
        <button
          className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-10 bg-white transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(event);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onEdit(event);
          }}
        />

        {/* Resize handles */}
        {onResize && (
          <>
            <div
              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-50 bg-gray-500 rounded-b-md"
              onMouseDown={(e) => {
                e.stopPropagation();
                onResize(event, 'bottom');
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

// Droppable Time Slot Component
function DroppableTimeSlot({ 
  id,
  day, 
  timeSlot, 
  onDrop, 
  isOccupied, 
  children,
  onCreateNew
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: id
  });
  const handleClick = () => {
    if (!isOccupied && onCreateNew) {
      onCreateNew(day, timeSlot);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[48px] border-r border-gray-200 transition-colors ${
        isOver && !isOccupied ? 'bg-blue-100 border-blue-300' :
        isOccupied 
          ? 'bg-transparent' 
          : 'cursor-pointer hover:bg-blue-50'
      }`}
      onClick={handleClick}
      data-day={format(day, 'yyyy-MM-dd')}
      data-time={timeSlot}
    >
      {children}
    </div>
  );
}

export default function DragDropScheduleCalendar({
  childId,
  selectedChildrenIds = [],
  allChildren = [],
  subscriptionPermissions,
  scheduleManagement,
  childSubjects = [],
  onEventUpdate
}) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [draggedEvent, setDraggedEvent] = useState(null);
  // Removed conflict detection state
  const [dragOverInfo, setDragOverInfo] = useState(null);
  const [localChanges, setLocalChanges] = useState(false);

  const {
    calendarEvents,
    loading,
    error,
    openCreateModal,
    openEditModal,
    updateScheduleEntry
  } = scheduleManagement || useScheduleManagement(childId, subscriptionPermissions);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  }, [currentWeek]);

  // Time slots
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour <= 15; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 15) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  }, []);

  // Get events for a specific day
  const getEventsForDay = useCallback((day) => {
    const dayString = format(day, 'yyyy-MM-dd');
    const events = calendarEvents || [];
    
    return events.filter(event => {
      if (event.date) return event.date === dayString;
      if (event.start) return isSameDay(new Date(event.start), day);
      return false;
    });
  }, [calendarEvents]);

  // Removed conflict detection function

  // Handle drag start
  const handleDragStart = useCallback((event) => {
    const eventData = calendarEvents?.find(e => e.id === event.active.id);
    setDraggedEvent(eventData);
  }, [calendarEvents]);

  // Handle drag over
  const handleDragOver = useCallback((event) => {
    const { over } = event;
    if (!over || !draggedEvent) return;

    // Extract day and time from the droppable element
    const overElement = document.querySelector(`[data-day][data-time]`);
    if (!overElement) return;

    const targetDay = parseISO(overElement.dataset.day);
    const targetTime = overElement.dataset.time;

    setDragOverInfo({ day: targetDay, time: targetTime });
  }, [draggedEvent]);

  // Handle drag end
  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    setDraggedEvent(null);
    setDragOverInfo(null);

    if (!over) {
      return;
    }

    // Parse the drop target ID to get day and time
    const dropTargetId = over.id;
    if (!dropTargetId || !dropTargetId.includes('_')) {
      return;
    }

    const [dayStr, timeStr] = dropTargetId.split('_');
    const targetDay = parseISO(dayStr);
    const targetTime = timeStr;
    const eventToMove = calendarEvents?.find(e => e.id === active.id);

    if (!eventToMove) {
      return;
    }

    // Extract the real entry ID and child ID from composite ID in multi-child mode
    let realEntryId = eventToMove.id;
    let childIdToUse = eventToMove.child_id;
    
    // Check if this is a composite ID format: "childId-entryId"
    // The format is UUID-UUID, so we need to find the last occurrence of "-"
    if (eventToMove.id && eventToMove.id.includes('-')) {
      // Find the last hyphen position to split child ID and entry ID
      const lastHyphenIndex = eventToMove.id.lastIndexOf('-');
      
      // Count total hyphens - if more than 4, it's likely a composite ID
      const hyphenCount = (eventToMove.id.match(/-/g) || []).length;
      
      // UUIDs have 4 hyphens, so composite IDs will have 9 hyphens total
      if (hyphenCount > 4) {
        // Split at the middle point between the two UUIDs
        const parts = eventToMove.id.split('-');
        if (parts.length > 5) {
          // Reconstruct the two UUIDs
          childIdToUse = parts.slice(0, 5).join('-');
          realEntryId = parts.slice(5).join('-');
        }
      }
    }
    
    // If we still don't have a child_id, try to get it from the original entry
    if (!childIdToUse && eventToMove.originalEntry) {
      childIdToUse = eventToMove.originalEntry.child_id;
    }
    
    // Final fallback: use the current childId if we're in single-child mode
    if (!childIdToUse) {
      childIdToUse = childId;
    }


    // Don't move if it's the same slot
    const currentDayStr = eventToMove.date || format(new Date(eventToMove.start), 'yyyy-MM-dd');
    const currentTime = eventToMove.startTime || eventToMove.start_time || format(new Date(eventToMove.start), 'HH:mm');
    if (currentDayStr === dayStr && currentTime === timeStr) {
      return;
    }

    // Removed conflict checking - allow any scheduling

    try {
      
      // Only send the fields that need to be updated
      // For multi-child management, we need to pass the child_id as well
      const updateResult = await updateScheduleEntry(realEntryId, {
        scheduled_date: dayStr,
        start_time: timeStr
      }, childIdToUse);
      
      
      // Show indicator if changes are local only
      if (updateResult.localOnly) {
        setLocalChanges(true);
      }
      
      if (onEventUpdate) {
        onEventUpdate({
          ...eventToMove,
          scheduled_date: dayStr,
          start_time: timeStr
        });
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      alert('Failed to move the event. Please try again.');
    }
  }, [calendarEvents, updateScheduleEntry, onEventUpdate, allChildren]);

  // Handle event resizing
  const handleEventResize = useCallback(async (event, direction) => {
    // Implement resize logic
  }, []);

  // Check if a time slot is occupied
  const isTimeSlotOccupied = useCallback((day, timeSlot) => {
    const dayEvents = getEventsForDay(day);
    const slotTime = new Date(`2000-01-01T${timeSlot}`);
    
    return dayEvents.some(event => {
      let eventTimeStr = event.startTime || format(new Date(event.start), 'HH:mm');
      eventTimeStr = eventTimeStr.length === 8 ? eventTimeStr.substring(0, 5) : eventTimeStr;
      const eventStartTime = new Date(`2000-01-01T${eventTimeStr}`);
      const eventDuration = event.duration || event.duration_minutes || 30;
      const eventEndTime = new Date(eventStartTime.getTime() + (eventDuration * 60000));
      
      const slotEndTime = new Date(slotTime.getTime() + (30 * 60000));
      return (slotTime < eventEndTime && slotEndTime > eventStartTime);
    });
  }, [getEventsForDay]);

  // Get event starting at specific time
  const getEventStartingAt = useCallback((day, timeSlot) => {
    const dayEvents = getEventsForDay(day);
    return dayEvents.find(event => {
      let eventTime = event.startTime || format(new Date(event.start), 'HH:mm');
      eventTime = eventTime.length === 8 ? eventTime.substring(0, 5) : eventTime;
      return eventTime === timeSlot;
    });
  }, [getEventsForDay]);

  // Removed conflict detection logic

  // Navigation
  const previousWeek = () => setCurrentWeek(addDays(currentWeek, -7));
  const nextWeek = () => setCurrentWeek(addDays(currentWeek, 7));
  const goToToday = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-8 gap-4">
            {Array.from({ length: 56 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3">
        {/* Compact Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <button
              onClick={previousWeek}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            
            <h2 className="text-sm font-medium text-text-primary min-w-[160px] text-center">
              Week of {format(currentWeek, 'MMM d, yyyy')}
            </h2>
            
            <button
              onClick={nextWeek}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={goToToday} className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md">
              Today
            </button>
            <button
              onClick={() => openCreateModal()}
              className="btn-primary px-3 py-1.5 text-sm"
            >
              <PlusIcon className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        {/* Drag Instructions */}
        {calendarEvents && calendarEvents.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-blue-800 text-sm">
              <ArrowsUpDownIcon className="h-4 w-4" />
              <span>Drag and drop events to reschedule them. Double-click to edit details.</span>
            </div>
          </div>
        )}
        
        {/* Local changes indicator */}
        {localChanges && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-800 text-sm">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span>Changes saved locally. Server sync may be required - check your internet connection.</span>
              </div>
              <button
                onClick={() => setLocalChanges(false)}
                className="text-yellow-600 hover:text-yellow-800"
                title="Dismiss this notification"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-3 text-sm font-medium text-gray-500 bg-gray-50">Time</div>
            {weekDays.map((day, index) => (
              <div key={day.toString()} className="p-3 text-center bg-gray-50">
                <div className="text-sm font-medium text-gray-900">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div className="max-h-[600px] overflow-y-auto">
            <SortableContext items={calendarEvents?.map(e => e.id) || []} strategy={verticalListSortingStrategy}>
              {timeSlots.map(timeSlot => (
                <div key={timeSlot} className="grid grid-cols-8 border-b border-gray-100">
                  {/* Time label */}
                  <div className="p-3 text-sm text-gray-500 bg-gray-50 border-r border-gray-200">
                    {timeSlot}
                  </div>
                  
                  {/* Day cells */}
                  {weekDays.map(day => {
                    const eventAtTime = getEventStartingAt(day, timeSlot);
                    const isOccupied = isTimeSlotOccupied(day, timeSlot);
                    // Removed conflict detection

                    return (
                      <DroppableTimeSlot
                        key={`${day}-${timeSlot}`}
                        id={`${format(day, 'yyyy-MM-dd')}_${timeSlot}`}
                        day={day}
                        timeSlot={timeSlot}
                        isOccupied={isOccupied}
                        // Removed conflict prop
                        onCreateNew={(day, time) => openCreateModal({ 
                          date: format(day, 'yyyy-MM-dd'), 
                          time 
                        })}
                      >
                        {eventAtTime && (
                          <DraggableScheduleEvent
                            event={eventAtTime}
                            onEdit={openEditModal}
                            childSubjects={childSubjects}
                            onResize={handleEventResize}
                            selectedChildrenIds={selectedChildrenIds}
                            allChildren={allChildren}
                          />
                        )}
                      </DroppableTimeSlot>
                    );
                  })}
                </div>
              ))}
            </SortableContext>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedEvent && (
            <DraggableScheduleEvent
              event={draggedEvent}
              onEdit={() => {}}
              childSubjects={childSubjects}
              isOverlay={true}
              selectedChildrenIds={selectedChildrenIds}
              allChildren={allChildren}
            />
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}