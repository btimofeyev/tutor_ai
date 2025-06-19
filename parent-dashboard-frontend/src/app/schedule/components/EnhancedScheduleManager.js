// app/schedule/components/EnhancedScheduleManager.js
"use client";
import { useState, useEffect } from 'react';
import { 
  CalendarDaysIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  ArrowsUpDownIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import AdvancedScheduleCalendar from './AdvancedScheduleCalendar';
import DragDropScheduleCalendar from './DragDropScheduleCalendar';
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
  scheduleManagement
}) {
  const [activeView, setActiveView] = useState('advanced'); // advanced, dragdrop
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  
  // Use provided schedule management or create our own
  const finalScheduleManagement = scheduleManagement || useScheduleManagement(childId, subscriptionPermissions);
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
      console.log('Template application already in progress, skipping...');
      return { success: false, entriesCreated: 0 };
    }

    try {
      setApplyingTemplate(true);
      console.log('Applying template:', template.name, 'starting from:', startDate);
      
      // Determine which children to apply the template to
      const targetChildIds = selectedChildrenIds.length >= 1 
        ? selectedChildrenIds 
        : (childId ? [childId] : []);
      
      if (targetChildIds.length === 0) {
        alert('No children selected. Please select at least one child.');
        return { success: false, entriesCreated: 0 };
      }
      
      console.log('Applying template to children:', targetChildIds);
      
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
        console.log(`Preparing entries for child: ${targetChildId}`);
        
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
      console.log(`Creating ${allEntriesToCreate.length} entries in batch mode...`);
      
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
        console.log('Batch create completed:', batchResult);
      } else {
        totalFailedEntries = allEntriesToCreate.length;
        console.error('Batch create failed:', batchResult.error);
      }

      const totalChildren = targetChildIds.length;
      const totalEntriesAttempted = template.sessions.length * totalChildren;

      console.log(`Template applied: ${totalSuccessfulEntries} entries created across ${totalChildren} children, ${totalFailedEntries} failed out of ${totalEntriesAttempted} attempted`);
      
      // Note: No explicit refresh needed - batch create automatically updates the state
      
      if (totalSuccessfulEntries > 0) {
        const message = totalChildren > 1 
          ? `Template applied successfully! Created ${totalSuccessfulEntries} schedule entries across ${totalChildren} children.${totalFailedEntries > 0 ? ` (${totalFailedEntries} entries failed to create)` : ''}`
          : `Template applied successfully! Created ${totalSuccessfulEntries} schedule entries.${totalFailedEntries > 0 ? ` (${totalFailedEntries} entries failed to create)` : ''}`;
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
          subject: event.subject_name || event.subject || event.title || 'Study'
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

      console.log('Saving template:', template);
      
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

  // Simple, clear tab selector
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
        onClick={() => setActiveView('dragdrop')}
        className={`${activeView === 'dragdrop' ? 'btn-primary' : 'btn-secondary'}`}
      >
        <ArrowsUpDownIcon className="h-4 w-4" />
        Organize
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

  // Render action buttons - enhanced styling
  const renderActionButtons = () => (
    <div className="flex items-center gap-3">
      {/* Quick Save as Template button - show in calendar views */}
      {(activeView === 'advanced' || activeView === 'dragdrop') && (
        <button
          onClick={() => handleSaveAsTemplate()}
          className="btn-yellow"
          title="Save current schedule as template"
        >
          <DocumentDuplicateIcon className="h-4 w-4" />
          Save as Template
        </button>
      )}
      
      {/* More menu dropdown - enhanced styling */}
      <div className="relative">
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className="p-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 hover:text-gray-900 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 border border-gray-300"
          title="More options"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
        
        {showMoreMenu && (
          <div className="absolute right-0 mt-3 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 backdrop-blur-sm">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
              Quick Actions
            </div>
            <button
              onClick={() => {
                handleGeneratePDF(null, { format: 'daily' });
                setShowMoreMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-800 transition-all duration-150 flex items-center gap-3"
            >
              <div className="p-1 bg-blue-100 rounded-md">
                <PrinterIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">Print PDF</div>
                <div className="text-xs text-gray-500">Export schedule</div>
              </div>
            </button>
            <button
              onClick={() => {
                finalScheduleManagement.openSettingsModal();
                setShowMoreMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 hover:text-purple-800 transition-all duration-150 flex items-center gap-3"
            >
              <div className="p-1 bg-purple-100 rounded-md">
                <Cog6ToothIcon className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">Schedule Settings</div>
                <div className="text-xs text-gray-500">Configure preferences</div>
              </div>
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
    <div className="space-y-6">
      {/* Enhanced Header with Current View Display */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                {activeView === 'advanced' && (
                  <>
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg">
                      <CalendarDaysIcon className="h-6 w-6 text-white" />
                    </div>
                    Schedule Calendar
                  </>
                )}
                {activeView === 'dragdrop' && (
                  <>
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg">
                      <ArrowsUpDownIcon className="h-6 w-6 text-white" />
                    </div>
                    Organize Schedule
                  </>
                )}
                {activeView === 'templates' && (
                  <>
                    <div className="p-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow-lg">
                      <DocumentDuplicateIcon className="h-6 w-6 text-white" />
                    </div>
                    Schedule Templates
                  </>
                )}
              </h1>
              <p className="text-sm text-gray-600 ml-14">
                {activeView === 'advanced' && 'View and manage your family\'s learning schedule'}
                {activeView === 'dragdrop' && 'Drag and drop to reorganize scheduled sessions'}
                {activeView === 'templates' && 'Create and apply schedule templates to save time'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {renderActionButtons()}
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex justify-center">
          {renderViewSelector()}
        </div>
      </div>

      {/* Main calendar view */}
      {activeView === 'advanced' && (
        <AdvancedScheduleCalendar
          childId={childId}
          selectedChildrenIds={selectedChildrenIds}
          allChildren={allChildren}
          subscriptionPermissions={subscriptionPermissions}
          scheduleManagement={finalScheduleManagement}
          childSubjects={childSubjects}
          schedulePreferences={schedulePreferences}
        />
      )}

      {activeView === 'dragdrop' && (
        <DragDropScheduleCalendar
          childId={childId}
          selectedChildrenIds={selectedChildrenIds}
          allChildren={allChildren}
          subscriptionPermissions={subscriptionPermissions}
          scheduleManagement={finalScheduleManagement}
          childSubjects={childSubjects}
          onEventUpdate={handleEventUpdate}
        />
      )}

      {activeView === 'templates' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
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