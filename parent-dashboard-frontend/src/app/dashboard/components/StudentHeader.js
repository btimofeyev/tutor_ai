// app/dashboard/components/StudentHeader.js
"use client";

import React from "react";
import Link from "next/link";
import { BookOpenIcon } from "@heroicons/react/24/outline";

export default function StudentHeader({ selectedChild, dashboardStats }) {
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
    <div className="mb-6 p-6 bg-background-card rounded-lg shadow-sm border border-border-subtle">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4">
        <div className="mb-3 sm:mb-0">
          <h1 className="text-3xl font-bold text-text-primary mb-0.5">
            {selectedChild.name}
          </h1>
          <div className="text-sm text-text-secondary">
            Grade{" "}
            {selectedChild.grade || (
              <span className="italic text-text-tertiary">N/A</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
          <div className="text-xs text-text-secondary mb-2 self-end">
            {dashboardStats.totalItems > 0
              ? `${dashboardStats.completedItems} / ${dashboardStats.totalItems} items completed (${dashboardStats.overallCompletionPercent}%)`
              : "No materials yet."}
          </div>

          <Link
            href="/subject-management"
            className="flex items-center text-xs px-3 py-1.5 bg-gray-100 text-text-secondary hover:bg-gray-200 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 focus:ring-offset-background-card"
          >
            <BookOpenIcon className="h-4 w-4 mr-1.5" />
            Manage Subjects
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-4 border-t border-border-subtle">
        {[
          { label: "Total Items", value: dashboardStats.totalItems, color: "blue" },
          { label: "Due Soon (7d)", value: dashboardStats.dueSoon, color: "orange" },
          { label: "Overdue", value: dashboardStats.overdue, color: "red" },
          { label: "Completion", value: `${dashboardStats.overallCompletionPercent}%`, color: "green" },
        ].map(stat => (
          <div key={stat.label} className={`p-3 rounded-md bg-${stat.color}-50`}>
            <div className={`text-xs uppercase text-${stat.color}-600 tracking-wider font-semibold`}>
              {stat.label}
            </div>
            <div className={`text-2xl font-bold text-${stat.color}-700 mt-1`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
