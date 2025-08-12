'use client';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import GradebookNeedsGrading from './GradebookNeedsGrading';
import GradebookGradeTable from './GradebookGradeTable';
import SubjectGradesOverview from './SubjectGradesOverview';
import GradeDistributionCharts from './GradeDistributionCharts';
import api from '../../../utils/api';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckIcon,
  ChartBarIcon,
  PresentationChartLineIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

export default function GradebookOverview({
  activeTab,
  selectedChild,
  childrenData,
  gradebookData,
  onOpenGradeModal,
  onRefresh
}) {
  const [customCategories, setCustomCategories] = useState([]);

  // Get subjects for the selected child
  const availableSubjects = useMemo(() => {
    if (!selectedChild) return [];

    const childSubjects = childrenData.childSubjects[selectedChild.id] || [];
    return childSubjects.map(subject => ({
      id: subject.child_subject_id,
      name: subject.name
    }));
  }, [selectedChild, childrenData.childSubjects]);

  // Fetch custom categories for all child's subjects
  const fetchCustomCategories = useCallback(async () => {
    if (!selectedChild || availableSubjects.length === 0) {
      setCustomCategories([]);
      return;
    }

    try {
      // Fetch custom categories for all subjects and merge them
      const categoryPromises = availableSubjects.map(subject =>
        api.get(`/custom-categories/${subject.id}`).catch(() => ({ data: [] }))
      );

      const categoryResponses = await Promise.all(categoryPromises);
      const allCategories = categoryResponses.reduce((acc, response) => {
        return acc.concat(response.data || []);
      }, []);

      // Remove duplicates based on category name and id
      const uniqueCategories = allCategories.filter((category, index, self) =>
        index === self.findIndex(c => c.id === category.id)
      );

      setCustomCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching custom categories:', error);
      setCustomCategories([]);
    }
  }, [selectedChild, availableSubjects]);

  useEffect(() => {
    fetchCustomCategories();
  }, [fetchCustomCategories]);

  // Content types for filtering (including custom categories)
  const contentTypes = useMemo(() => {
    const baseTypes = [
      { value: 'all', label: 'All Types' },
      { value: 'test', label: 'Tests' },
      { value: 'quiz', label: 'Quizzes' },
      { value: 'assignment', label: 'Assignments' },
      { value: 'worksheet', label: 'Worksheets' },
      { value: 'review', label: 'Reviews' }
    ];

    // Add custom categories to the list
    const customTypes = customCategories.map(category => ({
      value: `custom_${category.id}`,
      label: category.category_name
    }));

    return [...baseTypes, ...customTypes];
  }, [customCategories]);

  return (
    <div className="space-y-6">
      {/* Filters and Actions Bar - only show for needs-grading and grade-details tabs */}
      {activeTab !== 'subject-overview' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={gradebookData.searchTerm}
                  onChange={(e) => gradebookData.setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

          {/* Subject Filter */}
          <div className="w-full lg:w-48">
            <select
              value={gradebookData.subjectFilter}
              onChange={(e) => gradebookData.setSubjectFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Content Type Filter */}
          <div className="w-full lg:w-48">
            <select
              value={gradebookData.contentTypeFilter}
              onChange={(e) => gradebookData.setContentTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {contentTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              disabled={gradebookData.refreshing}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              title="Refresh data"
            >
              <ArrowPathIcon className={`h-5 w-5 text-gray-600 ${gradebookData.refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {activeTab === 'grade-overview' && (
              <button
                onClick={gradebookData.exportToCSV}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                title="Export to CSV"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Date Range Filter (Optional) */}
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={gradebookData.dateRange.start ? gradebookData.dateRange.start.toISOString().split('T')[0] : ''}
              onChange={(e) => gradebookData.setDateRange(prev => ({
                ...prev,
                start: e.target.value ? new Date(e.target.value) : null
              }))}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={gradebookData.dateRange.end ? gradebookData.dateRange.end.toISOString().split('T')[0] : ''}
              onChange={(e) => gradebookData.setDateRange(prev => ({
                ...prev,
                end: e.target.value ? new Date(e.target.value) : null
              }))}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {(gradebookData.dateRange.start || gradebookData.dateRange.end) && (
            <button
              onClick={() => gradebookData.setDateRange({ start: null, end: null })}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>
      )}

      {/* Error State */}
      {gradebookData.error ? (
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Data Loading Error</h3>
          <p className="text-gray-500 mb-4">{gradebookData.error}</p>
          <button
            onClick={() => onRefresh()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : gradebookData.loading || childrenData.loadingChildData ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 mb-2">
            {childrenData.loadingChildData ? "Loading student data..." : "Processing gradebook data..."}
          </p>
          <p className="text-sm text-gray-400">
            Please wait while we gather the latest information
          </p>
        </div>
      ) : (
        <>
          {activeTab === 'subject-overview' ? (
            <div className="space-y-8">
              {/* Subject Performance Cards Only */}
              <SubjectGradesOverview
                allGrades={gradebookData.allGrades}
                selectedChild={selectedChild}
                customCategories={customCategories}
              />

              {/* Needs Grading Section - Always visible with better layout */}
              {gradebookData.needsGradingItems.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <span>Items Needing Grades</span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                        {gradebookData.needsGradingItems.length}
                      </span>
                    </h3>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                    <GradebookNeedsGrading
                      needsGradingItems={gradebookData.needsGradingItems}
                      onOpenGradeModal={onOpenGradeModal}
                      loading={gradebookData.refreshing}
                      customCategories={customCategories}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'needs-grading' ? (
            <GradebookNeedsGrading
              needsGradingItems={gradebookData.needsGradingItems}
              onOpenGradeModal={onOpenGradeModal}
              loading={gradebookData.refreshing}
              customCategories={customCategories}
            />
          ) : (
            <GradebookGradeTable
              allGrades={gradebookData.allGrades}
              childrenList={[selectedChild]}
              loading={gradebookData.refreshing}
              customCategories={customCategories}
            />
          )}
        </>
      )}
    </div>
  );
}
