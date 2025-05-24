// app/dashboard/components/StudentSidebar.js
'use client'; 
import React from 'react';
import Link from 'next/link';
import { ArrowLeftOnRectangleIcon, UserPlusIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function StudentSidebar({
  childrenList,
  selectedChild,
  onSelectChild,
  showAddChild,
  onToggleShowAddChild,
  newChildName,
  onNewChildNameChange,
  newChildGrade,
  onNewChildGradeChange,
  onAddChildSubmit,
  onOpenChildLoginSettings, // For the cog icon next to each child
}) {
  return (
    <aside className="w-64 bg-white border-r border-gray-100 shadow-lg flex flex-col h-full"> 
      <div className="px-6 pt-8 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">EduNest</h2>
      </div>
      
      <div className="px-6 pt-2 pb-4 border-b border-gray-200 mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Students</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {(childrenList || []).map(child => ( // Added guard for childrenList
          <div key={child.id} className={`group relative rounded-xl mb-2 transition-all duration-150 ease-in-out ${selectedChild?.id === child.id ? 'bg-blue-600 shadow-lg' : 'bg-gray-50 hover:bg-blue-50'}`}>
            <button
              className={`w-full text-left px-4 py-3 
                ${selectedChild?.id === child.id ? 'text-white' : 'text-gray-800 hover:text-blue-700'}`}
              onClick={() => onSelectChild(child)}
            >
              <div className="font-semibold text-sm">{child.name}</div>
              <div className={`text-xs ${selectedChild?.id === child.id ? 'text-blue-200' : 'text-gray-500'}`}>
                  Grade {child.grade || <span className="italic">N/A</span>}
              </div>
            </button>
            {/* Button to open login settings */}
            <button
                onClick={(e) => { e.stopPropagation(); onOpenChildLoginSettings(child);}}
                className={`absolute top-1/2 right-2 -translate-y-1/2 p-1.5 rounded-md
                           text-xs transition-all duration-150 ease-in-out
                           ${selectedChild?.id === child.id 
                                ? 'text-blue-300 hover:bg-blue-700 hover:text-white' 
                                : 'text-gray-400 hover:bg-gray-200 hover:text-gray-700 opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
                title={`Login settings for ${child.name}`}
            >
                <Cog6ToothIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-gray-200">
        {!showAddChild ? (
          <button onClick={() => onToggleShowAddChild(true)}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors flex items-center justify-center">
            <UserPlusIcon className="h-5 w-5 mr-2"/> Add Student
          </button>
        ) : (
          <form onSubmit={onAddChildSubmit} className="flex flex-col gap-2.5 p-2 bg-gray-50 rounded-lg">
            <input value={newChildName} onChange={onNewChildNameChange} placeholder="Student Name" className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required />
            <input value={newChildGrade} onChange={onNewChildGradeChange} placeholder="Grade Level" className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
            <div className="flex gap-2 mt-1">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1.5 text-sm font-medium transition-colors">Save</button>
              <button type="button" className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md py-1.5 text-sm transition-colors" onClick={() => onToggleShowAddChild(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-auto p-4 border-t border-gray-200">
        <Link href="/logout" legacyBehavior>
          <a className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group">
            <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2 text-red-500 group-hover:text-red-600 transition-colors"/>
            Log Out
          </a>
        </Link>
      </div>
    </aside>
  );
}