// app/schedule/components/ScheduleCalendar.js
"use client";
import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, CalendarDaysIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useScheduleManagement } from '../../../hooks/useScheduleManagement';
import { getSubjectColor, getSubjectDarkBgColor, getSubjectTextColor } from '../../../utils/subjectColors';

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

  // Check if a time slot is occupied by an event (for click handling)
  const isTimeSlotOccupied = (day, timeSlot) => {
    const dayEvents = getEventsForDay(day);
    const slotTime = new Date(`2000-01-01T${timeSlot}`);
    
    return dayEvents.some(event => {
      let eventTimeStr = event.startTime || format(new Date(event.start), 'HH:mm');
      // Normalize time format - remove seconds if present
      eventTimeStr = eventTimeStr.length === 8 ? eventTimeStr.substring(0, 5) : eventTimeStr;
      const eventStartTime = new Date(`2000-01-01T${eventTimeStr}`);
      const eventDuration = event.duration || event.duration_minutes || 30;
      const eventEndTime = new Date(eventStartTime.getTime() + (eventDuration * 60000));
      
      // Check if this time slot falls within an existing event's duration
      const slotEndTime = new Date(slotTime.getTime() + (30 * 60000)); // 30-minute slot
      
      // Slot is occupied if it overlaps with an existing event
      return (slotTime < eventEndTime && slotEndTime > eventStartTime);
    });
  };

  // Get the event that starts at a specific time slot
  const getEventStartingAt = (day, timeSlot) => {
    const dayEvents = getEventsForDay(day);
    return dayEvents.find(event => {
      let eventTime = event.startTime || format(new Date(event.start), 'HH:mm');
      eventTime = eventTime.length === 8 ? eventTime.substring(0, 5) : eventTime;
      return eventTime === timeSlot;
    });
  };

  // Calculate how many 30-minute slots an event spans
  const getEventHeight = (duration) => {
    return Math.ceil(duration / 30);
  };

  // Calculate the position and height for spanning events
  const getEventDisplayInfo = (event, timeSlot) => {
    let eventTime = event.startTime || format(new Date(event.start), 'HH:mm');
    eventTime = eventTime.length === 8 ? eventTime.substring(0, 5) : eventTime;
    
    if (eventTime !== timeSlot) return null;
    
    const duration = event.duration || event.duration_minutes || 30;
    const height = getEventHeight(duration);
    
    return {
      height,
      duration
    };
  };

  // Check if a time slot has an event starting at that exact time
  const hasEventAtTime = (day, timeSlot) => {
    const dayEvents = getEventsForDay(day);
    return dayEvents.some(event => {
      let eventTime = event.startTime || format(new Date(event.start), 'HH:mm');
      // Normalize time format - remove seconds if present
      eventTime = eventTime.length === 8 ? eventTime.substring(0, 5) : eventTime;
      return eventTime === timeSlot;
    });
  };

  // Use centralized color utility for calendar events
  const getSubjectEventColor = (subject) => {
    return getSubjectDarkBgColor(subject, childSubjects);
  };

  const getSubjectEventTextColor = (subject) => {
    return getSubjectTextColor(subject, childSubjects);
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
            className="btn-secondary text-sm px-4 py-2"
          >
            Today
          </button>
          <button
            onClick={() => openCreateModal()}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
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
        <div className="text-center py-8 bg-slate-50 rounded-lg border border-gray-200 mb-4">
          <div className="text-slate-700 mb-2">
            <CalendarDaysIcon className="h-12 w-12 mx-auto mb-3 text-slate-400" />
            <h3 className="font-semibold text-lg">No Schedule Entries Yet</h3>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              Click "Add Study Time" to create your first schedule entry, or use "AI Schedule" to generate an intelligent weekly plan.
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
        <div className="min-h-[calc(100vh-450px)] max-h-[calc(100vh-350px)] overflow-y-auto">
          {timeSlots.map((timeSlot) => (
            <div key={timeSlot} className="grid grid-cols-8 border-b border-border-subtle last:border-b-0">
              {/* Time Label */}
              <div className="p-3 bg-gray-50 text-sm text-text-secondary font-medium border-r border-border-subtle">
                {format(new Date(`2000-01-01T${timeSlot}`), 'h:mm a')}
              </div>
              
              {/* Day Columns */}
              {weekDays.map((day, dayIndex) => {
                const isOccupied = isTimeSlotOccupied(day, timeSlot);
                const eventStartingHere = getEventStartingAt(day, timeSlot);
                const isClickable = !isOccupied || eventStartingHere; // Can click if not occupied, or if there's an event to edit

                return (
                  <div
                    key={dayIndex}
                    className={`relative border-r border-border-subtle last:border-r-0 transition-colors ${
                      !isOccupied ? 'hover:bg-gray-50 cursor-pointer' : ''
                    }`}
                    style={{ minHeight: '60px' }}
                    onClick={() => {
                      if (!isOccupied) {
                        openCreateModal({
                          date: format(day, 'yyyy-MM-dd'),
                          time: timeSlot
                        });
                      }
                    }}
                  >
                    {eventStartingHere && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(eventStartingHere);
                        }}
                        className={`
                          absolute inset-x-0 top-0 mx-1 rounded-lg cursor-pointer hover:opacity-90 transition-all duration-200 shadow-sm hover:shadow-md
                          ${getSubjectEventColor(eventStartingHere.subject)} 
                          ${getSubjectEventTextColor(eventStartingHere.subject)}
                          ${eventStartingHere.status === 'completed' ? 'opacity-60' : ''}
                          text-xs p-3 z-10 border border-white/20
                        `}
                        style={{
                          height: `${getEventHeight(eventStartingHere.duration || eventStartingHere.duration_minutes || 30) * 60 - 4}px`, // Account for margin
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className={`font-semibold truncate ${eventStartingHere.status === 'completed' ? 'line-through' : ''}`}>
                              {eventStartingHere.title}
                            </div>
                            <div className="opacity-80 text-xs mt-1">
                              {eventStartingHere.duration || eventStartingHere.duration_minutes || 30} minutes
                            </div>
                            {eventStartingHere.notes && (
                              <div className="opacity-70 text-xs mt-1 truncate">
                                {eventStartingHere.notes}
                              </div>
                            )}
                          </div>
                          
                          {/* Completion Toggle Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (eventStartingHere.status === 'completed') {
                                scheduleManagement.updateScheduleEntry(eventStartingHere.id, { status: 'scheduled' });
                              } else {
                                scheduleManagement.markEntryCompleted(eventStartingHere.id);
                              }
                            }}
                            className={`ml-2 p-1 rounded-full transition-all duration-200 hover:scale-110 ${
                              eventStartingHere.status === 'completed' 
                                ? 'bg-white/30 text-white' 
                                : 'bg-white/20 hover:bg-white/40 text-white/70 hover:text-white'
                            }`}
                            title={eventStartingHere.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}
                          >
                            <CheckIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Legend based on child's subjects */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        {childSubjects.map((subject) => {
          const colorInfo = getSubjectColor(subject.name, childSubjects);
          return (
            <div key={subject.child_subject_id} className="flex items-center gap-2">
              <div className={`w-3 h-3 ${colorInfo.bg} rounded`}></div>
              <span className="text-text-secondary">{subject.name}</span>
            </div>
          );
        })}
        
        {/* Always show completed status */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded opacity-60"></div>
          <span className="text-text-secondary">Completed</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-gray-200">
        <p className="text-sm text-slate-700">
          <strong>How to use:</strong> Click on any available time slot to add study time. Click on existing events to edit them. 
          Events span multiple time slots based on their duration.
        </p>
      </div>
    </div>
  );
}