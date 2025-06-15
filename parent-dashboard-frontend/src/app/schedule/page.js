// app/schedule/page.js
"use client";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Import existing hooks and components
import { useSubscription } from "../../hooks/useSubscription";
import { useChildrenData } from "../../hooks/useChildrenData";
import StudentSidebar from "../dashboard/components/StudentSidebar";
import StudentHeader from "../dashboard/components/StudentHeader";

// Schedule-specific components
import ScheduleCalendar from "./components/ScheduleCalendar";
import ScheduleSettingsModal from "./components/ScheduleSettingsModal";
import CreateScheduleEntryModal from "./components/CreateScheduleEntryModal";
import EditScheduleEntryModal from "./components/EditScheduleEntryModal";
import AIScheduleModal from "./components/AIScheduleModal";
import { useScheduleManagement } from "../../hooks/useScheduleManagement";

export default function SchedulePage() {
  const session = useSession();
  const router = useRouter();

  // Use existing hooks for consistency
  const {
    subscription,
    loading: subscriptionLoading,
    permissions: subscriptionPermissions
  } = useSubscription();

  const childrenData = useChildrenData(session, subscription, subscriptionPermissions);

  // Schedule management for the selected child
  const scheduleManagement = useScheduleManagement(
    childrenData.selectedChild?.id, 
    subscriptionPermissions
  );

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
  const handleCreateEntry = async (entryData) => {
    const result = await scheduleManagement.createScheduleEntry(entryData);
    // Don't refresh after saving - the local state is already updated
    return result;
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
        {/* Header */}
        {childrenData.selectedChild && (
          <div className="border-b border-border-subtle bg-background-card">
            <div className="p-6">
              <StudentHeader
                selectedChild={childrenData.selectedChild}
                dashboardStats={{}} // We'll populate this later
              />
            </div>
          </div>
        )}

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
              {/* Schedule Header */}
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-text-primary">
                  📅 Schedule for {childrenData.selectedChild.name}
                </h1>
                <div className="flex gap-2">
                  <button 
                    onClick={scheduleManagement.openSettingsModal}
                    className="btn-secondary"
                  >
                    Settings
                  </button>
                  <button 
                    onClick={scheduleManagement.openAIModal}
                    className="btn-primary"
                  >
                    🤖 AI Schedule
                  </button>
                </div>
              </div>

              {/* Calendar View */}
              <div className="bg-background-card rounded-lg shadow border border-border-subtle">
                <ScheduleCalendar 
                  childId={childrenData.selectedChild.id}
                  subscriptionPermissions={subscriptionPermissions}
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
        isSaving={scheduleManagement.loading}
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

      {/* AI Schedule Modal */}
      <AIScheduleModal
        isOpen={scheduleManagement.showAIModal}
        onClose={scheduleManagement.closeAIModal}
        onGenerateSchedule={scheduleManagement.generateAISchedule}
        onApplySchedule={scheduleManagement.applyAISchedule}
        childId={childrenData.selectedChild?.id}
        childName={childrenData.selectedChild?.name}
        childSubjects={assignedSubjectsForCurrentChild}
        materials={materialsForCurrentChild}
        aiScheduleResults={scheduleManagement.aiScheduleResults}
        isGenerating={scheduleManagement.aiScheduling}
        isApplying={scheduleManagement.loading}
      />
    </div>
  );
}