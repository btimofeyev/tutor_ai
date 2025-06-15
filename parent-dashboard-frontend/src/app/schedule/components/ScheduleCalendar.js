// app/schedule/components/ScheduleCalendar.js
"use client";
import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useScheduleManagement } from '../../../hooks/useScheduleManagement';

export default function ScheduleCalendar({ childId, subscriptionPermissions, scheduleManagement }) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Start on Monday
  
  // Use schedule management from props or create our own
  const {
    calendarEvents,
    loading,
    error,
    openCreateModal,
    openEditModal
  } = scheduleManagement || useScheduleManagement(childId, subscriptionPermissions);
  
  // Sample events (fallback for when backend isn't connected)
  const sampleEvents = useMemo(() => {
    const today = new Date();
    const monday = addDays(currentWeek, 0); // Monday of current week
    const tuesday = addDays(currentWeek, 1); // Tuesday of current week
    const wednesday = addDays(currentWeek, 2); // Wednesday of current week
    
    return [
      {
        id: 1,
        title: 'Math - Algebra Practice',
        subject: 'Math',
        date: format(monday, 'yyyy-MM-dd'),
        startTime: '09:00',
        duration: 60,
        status: 'scheduled'
      },
      {
        id: 2,
        title: 'Science - Chemistry Lab',
        subject: 'Science', 
        date: format(monday, 'yyyy-MM-dd'),
        startTime: '11:00',
        duration: 45,
        status: 'scheduled'
      },
      {
        id: 3,
        title: 'English - Reading',
        subject: 'English',
        date: format(tuesday, 'yyyy-MM-dd'),
        startTime: '09:00',
        duration: 30,
        status: 'completed'
      },
      {
        id: 4,
        title: 'History - World War II',
        subject: 'History',
        date: format(wednesday, 'yyyy-MM-dd'),
        startTime: '10:00',
        duration: 45,
        status: 'scheduled'
      }
    ];
  }, [currentWeek]);

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
    const events = calendarEvents.length > 0 ? calendarEvents : sampleEvents;
    
    return events.filter(event => {
      if (event.date) {
        return event.date === dayString;
      }
      // Handle calendar events format
      if (event.start) {
        return isSameDay(new Date(event.start), day);
      }
      return false;
    });
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
    return dayEvents.some(event => {
      const eventTime = event.startTime || format(new Date(event.start), 'HH:mm');
      return eventTime === timeSlot;
    });
  };

  // Get subject color
  const getSubjectColor = (subject) => {
    const colors = {
      'Math': 'bg-red-500',
      'Science': 'bg-green-500', 
      'English': 'bg-purple-500',
      'History': 'bg-yellow-500',
      'default': 'bg-blue-500'
    };
    return colors[subject] || colors.default;
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
      
      {error && !error.includes('Schedule database not yet set up') && (
        <div className="text-center py-4 text-orange-600 bg-orange-50 rounded-lg border border-orange-200 p-3 mb-4">
          <p className="text-sm">No schedule data found - showing sample schedule below</p>
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