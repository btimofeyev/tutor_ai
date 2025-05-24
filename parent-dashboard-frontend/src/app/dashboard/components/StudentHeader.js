// app/dashboard/components/StudentHeader.js
'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpenIcon } from '@heroicons/react/24/outline';

export default function StudentHeader({ selectedChild, dashboardStats }) {
  if (!selectedChild) return (
    <div className="mb-8 p-6 bg-white rounded-2xl shadow-lg border border-gray-100 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );

  return (
    <div className="mb-8 p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4">
        <div className="mb-3 sm:mb-0">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">{selectedChild.name}</h1>
          <div className="text-sm text-gray-500">Grade {selectedChild.grade || <span className="italic text-gray-400">N/A</span>}</div>
        </div>

        <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
            <div className="text-sm text-gray-600 mb-2 self-end">
            {dashboardStats.totalItems > 0 ? 
                `${dashboardStats.completedItems} / ${dashboardStats.totalItems} items completed (${dashboardStats.overallCompletionPercent}%)`
                : "No materials yet."
            }
            </div>
            {/*
              With legacyBehavior, the Link component expects its child to be an <a> tag.
              The <a> tag then receives the href and other props.
              The content of the <a> tag can be complex.
            */}
            <Link href="/subject-management" legacyBehavior passHref>
                <a className="flex items-center text-xs px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                    <BookOpenIcon className="h-4 w-4 mr-1.5" />
                    Manage Subjects
                </a>
            </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-4 border-t border-gray-200">
        <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-xs uppercase text-blue-600 tracking-wider font-semibold">Total Items</div>
            <div className="text-2xl font-bold text-blue-800 mt-1">{dashboardStats.totalItems}</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-xs uppercase text-yellow-600 tracking-wider font-semibold">Due Soon (7d)</div>
            <div className="text-2xl font-bold text-yellow-800 mt-1">{dashboardStats.dueSoon}</div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-xs uppercase text-red-600 tracking-wider font-semibold">Overdue</div>
            <div className="text-2xl font-bold text-red-800 mt-1">{dashboardStats.overdue}</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-xs uppercase text-green-600 tracking-wider font-semibold">Completion</div>
            <div className="text-2xl font-bold text-green-800 mt-1">{dashboardStats.overallCompletionPercent}%</div>
        </div>
      </div>
    </div>
  );
}