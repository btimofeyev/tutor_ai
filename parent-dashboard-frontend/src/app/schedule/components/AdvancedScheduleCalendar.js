// app/schedule/components/AdvancedScheduleCalendar.js
"use client";
import { useState, useMemo, useCallback } from 'react';
import { 
  format, 
  addDays, 
  addWeeks, 
  startOfWeek, 
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay, 
  parseISO,
  getDay,
  isWeekend,
  isToday 
} from 'date-fns';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  PlusIcon, 
  CalendarDaysIcon, 
  CheckIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
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
import { useScheduleManagement } from '../../../hooks/useScheduleManagement';
import { getSubjectColor, getSubjectDarkBgColor, getSubjectTextColor, getSubjectGradient, getSubjectIcon, getMultiChildSubjectStyle, getChildVariation } from '../../../utils/subjectColors';
// Removed WorkloadVisualization and CollapsibleWorkloadSummary components

const VIEW_TYPES = {
  WEEK: 'week',
  MULTI_WEEK: 'multi-week',
  MONTH: 'month'
};

export default function AdvancedScheduleCalendar({ 
  childId, 
  selectedChildrenIds = [], 
  allChildren = [],
  subscriptionPermissions, 
  scheduleManagement, 
  childSubjects = [],
  schedulePreferences = {},
  onGenerateAISchedule
}) {
  const [currentDate, setCurrentDate] = useState(() => {
    // Try to restore the last viewed date from localStorage
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('schedule-calendar-date');
      if (savedDate) {
        const parsedDate = new Date(savedDate);
        // Only use saved date if it's within reasonable range (not more than 6 months old/future)
        const now = new Date();
        const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
        const sixMonthsFuture = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000);
        
        if (parsedDate >= sixMonthsAgo && parsedDate <= sixMonthsFuture) {
          return parsedDate;
        }
      }
    }
    return new Date();
  });
  const [viewType, setViewType] = useState(VIEW_TYPES.WEEK);
  const [weeksToShow, setWeeksToShow] = useState(2); // For multi-week view
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [dragOverInfo, setDragOverInfo] = useState(null);
  const [localChanges, setLocalChanges] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Always call the hook to satisfy React rules
  const fallbackScheduleManagement = useScheduleManagement(childId, subscriptionPermissions);
  
  // Use schedule management from props or create our own
  const {
    calendarEvents,
    loading,
    error,
    openCreateModal,
    openEditModal,
    updateScheduleEntry
  } = scheduleManagement ?? fallbackScheduleManagement;

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

  // Calculate date ranges based on view type
  const dateRange = useMemo(() => {
    switch (viewType) {
      case VIEW_TYPES.WEEK:
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        return {
          start: weekStart,
          end: addDays(weekStart, 6),
          days: Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
        };
      
      case VIEW_TYPES.MULTI_WEEK:
        const multiWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const totalDays = weeksToShow * 7;
        return {
          start: multiWeekStart,
          end: addDays(multiWeekStart, totalDays - 1),
          days: Array.from({ length: totalDays }, (_, i) => addDays(multiWeekStart, i)),
          weeks: Array.from({ length: weeksToShow }, (_, i) => ({
            start: addWeeks(multiWeekStart, i),
            days: Array.from({ length: 7 }, (_, j) => addDays(addWeeks(multiWeekStart, i), j))
          }))
        };
      
      case VIEW_TYPES.MONTH:
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = addDays(startOfWeek(monthEnd, { weekStartsOn: 1 }), 6);
        return {
          start: calendarStart,
          end: calendarEnd,
          days: eachDayOfInterval({ start: calendarStart, end: calendarEnd })
        };
      
      default:
        return { start: new Date(), end: new Date(), days: [] };
    }
  }, [currentDate, viewType, weeksToShow]);


  // Dynamic time slots based on 15-minute increments for maximum flexibility
  const timeSlots = useMemo(() => {
    const startHour = schedulePreferences?.preferred_start_time ? 
      parseInt(schedulePreferences.preferred_start_time.split(':')[0]) : 9;
    const endHour = schedulePreferences?.preferred_end_time ? 
      parseInt(schedulePreferences.preferred_end_time.split(':')[0]) : 15;
    
    const slots = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      // Add all four 15-minute increments per hour: :00, :15, :30, :45
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < endHour) {
        slots.push(`${hour.toString().padStart(2, '0')}:15`);
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
        slots.push(`${hour.toString().padStart(2, '0')}:45`);
      }
    }
    return slots;
  }, [schedulePreferences]);

  // Calculate basic day statistics for display (no overload detection)
  const getDayStats = (day) => {
    const dayString = format(day, 'yyyy-MM-dd');
    const events = calendarEvents || [];
    
    const dayEvents = events.filter(event => {
      if (event.date) return event.date === dayString;
      if (event.start) return isSameDay(new Date(event.start), day);
      return false;
    });

    const totalMinutes = dayEvents.reduce((sum, event) => {
      return sum + (event.duration || event.duration_minutes || 30);
    }, 0);
    
    return {
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      events: dayEvents,
      subjectBreakdown: getSubjectBreakdown(dayEvents)
    };
  };

  // Get subject breakdown for basic statistics
  const getSubjectBreakdown = (events) => {
    const breakdown = {};
    events.forEach(event => {
      const subject = event.base_subject_name || event.subject_name || event.title || 'Other';
      const duration = event.duration || event.duration_minutes || 30;
      breakdown[subject] = (breakdown[subject] || 0) + duration;
    });
    return breakdown;
  };

  // Get events for a specific day
  const getEventsForDay = useCallback((day) => {
    const dayString = format(day, 'yyyy-MM-dd');
    const events = calendarEvents || [];
    
    const dayEvents = events.filter(event => {
      if (event.date) return event.date === dayString;
      if (event.start) return isSameDay(new Date(event.start), day);
      return false;
    });
    
    return dayEvents;
  }, [calendarEvents]);


  // Navigation functions with localStorage persistence
  const navigate = (direction) => {
    let newDate;
    switch (viewType) {
      case VIEW_TYPES.WEEK:
        newDate = addDays(currentDate, direction * 7);
        break;
      case VIEW_TYPES.MULTI_WEEK:
        newDate = addDays(currentDate, direction * weeksToShow * 7);
        break;
      case VIEW_TYPES.MONTH:
        newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        break;
      default:
        return;
    }
    setCurrentDate(newDate);
    // Save to localStorage to persist navigation state
    if (typeof window !== 'undefined') {
      localStorage.setItem('schedule-calendar-date', newDate.toISOString());
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('schedule-calendar-date', today.toISOString());
    }
  };

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
    if (eventToMove.id && eventToMove.id.includes('-')) {
      const lastHyphenIndex = eventToMove.id.lastIndexOf('-');
      const hyphenCount = (eventToMove.id.match(/-/g) || []).length;
      
      // UUIDs have 4 hyphens, so composite IDs will have 9 hyphens total
      if (hyphenCount > 4) {
        const parts = eventToMove.id.split('-');
        if (parts.length > 5) {
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

    try {
      // Update the schedule entry
      const updateResult = await updateScheduleEntry(realEntryId, {
        scheduled_date: dayStr,
        start_time: timeStr
      }, childIdToUse);
      
      // Show indicator if changes are local only
      if (updateResult && updateResult.localOnly) {
        setLocalChanges(true);
      } else {
        // Show success message briefly without causing navigation reset
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 2000);
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      alert('Failed to move the event. Please try again.');
    }
  }, [calendarEvents, updateScheduleEntry, childId]);

  // Handle day clicks with AI scheduling option
  const handleDayClick = (day) => {
    const clickedDate = format(day, 'yyyy-MM-dd');
    const dayOfWeek = day.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Only allow scheduling on weekdays
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      openCreateModal({
        date: clickedDate
      });
      return;
    }
    
    // Show options for weekdays
    const dayName = format(day, 'EEEE, MMMM d');
    const confirmMessage = `What would you like to do for ${dayName}?\n\n1. Create single lesson entry\n2. Generate AI schedule starting from this day\n\nClick "OK" for AI schedule, "Cancel" to create single entry.`;
    
    if (window.confirm(confirmMessage)) {
      // User chose AI schedule
      if (onGenerateAISchedule) {
        onGenerateAISchedule(clickedDate);
      } else {
        alert('AI scheduling is not available. Please use the AI Schedule button.');
      }
    } else {
      // User chose to create single entry
      openCreateModal({
        date: clickedDate
      });
    }
  };


  // Calculate available time duration from a given slot
  const calculateAvailableTime = useCallback((day, timeSlot) => {
    const events = getEventsForDay(day);
    const slotTime = new Date(`2000-01-01T${timeSlot}`);
    
    // Get day end time from preferences
    const endHour = schedulePreferences?.preferred_end_time ? 
      parseInt(schedulePreferences.preferred_end_time.split(':')[0]) : 15;
    const endMinute = schedulePreferences?.preferred_end_time ? 
      parseInt(schedulePreferences.preferred_end_time.split(':')[1]) : 0;
    const dayEnd = new Date(`2000-01-01T${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`);
    
    // Find the next event after this time slot
    let nextEventTime = dayEnd;
    events.forEach(event => {
      const eventTimeStr = event.startTime || format(new Date(event.start), 'HH:mm');
      const eventTime = new Date(`2000-01-01T${eventTimeStr}`);
      
      if (eventTime > slotTime && eventTime < nextEventTime) {
        nextEventTime = eventTime;
      }
    });
    
    // Calculate available minutes
    const availableMinutes = Math.floor((nextEventTime - slotTime) / (1000 * 60));
    return Math.max(0, availableMinutes);
  }, [getEventsForDay, schedulePreferences]);

  // Enhanced time slot click handler with smart 15-minute increment suggestions
  const handleTimeSlotClick = (day, timeSlot) => {
    if (isTimeSlotOccupied(day, timeSlot)) return;
    
    const availableMinutes = calculateAvailableTime(day, timeSlot);
    
    // Smart duration suggestions based on common lesson lengths and 15-minute increments
    const commonDurations = [15, 30, 45, 60, 75, 90]; // Common lesson durations
    let suggestedDuration = 30; // Default
    
    // Find the best fit duration that doesn't exceed available time
    for (let i = commonDurations.length - 1; i >= 0; i--) {
      if (commonDurations[i] <= availableMinutes) {
        suggestedDuration = commonDurations[i];
        break;
      }
    }
    
    // Provide multiple duration options for the user
    const durationOptions = commonDurations.filter(d => d <= availableMinutes);
    
    openCreateModal({
      date: format(day, 'yyyy-MM-dd'),
      time: timeSlot,
      suggestedDuration: suggestedDuration,
      availableMinutes: availableMinutes,
      durationOptions: durationOptions,
      smartSuggestion: availableMinutes !== suggestedDuration ? 
        `${availableMinutes} minutes available. Suggested: ${suggestedDuration}min` : null
    });
  };

  // Check if time slot is occupied
  const isTimeSlotOccupied = (day, timeSlot) => {
    const dayEvents = getEventsForDay(day);
    const slotTime = new Date(`2000-01-01T${timeSlot}`);
    
    return dayEvents.some(event => {
      let eventTimeStr = event.startTime || format(new Date(event.start), 'HH:mm');
      eventTimeStr = eventTimeStr.length === 8 ? eventTimeStr.substring(0, 5) : eventTimeStr;
      const eventStartTime = new Date(`2000-01-01T${eventTimeStr}`);
      const eventDuration = event.duration || event.duration_minutes || 30;
      
      // Calculate visual end time based on 15-minute increments
      const visualHeight = Math.ceil(eventDuration / 15);
      const visualDurationMinutes = visualHeight * 15; // Convert back to minutes for overlap calculation
      const eventEndTime = new Date(eventStartTime.getTime() + (visualDurationMinutes * 60000));
      
      const slotEndTime = new Date(slotTime.getTime() + (15 * 60000)); // 15-minute slot
      return (slotTime < eventEndTime && slotEndTime > eventStartTime);
    });
  };

  // Simple day status indicator (no overload detection)
  const getDayStatusColor = (totalMinutes) => {
    if (totalMinutes === 0) return 'bg-gray-100';
    return 'bg-blue-100'; // Simple blue for scheduled days
  };

  const getDayStatusTextColor = (totalMinutes) => {
    if (totalMinutes === 0) return 'text-gray-400';
    return 'text-blue-800';
  };

  // Render view type selector - simplified icons
  const renderViewSelector = () => (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setViewType(VIEW_TYPES.WEEK)}
        className={`btn-icon ${
          viewType === VIEW_TYPES.WEEK 
            ? 'bg-blue-50 text-blue-700 border-blue-200' 
            : ''
        }`}
        title="Week view"
      >
        <ViewColumnsIcon className="h-5 w-5" />
      </button>
      <button
        onClick={() => setViewType(VIEW_TYPES.MULTI_WEEK)}
        className={`btn-icon ${
          viewType === VIEW_TYPES.MULTI_WEEK 
            ? 'bg-blue-50 text-blue-700 border-blue-200' 
            : ''
        }`}
        title="Multi-week view"
      >
        <Squares2X2Icon className="h-5 w-5" />
      </button>
      <button
        onClick={() => setViewType(VIEW_TYPES.MONTH)}
        className={`btn-icon ${
          viewType === VIEW_TYPES.MONTH 
            ? 'bg-blue-50 text-blue-700 border-blue-200' 
            : ''
        }`}
        title="Month view"
      >
        <CalendarDaysIcon className="h-5 w-5" />
      </button>
    </div>
  );

  // Render week selector for multi-week view - compact
  const renderWeekSelector = () => {
    if (viewType !== VIEW_TYPES.MULTI_WEEK) return null;
    
    return (
      <div className="flex items-center gap-1">
        {[2, 3, 4].map(weeks => (
          <button
            key={weeks}
            onClick={() => setWeeksToShow(weeks)}
            className={`px-2 py-1 rounded-md text-sm font-medium transition-all ${
              weeksToShow === weeks 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {weeks}w
          </button>
        ))}
      </div>
    );
  };

  // Render title based on view type
  const renderTitle = () => {
    switch (viewType) {
      case VIEW_TYPES.WEEK:
        return `Week of ${format(dateRange.start, 'MMM d, yyyy')}`;
      case VIEW_TYPES.MULTI_WEEK:
        return `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`;
      case VIEW_TYPES.MONTH:
        return format(currentDate, 'MMMM yyyy');
      default:
        return '';
    }
  };

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
        {/* Enhanced Drag Instructions with modern design */}
        {calendarEvents && calendarEvents.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/90 backdrop-blur-sm border border-blue-200/60 rounded-xl p-4 mb-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow-sm">
                <ArrowsUpDownIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-blue-900 mb-1">✨ Interactive Schedule</h4>
                <p className="text-sm text-blue-700 font-medium">
                  Drag events to reschedule with 15-minute precision • Click weekdays for AI scheduling • Double-click to edit
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Enhanced success message */}
        {showSuccessMessage && (
          <div className="bg-gradient-to-r from-green-50/90 to-emerald-50/90 backdrop-blur-sm border border-green-200/60 rounded-xl p-3 mb-4 shadow-lg animate-fade-in">
            <div className="flex items-center gap-2 text-green-800 text-sm font-medium">
              <div className="p-1 bg-green-100 rounded-full">
                <CheckIcon className="h-4 w-4" />
              </div>
              <span>✅ Schedule updated successfully!</span>
            </div>
          </div>
        )}
        
        {/* Enhanced local changes indicator */}
        {localChanges && (
          <div className="bg-gradient-to-r from-yellow-50/90 to-amber-50/90 backdrop-blur-sm border border-yellow-200/60 rounded-xl p-3 mb-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium">
                <div className="p-1 bg-yellow-100 rounded-full">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                </div>
                <span>⚠️ Changes saved locally. Server sync may be required - check your connection.</span>
              </div>
              <button
                onClick={() => setLocalChanges(false)}
                className="text-yellow-600 hover:text-yellow-800 font-bold text-lg transition-colors duration-200"
                title="Dismiss this notification"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Modern Header with Navigation */}
        <div className="flex justify-between items-center bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-200/50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100/70 rounded-xl transition-all duration-200 hover:shadow-md"
            aria-label="Previous period"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          
          <h2 className="text-lg font-bold text-gray-800 min-w-[180px] text-center">
            {renderTitle()}
          </h2>
          
          <button
            onClick={() => navigate(1)}
            className="p-2 hover:bg-gray-100/70 rounded-xl transition-all duration-200 hover:shadow-md"
            aria-label="Next period"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          {renderWeekSelector()}
          {renderViewSelector()}
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100/70 rounded-xl transition-all duration-200 hover:shadow-md"
          >
            📅 Today
          </button>
          <button
            onClick={() => openCreateModal()}
            className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add Lesson
          </button>
        </div>
      </div>

      {/* Removed Workload Summary - no overload detection */}

      {/* Calendar Grid */}
      {viewType === VIEW_TYPES.WEEK && (
        <WeekView 
          dateRange={dateRange}
          timeSlots={timeSlots}
          getEventsForDay={getEventsForDay}
          getDayStats={getDayStats}
          handleTimeSlotClick={handleTimeSlotClick}
          handleDayClick={handleDayClick}
          openEditModal={openEditModal}
          childSubjects={childSubjects}
          selectedChildrenIds={selectedChildrenIds}
          allChildren={allChildren}
          calculateAvailableTime={calculateAvailableTime}
        />
      )}

      {viewType === VIEW_TYPES.MULTI_WEEK && (
        <MultiWeekView 
          dateRange={dateRange}
          getDayStats={getDayStats}
          getEventsForDay={getEventsForDay}
          handleDayClick={handleDayClick}
          openEditModal={openEditModal}
          childSubjects={childSubjects}
          selectedChildrenIds={selectedChildrenIds}
          allChildren={allChildren}
        />
      )}

      {viewType === VIEW_TYPES.MONTH && (
        <MonthView 
          dateRange={dateRange}
          currentDate={currentDate}
          getDayStats={getDayStats}
          getEventsForDay={getEventsForDay}
          handleDayClick={handleDayClick}
          openEditModal={openEditModal}
          childSubjects={childSubjects}
          selectedChildrenIds={selectedChildrenIds}
          allChildren={allChildren}
        />
      )}
      
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

// Draggable Schedule Event Component
function DraggableScheduleEvent({ 
  event, 
  onEdit, 
  childSubjects = [],
  isOverlay = false,
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
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const subject = event.base_subject_name || event.subject_name || event.title || 'Study';
  const duration = event.duration || event.duration_minutes || 30;
  // Calculate height based on 15-minute increments for precise visual representation
  const timeSlotHeight = 64; // Each 15-minute slot is 64px to match the grid
  const actualHeightPx = Math.max(timeSlotHeight, (duration / 15) * timeSlotHeight); // Scale precisely with 15-min increments
  const height = Math.ceil(duration / 15); // Grid layout calculations based on 15-min slots
  const displayTitle = event.title || subject;
  
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
        className={`absolute inset-x-1 top-1 rounded-xl p-2 cursor-move transition-all duration-300 ease-out hover:shadow-2xl hover:scale-[1.02] border-2 z-10 ${
          isDragging 
            ? 'border-white/60 shadow-2xl ring-2 ring-white/50 scale-105' 
            : 'border-white/40 hover:border-white/60 shadow-lg'
        } ${getSubjectGradient(subject, childSubjects)}`}
        style={{ 
          height: `${actualHeightPx - 8}px` // Allow proper spanning for longer events
        }}
        {...listeners}
      >
        {/* Modern drag handle */}
        <div className={`absolute top-2 right-2 transition-all duration-300 ${
          isDragging ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <div className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/20">
            <ArrowsUpDownIcon className="h-3 w-3 text-gray-700" />
          </div>
        </div>

        {/* Event content */}
        {height <= 1 ? (
          /* Compact layout for 30-minute slots */
          <div className="h-full flex items-center justify-between p-2 overflow-hidden">
            <div className="flex items-center flex-1 min-w-0 pr-2">
              <div className="text-sm mr-2 opacity-90">
                {getSubjectIcon(subject, childSubjects)}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-bold text-xs truncate leading-tight ${getSubjectTextColor(subject, childSubjects)} ${event.status === 'completed' ? 'line-through opacity-70' : ''}`}>
                  {displayTitle}
                </div>
                <div className={`text-xs font-bold mt-0.5 ${getSubjectTextColor(subject, childSubjects)} opacity-80`}>
                  {duration}m
                </div>
              </div>
            </div>
            
            {event.status === 'completed' && (
              <div className="p-1 bg-green-500/90 rounded-full shadow-sm">
                <CheckIcon className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        ) : (
          /* Full layout for longer slots */
          <div className="h-full flex flex-col justify-between p-3 overflow-hidden">
            {/* Header with icon and title */}
            <div className="flex items-start gap-2 flex-1 overflow-hidden">
              <div className="text-base opacity-90 mt-0.5 flex-shrink-0">
                {getSubjectIcon(subject, childSubjects)}
              </div>
              <div className="flex-1 min-w-0">
                {/* Subject/Title - Main heading */}
                <div className={`font-bold text-sm mb-1 truncate ${getSubjectTextColor(subject, childSubjects)} ${event.status === 'completed' ? 'line-through opacity-70' : ''}`}>
                  {displayTitle}
                </div>
                
                {/* Lesson title if available - Secondary info */}
                {event.lesson?.title && event.lesson.title !== displayTitle && (
                  <div className={`text-xs font-semibold mb-1 line-clamp-2 ${getSubjectTextColor(subject, childSubjects)} opacity-90`}>
                    {event.lesson.title}
                  </div>
                )}
                
                {/* Child name for multi-child view */}
                {childName && (
                  <div className={`text-xs font-bold truncate bg-white/40 px-2 py-1 rounded-md mt-1 ${getSubjectTextColor(subject, childSubjects)}`}>
                    {childName}
                  </div>
                )}
              </div>
            </div>
            
            {/* Bottom section with duration and completion */}
            <div className={`flex justify-between items-center mt-2 pt-2 border-t ${getSubjectTextColor(subject, childSubjects)} border-current opacity-20`}>
              <div className={`text-xs font-bold bg-white/40 px-2 py-1 rounded-md ${getSubjectTextColor(subject, childSubjects)} opacity-90`}>
                {duration}m
              </div>
              
              {event.status === 'completed' && (
                <div className="p-1 bg-green-500/90 rounded-full shadow-sm">
                  <CheckIcon className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          </div>
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
      </div>
    </div>
  );
}

// Droppable Time Slot Component
function DroppableTimeSlot({ 
  id,
  day, 
  timeSlot, 
  isOccupied, 
  children,
  onCreateNew,
  availableMinutes = null
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: id
  });
  
  const handleClick = () => {
    if (!isOccupied && onCreateNew) {
      onCreateNew(day, timeSlot);
    }
  };

  const isWeekend = getDay(day) === 0 || getDay(day) === 6;

  return (
    <div
      ref={setNodeRef}
      className={`group transition-all duration-300 ease-out ${
        isOver && !isOccupied 
          ? 'bg-gradient-to-br from-blue-100/80 to-blue-200/80 border-blue-400/60 shadow-inner backdrop-blur-sm' :
        isOccupied 
          ? 'bg-transparent'
          : `cursor-pointer ${isWeekend ? 'hover:bg-gray-100/50' : 'hover:bg-blue-50/50 hover:shadow-sm'}`
      } ${isWeekend ? 'bg-gray-50/30' : 'bg-white/50'} border-r border-b border-gray-200/60 relative backdrop-blur-xs`}
      onClick={handleClick}
      data-day={format(day, 'yyyy-MM-dd')}
      data-time={timeSlot}
      style={{ minHeight: '64px' }}
    >
      {/* Modern drop zone indicator */}
      {isOver && !isOccupied && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-blue-700 text-xs font-semibold bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-blue-300/60 animate-pulse">
            Drop here ✨
          </div>
        </div>
      )}
      
      {/* Enhanced available time hint on hover for empty slots */}
      {!isOccupied && availableMinutes && availableMinutes < 60 && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
          <div className="text-xs text-amber-700 font-medium bg-amber-50/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-amber-200/60 shadow-sm">
            ⏱️ {availableMinutes}min
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
}

// Week View Component - Cleaner Design
function WeekView({ 
  dateRange, 
  timeSlots, 
  getEventsForDay, 
  getDayStats,
  handleTimeSlotClick,
  handleDayClick, 
  openEditModal,
  childSubjects,
  selectedChildrenIds,
  allChildren,
  calculateAvailableTime
}) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get all events for sortable context
  const allEvents = dateRange.days.flatMap(day => getEventsForDay(day));

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200/50 overflow-hidden shadow-xl">
      {/* Modern day headers - now clickable */}
      <div className="grid grid-cols-8 bg-gradient-to-r from-slate-50/80 to-gray-50/80 backdrop-blur-sm">
        <div className="p-4 text-xs font-semibold text-gray-600 bg-gradient-to-br from-gray-50/90 to-gray-100/90 border-b border-r border-gray-200/60 backdrop-blur-sm">TIME</div>
        {dateRange.days.map((day, index) => {
          const dayStats = getDayStats(day);
          const isWeekend = index >= 5;
          const isTodayDay = isToday(day);
          const dayOfWeek = day.getDay();
          const isClickableWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday-Friday
          
          return (
            <div 
              key={day.toString()} 
              className={`p-4 text-center border-b border-gray-200/60 transition-all duration-300 ease-out ${
                isWeekend ? 'bg-gray-50/70' : 'bg-white/70'
              } ${
                isClickableWeekday ? 'cursor-pointer hover:bg-blue-50/80 hover:shadow-lg hover:backdrop-blur-md transform hover:scale-105' : ''
              } ${
                isTodayDay ? 'bg-gradient-to-br from-blue-100/90 to-blue-200/70 ring-2 ring-blue-300/60 ring-opacity-50 backdrop-blur-sm' : ''
              } backdrop-blur-xs`}
              onClick={() => isClickableWeekday ? handleDayClick(day) : null}
              title={isClickableWeekday ? `Click to schedule lessons starting ${format(day, 'EEEE, MMM d')}` : format(day, 'EEEE, MMM d')}
            >
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {dayNames[index]}
              </div>
              <div className={`text-xl font-bold mt-1 ${
                isTodayDay ? 'text-blue-900' : 'text-gray-900'
              }`}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modern time slots grid with glassmorphism */}
      <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
        <SortableContext items={allEvents.map(e => e.id) || []} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-8 bg-gradient-to-br from-white/60 to-gray-50/40 backdrop-blur-sm">
            {/* Enhanced time labels column */}
            <div className="bg-gradient-to-b from-gray-50/90 to-gray-100/80 border-r border-gray-200/60 backdrop-blur-sm">
              <div className="h-12 border-b border-gray-200/60 flex items-center justify-center text-xs font-semibold text-gray-600">
                Time
              </div>
              {timeSlots.map(timeSlot => (
                <div key={timeSlot} className="h-16 border-b border-gray-100/60 flex items-center justify-center text-xs font-medium text-gray-600 bg-white/20">
                  {timeSlot}
                </div>
              ))}
            </div>
  
            {/* Day columns */}
            {dateRange.days.map((day, dayIndex) => {
              const dayString = format(day, 'yyyy-MM-dd');
              const events = getEventsForDay(day);
              const dayStats = getDayStats(day);
              const isWeekendDay = isWeekend(day);
              const isTodayDay = isToday(day);
              
              return (
                <div key={dayString} className="border-r border-gray-200/60 last:border-r-0">

                  {/* Dynamic 15-minute time slots */}
                  {timeSlots.map((timeSlot, timeSlotIndex) => {
                    // Check if this slot starts an event
                    const eventStartingHere = events.find(event => {
                      let eventTimeStr = event.startTime || event.start_time;
                      if (!eventTimeStr && event.start) {
                        eventTimeStr = format(new Date(event.start), 'HH:mm');
                      }
                      if (!eventTimeStr && event.scheduled_date && event.start_time) {
                        eventTimeStr = event.start_time;
                      }
                      // Normalize time format - remove seconds if present
                      if (eventTimeStr && eventTimeStr.length === 8) {
                        eventTimeStr = eventTimeStr.substring(0, 5);
                      }
                      return eventTimeStr === timeSlot;
                    });

                    // Check if this slot is occupied by a spanning event
                    const isOccupiedBySpanningEvent = events.some(event => {
                      let eventTimeStr = event.startTime || event.start_time;
                      if (!eventTimeStr && event.start) {
                        eventTimeStr = format(new Date(event.start), 'HH:mm');
                      }
                      if (!eventTimeStr && event.scheduled_date && event.start_time) {
                        eventTimeStr = event.start_time;
                      }
                      if (eventTimeStr && eventTimeStr.length === 8) {
                        eventTimeStr = eventTimeStr.substring(0, 5);
                      }
                      
                      if (!eventTimeStr) return false;
                      
                      const eventStartTime = new Date(`2000-01-01T${eventTimeStr}`);
                      const currentSlotTime = new Date(`2000-01-01T${timeSlot}`);
                      const eventDuration = event.duration || event.duration_minutes || 30;
                      const eventEndTime = new Date(eventStartTime.getTime() + (eventDuration * 60000));
                      const slotEndTime = new Date(currentSlotTime.getTime() + (15 * 60000));
                      
                      return currentSlotTime < eventEndTime && slotEndTime > eventStartTime && eventTimeStr !== timeSlot;
                    });

                    if (eventStartingHere) {
                      // Show the event starting here with proper height
                      const duration = eventStartingHere.duration || eventStartingHere.duration_minutes || 30;
                      const slotsSpanned = Math.ceil(duration / 15);
                      
                      return (
                        <div key={timeSlot} className="relative" style={{ minHeight: '64px' }}>
                          <DraggableScheduleEvent
                            key={`${eventStartingHere.id}-${timeSlot}`}
                            event={eventStartingHere}
                            onEdit={openEditModal}
                            childSubjects={childSubjects}
                            selectedChildrenIds={selectedChildrenIds}
                            allChildren={allChildren}
                          />
                        </div>
                      );
                    } else if (isOccupiedBySpanningEvent) {
                      // This slot is occupied by a spanning event, render empty slot
                      return (
                        <div key={timeSlot} className="relative" style={{ minHeight: '64px' }}>
                          {/* Empty slot occupied by spanning event */}
                        </div>
                      );
                    }

                    // Empty available slot
                    return (
                      <DroppableTimeSlot
                        key={timeSlot}
                        id={`${format(day, 'yyyy-MM-dd')}_${timeSlot}`}
                        day={day}
                        timeSlot={timeSlot}
                        isOccupied={false}
                        onCreateNew={handleTimeSlotClick}
                        availableMinutes={calculateAvailableTime(day, timeSlot)}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}


// Multi-Week View Component
function MultiWeekView({ 
  dateRange, 
  getDayStats, 
  getEventsForDay,
  handleDayClick, 
  openEditModal,
  childSubjects,
  selectedChildrenIds,
  allChildren
}) {
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-4">
      {dateRange.weeks?.map((week, weekIndex) => (
        <div key={weekIndex} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">
              Week of {format(week.start, "MMM d, yyyy")}
            </h3>
          </div>
          <div className="grid grid-cols-7">
            {week.days.map((day, dayIndex) => {
              const dayStats = getDayStats(day);
              const events = getEventsForDay(day);
              const isWeekend = dayIndex >= 5;
              const isTodayDay = isToday(day);
              
              return (
                <div 
                  key={day.toString()} 
                  className={`p-3 border-r border-gray-200 last:border-r-0 min-h-[120px] cursor-pointer transition-colors ${
                    isWeekend ? "bg-gray-50" : "bg-white hover:bg-blue-50"
                  } ${isTodayDay ? "bg-blue-100" : ""}`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="text-center mb-3">
                    <div className="text-xs font-medium text-gray-500 uppercase">
                      {dayNames[dayIndex]}
                    </div>
                    <div className={`text-lg font-semibold ${isTodayDay ? "text-blue-800" : "text-gray-900"}`}>
                      {format(day, "d")}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {events.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded truncate ${getSubjectColor(event.subject_name || event.title, childSubjects).bg} ${getSubjectColor(event.subject_name || event.title, childSubjects).text}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(event);
                        }}
                      >
                        {event.title || event.subject_name}
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{events.length - 3} more
                      </div>
                    )}
                  </div>
                  {dayStats.totalMinutes > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {dayStats.totalHours}h scheduled
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Month View Component  
function MonthView({ 
  dateRange, 
  currentDate,
  getDayStats, 
  getEventsForDay,
  handleDayClick, 
  openEditModal,
  childSubjects,
  selectedChildrenIds,
  allChildren
}) {
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeks = [];
  
  for (let i = 0; i < dateRange.days.length; i += 7) {
    weeks.push(dateRange.days.slice(i, i + 7));
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {dayNames.map(day => (
          <div key={day} className="p-3 text-center text-xs font-medium text-gray-500 uppercase">
            {day}
          </div>
        ))}
      </div>
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7">
          {week.map((day, dayIndex) => {
            const dayStats = getDayStats(day);
            const events = getEventsForDay(day);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isWeekend = dayIndex >= 5;
            const isTodayDay = isToday(day);
            
            return (
              <div 
                key={day.toString()} 
                className={`p-2 border-r border-b border-gray-200 last:border-r-0 min-h-[100px] cursor-pointer transition-colors ${
                  !isCurrentMonth ? "bg-gray-50 text-gray-400" :
                  isWeekend ? "bg-gray-50" : "bg-white hover:bg-blue-50"
                } ${isTodayDay ? "bg-blue-100" : ""}`}
                onClick={() => handleDayClick(day)}
              >
                <div className={`text-sm font-semibold mb-1 ${
                  isTodayDay ? "text-blue-800" : 
                  !isCurrentMonth ? "text-gray-400" : "text-gray-900"
                }`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {events.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      className={`text-xs p-1 rounded truncate ${getSubjectColor(event.subject_name || event.title, childSubjects).bg} ${getSubjectColor(event.subject_name || event.title, childSubjects).text}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(event);
                      }}
                    >
                      {event.title || event.subject_name}
                    </div>
                  ))}
                  {events.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{events.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
