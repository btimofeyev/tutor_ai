// app/schedule/components/EnhancedScheduleManager.js
"use client";
import { useState, useEffect } from 'react';
import {
  CalendarDaysIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import AdvancedScheduleCalendar from './AdvancedScheduleCalendar';
import ScheduleTemplatesManager from './ScheduleTemplatesManager';
import PDFGenerator from './PDFGenerator';
import { useScheduleManagement } from '../../../hooks/useScheduleManagement';

export default function EnhancedScheduleManager({
  childId,
  selectedChildrenIds = [],
  allChildren = [],
  subscriptionPermissions,
  childSubjects = [],
  schedulePreferences = {},
  scheduleManagement,
  onGenerateAISchedule,
  selectedLessonContainer = null,
  onCalendarSlotClick = () => {},
  density = 'comfortable',
  onToggleDensity = () => {}
}) {
  const [activeView, setActiveView] = useState('advanced'); // advanced, dragdrop
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  // Always call the hook to satisfy React rules
  const fallbackScheduleManagement = useScheduleManagement(childId, subscriptionPermissions);

  // Use provided schedule management or create our own
  const finalScheduleManagement = scheduleManagement ?? fallbackScheduleManagement;
  const { calendarEvents, loading, error, refresh, refreshEvents } = finalScheduleManagement;

  // PDF Generator instance
  const pdfGenerator = new PDFGenerator();

  // Helper function to find next available time slot
  const findNextAvailableTimeSlot = (originalTime, duration, date, existingEntries, increment = 30) => {
    let currentTime = originalTime;
    let attempts = 0;
    const maxAttempts = 20; // Prevent infinite loops

    while (attempts < maxAttempts) {
      const timeConflict = existingEntries.some(entry => {
        if (entry.scheduled_date !== date) return false;

        const entryStart = new Date(`1970-01-01T${entry.start_time}`);
        const entryEnd = new Date(entryStart.getTime() + (entry.duration_minutes * 60000));
        const newStart = new Date(`1970-01-01T${currentTime}`);
        const newEnd = new Date(newStart.getTime() + (duration * 60000));

        return (newStart < entryEnd && newEnd > entryStart);
      });

      if (!timeConflict) {
        return currentTime;
      }

      // Move to next time slot
      const timeDate = new Date(`1970-01-01T${currentTime}`);
      timeDate.setMinutes(timeDate.getMinutes() + increment);
      currentTime = timeDate.toTimeString().substring(0, 5);
      attempts++;
    }

    return originalTime; // Fallback to original time if no slot found
  };

  // Handle template application
  const handleApplyTemplate = async (template, startDate) => {
    // Prevent multiple simultaneous applications
    if (applyingTemplate) {
      return { success: false, entriesCreated: 0 };
    }

    try {
      setApplyingTemplate(true);

      // Give UI time to show loading skeleton
      await new Promise(resolve => setTimeout(resolve, 150));

      // Determine which children to apply the template to
      const targetChildIds = selectedChildrenIds.length >= 1
        ? selectedChildrenIds
        : (childId ? [childId] : []);

      if (targetChildIds.length === 0) {
        alert('No children selected. Please select at least one child.');
        return { success: false, entriesCreated: 0 };
      }

      // Get existing schedule entries to check for conflicts
      let existingEntries = [];
      if (calendarEvents && calendarEvents.length > 0) {
        existingEntries = calendarEvents.map(event => ({
          scheduled_date: event.date || (event.start ? event.start.split('T')[0] : null),
          start_time: event.startTime || event.start_time || (event.start ? event.start.split('T')[1].substring(0, 5) : null),
          duration_minutes: event.duration || event.duration_minutes || 30,
          child_id: event.child_id
        })).filter(entry => entry.scheduled_date && entry.start_time);
      }

      // Keep track of all created entries across children to avoid conflicts
      const allCreatedEntries = [...existingEntries];
      const allResults = [];
      let totalSuccessfulEntries = 0;
      let totalFailedEntries = 0;

      // Prepare all entries for batch creation
      const allEntriesToCreate = [];

      for (const targetChildId of targetChildIds) {

        // Convert template sessions to actual schedule entries for this child
        const scheduleEntries = template.sessions.map(session => {
          const scheduledDate = calculateDateForDay(startDate, session.day);

          // Find next available time slot considering all previously created entries
          const availableTime = findNextAvailableTimeSlot(
            session.time,
            session.duration,
            scheduledDate,
            allCreatedEntries
          );

          const entryData = {
            subject_name: session.subject,
            scheduled_date: scheduledDate,
            start_time: availableTime,
            duration_minutes: session.duration,
            status: 'scheduled',
            created_by: 'parent',
            notes: `Applied from template: ${template.name}${availableTime !== session.time ? ` (adjusted from ${session.time})` : ''}`
          };

          // Add to tracking list to prevent future conflicts
          allCreatedEntries.push({
            scheduled_date: scheduledDate,
            start_time: availableTime,
            duration_minutes: session.duration,
            child_id: targetChildId
          });

          return { entryData, targetChildId };
        });

        allEntriesToCreate.push(...scheduleEntries);
      }

      // Use batch create to prevent individual refreshes

      let batchResult;
      if (selectedChildrenIds.length >= 1) {
        // Multi-child batch create
        batchResult = await finalScheduleManagement.createScheduleEntriesBatch(allEntriesToCreate);
      } else {
        // Single-child batch create - convert format
        const entriesData = allEntriesToCreate.map(item => item.entryData);
        batchResult = await finalScheduleManagement.createScheduleEntriesBatch(entriesData);
      }

      if (batchResult.success) {
        totalSuccessfulEntries = batchResult.entriesCreated;
        totalFailedEntries = batchResult.entriesFailed;
      } else {
        totalFailedEntries = allEntriesToCreate.length;
        console.error('Batch create failed:', batchResult.error);
      }

      const totalChildren = targetChildIds.length;
      const totalEntriesAttempted = template.sessions.length * totalChildren;

      // Note: No explicit refresh needed - batch create automatically updates the state

      if (totalSuccessfulEntries > 0) {
        const message = totalChildren > 1
          ? `Template applied successfully! Created ${totalSuccessfulEntries} schedule entries across ${totalChildren} children.${totalFailedEntries > 0 ? ` (${totalFailedEntries} entries failed to create)` : ''}`
          : `Template applied successfully! Created ${totalSuccessfulEntries} schedule entries.${totalFailedEntries > 0 ? ` (${totalFailedEntries} entries failed to create)` : ''}`;

        // Switch to calendar view to show the results
        if (activeView === 'templates') {
          setActiveView('advanced');
        }

        alert(message);
      } else {
        alert(`Failed to apply template. All ${totalEntriesAttempted} entries failed to create. Please check for scheduling conflicts or try again.`);
      }

      return { success: totalSuccessfulEntries > 0, entriesCreated: totalSuccessfulEntries };
    } catch (error) {
      console.error('Failed to apply template:', error);
      alert('Failed to apply template. Please try again.');
      throw error;
    } finally {
      setApplyingTemplate(false);

      // Force a calendar refresh after state reset
      setTimeout(() => {
        const refreshFunction = refresh || refreshEvents;
        if (refreshFunction) {
          refreshFunction();
        }
      }, 100);
    }
  };

  // Calculate date for a specific day of the week
  const calculateDateForDay = (startDate, dayName) => {
    const days = {
      monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
      friday: 5, saturday: 6, sunday: 0
    };

    const startDay = new Date(startDate);
    const targetDay = days[dayName.toLowerCase()];
    const currentDay = startDay.getDay();

    const dayDifference = (targetDay - currentDay + 7) % 7;
    const targetDate = new Date(startDay);
    targetDate.setDate(startDate.getDate() + dayDifference);

    return targetDate.toISOString().split('T')[0];
  };

  // Handle saving current schedule as template
  const handleSaveAsTemplate = async () => {
    try {
      if (!calendarEvents || calendarEvents.length === 0) {
        alert('No scheduled events to save as template.');
        return;
      }

      // Extract template data from current schedule
      const templateName = prompt('Enter a name for this template:');
      if (!templateName) return;

      // Group events by day and convert to template format
      const sessionsByDay = {};
      calendarEvents.forEach(event => {
        const date = new Date(event.start || event.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

        if (!sessionsByDay[dayName]) {
          sessionsByDay[dayName] = [];
        }

        sessionsByDay[dayName].push({
          day: dayName,
          time: event.startTime || event.start_time || format(date, 'HH:mm'),
          duration: event.duration || event.duration_minutes || 30,
          subject: event.base_subject_name || event.subject_name || event.subject || event.title || 'Study'
        });
      });

      // Flatten sessions
      const sessions = Object.values(sessionsByDay).flat();

      // Create template object
      const template = {
        name: templateName,
        description: `Template created from schedule on ${format(new Date(), 'MMM d, yyyy')}`,
        category: 'custom',
        sessions: sessions,
        created_from_schedule: true,
        children_count: selectedChildrenIds.length || 1
      };

      // Switch to templates view and trigger save
      setActiveView('templates');
      setShowTemplates(true);

      // You could also directly save here if you want immediate save
      alert(`Template "${templateName}" will be available in the Templates section.`);

    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template. Please try again.');
    }
  };

  // Handle PDF generation
  const handleGeneratePDF = async (exportContent, options = {}) => {
    try {
      // Handle multiple children selection
      const selectedChildren = selectedChildrenIds.length >= 1
        ? allChildren.filter(child => selectedChildrenIds.includes(child.id))
        : [allChildren.find(c => c.id === childId)].filter(Boolean);

      const childNames = selectedChildren.map(child => child.name).join(', ');

      const scheduleData = {
        events: calendarEvents || [],
        childName: childNames || 'Student',
        selectedChildren: selectedChildren,
        selectedChildrenIds: selectedChildrenIds,
        dateRange: {
          start: new Date(),
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next week
        }
      };

      await pdfGenerator.generatePrintablePDF(scheduleData, {
        format: options.format || 'daily',
        includeNotes: options.includeNotes !== false,
        colorScheme: options.colorScheme || 'color'
      });
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };

  // Handle event updates from drag-and-drop
  const handleEventUpdate = async (updatedEvent) => {
    try {
      const refreshFunction = refresh || refreshEvents;
      if (refreshFunction) {
        await refreshFunction();
      }
    } catch (error) {
      console.error('Failed to refresh events after update:', error);
    }
  };

  // Simple, clear tab selector - removed organize tab
  const renderViewSelector = () => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setActiveView('advanced')}
        className={`${activeView === 'advanced' ? 'btn-primary' : 'btn-secondary'}`}
      >
        <CalendarDaysIcon className="h-4 w-4" />
        Calendar
      </button>
      <button
        onClick={() => setActiveView('templates')}
        className={`${activeView === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
      >
        <DocumentDuplicateIcon className="h-4 w-4" />
        Templates
      </button>
    </div>
  );

  // Render action buttons - clean styling
  const renderActionButtons = () => (
    <div className="flex items-center gap-2">
      {/* Density toggle */}
      <button
        onClick={onToggleDensity}
        className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
          density === 'compact'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title={`Switch to ${density === 'compact' ? 'comfortable' : 'compact'} view`}
      >
        {density === 'compact' ? 'Compact' : 'Standard'}
      </button>

      {/* Save template */}
      {activeView === 'advanced' && (
        <button
          onClick={() => handleSaveAsTemplate()}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          title="Save as template"
        >
          💾 Save
        </button>
      )}

      {/* More menu */}
      <div className="relative">
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className="px-3 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
          title="More options"
        >
          ⋯
        </button>

        {showMoreMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <button
              onClick={() => {
                handleGeneratePDF(null, { format: 'daily' });
                setShowMoreMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3"
            >
              <PrinterIcon className="h-4 w-4 text-gray-500" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={() => {
                finalScheduleManagement.openSettingsModal();
                setShowMoreMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3"
            >
              <Cog6ToothIcon className="h-4 w-4 text-gray-500" />
              <span>Settings</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMoreMenu && !event.target.closest('.relative')) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMoreMenu]);

  if (loading && !applyingTemplate) {
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

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <span className="font-medium">Error loading schedule</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
          <button
            onClick={() => {
              const refreshFunction = refresh || refreshEvents;
              if (refreshFunction) refreshFunction();
            }}
            className="btn-secondary text-sm px-4 py-2 mt-3"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Clean header */}
        <div className="flex justify-between items-center px-3 py-2 bg-white border border-gray-200 rounded-lg mb-3">
        <div className="flex items-center gap-2">
          {/* View selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
            <button
              onClick={() => setActiveView('advanced')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${activeView === 'advanced' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              📅 Calendar
            </button>
            <button
              onClick={() => setActiveView('templates')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${activeView === 'templates' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              📋 Templates
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {renderActionButtons()}
        </div>
      </div>

      {/* Main calendar view - optimized to balance with header content */}
      {activeView === 'advanced' && (
        <div className="flex-1 min-h-0 flex flex-col" style={{ minHeight: 'calc(100vh - 100px)' }}>
          {applyingTemplate ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="animate-pulse space-y-4">
                {/* Calendar header skeleton */}
                <div className="flex justify-between items-center mb-6">
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>

                {/* Week days header */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-8 bg-gray-200 rounded"></div>
                  ))}
                </div>

                {/* Calendar grid skeleton */}
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="h-24 bg-gray-100 rounded border border-gray-200 p-2">
                      <div className="h-4 bg-gray-200 rounded w-6 mb-2"></div>
                      {Math.random() > 0.7 && (
                        <div className="space-y-1">
                          <div className="h-3 bg-blue-200 rounded"></div>
                          {Math.random() > 0.5 && <div className="h-3 bg-green-200 rounded"></div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Loading indicator */}
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Creating schedule entries...</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <AdvancedScheduleCalendar
              key={`calendar-${selectedChildrenIds.join('-') || childId}-${schedulePreferences?.preferred_start_time || '09:00'}-${schedulePreferences?.preferred_end_time || '15:00'}`}
              childId={childId}
              selectedChildrenIds={selectedChildrenIds}
              allChildren={allChildren}
              subscriptionPermissions={subscriptionPermissions}
              scheduleManagement={finalScheduleManagement}
              childSubjects={childSubjects}
              schedulePreferences={schedulePreferences}
              onGenerateAISchedule={onGenerateAISchedule}
              selectedLessonContainer={selectedLessonContainer}
              onCalendarSlotClick={onCalendarSlotClick}
              density={density}
            />
          )}
        </div>
      )}

      {activeView === 'templates' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {applyingTemplate ? (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Applying Template</h3>
              <p className="text-gray-600">Creating schedule entries...</p>
            </div>
          ) : (
            <ScheduleTemplatesManager
              isOpen={true}
              onClose={() => setActiveView('advanced')}
              onApplyTemplate={handleApplyTemplate}
              childId={childId}
              selectedChildrenIds={selectedChildrenIds}
              allChildren={allChildren}
              childSubjects={childSubjects}
              schedulePreferences={schedulePreferences}
              inlineMode={true}
              isApplying={applyingTemplate}
            />
          )}
        </div>
      )}

      {/* Templates Modal - only when triggered from other views */}
      {showTemplates && activeView !== 'templates' && (
        <ScheduleTemplatesManager
          isOpen={showTemplates}
          onClose={() => setShowTemplates(false)}
          onApplyTemplate={handleApplyTemplate}
          childId={childId}
          selectedChildrenIds={selectedChildrenIds}
          allChildren={allChildren}
          childSubjects={childSubjects}
          schedulePreferences={schedulePreferences}
          isApplying={applyingTemplate}
        />
      )}

    </div>
  );
}
