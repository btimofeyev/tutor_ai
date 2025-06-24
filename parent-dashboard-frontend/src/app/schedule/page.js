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
import { useScheduleManagement } from "../../hooks/useScheduleManagement";
import { useMultiChildScheduleManagement } from "../../hooks/useMultiChildScheduleManagement";
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function SchedulePage() {
  const session = useSession();
  const router = useRouter();

  // Multi-child selection state
  const [selectedChildrenIds, setSelectedChildrenIds] = useState([]);

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
  }, [childrenData.children.length]);

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
    const result = await scheduleManagement.updateSchedulePreferences(preferencesData);
    return result;
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


  // Get assigned subjects for the current child
  const assignedSubjectsForCurrentChild = childrenData.selectedChild 
    ? childrenData.childSubjects[childrenData.selectedChild.id] || []
    : [];

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
              {/* Clean Schedule Header */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h1 className="text-xl font-semibold text-text-primary">
                    Schedule
                  </h1>
                  <div className="flex items-center gap-2">
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
                  childSubjects={assignedSubjectsForCurrentChild}
                  schedulePreferences={scheduleManagement.schedulePreferences}
                  scheduleManagement={scheduleManagement}
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
        childSubjects={assignedSubjectsForCurrentChild}
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
        childSubjects={assignedSubjectsForCurrentChild}
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
        schedulePreferences={scheduleManagement.schedulePreferences}
        childName={childrenData.selectedChild?.name}
        isSaving={scheduleManagement.loading}
      />

    </div>
  );
}