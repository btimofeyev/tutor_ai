// app/dashboard/components/StudentSidebar.js
'use client'; 
import React from 'react';
import Link from 'next/link';
import { ArrowLeftOnRectangleIcon, UserPlusIcon, Cog6ToothIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '../../../components/ui/Button';

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
  onOpenChildLoginSettings,
}) {
  return (
    <aside className="flex flex-col h-full"> 
      <div className="px-6 pt-6 pb-4">
        <Link href="/" className="text-2xl font-bold text-accent-blue">
          Klio AI
        </Link>
      </div>
      
      <div className="px-6 pt-2 pb-3 border-b border-border-subtle mb-2">
        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Students</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-1.5">
        {(childrenList || []).map(child => {
          const isSelected = selectedChild?.id === child.id;
          return (
            <div 
              key={child.id} 
              className={`group relative rounded-md transition-all duration-150 ease-in-out
                ${isSelected 
                  ? 'bg-accent-blue text-text-on-accent shadow-sm ring-2 ring-blue-300 ring-offset-1 ring-offset-background-card' // ENHANCED: Added ring for more definition
                  : 'hover:bg-gray-100'
                }`
              }
            >
              <button
                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between focus:outline-none
                  ${isSelected 
                    ? '' 
                    : 'text-text-primary'
                  }`
                }
                onClick={() => onSelectChild(child)}
              >
                <div>
                  <div className={`font-medium text-sm ${isSelected ? 'text-text-on-accent' : 'text-text-primary'}`}>
                    {child.name}
                  </div>
                  <div className={`text-xs ${isSelected ? 'text-blue-200' : 'text-text-secondary'}`}>
                      Grade {child.grade || <span className="italic">N/A</span>}
                  </div>
                </div>
              </button>
              <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onOpenChildLoginSettings(child);}}
                  className={`absolute top-1/2 right-1.5 -translate-y-1/2 p-1.5 rounded-full
                            ${isSelected 
                                  ? 'text-blue-200 hover:bg-accent-blue-hover hover:text-white' 
                                  : 'text-text-tertiary hover:bg-gray-200 hover:text-text-primary opacity-0 group-hover:opacity-100 focus:opacity-100'
                            }`
                          }
                  title={`Login settings for ${child.name}`}
              >
                  <Cog6ToothIcon className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
      
      {/* ... (rest of the sidebar: Add Student form, Logout button - remain the same as previous step) ... */}
      <div className="p-4 border-t border-border-subtle">
        {!showAddChild ? (
          <Button 
            variant="secondary" 
            size="md" 
            onClick={() => onToggleShowAddChild(true)}
            className="w-full"
          >
            <UserPlusIcon className="h-5 w-5 mr-2"/> Add Student
          </Button>
        ) : (
          <form onSubmit={onAddChildSubmit} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-border-subtle">
            <input 
              value={newChildName} 
              onChange={onNewChildNameChange} 
              placeholder="Student Name" 
              className="border-border-input rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-accent-blue focus:border-accent-blue placeholder-text-tertiary" required />
            <input 
              value={newChildGrade} 
              onChange={onNewChildGradeChange} 
              placeholder="Grade Level" 
              className="border-border-input rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-accent-blue focus:border-accent-blue placeholder-text-tertiary" />
            <div className="flex gap-2 mt-1.5">
              <Button type="submit" variant="primary" size="sm" className="flex-1">
                <CheckIcon className="h-4 w-4 mr-1.5"/> Save
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                size="sm" 
                onClick={() => onToggleShowAddChild(false)}
                className="flex-1"
              >
                <XMarkIcon className="h-4 w-4 mr-1.5"/> Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="p-4 border-t border-border-subtle">
        <Button 
          as="link" 
          href="/logout" 
          variant="ghost"
          size="md"
          className="w-full text-accent-red hover:bg-red-50"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2"/>
          Log Out
        </Button>
      </div>
    </aside>
  );
}