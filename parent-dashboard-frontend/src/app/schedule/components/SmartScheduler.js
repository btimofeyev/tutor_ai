// SmartScheduler.js - Unified, intelligent scheduling component with performance optimization
"use client";
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  format,
  addDays,
  addWeeks,
  startOfWeek,
  isSameDay,
  parseISO,
  isToday,
  getDay
} from 'date-fns';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CalendarDaysIcon,
  ClockIcon,
  PlusIcon,
  Cog6ToothIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getSubjectColor, getSubjectIcon } from '../../../utils/subjectColors';

// Smart Scheduler Context for unified state management
const SmartSchedulerContext = {
  // Calendar state
  currentDate: new Date(),
  viewType: 'week', // week, month
  selectedTimeSlot: null,

  // Lesson management
  selectedLessonContainer: null,
  availableLessons: [],
  scheduledEvents: [],

  // UI state
  showSidebar: true,
  density: 'comfortable',
  draggedEvent: null,

  // Smart features
  suggestedLessons: [],
  conflicts: [],
  recommendations: []
};

export default function SmartScheduler({
  childId,
  selectedChildrenIds = [],
  allChildren = [],
  subscriptionPermissions,
  scheduleManagement,
  childSubjects = [],
  schedulePreferences = {},
  onGenerateAISchedule,
  selectedLessonContainer = null,
  onCalendarSlotClick = () => {},
  density = 'comfortable',
  lessonsBySubject = {},
  unitsBySubject = {},
  lessonsByUnit = {}
}) {
  // Unified state management with adaptive context and performance tracking
  const [state, setState] = useState({
    currentDate: new Date(),
    viewType: 'week',
    selectedTimeSlot: null,
    showSidebar: true,
    draggedEvent: null,
    windowHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
    adaptiveContext: {
      timeOfDay: 'morning', // morning, afternoon, evening
      dayType: 'weekday',   // weekday, weekend
      scheduleLoad: 'light', // light, moderate, heavy
      userAction: 'browsing' // browsing, scheduling, organizing
    },
    virtualScrollOffset: 0,
    visibleTimeSlots: []
  });

  // Performance optimization refs and caches
  const renderCache = useRef(new Map());
  const debouncedUpdates = useRef(null);
  const intersectionObserver = useRef(null);
  const performanceMetrics = useRef({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0
  });

  // Get schedule data from management hook
  const {
    calendarEvents = [],
    loading,
    error,
    openCreateModal,
    openEditModal,
    updateScheduleEntry
  } = scheduleManagement || {};

  // Performance optimization hooks

  // Memoized calendar events with cache key
  const memoizedCalendarEvents = useMemo(() => {
    const cacheKey = `events_${JSON.stringify(calendarEvents?.slice(0, 5) || [])}`;

    if (renderCache.current.has(cacheKey)) {
      return renderCache.current.get(cacheKey);
    }

    const processedEvents = (calendarEvents || []).map(event => ({
      ...event,
      _cacheKey: `${event.id}_${event.date}_${event.start_time}`
    }));

    renderCache.current.set(cacheKey, processedEvents);

    // Clean cache if it gets too large (keep last 50 entries)
    if (renderCache.current.size > 50) {
      const entries = Array.from(renderCache.current.entries());
      renderCache.current.clear();
      entries.slice(-25).forEach(([key, value]) => {
        renderCache.current.set(key, value);
      });
    }

    return processedEvents;
  }, [calendarEvents]);

  // Debounced state updates for performance
  const debouncedSetState = useCallback((updateFn, delay = 16) => {
    if (debouncedUpdates.current) {
      clearTimeout(debouncedUpdates.current);
    }

    debouncedUpdates.current = setTimeout(() => {
      setState(updateFn);
      debouncedUpdates.current = null;
    }, delay);
  }, []);

  // Performance monitoring
  const trackRenderPerformance = useCallback((componentName, renderTime) => {
    const metrics = performanceMetrics.current;
    metrics.renderCount += 1;
    metrics.lastRenderTime = renderTime;
    metrics.averageRenderTime = (metrics.averageRenderTime * (metrics.renderCount - 1) + renderTime) / metrics.renderCount;

    // Log performance issues in development
    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(`Slow render detected in ${componentName}: ${renderTime}ms`);
    }
  }, []);

  // Optimized event lookup with spatial indexing
  const eventSpatialIndex = useMemo(() => {
    const index = new Map();

    memoizedCalendarEvents.forEach(event => {
      const dayKey = event.date || format(new Date(event.scheduled_date || event.start), 'yyyy-MM-dd');
      const timeKey = event.start_time || event.startTime || format(new Date(event.start), 'HH:mm');
      const spatialKey = `${dayKey}_${timeKey}`;

      if (!index.has(spatialKey)) {
        index.set(spatialKey, []);
      }
      index.get(spatialKey).push(event);
    });

    return index;
  }, [memoizedCalendarEvents]);

  // Optimized get events for day using spatial index
  const getEventsForDayOptimized = useCallback((day) => {
    const dayString = format(day, 'yyyy-MM-dd');
    const dayEvents = [];

    // Use spatial index for faster lookups
    for (const [key, events] of eventSpatialIndex.entries()) {
      if (key.startsWith(dayString)) {
        dayEvents.push(...events);
      }
    }

    return dayEvents;
  }, [eventSpatialIndex]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  // Smart time slots - dynamic based on preferences with intelligence (moved up to fix initialization order)
  const timeSlots = useMemo(() => {
    // Ensure we're on the client side to prevent SSR issues
    if (typeof window === 'undefined') {
      // Return default time slots for server-side rendering
      return ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00'];
    }

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

  // Smart date range calculation
  const dateRange = useMemo(() => {
    const weekStart = startOfWeek(state.currentDate, { weekStartsOn: 1 });
    return {
      start: weekStart,
      end: addDays(weekStart, 6),
      days: Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    };
  }, [state.currentDate]);

  // Dynamic slot height for optimal viewport utilization
  const slotHeight = useMemo(() => {
    const headerHeight = 120;
    const footerPadding = 40;
    const availableHeight = state.windowHeight - headerHeight - footerPadding;
    const slotCount = timeSlots.length;

    if (slotCount <= 1) return 60;

    const calculatedHeight = Math.floor(availableHeight / slotCount);
    const minHeight = density === 'compact' ? 40 : 55;
    const maxHeight = density === 'compact' ? 80 : 100;

    return Math.min(Math.max(calculatedHeight, minHeight), maxHeight);
  }, [timeSlots.length, density, state.windowHeight]);

  // Virtual scrolling for large datasets (moved after timeSlots definition)
  const calculateVisibleTimeSlots = useCallback(() => {
    const containerHeight = state.windowHeight - 200; // Header and padding
    const slotsPerView = Math.ceil(containerHeight / slotHeight) + 2; // Buffer
    const startIndex = Math.floor(state.virtualScrollOffset / slotHeight);

    return timeSlots.slice(startIndex, startIndex + slotsPerView).map((slot, index) => ({
      slot,
      index: startIndex + index,
      top: (startIndex + index) * slotHeight
    }));
  }, [timeSlots, slotHeight, state.windowHeight, state.virtualScrollOffset]);

  // Memoized visible slots for virtual scrolling
  const visibleTimeSlots = useMemo(() => {
    if (timeSlots.length <= 20) {
      // Don't use virtual scrolling for small datasets
      return timeSlots.map((slot, index) => ({
        slot,
        index,
        top: index * slotHeight
      }));
    }
    return calculateVisibleTimeSlots();
  }, [timeSlots, calculateVisibleTimeSlots, slotHeight]);

  // Multi-child intelligence and coordination
  const multiChildAnalysis = useMemo(() => {
    if (selectedChildrenIds.length <= 1) {
      return {
        isMultiChild: false,
        childCount: selectedChildrenIds.length,
        coordinationMode: 'single',
        familyConflicts: [],
        loadBalance: { balanced: true, recommendations: [] }
      };
    }

    // Analyze family-wide schedule patterns
    const familyEvents = (calendarEvents || []).filter(event =>
      selectedChildrenIds.includes(event.child_id)
    );

    // Detect family conflicts (overlapping parent involvement)
    const familyConflicts = [];
    const timeSlotUsage = new Map();

    familyEvents.forEach(event => {
      const dayKey = event.date || format(new Date(event.scheduled_date), 'yyyy-MM-dd');
      const timeKey = event.start_time || format(new Date(event.start), 'HH:mm');
      const slotKey = `${dayKey}_${timeKey}`;

      if (!timeSlotUsage.has(slotKey)) {
        timeSlotUsage.set(slotKey, []);
      }
      timeSlotUsage.get(slotKey).push(event);
    });

    // Find overlapping events that might require parent attention
    for (const [slot, events] of timeSlotUsage.entries()) {
      if (events.length > 1) {
        familyConflicts.push({
          slot,
          events,
          severity: events.length > 2 ? 'high' : 'medium',
          suggestion: events.length > 2
            ? 'Consider staggering start times by 15-30 minutes'
            : 'Manageable with preparation - ensure materials ready'
        });
      }
    }

    // Analyze load balance across children
    const childLoads = selectedChildrenIds.map(childId => {
      const childEvents = familyEvents.filter(e => e.child_id === childId);
      const child = allChildren.find(c => c.id === childId);

      return {
        childId,
        childName: child?.name || 'Unknown',
        eventCount: childEvents.length,
        averageSessionLength: childEvents.reduce((sum, e) =>
          sum + (e.duration_minutes || 30), 0) / Math.max(childEvents.length, 1),
        dailyLoad: {} // TODO: Calculate daily distribution
      };
    });

    const avgLoad = childLoads.reduce((sum, child) => sum + child.eventCount, 0) / childLoads.length;
    const isBalanced = childLoads.every(child =>
      Math.abs(child.eventCount - avgLoad) <= 2
    );

    const loadRecommendations = [];
    if (!isBalanced) {
      const overloaded = childLoads.filter(child => child.eventCount > avgLoad + 2);
      const underloaded = childLoads.filter(child => child.eventCount < avgLoad - 2);

      if (overloaded.length > 0) {
        loadRecommendations.push({
          type: 'redistribute',
          message: `Consider reducing load for ${overloaded.map(c => c.childName).join(', ')}`,
          priority: 'medium'
        });
      }
    }

    return {
      isMultiChild: true,
      childCount: selectedChildrenIds.length,
      coordinationMode: familyConflicts.length > 3 ? 'sequential' :
                      familyConflicts.length > 0 ? 'staggered' : 'parallel',
      familyConflicts,
      loadBalance: {
        balanced: isBalanced,
        childLoads,
        averageLoad: avgLoad,
        recommendations: loadRecommendations
      }
    };
  }, [selectedChildrenIds, calendarEvents, allChildren]);

  // Enhanced adaptive context analysis with multi-child intelligence
  const analyzeContext = useCallback(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const dayOfWeek = now.getDay();
    const totalEvents = (calendarEvents || []).length;
    const eventsInView = (calendarEvents || []).filter(event => {
      const eventDate = new Date(event.date || event.scheduled_date);
      return eventDate >= dateRange.start && eventDate <= dateRange.end;
    }).length;

    return {
      timeOfDay: currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening',
      dayType: dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday',
      scheduleLoad: eventsInView < 5 ? 'light' : eventsInView < 15 ? 'moderate' : 'heavy',
      userAction: selectedLessonContainer ? 'scheduling' : state.draggedEvent ? 'organizing' : 'browsing',
      lessonsAvailable: Object.values(lessonsBySubject).flat().length,
      urgentLessons: Object.values(lessonsBySubject).flat().filter(lesson =>
        lesson.due_date && new Date(lesson.due_date) < addDays(new Date(), 3)
      ).length,

      // Multi-child context
      multiChild: multiChildAnalysis,
      familyComplexity: multiChildAnalysis.familyConflicts.length > 0 ? 'complex' : 'simple',
      coordinationNeeded: multiChildAnalysis.familyConflicts.length > 2
    };
  }, [calendarEvents, dateRange, selectedLessonContainer, state.draggedEvent, lessonsBySubject, multiChildAnalysis]);

  // Update adaptive context with performance optimization
  useEffect(() => {
    const startTime = performance.now();
    const newContext = analyzeContext();

    debouncedSetState(prev => ({
      ...prev,
      adaptiveContext: newContext
    }), 32); // Slightly longer delay for context updates

    const endTime = performance.now();
    trackRenderPerformance('AdaptiveContext', endTime - startTime);
  }, [analyzeContext, debouncedSetState, trackRenderPerformance]);

  // Intersection observer for virtual scrolling
  useEffect(() => {
    if (typeof window === 'undefined' || timeSlots.length <= 20) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const scrollTop = entry.target.scrollTop || 0;
          debouncedSetState(prev => ({
            ...prev,
            virtualScrollOffset: scrollTop
          }), 16);
        }
      });
    }, { threshold: 0.1 });

    intersectionObserver.current = observer;

    return () => {
      if (intersectionObserver.current) {
        intersectionObserver.current.disconnect();
      }
    };
  }, [timeSlots.length, debouncedSetState]);

  // Cleanup performance monitoring
  useEffect(() => {
    return () => {
      if (debouncedUpdates.current) {
        clearTimeout(debouncedUpdates.current);
      }
    };
  }, []);

  // Get adaptive UI recommendations with multi-child intelligence
  const getAdaptiveRecommendations = useCallback(() => {
    const context = state.adaptiveContext;
    const recommendations = [];

    // Multi-child coordination recommendations (highest priority)
    if (context.multiChild?.isMultiChild) {
      const { familyConflicts, loadBalance, coordinationMode } = context.multiChild;

      if (familyConflicts.length > 0) {
        const highConflicts = familyConflicts.filter(c => c.severity === 'high').length;
        if (highConflicts > 0) {
          recommendations.push({
            type: 'family_conflict',
            message: `⚠️ ${highConflicts} high-priority family conflicts detected. Consider staggered scheduling.`,
            priority: 'high'
          });
        } else {
          recommendations.push({
            type: 'family_coordination',
            message: `👨‍👩‍👧‍👦 ${familyConflicts.length} overlapping sessions - manageable with preparation.`,
            priority: 'medium'
          });
        }
      }

      if (!loadBalance.balanced) {
        recommendations.push({
          type: 'load_balance',
          message: `⚖️ Uneven workload across children. ${coordinationMode} scheduling recommended.`,
          priority: 'medium'
        });
      }

      if (coordinationMode === 'sequential' && context.scheduleLoad === 'heavy') {
        recommendations.push({
          type: 'coordination_mode',
          message: "🔄 Complex family schedule detected. Sequential mode active for better management.",
          priority: 'low'
        });
      }
    }

    // Time-based recommendations (adjusted for multi-child)
    if (context.timeOfDay === 'morning' && context.scheduleLoad === 'light') {
      const morningMessage = context.multiChild?.isMultiChild
        ? "🌅 Morning planning time! Great for coordinating multiple children's schedules."
        : "🌅 Perfect time to plan your day! Consider scheduling focused subjects in the morning.";

      recommendations.push({
        type: 'timing',
        message: morningMessage,
        priority: 'medium'
      });
    }

    if (context.timeOfDay === 'evening' && context.urgentLessons > 0) {
      const urgentMessage = context.multiChild?.isMultiChild
        ? `⏰ ${context.urgentLessons} urgent lessons across ${context.multiChild.childCount} children. Prioritize for tomorrow.`
        : `⏰ You have ${context.urgentLessons} urgent lessons due soon. Plan them for tomorrow?`;

      recommendations.push({
        type: 'urgency',
        message: urgentMessage,
        priority: 'high'
      });
    }

    // Schedule load recommendations (multi-child aware)
    if (context.scheduleLoad === 'heavy' && !context.multiChild?.isMultiChild) {
      recommendations.push({
        type: 'density',
        message: "📅 Your schedule is quite full. Consider drag-and-drop to optimize timing.",
        priority: 'medium'
      });
    }

    if (context.scheduleLoad === 'light' && context.lessonsAvailable > 5) {
      const opportunityMessage = context.multiChild?.isMultiChild
        ? `📚 ${context.lessonsAvailable} lessons ready across ${context.multiChild.childCount} children. Good time to balance schedules!`
        : `📚 You have ${context.lessonsAvailable} lessons ready. Great time to fill your schedule!`;

      recommendations.push({
        type: 'opportunity',
        message: opportunityMessage,
        priority: 'low'
      });
    }

    // Action-based recommendations (multi-child enhanced)
    if (context.userAction === 'scheduling' && context.dayType === 'weekend') {
      const weekendMessage = context.multiChild?.isMultiChild
        ? "🎯 Weekend family time! Consider coordinated activities and lighter individual sessions."
        : "🎯 Weekend scheduling! Consider lighter, creative subjects for better engagement.";

      recommendations.push({
        type: 'weekend',
        message: weekendMessage,
        priority: 'low'
      });
    }

    return recommendations.slice(0, 2); // Show top 2 recommendations
  }, [state.adaptiveContext]);

  // Get adaptive UI styles and behaviors with multi-child coordination
  const getAdaptiveStyles = useCallback(() => {
    const context = state.adaptiveContext;
    const multiChild = context.multiChild;

    return {
      headerGradient: multiChild?.isMultiChild
        ? (multiChild.coordinationMode === 'sequential'
            ? 'from-orange-50 to-red-100'
            : multiChild.coordinationMode === 'staggered'
            ? 'from-yellow-50 to-amber-100'
            : 'from-green-50 to-emerald-100')
        : (context.timeOfDay === 'morning'
            ? 'from-blue-50 to-indigo-100'
            : context.timeOfDay === 'afternoon'
            ? 'from-amber-50 to-orange-100'
            : 'from-purple-50 to-indigo-100'),

      sidebarWidth: multiChild?.isMultiChild && multiChild.familyConflicts.length > 0
        ? 'w-96'
        : context.scheduleLoad === 'heavy' ? 'w-80' : 'w-80',

      calendarDensity: multiChild?.coordinationMode === 'sequential' ? 'compact' :
                      context.scheduleLoad === 'heavy' ? 'compact' : 'comfortable',

      primaryAction: multiChild?.isMultiChild
        ? (context.userAction === 'scheduling'
            ? `Schedule (${multiChild.coordinationMode})`
            : multiChild.familyConflicts.length > 0
            ? 'Coordinate Family'
            : 'Multi-Child Schedule')
        : (context.userAction === 'scheduling'
            ? 'Schedule Lesson'
            : context.lessonsAvailable > 0
            ? 'Quick Schedule'
            : 'Add Materials'),

      helpText: multiChild?.isMultiChild
        ? (context.userAction === 'scheduling'
            ? `${multiChild.coordinationMode} mode - conflicts will be highlighted`
            : multiChild.familyConflicts.length > 0
            ? `${multiChild.familyConflicts.length} family conflicts need attention`
            : `Managing ${multiChild.childCount} children - coordination mode: ${multiChild.coordinationMode}`)
        : (context.userAction === 'scheduling'
            ? 'Click any available time slot to schedule'
            : context.scheduleLoad === 'light'
            ? 'Select a lesson from the sidebar to get started'
            : 'Drag events to reorganize your schedule'),

      coordinationMode: multiChild?.coordinationMode || 'single',
      showFamilyIndicators: multiChild?.isMultiChild && multiChild.familyConflicts.length > 0
    };
  }, [state.adaptiveContext]);

  // Smart conflict detection
  const detectConflicts = useCallback((day, timeSlot, duration = 30) => {
    const dayString = format(day, 'yyyy-MM-dd');
    const [startHour, startMinute] = timeSlot.split(':').map(Number);
    const startTime = startHour * 60 + startMinute; // Convert to minutes
    const endTime = startTime + duration;

    const conflicts = (calendarEvents || []).filter(event => {
      if (event.date !== dayString && !isSameDay(new Date(event.start || event.scheduled_date), day)) {
        return false;
      }

      const eventStartTime = event.start_time || event.startTime;
      if (!eventStartTime) return false;

      const [eventHour, eventMinute] = eventStartTime.split(':').map(Number);
      const eventStart = eventHour * 60 + eventMinute;
      const eventEnd = eventStart + (event.duration_minutes || event.duration || 30);

      // Check for time overlap
      return (startTime < eventEnd && endTime > eventStart);
    });

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      severity: conflicts.length > 2 ? 'high' : conflicts.length > 1 ? 'medium' : 'low',
      suggestions: conflicts.length > 0 ? generateConflictSuggestions(day, timeSlot, duration, conflicts) : []
    };
  }, [calendarEvents]);

  // Generate smart suggestions to resolve conflicts
  const generateConflictSuggestions = useCallback((day, originalTimeSlot, duration, conflicts) => {
    const suggestions = [];
    const [originalHour, originalMinute] = originalTimeSlot.split(':').map(Number);
    const originalTime = originalHour * 60 + originalMinute;

    // Suggest alternative time slots on the same day
    for (const timeSlot of timeSlots) {
      const [hour, minute] = timeSlot.split(':').map(Number);
      const slotTime = hour * 60 + minute;

      if (Math.abs(slotTime - originalTime) <= 120) { // Within 2 hours
        const slotConflicts = detectConflicts(day, timeSlot, duration);
        if (!slotConflicts.hasConflicts) {
          suggestions.push({
            type: 'alternative_time',
            day: format(day, 'yyyy-MM-dd'),
            timeSlot,
            reason: `Available ${Math.abs(slotTime - originalTime)} minutes ${slotTime > originalTime ? 'later' : 'earlier'}`
          });
        }
      }
    }

    // Suggest alternative days within the current week
    dateRange.days.forEach(alternativeDay => {
      if (!isSameDay(alternativeDay, day)) {
        const dayConflicts = detectConflicts(alternativeDay, originalTimeSlot, duration);
        if (!dayConflicts.hasConflicts) {
          suggestions.push({
            type: 'alternative_day',
            day: format(alternativeDay, 'yyyy-MM-dd'),
            timeSlot: originalTimeSlot,
            reason: `Same time on ${format(alternativeDay, 'EEEE')}`
          });
        }
      }
    });

    // Suggest shorter duration if conflicts are partial
    if (duration > 15) {
      const shorterDuration = Math.max(15, duration - 15);
      const shorterConflicts = detectConflicts(day, originalTimeSlot, shorterDuration);
      if (shorterConflicts.conflicts.length < conflicts.length) {
        suggestions.push({
          type: 'shorter_duration',
          day: format(day, 'yyyy-MM-dd'),
          timeSlot: originalTimeSlot,
          duration: shorterDuration,
          reason: `Reduce to ${shorterDuration} minutes to avoid some conflicts`
        });
      }
    }

    return suggestions.slice(0, 3); // Limit to top 3 suggestions
  }, [timeSlots, dateRange.days]);

  // Smart lesson suggestions based on context
  const getSmartSuggestions = useCallback((day, timeSlot) => {
    if (!selectedLessonContainer) return [];

    // Check for conflicts first
    const conflicts = detectConflicts(day, timeSlot, 30);

    return [{
      lessonContainer: selectedLessonContainer.lessonContainer,
      subject: selectedLessonContainer.subject,
      suggestedDuration: 30,
      confidence: conflicts.hasConflicts ? 0.3 : 0.9,
      reason: conflicts.hasConflicts
        ? `⚠️ Time conflict detected with ${conflicts.conflicts.length} other event(s)`
        : 'Optimal time for this subject based on completion patterns',
      conflicts: conflicts.hasConflicts ? conflicts : null
    }];
  }, [selectedLessonContainer, detectConflicts]);

  // Get events for a specific day
  const getEventsForDay = useCallback((day) => {
    const dayString = format(day, 'yyyy-MM-dd');
    return (calendarEvents || []).filter(event => {
      if (event.date) return event.date === dayString;
      if (event.start) return isSameDay(new Date(event.start), day);
      return false;
    });
  }, [calendarEvents]);

  // Smart navigation
  const navigate = useCallback((direction) => {
    const newDate = addDays(state.currentDate, direction * 7);
    setState(prev => ({ ...prev, currentDate: newDate }));

    if (typeof window !== 'undefined') {
      localStorage.setItem('smart-scheduler-date', newDate.toISOString());
    }
  }, [state.currentDate]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setState(prev => ({ ...prev, currentDate: today }));

    if (typeof window !== 'undefined') {
      localStorage.setItem('smart-scheduler-date', today.toISOString());
    }
  }, []);

  // Smart time slot click handler with conflict detection
  const handleTimeSlotClick = useCallback((day, timeSlot) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    setState(prev => ({ ...prev, selectedTimeSlot: { day: dayStr, time: timeSlot } }));

    // Check for conflicts
    const conflicts = detectConflicts(day, timeSlot, 30);

    if (selectedLessonContainer) {
      if (conflicts.hasConflicts) {
        // Show conflict warning but still allow scheduling
        if (window.confirm(
          `⚠️ Scheduling conflict detected!\n\n` +
          `This time slot conflicts with ${conflicts.conflicts.length} existing event(s):\n` +
          `${conflicts.conflicts.map(c => `• ${c.title || c.subject_name || 'Unknown'}`).join('\n')}\n\n` +
          `Would you like to schedule anyway?`
        )) {
          onCalendarSlotClick(dayStr, timeSlot);
        }
      } else {
        onCalendarSlotClick(dayStr, timeSlot);
      }
    } else {
      openCreateModal({
        date: dayStr,
        time: timeSlot,
        suggestions: getSmartSuggestions(day, timeSlot),
        conflicts: conflicts.hasConflicts ? conflicts : null
      });
    }
  }, [selectedLessonContainer, onCalendarSlotClick, openCreateModal, getSmartSuggestions, detectConflicts]);

  // Drag handlers
  const handleDragStart = useCallback((event) => {
    const eventData = calendarEvents?.find(e => e.id === event.active.id);
    setState(prev => ({ ...prev, draggedEvent: eventData }));
  }, [calendarEvents]);

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    setState(prev => ({ ...prev, draggedEvent: null }));

    if (!over) return;

    const [dayStr, timeStr] = over.id.split('_');
    const eventToMove = calendarEvents?.find(e => e.id === active.id);

    if (!eventToMove) return;

    // Check for conflicts at the new location
    const newDay = parseISO(dayStr + 'T00:00:00');
    const duration = eventToMove.duration_minutes || eventToMove.duration || 30;
    const conflicts = detectConflicts(newDay, timeStr, duration);

    // Filter out the event we're moving from conflicts
    const filteredConflicts = {
      ...conflicts,
      conflicts: conflicts.conflicts.filter(c => c.id !== eventToMove.id)
    };
    filteredConflicts.hasConflicts = filteredConflicts.conflicts.length > 0;

    if (filteredConflicts.hasConflicts) {
      const confirmMove = window.confirm(
        `⚠️ Moving this event will create conflicts!\n\n` +
        `It will conflict with ${filteredConflicts.conflicts.length} other event(s):\n` +
        `${filteredConflicts.conflicts.map(c => `• ${c.title || c.subject_name || 'Unknown'}`).join('\n')}\n\n` +
        `Do you want to move it anyway?`
      );

      if (!confirmMove) {
        return; // Cancel the move
      }
    }

    try {
      await updateScheduleEntry(eventToMove.id, {
        scheduled_date: dayStr,
        start_time: timeStr
      }, eventToMove.child_id);
    } catch (error) {
      console.error('Failed to move event:', error);
    }
  }, [calendarEvents, updateScheduleEntry, detectConflicts]);

  // Window resize handler
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setState(prev => ({ ...prev, windowHeight: window.innerHeight }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg font-medium text-gray-700">Loading Smart Schedule...</span>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full bg-gray-50">
        {/* Smart Header with Adaptive Context */}
        <SmartHeader
          currentDate={state.currentDate}
          onNavigate={navigate}
          onGoToToday={goToToday}
          onToggleSidebar={() => setState(prev => ({ ...prev, showSidebar: !prev.showSidebar }))}
          showSidebar={state.showSidebar}
          onOpenSettings={() => scheduleManagement?.openSettingsModal()}
          onOpenCreate={() => openCreateModal()}
          adaptiveStyles={getAdaptiveStyles()}
          recommendations={getAdaptiveRecommendations()}
          context={state.adaptiveContext}
        />

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Smart Calendar */}
          <div className="flex-1 min-h-0">
            <SmartCalendar
              dateRange={dateRange}
              timeSlots={timeSlots}
              slotHeight={slotHeight}
              events={memoizedCalendarEvents}
              getEventsForDay={getEventsForDayOptimized}
              onTimeSlotClick={handleTimeSlotClick}
              onEventEdit={openEditModal}
              selectedLessonContainer={selectedLessonContainer}
              density={density}
              visibleTimeSlots={visibleTimeSlots}
              performanceTracking={trackRenderPerformance}
              detectConflicts={detectConflicts}
            />
          </div>

          {/* Intelligent Sidebar */}
          {state.showSidebar && (
            <SmartSidebar
              selectedChild={allChildren.find(c => c.id === childId)}
              childSubjects={childSubjects}
              selectedLessonContainer={selectedLessonContainer}
              onLessonSelect={onCalendarSlotClick}
              scheduleEvents={calendarEvents || []}
              lessonsBySubject={lessonsBySubject}
              unitsBySubject={unitsBySubject}
              lessonsByUnit={lessonsByUnit}
              adaptiveStyles={getAdaptiveStyles()}
              context={state.adaptiveContext}
            />
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {state.draggedEvent && (
            <SmartEventCard
              event={state.draggedEvent}
              childSubjects={childSubjects}
              isOverlay={true}
            />
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

// Smart Header Component with Adaptive UI
function SmartHeader({
  currentDate,
  onNavigate,
  onGoToToday,
  onToggleSidebar,
  showSidebar,
  onOpenSettings,
  onOpenCreate,
  adaptiveStyles = {},
  recommendations = [],
  context = {}
}) {
  return (
    <div className={`bg-gradient-to-r ${adaptiveStyles.headerGradient || 'from-white to-gray-50'} border-b border-gray-200`}>
      {/* Smart Recommendations Bar */}
      {recommendations.length > 0 && (
        <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`text-sm flex items-center gap-2 ${
                    rec.priority === 'high' ? 'text-red-700 font-semibold' :
                    rec.priority === 'medium' ? 'text-blue-700 font-medium' :
                    'text-gray-700'
                  }`}
                >
                  <span>{rec.message}</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
              {context.userAction === 'scheduling' ? '🎯 Scheduling' :
               context.userAction === 'organizing' ? '📋 Organizing' :
               '👀 Browsing'}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate(-1)}
              className="p-2 hover:bg-white/70 rounded-lg transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>

            <h1 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
              Week of {format(currentDate, 'MMM d, yyyy')}
            </h1>

            <button
              onClick={() => onNavigate(1)}
              className="p-2 hover:bg-white/70 rounded-lg transition-colors"
              aria-label="Next week"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Adaptive Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onGoToToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white/70 rounded-lg transition-colors"
            >
              Today
            </button>

            <button
              onClick={onToggleSidebar}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                showSidebar
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-white/70'
              }`}
              title={adaptiveStyles.helpText}
            >
              📚 Lessons
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 text-gray-600 hover:bg-white/70 rounded-lg transition-colors"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>

            <button
              onClick={onOpenCreate}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                context.userAction === 'scheduling'
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <PlusIcon className="h-4 w-4" />
              {adaptiveStyles.primaryAction || 'Add Lesson'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Smart Calendar Component with Performance Optimization
function SmartCalendar({
  dateRange,
  timeSlots,
  slotHeight,
  events,
  getEventsForDay,
  onTimeSlotClick,
  onEventEdit,
  selectedLessonContainer,
  density,
  visibleTimeSlots = [],
  performanceTracking,
  detectConflicts
}) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const calendarRef = useRef(null);

  // Performance tracking for calendar render
  useEffect(() => {
    if (performanceTracking) {
      const startTime = performance.now();

      // Track after render
      requestAnimationFrame(() => {
        const endTime = performance.now();
        performanceTracking('SmartCalendar', endTime - startTime);
      });
    }
  });

  // Memoized day headers to prevent unnecessary re-renders
  const dayHeaders = useMemo(() => {
    return dateRange.days.map((day, index) => {
      const isWeekend = index >= 5;
      const isTodayDay = isToday(day);

      return (
        <div
          key={day.toString()}
          className={`p-3 text-center border-r border-gray-200 last:border-r-0 transition-colors ${
            isWeekend ? 'bg-gray-50' : 'bg-white'
          } ${isTodayDay ? 'bg-blue-50 text-blue-800' : ''}`}
        >
          <div className="text-xs font-semibold text-gray-600 uppercase">
            {dayNames[index]}
          </div>
          <div className={`text-lg font-bold mt-1 ${
            isTodayDay ? 'text-blue-800' : 'text-gray-800'
          }`}>
            {format(day, 'd')}
          </div>
        </div>
      );
    });
  }, [dateRange.days]);

  // Use virtual scrolling for large datasets
  const useVirtualScrolling = timeSlots.length > 20;
  const renderTimeSlots = useVirtualScrolling ? visibleTimeSlots :
    timeSlots.map((slot, index) => ({ slot, index, top: index * slotHeight }));

  // Memoized time grid for performance
  const timeGrid = useMemo(() => {
    return (
      <div className="grid grid-cols-8 min-h-0 max-h-[600px] overflow-y-auto" ref={calendarRef}>
        {/* Time Labels */}
        <div className="bg-gray-50 border-r border-gray-200" style={{
          height: useVirtualScrolling ? `${timeSlots.length * slotHeight}px` : 'auto',
          position: 'relative'
        }}>
          {renderTimeSlots.map(({ slot: timeSlot, index, top }) => (
            <div
              key={`${timeSlot}_${index}`}
              className="border-b border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 bg-gray-100 absolute w-full"
              style={{
                height: `${slotHeight}px`,
                top: useVirtualScrolling ? `${top}px` : 'auto',
                position: useVirtualScrolling ? 'absolute' : 'relative'
              }}
            >
              {timeSlot}
            </div>
          ))}
        </div>

        {/* Day Columns with Performance Optimization */}
        {dateRange.days.map((day, dayIndex) => {
          const dayEvents = getEventsForDay(day);
          const isWeekendDay = dayIndex >= 5;

          return (
            <div key={day.toString()} className="border-r border-gray-200 last:border-r-0" style={{
              height: useVirtualScrolling ? `${timeSlots.length * slotHeight}px` : 'auto',
              position: 'relative'
            }}>
              {renderTimeSlots.map(({ slot: timeSlot, index, top }) => (
                <SmartTimeSlot
                  key={`${day.toString()}_${timeSlot}_${index}`}
                  day={day}
                  timeSlot={timeSlot}
                  height={slotHeight}
                  events={dayEvents}
                  isWeekend={isWeekendDay}
                  onClick={() => onTimeSlotClick(day, timeSlot)}
                  selectedLessonContainer={selectedLessonContainer}
                  detectConflicts={detectConflicts}
                  style={useVirtualScrolling ? {
                    position: 'absolute',
                    top: `${top}px`,
                    width: '100%'
                  } : {}}
                />
              ))}
            </div>
          );
        })}
      </div>
    );
  }, [dateRange.days, renderTimeSlots, slotHeight, getEventsForDay, onTimeSlotClick, selectedLessonContainer, useVirtualScrolling, timeSlots.length]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mx-4 mb-4 overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
        <div className="p-3 text-xs font-semibold text-gray-600 bg-gray-100 border-r border-gray-200 text-center">
          ⏰
        </div>
        {dayHeaders}
      </div>

      {/* Optimized Time Grid */}
      {timeGrid}

      {/* Performance indicator in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-bl">
          {useVirtualScrolling ? '🚀 Virtual' : '📊 Standard'} • {events.length} events
        </div>
      )}
    </div>
  );
}

// Smart Time Slot Component with Performance Optimization
function SmartTimeSlot({
  day,
  timeSlot,
  height,
  events,
  isWeekend,
  onClick,
  selectedLessonContainer,
  detectConflicts,
  style = {}
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${format(day, 'yyyy-MM-dd')}_${timeSlot}`
  });

  // Check if this slot has an event
  const eventStartingHere = events.find(event => {
    let eventTimeStr = event.startTime || event.start_time;
    if (!eventTimeStr && event.start) {
      eventTimeStr = format(new Date(event.start), 'HH:mm');
    }
    if (eventTimeStr && eventTimeStr.length === 8) {
      eventTimeStr = eventTimeStr.substring(0, 5);
    }
    return eventTimeStr === timeSlot;
  });

  // Detect potential conflicts for this slot when lesson is selected
  const conflicts = selectedLessonContainer && detectConflicts ? detectConflicts(day, timeSlot, 30) : null;

  if (eventStartingHere) {
    return (
      <div
        ref={setNodeRef}
        className="relative border-b border-gray-200"
        style={{ height: `${height}px` }}
      >
        <SmartEventCard
          event={eventStartingHere}
          height={height}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`border-b border-gray-200 transition-colors cursor-pointer relative ${
        isWeekend ? 'bg-gray-50/50 hover:bg-gray-100' : 'bg-white hover:bg-blue-50'
      } ${isOver ? 'bg-blue-100' : ''} ${
        selectedLessonContainer ? (
          conflicts?.hasConflicts ? 'bg-red-50 hover:bg-red-100 border-red-200' : 'bg-green-50 hover:bg-green-100'
        ) : ''
      }`}
      style={{ height: `${height}px`, ...style }}
      onClick={onClick}
    >
      {/* Smart scheduling indicator with conflict warning */}
      {selectedLessonContainer && (
        <div className="absolute inset-0 flex items-center justify-center">
          {conflicts?.hasConflicts ? (
            <div className="text-xs text-red-700 font-semibold bg-red-100 px-2 py-1 rounded-md border border-red-200">
              ⚠️ Conflict ({conflicts.conflicts.length})
            </div>
          ) : (
            <div className="text-xs text-green-700 font-semibold bg-green-100 px-2 py-1 rounded-md">
              ✓ Available
            </div>
          )}
        </div>
      )}

      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-xs text-blue-700 font-semibold bg-blue-100 px-2 py-1 rounded-md">
            Drop here
          </div>
        </div>
      )}
    </div>
  );
}

// Smart Event Card Component
function SmartEventCard({ event, height, childSubjects = [], isOverlay = false }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  };

  const subject = event.base_subject_name || event.subject_name || event.title || 'Study';
  const duration = event.duration || event.duration_minutes || 30;
  const subjectColors = getSubjectColor(subject, childSubjects);
  const subjectIcon = getSubjectIcon(subject, childSubjects);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group h-full ${isOverlay ? 'z-50' : ''}`}
      {...attributes}
    >
      <div
        className={`h-full p-2 m-1 rounded-lg cursor-move transition-all hover:shadow-md ${subjectColors.bg} ${subjectColors.text} border ${subjectColors.border || 'border-gray-200'}`}
        {...listeners}
      >
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm">{subjectIcon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">
                {event.title || subject}
              </div>
              <div className="text-xs opacity-75">
                {duration}m
              </div>
            </div>
          </div>

          {event.status === 'completed' && (
            <CheckIcon className="h-4 w-4 text-green-600" />
          )}
        </div>
      </div>
    </div>
  );
}

// Smart Sidebar Component with Adaptive Context
function SmartSidebar({
  selectedChild,
  childSubjects,
  selectedLessonContainer,
  onLessonSelect,
  scheduleEvents,
  lessonsBySubject = {},
  unitsBySubject = {},
  lessonsByUnit = {},
  adaptiveStyles = {},
  context = {}
}) {
  const [expandedSubjects, setExpandedSubjects] = useState(
    childSubjects.reduce((acc, subject) => {
      acc[subject.id] = true;
      return acc;
    }, {})
  );

  // Smart lesson organization - get ready lesson containers
  const organizedLessons = useMemo(() => {
    if (!selectedChild || !childSubjects.length) return {};

    const scheduledLessonContainerIds = new Set(
      scheduleEvents
        .map(entry => {
          if (entry.lesson_container_id) {
            return entry.lesson_container_id;
          }
          if (entry.notes) {
            try {
              const notesData = JSON.parse(entry.notes);
              if (notesData.lesson_container_id) {
                return notesData.lesson_container_id;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
          return null;
        })
        .filter(id => id !== null)
    );

    return childSubjects.reduce((acc, subject) => {
      const subjectUnits = unitsBySubject[subject.child_subject_id] || [];
      const subjectMaterials = lessonsBySubject[subject.child_subject_id] || [];

      const allLessonContainers = [];

      subjectUnits.forEach(unit => {
        const unitLessons = lessonsByUnit[unit.id] || [];

        unitLessons.forEach(lesson => {
          const lessonMaterials = subjectMaterials.filter(material =>
            material.lesson_id === lesson.id
          );

          if (lessonMaterials.length > 0) {
            const completedMaterials = lessonMaterials.filter(m => m.completed_at).length;
            const totalMaterials = lessonMaterials.length;

            // Only include if not all materials are completed AND not already scheduled
            if (completedMaterials < totalMaterials && !scheduledLessonContainerIds.has(lesson.id)) {
              const hasOverdue = lessonMaterials.some(material =>
                material.due_date && !material.completed_at &&
                new Date(material.due_date) < new Date()
              );

              const hasDueSoon = lessonMaterials.some(material =>
                material.due_date && !material.completed_at &&
                new Date(material.due_date) < addDays(new Date(), 3)
              );

              const priority = hasOverdue ? 1 : hasDueSoon ? 2 : 3;

              allLessonContainers.push({
                id: lesson.id,
                title: lesson.title,
                unitTitle: unit.name,
                materials: lessonMaterials,
                totalMaterials,
                completedMaterials,
                progressPercentage: Math.round((completedMaterials / totalMaterials) * 100),
                priority,
                urgencyLabel: hasOverdue ? 'Overdue' :
                             hasDueSoon ? 'Due Soon' : 'Ready'
              });
            }
          }
        });
      });

      // Sort by priority and limit to top 5
      const sortedLessonContainers = allLessonContainers
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 5);

      if (sortedLessonContainers.length > 0) {
        acc[subject.id] = {
          subject,
          lessonContainers: sortedLessonContainers,
          totalIncomplete: sortedLessonContainers.length
        };
      }

      return acc;
    }, {});
  }, [selectedChild, childSubjects, lessonsBySubject, unitsBySubject, lessonsByUnit, scheduleEvents]);

  const subjectsWithLessons = Object.values(organizedLessons);

  const toggleSubject = (subjectId) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  return (
    <div className={`${adaptiveStyles.sidebarWidth || 'w-80'} bg-white border-l border-gray-200 flex flex-col shadow-sm`}>
      {/* Adaptive Header */}
      <div className={`p-4 border-b border-gray-200 ${
        context.timeOfDay === 'evening' ? 'bg-purple-50' :
        context.timeOfDay === 'afternoon' ? 'bg-amber-50' :
        'bg-blue-50'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-2 rounded-lg ${
            context.userAction === 'scheduling' ? 'bg-green-100' : 'bg-blue-100'
          }`}>
            <CalendarDaysIcon className={`h-5 w-5 ${
              context.userAction === 'scheduling' ? 'text-green-600' : 'text-blue-600'
            }`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {context.userAction === 'scheduling' ? 'Schedule Lesson' : 'Smart Lessons'}
            </h3>
            <p className="text-xs text-gray-600">
              {context.userAction === 'scheduling'
                ? `${adaptiveStyles.helpText}`
                : `${context.lessonsAvailable || 0} ready • ${context.urgentLessons || 0} urgent`}
            </p>
          </div>
        </div>

        {selectedLessonContainer && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckIcon className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-800 text-sm">Selected</span>
            </div>
            <div className="text-sm text-green-700 font-medium">
              {selectedLessonContainer.lessonContainer?.title}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {context.dayType === 'weekend'
                ? 'Weekend scheduling - consider lighter sessions'
                : 'Click any available time slot to schedule'}
            </div>
          </div>
        )}

        {context.urgentLessons > 0 && !selectedLessonContainer && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
            <div className="flex items-center gap-2 mb-1">
              <ClockIcon className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-red-800 text-sm">
                {context.urgentLessons} Urgent Lessons
              </span>
            </div>
            <div className="text-xs text-red-600">
              Due within 3 days - prioritize these first
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
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
              <SmartSubjectSection
                key={subject.id}
                subject={subject}
                lessonContainers={lessonContainers}
                isExpanded={expandedSubjects[subject.id]}
                onToggle={() => toggleSubject(subject.id)}
                selectedLessonContainer={selectedLessonContainer}
                onLessonSelect={onLessonSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Adaptive Smart footer */}
      <div className={`p-4 border-t border-gray-200 ${
        context.timeOfDay === 'evening' ? 'bg-purple-50' :
        context.timeOfDay === 'afternoon' ? 'bg-amber-50' :
        'bg-gray-50'
      }`}>
        <div className="text-xs text-gray-600">
          <p className="font-medium text-gray-700 mb-2">
            {context.userAction === 'scheduling' ? 'Scheduling Mode:' :
             context.scheduleLoad === 'heavy' ? 'Busy Schedule:' :
             'Quick Guide:'}
          </p>
          <ul className="space-y-1">
            {context.userAction === 'scheduling' ? (
              <>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Green slots = available</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>Red slots = conflict warning</span>
                </li>
              </>
            ) : context.scheduleLoad === 'heavy' ? (
              <>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Drag events to reorganize</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span>Consider shorter durations</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Click lesson → Click time slot</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>Red = overdue • Orange = due soon</span>
                </li>
              </>
            )}
          </ul>

          {context.timeOfDay === 'evening' && context.urgentLessons > 0 && (
            <div className="mt-3 p-2 bg-amber-100 rounded-lg">
              <p className="text-xs text-amber-800 font-medium">
                💡 Evening tip: Plan tomorrow&apos;s urgent lessons now for a smooth start!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Smart Subject Section Component
function SmartSubjectSection({
  subject,
  lessonContainers,
  isExpanded,
  onToggle,
  selectedLessonContainer,
  onLessonSelect
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
            <div className="text-lg">{subjectIcon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {subject.custom_subject_name_override || subject.name}
              </div>
              <div className="flex items-center gap-2 text-xs opacity-80 mt-0.5">
                <span>{lessonContainers.length} lessons ready</span>
                {urgentCount > 0 && (
                  <span className="text-red-600 font-semibold">
                    • {urgentCount} urgent
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
          <div className="space-y-2 p-3">
            {lessonContainers.map((lessonContainer) => (
              <SmartLessonCard
                key={lessonContainer.id}
                lessonContainer={lessonContainer}
                subject={subject}
                selectedLessonContainer={selectedLessonContainer}
                onLessonSelect={onLessonSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Smart Lesson Card Component
function SmartLessonCard({
  lessonContainer,
  subject,
  selectedLessonContainer,
  onLessonSelect
}) {
  const isSelected = selectedLessonContainer?.lessonContainer?.id === lessonContainer.id;

  const handleClick = () => {
    onLessonSelect(lessonContainer.id, 30); // Default duration
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm ${
        isSelected
          ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm truncate ${
            isSelected ? 'text-green-800' : 'text-gray-900'
          }`}>
            {lessonContainer.title}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {lessonContainer.unitTitle} • {lessonContainer.completedMaterials}/{lessonContainer.totalMaterials} complete
          </div>
          <div className={`text-xs font-semibold mt-1 ${
            lessonContainer.priority === 1 ? 'text-red-600' :
            lessonContainer.priority === 2 ? 'text-orange-600' : 'text-blue-600'
          }`}>
            {lessonContainer.urgencyLabel}
          </div>
        </div>

        {isSelected && (
          <CheckIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
        )}
      </div>
    </button>
  );
}
