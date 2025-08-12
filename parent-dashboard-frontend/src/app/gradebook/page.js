'use client';
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

// Hooks
import { useSubscription } from "../../hooks/useSubscription";
import { useChildrenData } from "../../hooks/useChildrenData";
import { useGradebookData } from "../../hooks/useGradebookData";
import { useModalManagement } from "../../hooks/useModalManagement";
import { useToast } from "../../hooks/useToast";

// Components
import StudentSidebar from "../dashboard/components/StudentSidebar";
import GradebookOverview from "./components/GradebookOverview";
import GradeInputModal from "../dashboard/components/GradeInputModal";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import {
  AcademicCapIcon,
  HomeIcon,
  CalendarDaysIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

export default function GradebookPage() {
  const session = useSession();
  const router = useRouter();

  // Active tab state
  const [activeTab, setActiveTab] = useState('subject-overview'); // 'subject-overview', 'needs-grading', or 'grade-details'

  // Use existing hooks
  const {
    subscription,
    loading: subscriptionLoading,
    permissions: subscriptionPermissions
  } = useSubscription();

  const childrenData = useChildrenData(session);
  const modalManagement = useModalManagement();
  const { showSuccess, showError } = useToast();

  // Use gradebook data hook - only for the currently selected child
  const gradebookData = useGradebookData(
    childrenData.selectedChild ? [childrenData.selectedChild.id] : [],
    childrenData
  );

  // Redirect to login if no session
  useEffect(() => {
    if (session === false) {
      router.replace("/login");
    }
  }, [session, router]);

  // Auto-refresh child data when entering gradebook page
  useEffect(() => {
    const refreshDataOnEntry = async () => {
      if (session && childrenData.selectedChild?.id && !childrenData.loadingInitial) {
        // Invalidate cache and refresh child data to ensure fresh data
        childrenData.invalidateChildCache(childrenData.selectedChild.id);
        await childrenData.refreshChildSpecificData(true);

        // Small delay to ensure data is loaded before processing gradebook
        setTimeout(() => {
          gradebookData.refreshGradebookData();
        }, 200);
      }
    };

    refreshDataOnEntry();
  }, [session, childrenData.selectedChild?.id]); // Only run when session is ready and child is selected

  // Handle child selection change from sidebar
  const handleChildSelectionChange = async (child) => {
    childrenData.setSelectedChild(child);

    // Automatically refresh child data when switching in gradebook
    if (child?.id) {
      childrenData.invalidateChildCache(child.id);
      await childrenData.refreshChildSpecificData(true);

      // Give a small delay and refresh gradebook data
      setTimeout(() => {
        gradebookData.refreshGradebookData();
      }, 100);
    }
  };

  // Handle grade submission
  const handleGradeSubmit = async (gradeData) => {
    modalManagement.setIsSubmittingGrade(true);
    try {
      await gradebookData.updateGrade(modalManagement.gradingLesson.id, gradeData);
      showSuccess('Grade saved successfully');
      modalManagement.closeGradeModal();

      // Refresh the children data to get updated grades
      if (childrenData.selectedChild?.id) {
        childrenData.invalidateChildCache(childrenData.selectedChild.id);
        await childrenData.refreshChildSpecificData(true);

        // Manually refresh gradebook data after children data is updated
        setTimeout(() => {
          gradebookData.refreshGradebookData();
        }, 200); // Small delay to ensure children data is fully updated
      }
    } catch (error) {
      showError('Failed to save grade');
    } finally {
      modalManagement.setIsSubmittingGrade(false);
    }
  };

  // Loading state
  const isLoading = session === undefined || subscriptionLoading ||
    (childrenData.loadingInitial && childrenData.children.length === 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-main">
        <div className="text-xl text-text-secondary">Loading Gradebook...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-screen bg-background-main overflow-hidden">
      {/* Sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0 bg-background-card border-r border-border-subtle shadow-lg">
        <StudentSidebar
          childrenList={childrenData.children}
          selectedChild={childrenData.selectedChild}
          onSelectChild={handleChildSelectionChange}
          showAddChild={childrenData.showAddChild}
          onToggleShowAddChild={childrenData.setShowAddChild}
          newChildName={childrenData.newChildName}
          onNewChildNameChange={(e) => childrenData.setNewChildName(e.target.value)}
          newChildGrade={childrenData.newChildGrade}
          onNewChildGradeChange={(e) => childrenData.setNewChildGrade(e.target.value)}
          onAddChildSubmit={() => {}} // Handle in dashboard
          onOpenChildLoginSettings={() => {}} // Handle in dashboard
          onDeleteChild={() => {}} // Handle in dashboard
          subscription={subscription}
          canAddChild={subscriptionPermissions.maxChildren > childrenData.children.length}
          onUpgradeNeeded={() => {}}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <AcademicCapIcon className="h-7 w-7 text-blue-600" />
                  Gradebook
                  {childrenData.selectedChild && (
                    <span className="text-lg text-gray-600 font-normal">
                      - {childrenData.selectedChild.name}
                    </span>
                  )}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {childrenData.selectedChild
                    ? `Manage grades and track progress for ${childrenData.selectedChild.name}`
                    : "Select a student from the sidebar to view their grades"
                  }
                </p>
              </div>
            </div>

          </div>

          {/* Breadcrumbs */}
          <div className="mt-4">
            <Breadcrumbs
              items={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Gradebook" },
                ...(childrenData.selectedChild ? [{ label: childrenData.selectedChild.name }] : [])
              ]}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('subject-overview')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'subject-overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Subject Overview
            </button>
            <button
              onClick={() => setActiveTab('needs-grading')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'needs-grading'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Needs Grading
              {gradebookData.stats.needsGradingCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                  {gradebookData.stats.needsGradingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('grade-details')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'grade-details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Grade Details
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          {childrenData.children.length === 0 ? (
            <div className="text-center py-12">
              <AcademicCapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
              <p className="text-gray-500 mb-4">Add a student to start tracking grades.</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          ) : !childrenData.selectedChild ? (
            <div className="text-center py-12">
              <AcademicCapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Student</h3>
              <p className="text-gray-500 mb-4">Choose a student from the sidebar to view their grades and assignments.</p>
            </div>
          ) : (
            <GradebookOverview
              activeTab={activeTab}
              selectedChild={childrenData.selectedChild}
              childrenData={childrenData}
              gradebookData={gradebookData}
              onOpenGradeModal={modalManagement.openGradeModal}
              onRefresh={() => gradebookData.refreshGradebookData()}
            />
          )}
        </div>
      </div>

      {/* Grade Input Modal */}
      {modalManagement.showGradeModal && (
        <GradeInputModal
          isOpen={modalManagement.showGradeModal}
          onClose={modalManagement.closeGradeModal}
          onSubmit={handleGradeSubmit}
          lesson={modalManagement.gradingLesson}
          isLoading={modalManagement.isSubmittingGrade}
        />
      )}
    </div>
  );
}
