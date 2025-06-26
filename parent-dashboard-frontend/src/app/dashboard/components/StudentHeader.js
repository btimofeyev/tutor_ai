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
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border-subtle">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-100 p-3 rounded-md">
                    <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
                </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <header className="mb-4 p-4 bg-background-card rounded-lg shadow-sm border border-border-subtle">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div className="mb-2 sm:mb-0">
          <h1 className="text-2xl font-bold text-text-primary">
            {selectedChild.name}
          </h1>
          <div 
            className="text-sm text-text-secondary"
            aria-label={ariaLabels.progress(
              dashboardStats.completedItems,
              dashboardStats.totalItems,
              'assignments'
            )}
          >
            Grade{" "}
            {selectedChild.grade || (
              <span className="italic text-text-tertiary">N/A</span>
            )} • {dashboardStats.totalItems > 0
              ? `${dashboardStats.completedItems}/${dashboardStats.totalItems} completed (${dashboardStats.overallCompletionPercent}%)`
              : "No materials yet."}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div 
            className="grid grid-cols-4 gap-2 text-center"
            role="region"
            aria-label="Dashboard statistics summary"
          >
            {[
              { label: "Total", value: dashboardStats.totalItems, color: "blue", status: "total" },
              { label: "Due Soon", value: dashboardStats.dueSoon, color: "orange", status: "dueSoon" },
              { label: "Overdue", value: dashboardStats.overdue, color: "red", status: "overdue" },
              { label: "Complete", value: `${dashboardStats.overallCompletionPercent}%`, color: "green", status: "complete" },
            ].map(stat => {
              const colors = colorVariants[stat.color] || colorVariants.blue; // fallback to blue
              const statusIcon = colorA11y.statusIcon(stat.status);
              const ariaLabel = `${stat.label}: ${stat.value}${stat.status !== 'total' ? ' items' : ''}`;
              
              return (
                <div 
                  key={stat.label} 
                  className={`p-2 rounded ${colors.bg}`}
                  role="status"
                  aria-label={ariaLabel}
                >
                  <div className={`text-xs ${colors.text} font-medium`}>
                    <span aria-hidden="true">{statusIcon}</span>
                    <span className="ml-1">{stat.label}</span>
                  </div>
                  <div className={`text-lg font-bold ${colors.textBold}`}>
                    {stat.value}
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            href="/subject-management"
            className="flex items-center text-xs px-3 py-2 bg-gray-100 text-text-secondary hover:bg-gray-200 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 focus:ring-offset-background-card"
            aria-label={`Manage subjects for ${selectedChild.name}`}
          >
            <BookOpenIcon className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Manage Subjects
          </Link>
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
