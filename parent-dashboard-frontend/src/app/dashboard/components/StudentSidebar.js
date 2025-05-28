// app/dashboard/components/StudentSidebar.js
'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Import the Next.js Image component
import { ArrowLeftOnRectangleIcon, UserPlusIcon, Cog6ToothIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '../../../components/ui/Button';

// Helper for input styling (consistent with dashboard page)
const formInputStyles = "block w-full border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--border-input-focus)] focus:border-[var(--border-input-focus)] rounded-[var(--radius-md)] bg-background-card text-text-primary placeholder-text-tertiary shadow-sm text-sm px-3 py-2";

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
    <aside className="flex flex-col h-full text-text-primary bg-background-card">
      <div className="px-6 pt-6 pb-4">
        <Link href="/" className="flex items-center group transition-opacity hover:opacity-80">
          <Image
            src="/klio_logo.png" // Assuming your logo is here
            alt="Klio AI Logo"
            width={32} // Adjust size as needed
            height={32} // Adjust size as needed
            className="mr-2" // Add some margin to the right of the logo
            priority // If it's above the fold and important
          />
          <span className="text-2xl font-bold text-[var(--accent-blue)] group-hover:text-[var(--accent-blue-hover)] transition-colors">
            Klio AI
          </span>
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
              className={`group relative rounded-[var(--radius-md)] transition-all duration-150 ease-in-out
                ${isSelected
                  ? 'bg-[var(--accent-blue)] text-[var(--text-on-accent)] shadow-md'
                  : 'hover:bg-[var(--accent-blue)]/20'
                }`
              }
            >
              <button
                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between focus:outline-none rounded-[var(--radius-md)]
                  ${isSelected
                    ? 'text-[var(--text-on-accent)]'
                    : 'text-text-primary hover:text-text-primary'
                  }`
                }
                onClick={() => onSelectChild(child)}
              >
                <div>
                  <div className={`font-medium text-sm`}>
                    {child.name}
                  </div>
                  <div className={`text-xs ${isSelected ? 'text-[var(--text-on-accent)] opacity-80' : 'text-text-secondary'}`}>
                      Grade {child.grade || <span className="italic">N/A</span>}
                  </div>
                </div>
              </button>
              <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onOpenChildLoginSettings(child);}}
                  className={`absolute top-1/2 right-1.5 -translate-y-1/2 p-1 rounded-full transition-all focus:ring-0
                            ${isSelected
                                  ? 'text-[var(--text-on-accent)] opacity-70 hover:bg-[var(--accent-blue-hover)]/[0.5] hover:opacity-100'
                                  : 'text-text-tertiary hover:bg-[var(--accent-blue)]/30 hover:text-text-primary opacity-0 group-hover:opacity-100 focus:opacity-100'
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

      <div className="p-4 border-t border-border-subtle mt-auto">
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
          <form onSubmit={onAddChildSubmit} className="flex flex-col gap-2 p-3 bg-background-main rounded-lg border border-border-subtle">
            <input
              value={newChildName}
              onChange={onNewChildNameChange}
              placeholder="Student Name"
              className={formInputStyles} required />
            <input
              value={newChildGrade}
              onChange={onNewChildGradeChange}
              placeholder="Grade Level"
              className={formInputStyles} />
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
          href="/api/auth/logout"
          variant="ghost"
          size="md"
          className="w-full !text-[var(--messageTextDanger)] hover:!bg-[var(--messageTextDanger)]/10"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2"/>
          Log Out
        </Button>
      </div>
    </aside>
  );
}