// app/schedule/components/ScheduleCalendar.js
"use client";
import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useScheduleManagement } from '../../../hooks/useScheduleManagement';

export default function ScheduleCalendar({ childId, subscriptionPermissions, scheduleManagement, childSubjects = [] }) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Start on Monday
  
  // Use schedule management from props or create our own
  const {
    calendarEvents,
    loading,
    error,
    openCreateModal,
    openEditModal
  } = scheduleManagement || useScheduleManagement(childId, subscriptionPermissions);
  
  // No sample events - use real data only

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  }, [currentWeek]);

  // Time slots (9 AM to 3 PM in 30-minute increments)
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
  const getEventsForDay = (day) => {
    const dayString = format(day, 'yyyy-MM-dd');
    const events = calendarEvents || [];
    console.log(`Getting events for ${dayString}, available events:`, events);
    
    const dayEvents = events.filter(event => {
      if (event.date) {
        return event.date === dayString;
      }
      // Handle calendar events format
      if (event.start) {
        return isSameDay(new Date(event.start), day);
      }
      return false;
    });
    console.log(`Filtered events for ${dayString}:`, dayEvents);
    return dayEvents;
  };

  // Check if a time slot is blocked by an existing event
  const isTimeSlotBlocked = (day, timeSlot) => {
    const dayEvents = getEventsForDay(day);
    const slotTime = new Date(`2000-01-01T${timeSlot}`);
    
    return dayEvents.some(event => {
      const eventStartTime = new Date(`2000-01-01T${event.startTime || format(new Date(event.start), 'HH:mm')}`);
      const eventDuration = event.duration || event.duration_minutes || 30;
      const eventEndTime = new Date(eventStartTime.getTime() + (eventDuration * 60000));
      
      // Check if this time slot falls within an existing event's duration
      const slotEndTime = new Date(slotTime.getTime() + (30 * 60000)); // 30-minute slot
      
      // Slot is blocked if it overlaps with an existing event
      return (slotTime < eventEndTime && slotEndTime > eventStartTime);
    });
  };

  // Check if a time slot has an event starting at that exact time
  const hasEventAtTime = (day, timeSlot) => {
    const dayEvents = getEventsForDay(day);
    const dayString = format(day, 'yyyy-MM-dd');
    console.log(`Checking hasEventAtTime for ${dayString} ${timeSlot}:`, dayEvents);
    const result = dayEvents.some(event => {
      const eventTime = event.startTime || format(new Date(event.start), 'HH:mm');
      console.log(`Event time: ${eventTime}, checking against: ${timeSlot}`);
      return eventTime === timeSlot;
    });
    console.log(`hasEventAtTime result: ${result}`);
    return result;
  };

  // Get subject color
  const getSubjectColor = (subject) => {
    // First check if this matches a child's actual subjects
    const childSubject = childSubjects.find(s => s.name === subject);
    if (childSubject) {
      // Generate consistent color based on subject name
      const subjectColors = [
        'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
        'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
      ];
      const colorIndex = childSubject.name.length % subjectColors.length;
      return subjectColors[colorIndex];
    }
    
    // Fallback to default colors for common subjects
    const defaultColors = {
      'Math': 'bg-red-500',
      'Science': 'bg-green-500', 
      'English': 'bg-purple-500',
      'History': 'bg-yellow-500',
      'Unknown': 'bg-gray-400',
      'default': 'bg-blue-500'
    };
    return defaultColors[subject] || defaultColors.default;
  };

  // Navigate weeks
  const previousWeek = () => {
    setCurrentWeek(addDays(currentWeek, -7));
  };

  const nextWeek = () => {
    setCurrentWeek(addDays(currentWeek, 7));
  };

  const goToToday = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return (
    <div className="p-6">
      {/* Week Navigation */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={previousWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          <h2 className="text-xl font-semibold text-text-primary">
            Week of {format(currentWeek, 'MMM d, yyyy')}
          </h2>
          
          <button
            onClick={nextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={goToToday}
            className="btn-secondary text-sm"
          >
            Today
          </button>
          <button
            onClick={() => openCreateModal()}
            className="btn-primary text-sm flex items-center gap-1"
          >
            <PlusIcon className="h-4 w-4" />
            Add Study Time
          </button>
        </div>
      </div>

      {/* Loading/Error States */}
      {loading && (
        <div className="text-center py-8 text-text-secondary">
          Loading schedule...
        </div>
      )}
      
      {!loading && calendarEvents.length === 0 && (
        <div className="text-center py-8 bg-blue-50 rounded-lg border border-blue-200 mb-4">
          <div className="text-blue-800 mb-2">
            <CalendarDaysIcon className="h-12 w-12 mx-auto mb-2 text-blue-500" />
            <h3 className="font-medium">No Schedule Entries Yet</h3>
            <p className="text-sm text-blue-600 mt-1">
              Click "Add Study Time" to create your first schedule entry, or use "🤖 AI Schedule" to generate an intelligent weekly plan.
            </p>
          </div>
        </div>
      )}

      {/* Simple Weekly Grid */}
      <div className="bg-white rounded-lg border border-border-subtle overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-8 border-b border-border-subtle">
          <div className="p-4 bg-gray-50 font-medium text-text-secondary text-sm">
            Time
          </div>
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`p-4 text-center font-medium ${
                isSameDay(day, new Date())
                  ? 'bg-accent-blue text-text-primary'
                  : 'bg-gray-50 text-text-secondary'
              }`}
            >
              <div className="text-sm">{format(day, 'EEE')}</div>
              <div className="text-lg">{format(day, 'd')}</div>
            </div>
          ))}
        </div>

        {/* Time Slots and Events */}
        <div className="max-h-96 overflow-y-auto">
          {timeSlots.map((timeSlot) => (
            <div key={timeSlot} className="grid grid-cols-8 border-b border-border-subtle last:border-b-0">
              {/* Time Label */}
              <div className="p-3 bg-gray-50 text-sm text-text-secondary font-medium border-r border-border-subtle">
                {format(new Date(`2000-01-01T${timeSlot}`), 'h:mm a')}
              </div>
              
              {/* Day Columns */}
              {weekDays.map((day, dayIndex) => {
                const dayEvents = getEventsForDay(day);
                const timeEvents = dayEvents.filter(event => {
                  const eventTime = event.startTime || format(new Date(event.start), 'HH:mm');
                  return eventTime === timeSlot;
                });

                const isBlocked = isTimeSlotBlocked(day, timeSlot);
                const hasEvent = hasEventAtTime(day, timeSlot);
                const isClickable = !isBlocked || hasEvent; // Can click if not blocked, or if there's an event to edit

                return (
                  <div
                    key={dayIndex}
                    className={`p-2 min-h-[60px] border-r border-border-subtle last:border-r-0 transition-colors ${
                      isBlocked && !hasEvent
                        ? 'bg-gray-100 cursor-not-allowed opacity-60' // Blocked slots
                        : 'hover:bg-gray-50 cursor-pointer' // Normal slots
                    }`}
                    onClick={() => {
                      if (isClickable) {
                        openCreateModal({
                          date: format(day, 'yyyy-MM-dd'),
                          time: timeSlot
                        });
                      }
                    }}
                  >
                    {timeEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(event);
                        }}
                        className={`
                          ${getSubjectColor(event.subject)} 
                          ${event.status === 'completed' ? 'opacity-60' : ''}
                          text-white text-xs p-2 rounded mb-1 cursor-pointer hover:opacity-80 transition-opacity
                        `}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="opacity-75">
                          {event.duration || 30}min
                        </div>
                      </div>
                    ))}
                    
                    {/* Show blocked indicator if slot is blocked but has no event */}
                    {isBlocked && !hasEvent && (
                      <div className="text-xs text-gray-400 italic text-center py-2">
                        In use
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-text-secondary">Math</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-text-secondary">Science</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded"></div>
          <span className="text-text-secondary">English</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span className="text-text-secondary">History</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded"></div>
          <span className="text-text-secondary">Completed</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>How to use:</strong> Click on any available time slot to add study time. Click on existing events to edit them. 
          Grayed-out slots are blocked by existing activities - longer sessions automatically block overlapping time slots.
        </p>
      </div>
    </div>
  );
}