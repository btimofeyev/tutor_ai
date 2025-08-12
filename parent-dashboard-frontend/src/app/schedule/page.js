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
import SmartScheduler from "./components/SmartScheduler";
import ScheduleSettingsModal from "./components/ScheduleSettingsModal";
import CreateScheduleEntryModal from "./components/CreateScheduleEntryModal";
import EditScheduleEntryModal from "./components/EditScheduleEntryModal";
import DurationPicker from "./components/DurationPicker";
// import AIScheduleConfigModal from "./components/AIScheduleConfigModal"; // DISABLED
import { useScheduleManagement } from "../../hooks/useScheduleManagement";
import { useMultiChildScheduleManagement } from "../../hooks/useMultiChildScheduleManagement";
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import Breadcrumbs from "../../components/ui/Breadcrumbs";

export default function SchedulePage() {
  const session = useSession();
  const router = useRouter();

  // Multi-child selection state
  const [selectedChildrenIds, setSelectedChildrenIds] = useState([]);

  // Sidebar visibility state
  const [showSubjectsSidebar, setShowSubjectsSidebar] = useState(true);

  // Selected lesson container for scheduling
  const [selectedLessonContainer, setSelectedLessonContainer] = useState(null);

  // Duration picker state
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [pendingSchedule, setPendingSchedule] = useState(null);

  // AI Schedule Modal state - DISABLED
  // const [showAIScheduleModal, setShowAIScheduleModal] = useState(false);

  // UI density: 'comfortable' | 'compact'
  const [density, setDensity] = useState('comfortable');

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
      // Force refresh of preferences and schedule data
      if (result.success) {
        // Wait a moment for the backend to process
        setTimeout(() => {
          multiChildScheduleManagement.refresh();
        }, 100);
      }
      return result;
    } else {
      const result = await singleChildScheduleManagement.updateSchedulePreferences(preferencesData);
      // Force refresh of preferences and schedule data
      if (result.success) {
        // Wait a moment for the backend to process
        setTimeout(() => {
          singleChildScheduleManagement.refresh();
        }, 100);
      }
      return result;
    }
  };

  // Handle lesson container selection from sidebar
  const handleLessonContainerSelect = (lessonContainer, subject) => {
    setSelectedLessonContainer({ lessonContainer, subject });
  };

  // Handle calendar slot click when lesson container is selected
  const handleCalendarSlotClick = async (dayStr, timeStr) => {
    if (!selectedLessonContainer) return;

    // Store the pending schedule info and show duration picker
    setPendingSchedule({
      dayStr,
      timeStr,
      lessonContainer: selectedLessonContainer
    });
    setShowDurationPicker(true);
  };

  // Handle duration confirmation from picker
  const handleDurationConfirm = async (duration) => {
    if (!pendingSchedule) return;

    try {
      // Create schedule entry data
      const entryData = {
        subject_name: pendingSchedule.lessonContainer.subject.custom_subject_name_override || pendingSchedule.lessonContainer.subject.name,
        scheduled_date: pendingSchedule.dayStr,
        start_time: pendingSchedule.timeStr,
        duration_minutes: duration,
        status: 'scheduled',
        created_by: 'parent',
        lesson_container_id: pendingSchedule.lessonContainer.lessonContainer.id,
        notes: JSON.stringify({
          lesson_container_id: pendingSchedule.lessonContainer.lessonContainer.id,
          lesson_container_title: pendingSchedule.lessonContainer.lessonContainer.title,
          total_materials: pendingSchedule.lessonContainer.lessonContainer.totalMaterials,
          completed_materials: pendingSchedule.lessonContainer.lessonContainer.completedMaterials,
          progress_percentage: pendingSchedule.lessonContainer.lessonContainer.progressPercentage,
          created_from_click: true,
          type: 'lesson_container'
        })
      };

      const result = await handleCreateEntry(entryData, childrenData.selectedChild?.id);

      if (result) {
        // Clear states after successful scheduling
        setSelectedLessonContainer(null);
        setShowDurationPicker(false);
        setPendingSchedule(null);
      }
    } catch (error) {
      console.error('Failed to create schedule entry from click:', error);
      alert('Failed to schedule the lesson. Please try again.');
    }
  };

  // Handle duration picker cancel
  const handleDurationCancel = () => {
    setShowDurationPicker(false);
    setPendingSchedule(null);
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

  // Handle opening AI Schedule configuration modal - DISABLED
  // const handleOpenAIScheduleModal = () => {
  //   setShowAIScheduleModal(true);
  // };

  // Handle AI schedule generation with configuration - DISABLED
  // const handleGenerateAIScheduleWithConfig = async (schedulingConfig) => {
  //   // AI scheduling functionality disabled
  // };

  // Legacy function for compatibility - DISABLED
  // const handleGenerateAISchedule = async (customStartDate = null) => {
  //   // AI scheduling functionality disabled
  // };

  // Get assigned subjects for the current child or all selected children
  const assignedSubjectsForCurrentChild = childrenData.selectedChild
    ? childrenData.childSubjects[childrenData.selectedChild.id] || []
    : [];

  // Debug: Log current preferences being passed to calendar
  const currentPreferences = selectedChildrenIds.length >= 1
    ? (multiChildScheduleManagement.schedulePreferences[childrenData.selectedChild?.id] || multiChildScheduleManagement.schedulePreferences[selectedChildrenIds[0]] || {})
    : singleChildScheduleManagement.schedulePreferences;
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Clean Sidebar */}
      <div className="w-52 flex-shrink-0 bg-white border-r border-gray-200 shadow-sm h-full">
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
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {!childrenData.selectedChild ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-4xl mb-4">📅</div>
              <div className="text-gray-600 text-lg font-medium">
                {childrenData.children.length > 0
                  ? "Select a student to view their schedule"
                  : "No students found. Please add a student to begin"}
              </div>
            </div>
          </div>
        ) : (
          <SmartScheduler
            childId={selectedChildrenIds.length >= 1 ? selectedChildrenIds[0] : childrenData.selectedChild?.id}
            selectedChildrenIds={selectedChildrenIds}
            allChildren={childrenData.children}
            subscriptionPermissions={subscriptionPermissions}
            scheduleManagement={scheduleManagement}
            childSubjects={allSubjectsForSelectedChildren}
            schedulePreferences={currentPreferences}
            onGenerateAISchedule={null}
            selectedLessonContainer={selectedLessonContainer}
            onCalendarSlotClick={handleCalendarSlotClick}
            density={density}
            lessonsBySubject={childrenData.lessonsBySubject}
            unitsBySubject={childrenData.unitsBySubject}
            lessonsByUnit={childrenData.lessonsByUnit}
          />
        )}
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
        schedulePreferences={currentPreferences}
        childName={childrenData.selectedChild?.name}
        childSubjects={allSubjectsForSelectedChildren}
        isSaving={scheduleManagement.loading}
      />

      {/* AI Schedule Configuration Modal - DISABLED */}
      {/* <AIScheduleConfigModal
        isOpen={showAIScheduleModal}
        onClose={() => setShowAIScheduleModal(false)}
        onGenerate={handleGenerateAIScheduleWithConfig}
        childSubjects={allSubjectsForSelectedChildren}
        selectedChildrenIds={selectedChildrenIds}
        allChildren={childrenData.children}
        isGenerating={scheduleManagement.loading}
      /> */}

      {/* Duration Picker Modal */}
      {showDurationPicker && pendingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <DurationPicker
            lessonTitle={pendingSchedule.lessonContainer.lessonContainer.title}
            onDurationChange={() => {}}
            onConfirm={handleDurationConfirm}
            onCancel={handleDurationCancel}
            initialDuration={30}
          />
        </div>
      )}

    </div>
  );
}
