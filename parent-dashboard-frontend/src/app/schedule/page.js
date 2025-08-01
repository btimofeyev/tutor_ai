// app/schedule/page.js
"use client";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Import existing hooks and components
import { useSubscription } from "../../hooks/useSubscription";
import { useChildrenData } from "../../hooks/useChildrenData";
import StudentSidebar from "../dashboard/components/StudentSidebar";
import StudentHeader from "../dashboard/components/StudentHeader";

// Schedule-specific components
import ScheduleCalendar from "./components/ScheduleCalendar";
import EnhancedScheduleManager from "./components/EnhancedScheduleManager";
import ScheduleSettingsModal from "./components/ScheduleSettingsModal";
import CreateScheduleEntryModal from "./components/CreateScheduleEntryModal";
import EditScheduleEntryModal from "./components/EditScheduleEntryModal";
import AIScheduleConfigModal from "./components/AIScheduleConfigModal";
import { useScheduleManagement } from "../../hooks/useScheduleManagement";
import { useMultiChildScheduleManagement } from "../../hooks/useMultiChildScheduleManagement";
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import Breadcrumbs from "../../components/ui/Breadcrumbs";

export default function SchedulePage() {
  const session = useSession();
  const router = useRouter();

  // Multi-child selection state
  const [selectedChildrenIds, setSelectedChildrenIds] = useState([]);
  
  // AI Schedule Modal state
  const [showAIScheduleModal, setShowAIScheduleModal] = useState(false);

  // Use existing hooks for consistency
  const {
    subscription,
    loading: subscriptionLoading,
    permissions: subscriptionPermissions
  } = useSubscription();

  const childrenData = useChildrenData(session, subscription, subscriptionPermissions);

  // Schedule management - use multi-child when multiple children selected
  const singleChildScheduleManagement = useScheduleManagement(
    childrenData.selectedChild?.id, 
    subscriptionPermissions
  );

  const multiChildScheduleManagement = useMultiChildScheduleManagement(
    selectedChildrenIds,
    subscriptionPermissions,
    childrenData.children
  );

  // Always use multi-child management when using checkboxes, even for single child
  const scheduleManagement = selectedChildrenIds.length >= 1 
    ? multiChildScheduleManagement 
    : singleChildScheduleManagement;

  // Helper function to safely get entries count
  const getTotalEntriesCount = () => {
    if (selectedChildrenIds.length >= 1) {
      const allEntries = multiChildScheduleManagement.allScheduleEntries || {};
      return Object.values(allEntries).flat().length;
    } else {
      return (singleChildScheduleManagement.scheduleEntries || []).length;
    }
  };

  // Initialize with ALL children by default when children data loads
  useEffect(() => {
    if (childrenData.children.length > 0 && selectedChildrenIds.length === 0) {
      // Default to showing ALL children's schedules
      setSelectedChildrenIds(childrenData.children.map(child => child.id));
    }
  }, [childrenData.children, selectedChildrenIds.length]);

  // Redirect to login if no session
  useEffect(() => {
    if (session === false) {
      router.replace("/login");
    }
  }, [session, router]);

  // Loading state
  const isLoading = session === undefined || subscriptionLoading || (childrenData.loadingInitial && childrenData.children.length === 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-main">
        <div className="text-xl text-text-secondary">Loading Schedule...</div>
      </div>
    );
  }

  if (!session) return null;

  // Handle creating new schedule entries
  const handleCreateEntry = async (entryData, targetChildId) => {
    const isMultiChild = selectedChildrenIds.length >= 1;
    
    if (isMultiChild) {
      const result = await multiChildScheduleManagement.createScheduleEntry(entryData, targetChildId);
      return result;
    } else {
      const result = await singleChildScheduleManagement.createScheduleEntry(entryData);
      return result;
    }
  };

  // Handle updating schedule entries
  const handleUpdateEntry = async (entryId, updateData) => {
    const result = await scheduleManagement.updateScheduleEntry(entryId, updateData);
    return result;
  };

  // Handle deleting schedule entries
  const handleDeleteEntry = async (entryId) => {
    const result = await scheduleManagement.deleteScheduleEntry(entryId);
    return result;
  };

  // Handle saving schedule preferences
  const handleSavePreferences = async (preferencesData) => {
    const isMultiChild = selectedChildrenIds.length >= 1;
    
    if (isMultiChild) {
      // For multi-child, we need to determine which child to save preferences for
      // For now, we'll save to the first selected child or the currently selected child
      const targetChildId = childrenData.selectedChild?.id || selectedChildrenIds[0];
      const result = await multiChildScheduleManagement.updateSchedulePreferences(preferencesData, targetChildId);
      return result;
    } else {
      const result = await singleChildScheduleManagement.updateSchedulePreferences(preferencesData);
      return result;
    }
  };

  // Handle clearing entire schedule
  const handleClearSchedule = async () => {
    const isMultiChild = selectedChildrenIds.length >= 1;
    const confirmMessage = isMultiChild 
      ? 'Are you sure you want to delete all scheduled entries for the selected children? This action cannot be undone.'
      : 'Are you sure you want to delete all scheduled entries? This action cannot be undone.';
    
    if (window.confirm(confirmMessage)) {
      if (isMultiChild) {
        // Clear entries for all selected children
        const allEntries = multiChildScheduleManagement.allScheduleEntries || {};
        for (const [childId, entries] of Object.entries(allEntries)) {
          for (const entry of (entries || [])) {
            await multiChildScheduleManagement.deleteScheduleEntry(entry.id, childId);
          }
        }
      } else {
        // Clear entries for single child
        const entries = singleChildScheduleManagement.scheduleEntries || [];
        for (const entry of entries) {
          await singleChildScheduleManagement.deleteScheduleEntry(entry.id);
        }
      }
    }
  };

  // Get a default start date (current Monday or today if it's a weekday)
  const getDefaultStartDate = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // If it's a weekday, use today; otherwise use next Monday
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return today.toISOString().split('T')[0];
    } else {
      // Calculate next Monday
      const nextMonday = new Date(today);
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      nextMonday.setDate(today.getDate() + daysUntilMonday);
      return nextMonday.toISOString().split('T')[0];
    }
  };

  // Handle opening AI Schedule configuration modal
  const handleOpenAIScheduleModal = () => {
    setShowAIScheduleModal(true);
  };

  // Handle AI schedule generation with configuration
  const handleGenerateAIScheduleWithConfig = async (schedulingConfig) => {
    const isMultiChild = selectedChildrenIds.length >= 1;
    
    // Get current preferences to pass to AI - ensure it's serializable
    const rawPreferences = isMultiChild 
      ? (multiChildScheduleManagement.schedulePreferences[childrenData.selectedChild?.id] || multiChildScheduleManagement.schedulePreferences[selectedChildrenIds[0]] || {})
      : singleChildScheduleManagement.schedulePreferences;
    
    // Merge configuration with existing preferences
    const enhancedPreferences = {
      // Base preferences
      preferred_start_time: rawPreferences?.preferred_start_time || '09:00',
      preferred_end_time: rawPreferences?.preferred_end_time || '15:00',
      max_daily_study_minutes: rawPreferences?.max_daily_study_minutes || 240,
      break_duration_minutes: rawPreferences?.break_duration_minutes || 15,
      difficult_subjects_morning: rawPreferences?.difficult_subjects_morning !== false,
      study_days: rawPreferences?.study_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      
      // AI Configuration from modal
      subject_frequencies: schedulingConfig.subjectFrequencies,
      study_intensity: schedulingConfig.studyIntensity,
      prioritize_urgent: schedulingConfig.prioritizeUrgent,
      difficulty_distribution: schedulingConfig.difficultyDistribution,
      session_length_preference: schedulingConfig.sessionLength,
      coordination_mode: schedulingConfig.coordination,
      ai_reasoning_enabled: true
    };

    try {
      setShowAIScheduleModal(false); // Close modal
      
      const result = isMultiChild 
        ? await multiChildScheduleManagement.generateAISchedule({
            start_date: schedulingConfig.startDate,
            days_to_schedule: schedulingConfig.totalDaysToSchedule,
            preferences: enhancedPreferences
          })
        : await singleChildScheduleManagement.generateAISchedule({
            start_date: schedulingConfig.startDate,
            days_to_schedule: schedulingConfig.totalDaysToSchedule,
            preferences: enhancedPreferences
          });

      if (result.success) {
        alert(result.message || `Successfully created ${result.entriesCreated} AI-generated schedule entries!`);
      } else {
        alert(result.error || 'Failed to generate AI schedule. Please try again.');
      }
    } catch (error) {
      console.error('Error generating AI schedule:', error.message || error);
      alert(`Failed to generate AI schedule: ${error.message || 'Please check your materials and preferences.'}`);
    }
  };

  // Legacy function for compatibility (now opens modal)
  const handleGenerateAISchedule = async (customStartDate = null) => {
    handleOpenAIScheduleModal();
  };


  // Get assigned subjects for the current child or all selected children
  const assignedSubjectsForCurrentChild = childrenData.selectedChild 
    ? childrenData.childSubjects[childrenData.selectedChild.id] || []
    : [];

  // Get all subjects for selected children (for AI scheduling)
  const allSubjectsForSelectedChildren = selectedChildrenIds.length >= 1
    ? selectedChildrenIds.reduce((allSubjects, childId) => {
        const childSubjects = childrenData.childSubjects[childId] || [];
        
        // Combine subjects, avoiding duplicates by subject name
        childSubjects.forEach(subject => {
          const subjectName = subject.custom_subject_name_override || subject.name;
          
          if (subjectName && !allSubjects.some(s => 
            (s.custom_subject_name_override || s.name) === subjectName
          )) {
            allSubjects.push(subject);
          }
        });
        return allSubjects;
      }, [])
    : assignedSubjectsForCurrentChild;

  // Get lessons/materials for the current child across all subjects
  const materialsForCurrentChild = childrenData.selectedChild && childrenData.lessonsBySubject
    ? Object.values(childrenData.lessonsBySubject).flat()
    : [];

  return (
    <div className="flex h-screen bg-background-main overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 bg-background-card border-r border-border-subtle shadow-lg">
        <StudentSidebar
          childrenList={childrenData.children}
          selectedChild={childrenData.selectedChild}
          onSelectChild={childrenData.setSelectedChild}
          showAddChild={childrenData.showAddChild}
          onToggleShowAddChild={childrenData.setShowAddChild}
          newChildName={childrenData.newChildName}
          onNewChildNameChange={(e) => childrenData.setNewChildName(e.target.value)}
          newChildGrade={childrenData.newChildGrade}
          onNewChildGradeChange={(e) => childrenData.setNewChildGrade(e.target.value)}
          onAddChildSubmit={() => {}} // Placeholder for now
          onOpenChildLoginSettings={() => {}} // Placeholder for now
          subscription={subscription}
          canAddChild={subscriptionPermissions.maxChildren > childrenData.children.length}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Schedule Content */}
        <div className="flex-1 p-6 overflow-auto">
          {!childrenData.selectedChild ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-text-secondary italic text-xl text-center">
                {childrenData.children.length > 0
                  ? "Select a student to view their schedule."
                  : "No students found. Please add a student to begin."}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Breadcrumbs */}
              <Breadcrumbs 
                items={[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Schedule" }
                ]}
              />
              
              {/* Clean Schedule Header */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h1 className="text-xl font-semibold text-text-primary">
                    {childrenData.selectedChild?.name}&apos;s Schedule
                  </h1>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenAIScheduleModal()}
                      className="btn-primary"
                      disabled={scheduleManagement.loading}
                    >
                      {scheduleManagement.loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Generating...
                        </>
                      ) : (
                        <>🧠 Configure AI Schedule</>
                      )}
                    </button>
                    
                    <button 
                      onClick={scheduleManagement.openSettingsModal}
                      className="btn-secondary"
                    >
                      <Cog6ToothIcon className="h-4 w-4" />
                      Settings
                    </button>
                    
                    {getTotalEntriesCount() > 0 && (
                      <button 
                        onClick={handleClearSchedule}
                        className="btn-secondary"
                      >
                        Clear All
                      </button>
                    )}
                    
                  </div>
                </div>

                {/* Child Schedule Filter */}
                {childrenData.children.length > 1 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm font-medium text-gray-600 self-center mr-2">Show schedules for:</span>
                        {childrenData.children.map((child) => (
                          <label key={child.id} className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedChildrenIds.includes(child.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedChildrenIds(prev => [...prev, child.id]);
                                } else {
                                  setSelectedChildrenIds(prev => prev.filter(id => id !== child.id));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">{child.name}</span>
                            <span className="text-xs text-gray-400">G{child.grade}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSelectedChildrenIds(childrenData.children.map(c => c.id))}
                          className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          Show All
                        </button>
                        <button
                          onClick={() => setSelectedChildrenIds([])}
                          className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                        >
                          Hide All
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Calendar View */}
              <div className="bg-background-card rounded-xl shadow-sm">
                <EnhancedScheduleManager 
                  childId={selectedChildrenIds.length >= 1 ? selectedChildrenIds[0] : childrenData.selectedChild?.id}
                  selectedChildrenIds={selectedChildrenIds}
                  allChildren={childrenData.children}
                  subscriptionPermissions={subscriptionPermissions}
                  childSubjects={allSubjectsForSelectedChildren}
                  schedulePreferences={scheduleManagement.schedulePreferences}
                  scheduleManagement={scheduleManagement}
                  onGenerateAISchedule={handleGenerateAISchedule}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Schedule Entry Modal */}
      <CreateScheduleEntryModal
        isOpen={scheduleManagement.showCreateModal}
        onClose={scheduleManagement.closeCreateModal}
        onSave={handleCreateEntry}
        selectedSlot={scheduleManagement.editingEntry}
        childSubjects={allSubjectsForSelectedChildren}
        materials={materialsForCurrentChild}
        lessonsBySubject={childrenData.lessonsBySubject}
        unitsBySubject={childrenData.unitsBySubject}
        lessonsByUnit={childrenData.lessonsByUnit}
        isSaving={scheduleManagement.loading}
        selectedChildrenIds={selectedChildrenIds}
        allChildren={childrenData.children}
        calendarEvents={selectedChildrenIds.length >= 1 ? multiChildScheduleManagement.calendarEvents : singleChildScheduleManagement.calendarEvents}
      />

      {/* Edit Schedule Entry Modal */}
      <EditScheduleEntryModal
        isOpen={scheduleManagement.showEditModal}
        onClose={scheduleManagement.closeEditModal}
        onSave={handleUpdateEntry}
        onDelete={handleDeleteEntry}
        scheduleEntry={scheduleManagement.editingEntry}
        childSubjects={allSubjectsForSelectedChildren}
        materials={materialsForCurrentChild}
        lessonsBySubject={childrenData.lessonsBySubject}
        unitsBySubject={childrenData.unitsBySubject}
        lessonsByUnit={childrenData.lessonsByUnit}
        isSaving={scheduleManagement.loading}
      />

      {/* Schedule Settings Modal */}
      <ScheduleSettingsModal
        isOpen={scheduleManagement.showSettingsModal}
        onClose={scheduleManagement.closeSettingsModal}
        onSave={handleSavePreferences}
        schedulePreferences={
          selectedChildrenIds.length >= 1 
            ? (multiChildScheduleManagement.schedulePreferences[childrenData.selectedChild?.id] || multiChildScheduleManagement.schedulePreferences[selectedChildrenIds[0]] || {})
            : singleChildScheduleManagement.schedulePreferences
        }
        childName={childrenData.selectedChild?.name}
        childSubjects={allSubjectsForSelectedChildren}
        isSaving={scheduleManagement.loading}
      />

      {/* AI Schedule Configuration Modal */}
      <AIScheduleConfigModal
        isOpen={showAIScheduleModal}
        onClose={() => setShowAIScheduleModal(false)}
        onGenerate={handleGenerateAIScheduleWithConfig}
        childSubjects={allSubjectsForSelectedChildren}
        selectedChildrenIds={selectedChildrenIds}
        allChildren={childrenData.children}
        isGenerating={scheduleManagement.loading}
      />

    </div>
  );
}