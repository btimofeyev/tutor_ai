// app/dashboard/components/StudentHeader.js
"use client";

import React, { memo } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { BookOpenIcon } from "@heroicons/react/24/outline";
import { ariaLabels, colorA11y } from "../../../utils/accessibility";

// Predefined color variants to ensure Tailwind includes them in the build
const colorVariants = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600', 
    textBold: 'text-blue-700'
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    textBold: 'text-orange-700'
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    textBold: 'text-red-700'
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    textBold: 'text-green-700'
  }
};

const StudentHeader = memo(function StudentHeader({ selectedChild, dashboardStats }) {
  if (!selectedChild) {
    return (
      <div className="mb-6 p-6 bg-background-card rounded-lg shadow-sm border border-border-subtle animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-border-subtle">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-100 p-4 rounded-lg">
                    <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
            ))}
        </div>
      </div>
    );
  }

  // Calculate progress bar width
  const progressPercent = dashboardStats.totalItems > 0 ? dashboardStats.overallCompletionPercent : 0;

  return (
    <header className="mb-6 p-6 bg-background-card rounded-lg shadow-sm border border-border-subtle">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        {/* Student Info Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-3xl font-bold text-text-primary truncate">
              {selectedChild.name}
            </h1>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-200 flex-shrink-0">
              Grade {selectedChild.grade || "N/A"}
            </span>
          </div>

          {/* Progress Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-text-secondary">Learning Progress</span>
              <span className="font-bold text-text-primary">
                {dashboardStats.completedItems} of {dashboardStats.totalItems} assignments completed
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500 ease-in-out"
                style={{ width: `${progressPercent}%` }}
                aria-label={`${progressPercent}% complete`}
              />
            </div>
            
            <div className="text-center">
              <span className="text-2xl font-bold text-green-600">{progressPercent}%</span>
              <span className="text-sm text-text-secondary ml-1">Complete</span>
            </div>
          </div>
        </div>

        {/* Action Items & Quick Stats */}
        <div className="flex flex-col gap-4">
          {/* Action Items - Only show if there are items needing attention */}
          {(dashboardStats.overdue > 0 || dashboardStats.dueSoon > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 min-w-0 lg:min-w-[280px]">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center">
                <span className="mr-2">⚠️</span>
                Needs Attention
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {dashboardStats.overdue > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{dashboardStats.overdue}</div>
                    <div className="text-xs text-red-700 font-medium">Overdue</div>
                  </div>
                )}
                {dashboardStats.dueSoon > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{dashboardStats.dueSoon}</div>
                    <div className="text-xs text-orange-700 font-medium">Due Soon</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 min-w-0 lg:min-w-[200px]">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{dashboardStats.totalItems}</div>
              <div className="text-xs text-blue-700 font-medium">Total Assignments</div>
            </div>
            
            {dashboardStats.totalGradableItems > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {dashboardStats.overallGradePercent > 0 ? `${dashboardStats.overallGradePercent}%` : 'N/A'}
                </div>
                <div className="text-xs text-purple-700 font-medium">Average Grade</div>
              </div>
            )}
          </div>

          {/* Quick Navigation */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/subject-management"
                className="flex items-center text-sm px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={`Manage subjects for ${selectedChild.name}`}
              >
                <BookOpenIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Add Subjects</span>
                <span className="sm:hidden">Subjects</span>
              </Link>
              
              <Link
                href="/schedule"
                className="flex items-center text-sm px-3 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <span className="mr-2">📅</span>
                <span className="hidden sm:inline">View Schedule</span>
                <span className="sm:hidden">Schedule</span>
              </Link>
              
              <Link
                href={`/dashboard/chat-insights`}
                className="flex items-center text-sm px-3 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <span className="mr-2">💬</span>
                <span className="hidden sm:inline">Chat Insights</span>
                <span className="sm:hidden">Insights</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
});

StudentHeader.propTypes = {
  selectedChild: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    grade: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }),
  dashboardStats: PropTypes.shape({
    totalItems: PropTypes.number.isRequired,
    completedItems: PropTypes.number.isRequired,
    overallCompletionPercent: PropTypes.number.isRequired,
    dueSoon: PropTypes.number.isRequired,
    overdue: PropTypes.number.isRequired
  }).isRequired
};

export default StudentHeader;
