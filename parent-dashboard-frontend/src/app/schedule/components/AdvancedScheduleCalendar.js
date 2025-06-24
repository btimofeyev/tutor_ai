// app/schedule/components/AdvancedScheduleCalendar.js
"use client";
import { useState, useMemo } from 'react';
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
  ClockIcon
} from '@heroicons/react/24/outline';
import { useScheduleManagement } from '../../../hooks/useScheduleManagement';
import { getSubjectColor, getSubjectDarkBgColor, getSubjectTextColor, getMultiChildSubjectStyle, getChildVariation } from '../../../utils/subjectColors';
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
  schedulePreferences = {}
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState(VIEW_TYPES.WEEK);
  const [weeksToShow, setWeeksToShow] = useState(2); // For multi-week view
  
  // Use schedule management from props or create our own
  const {
    calendarEvents,
    loading,
    error,
    openCreateModal,
    openEditModal
  } = scheduleManagement || useScheduleManagement(childId, subscriptionPermissions);

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

  // Time slots (flexible based on preferences)
  const timeSlots = useMemo(() => {
    const startHour = schedulePreferences?.preferred_start_time ? 
      parseInt(schedulePreferences.preferred_start_time.split(':')[0]) : 9;
    const endHour = schedulePreferences?.preferred_end_time ? 
      parseInt(schedulePreferences.preferred_end_time.split(':')[0]) : 15;
    
    const slots = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < endHour) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
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
      const subject = event.subject_name || event.title || 'Other';
      const duration = event.duration || event.duration_minutes || 30;
      breakdown[subject] = (breakdown[subject] || 0) + duration;
    });
    return breakdown;
  };

  // Get events for a specific day
  const getEventsForDay = (day) => {
    const dayString = format(day, 'yyyy-MM-dd');
    const events = calendarEvents || [];
    
    const dayEvents = events.filter(event => {
      if (event.date) return event.date === dayString;
      if (event.start) return isSameDay(new Date(event.start), day);
      return false;
    });
    
    return dayEvents;
  };

  // Navigation functions
  const navigate = (direction) => {
    switch (viewType) {
      case VIEW_TYPES.WEEK:
        setCurrentDate(addDays(currentDate, direction * 7));
        break;
      case VIEW_TYPES.MULTI_WEEK:
        setCurrentDate(addDays(currentDate, direction * weeksToShow * 7));
        break;
      case VIEW_TYPES.MONTH:
        const newMonth = new Date(currentDate);
        newMonth.setMonth(newMonth.getMonth() + direction);
        setCurrentDate(newMonth);
        break;
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };


  // Handle time slot clicks
  const handleTimeSlotClick = (day, timeSlot) => {
    if (isTimeSlotOccupied(day, timeSlot)) return;
    
    openCreateModal({
      date: format(day, 'yyyy-MM-dd'),
      time: timeSlot
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
      
      // Calculate visual end time based on how we display the event
      const visualHeight = Math.ceil(eventDuration / 30);
      const visualDurationMinutes = visualHeight * 30; // Convert back to minutes for overlap calculation
      const eventEndTime = new Date(eventStartTime.getTime() + (visualDurationMinutes * 60000));
      
      const slotEndTime = new Date(slotTime.getTime() + (30 * 60000));
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
    <div className="space-y-3">
      {/* Compact Header with Navigation */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous period"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          
          <h2 className="text-sm font-medium text-text-primary min-w-[160px] text-center">
            {renderTitle()}
          </h2>
          
          <button
            onClick={() => navigate(1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next period"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {renderWeekSelector()}
          {renderViewSelector()}
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md"
          >
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

      {/* Removed Workload Summary - no overload detection */}

      {/* Calendar Grid */}
      {viewType === VIEW_TYPES.WEEK && (
        <WeekView 
          dateRange={dateRange}
          timeSlots={timeSlots}
          getEventsForDay={getEventsForDay}
          getDayStats={getDayStats}
          handleTimeSlotClick={handleTimeSlotClick}
          openEditModal={openEditModal}
          childSubjects={childSubjects}
          selectedChildrenIds={selectedChildrenIds}
          allChildren={allChildren}
        />
      )}

      {viewType === VIEW_TYPES.MULTI_WEEK && (
        <MultiWeekView 
          dateRange={dateRange}
          getDayStats={getDayStats}
          getEventsForDay={getEventsForDay}
          openCreateModal={openCreateModal}
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
          openCreateModal={openCreateModal}
          openEditModal={openEditModal}
          childSubjects={childSubjects}
          selectedChildrenIds={selectedChildrenIds}
          allChildren={allChildren}
        />
      )}
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
  openEditModal,
  childSubjects,
  selectedChildrenIds,
  allChildren
}) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Clean day headers */}
      <div className="grid grid-cols-8">
        <div className="p-3 text-xs font-medium text-gray-500 bg-gray-50 border-b border-r border-gray-200">TIME</div>
        {dateRange.days.map((day, index) => {
          const dayStats = getDayStats(day);
          const isWeekend = index >= 5;
          return (
            <div key={day.toString()} className={`p-3 text-center border-b border-gray-200 ${isWeekend ? 'bg-gray-50' : 'bg-white'}`}>
              <div className="text-xs font-medium text-gray-500 uppercase">
                {dayNames[index]}
              </div>
              <div className={`text-lg font-semibold mt-1 ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </div>
              {dayStats.totalMinutes > 0 && (
                <div className="mt-2">
                  <div className="h-1 w-full rounded-full bg-blue-300" />
                  <div className="text-xs text-gray-500 mt-1">
                    {dayStats.totalHours}h
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time slots grid - cleaner styling */}
      <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
        {timeSlots.map(timeSlot => (
          <div key={timeSlot} className="grid grid-cols-8">
            {/* Time label */}
            <div className="p-3 text-xs text-gray-500 bg-gray-50 border-r border-b border-gray-200">
              {timeSlot}
            </div>
            
            {/* Day cells */}
            {dateRange.days.map(day => {
              const events = getEventsForDay(day);
              
              // Check if this time slot is the start of an event
              const eventStartingHere = events.find(event => {
                let eventTime = event.startTime || format(new Date(event.start), 'HH:mm');
                eventTime = eventTime.length === 8 ? eventTime.substring(0, 5) : eventTime;
                return eventTime === timeSlot;
              });
              
              // Check if this time slot is occupied by any event (for preventing clicks)
              const isOccupiedByEvent = events.some(event => {
                let eventTimeStr = event.startTime || format(new Date(event.start), 'HH:mm');
                eventTimeStr = eventTimeStr.length === 8 ? eventTimeStr.substring(0, 5) : eventTimeStr;
                const eventStartTime = new Date(`2000-01-01T${eventTimeStr}`);
                const eventDuration = event.duration || event.duration_minutes || 30;
                
                // Calculate visual end time based on how we display the event
                const visualHeight = Math.ceil(eventDuration / 30);
                const visualDurationMinutes = visualHeight * 30; // Convert back to minutes for overlap calculation
                const eventEndTime = new Date(eventStartTime.getTime() + (visualDurationMinutes * 60000));
                
                const slotTime = new Date(`2000-01-01T${timeSlot}`);
                const slotEndTime = new Date(slotTime.getTime() + (30 * 60000)); // 30-minute slot
                
                // Check if this time slot overlaps with the event's visual space
                return (slotTime < eventEndTime && slotEndTime > eventStartTime);
              });

              const isWeekend = getDay(day) === 0 || getDay(day) === 6;
              
              if (eventStartingHere) {
                const duration = eventStartingHere.duration || eventStartingHere.duration_minutes || 30;
                const height = Math.ceil(duration / 30);
                const subject = eventStartingHere.subject_name || eventStartingHere.title || 'Study';
                const displayTitle = eventStartingHere.title || subject;
                
                
                // Get child name if multiple children are selected
                const childName = selectedChildrenIds.length > 1 ? 
                  allChildren.find(child => child.id === eventStartingHere.child_id)?.name || '' : '';
                
                return (
                  <div 
                    key={`${day}-${timeSlot}`}
                    className="relative border-r border-b border-gray-200"
                    style={{ minHeight: '64px' }}
                  >
                    <div
                      className={`absolute inset-1 rounded-md p-1.5 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] border ${
                        getSubjectColor(subject, childSubjects).bg
                      } ${getSubjectColor(subject, childSubjects).border}`}
                      onClick={() => openEditModal(eventStartingHere)}
                      style={{ height: `${height * 64 - 8}px`, zIndex: 10 }}
                    >
{/* Different layouts based on duration */}
                      {height === 1 ? (
                        /* Compact layout for 30-minute slots */
                        <div className="h-full flex items-center justify-between p-2 overflow-hidden">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className={`font-semibold text-xs truncate leading-tight ${getSubjectColor(subject, childSubjects).text} ${eventStartingHere.status === 'completed' ? 'line-through' : ''}`}>
                              {displayTitle}
                            </div>
                            <div className={`text-xs opacity-75 mt-0.5 ${getSubjectColor(subject, childSubjects).text}`}>
                              {duration}m
                            </div>
                          </div>
                          
                          {eventStartingHere.status === 'completed' && (
                            <CheckIcon className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      ) : (
                        /* Full layout for longer slots */
                        <div className="h-full flex flex-col justify-between p-2 overflow-hidden">
                          {/* Main content area */}
                          <div className="flex-1 overflow-hidden">
                            {/* Subject/Title - Main heading */}
                            <div className={`font-semibold text-xs mb-2 truncate ${getSubjectColor(subject, childSubjects).text} ${eventStartingHere.status === 'completed' ? 'line-through' : ''}`}>
                              {displayTitle}
                            </div>
                            
                            {/* Lesson title if available - Secondary info */}
                            {eventStartingHere.lesson?.title && eventStartingHere.lesson.title !== displayTitle && (
                              <div className={`text-xs opacity-90 mb-1 line-clamp-2 ${getSubjectColor(subject, childSubjects).text}`}>
                                {eventStartingHere.lesson.title}
                              </div>
                            )}
                            
                            {/* Child name for multi-child view */}
                            {childName && (
                              <div className={`text-xs opacity-80 truncate ${getSubjectColor(subject, childSubjects).text}`}>
                                {childName}
                              </div>
                            )}
                          </div>
                          
                          {/* Bottom section with duration and completion */}
                          <div className="flex justify-between items-center mt-2">
                            <div className={`text-xs opacity-75 ${getSubjectColor(subject, childSubjects).text}`}>
                              {duration}m
                            </div>
                            
                            {eventStartingHere.status === 'completed' && (
                              <CheckIcon className="h-3 w-3 text-green-600" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else if (isOccupiedByEvent) {
                return (
                  <div 
                    key={`${day}-${timeSlot}`}
                    className={`border-r border-b border-gray-200 ${isWeekend ? 'bg-gray-50' : ''}`}
                    style={{ minHeight: '64px' }}
                  />
                );
              }

              return (
                <div 
                  key={`${day}-${timeSlot}`}
                  className={`border-r border-b border-gray-200 cursor-pointer transition-colors ${
                    isWeekend ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-blue-50'
                  }`}
                  style={{ minHeight: '64px' }}
                  onClick={() => handleTimeSlotClick(day, timeSlot)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple day status indicator (no intensity levels)
function getDayStatusColor(totalMinutes) {
  if (totalMinutes === 0) return 'bg-gray-200';
  return 'bg-blue-300';
}

// Multi-Week View Component
function MultiWeekView({ 
  dateRange, 
  getDayStats, 
  getEventsForDay,
  openCreateModal, 
  openEditModal,
  childSubjects,
  selectedChildrenIds,
  allChildren 
}) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleDayClick = (day) => {
    openCreateModal({
      date: format(day, 'yyyy-MM-dd')
    });
  };

  const renderDayCell = (day) => {
    const dayStats = getDayStats(day);
    const events = getEventsForDay(day);
    const isCurrentMonth = format(day, 'M') === format(new Date(), 'M');
    
    return (
      <div 
        key={day.toString()}
        className={`min-h-[80px] p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
          isCurrentMonth ? 'bg-white' : 'bg-gray-50'
        }`}
        onClick={() => handleDayClick(day)}
      >
        {/* Day number and status indicator */}
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${
            isToday(day) ? 'bg-blue-500 text-white px-2 py-1 rounded-full' : 
            isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
          }`}>
            {format(day, 'd')}
          </span>
          {dayStats.totalMinutes > 0 && (
            <div className={`h-2 w-2 rounded-full ${getDayStatusColor(dayStats.totalMinutes)}`} />
          )}
        </div>

        {/* Day summary */}
        {dayStats.totalMinutes > 0 && (
          <div className="text-xs text-gray-600 mb-1">
            {dayStats.totalHours}h
          </div>
        )}

        {/* Event previews */}
        <div className="space-y-1">
          {events.slice(0, 3).map((event, index) => {
            const subject = event.subject_name || event.title || 'Study';
            const childName = selectedChildrenIds.length > 1 ? 
              allChildren.find(child => child.id === event.child_id)?.name || '' : '';
            return (
              <div 
                key={index}
                className={`text-xs p-1 rounded truncate ${
                  getSubjectDarkBgColor(subject, childSubjects)
                } ${getSubjectTextColor(subject, childSubjects)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(event);
                }}
                title={childName ? `${subject} - ${childName}` : subject}
              >
                {childName ? `${subject} - ${childName}` : subject}
              </div>
            );
          })}
          {events.length > 3 && (
            <div className="text-xs text-gray-500">
              +{events.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Week-by-week layout */}
      {dateRange.weeks && dateRange.weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="border-b border-gray-200 last:border-b-0">
          {/* Week header */}
          <div className="bg-gray-50 p-3 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">
              Week of {format(week.start, 'MMM d, yyyy')}
            </h4>
          </div>
          
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50">
                {day}
              </div>
            ))}
          </div>
          
          {/* Week days */}
          <div className="grid grid-cols-7">
            {week.days.map(renderDayCell)}
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
  openCreateModal, 
  openEditModal,
  childSubjects,
  selectedChildrenIds,
  allChildren 
}) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Group days into weeks for calendar layout
  const weeks = [];
  for (let i = 0; i < dateRange.days.length; i += 7) {
    weeks.push(dateRange.days.slice(i, i + 7));
  }

  const handleDayClick = (day) => {
    openCreateModal({
      date: format(day, 'yyyy-MM-dd')
    });
  };

  const renderDayCell = (day) => {
    const dayStats = getDayStats(day);
    const events = getEventsForDay(day);
    const isCurrentMonth = format(day, 'M') === format(currentDate, 'M');
    const isWeekendDay = isWeekend(day);
    
    return (
      <div 
        key={day.toString()}
        className={`min-h-[100px] p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
          isCurrentMonth ? 'bg-white' : 'bg-gray-50'
        } ${isWeekendDay ? 'bg-gray-25' : ''}`}
        onClick={() => handleDayClick(day)}
      >
        {/* Day number and status indicator */}
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${
            isToday(day) ? 'bg-blue-500 text-white px-2 py-1 rounded-full' : 
            isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
          }`}>
            {format(day, 'd')}
          </span>
          {dayStats.totalMinutes > 0 && (
            <div className={`h-2 w-2 rounded-full ${getDayStatusColor(dayStats.totalMinutes)}`} />
          )}
        </div>

        {/* Day summary for month view */}
        {dayStats.totalMinutes > 0 && (
          <div className="text-xs text-gray-600 mb-2">
            {dayStats.totalHours}h
          </div>
        )}

        {/* Event dots/indicators for month view */}
        <div className="flex flex-wrap gap-1">
          {events.slice(0, 4).map((event, index) => {
            const subject = event.subject_name || event.title || 'Study';
            const childName = selectedChildrenIds.length > 1 ? 
              allChildren.find(child => child.id === event.child_id)?.name || '' : '';
            return (
              <div 
                key={index}
                className={`w-2 h-2 rounded-full ${
                  getSubjectColor(subject, childSubjects)
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(event);
                }}
                title={`${subject}${childName ? ` - ${childName}` : ''} - ${event.duration || event.duration_minutes || 30}min`}
              />
            );
          })}
          {events.length > 4 && (
            <div className="text-xs text-gray-500">
              +{events.length - 4}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Month header */}
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {dayNames.map(day => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {weeks.map((week, weekIndex) => 
          week.map(renderDayCell)
        )}
      </div>
    </div>
  );
}