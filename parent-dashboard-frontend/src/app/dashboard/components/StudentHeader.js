// app/dashboard/components/StudentHeader.js
"use client";

import React, { memo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { BookOpenIcon, PlusIcon, PencilIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { ariaLabels, colorA11y } from "../../../utils/accessibility";
import Button from "../../../components/ui/Button";
import { useParentNotes } from "../../../hooks/useParentNotes";

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

const StudentHeader = memo(function StudentHeader({ selectedChild, dashboardStats, onAddMaterial }) {
  // Use the database notes hook
  const { notes: dbNotes, createNote, deleteNote, updateNote } = useParentNotes(selectedChild?.id);
  
  // Local state for header-specific functionality
  const [localNotes, setLocalNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);

  // Migration effect: move local notes to database if database is empty
  useEffect(() => {
    if (selectedChild && !hasInitialized && dbNotes.length === 0 && localNotes.length > 0) {
      // Migrate local notes to database
      const migrateNotes = async () => {
        try {
          for (const noteText of localNotes) {
            await createNote({
              note_text: noteText,
              color: 'yellow'
            });
          }
          // Clear local notes after successful migration
          setLocalNotes([]);
        } catch (error) {
          console.warn('Failed to migrate notes to database:', error);
        }
      };
      
      migrateNotes();
      setHasInitialized(true);
    } else if (selectedChild && dbNotes.length > 0) {
      // Use database notes and clear local ones
      setLocalNotes([]);
      setHasInitialized(true);
    }
  }, [selectedChild?.id, dbNotes.length, hasInitialized]);

  // Note management functions
  const addNote = async () => {
    if (newNoteText.trim()) {
      try {
        // Always try to save to database first  
        // Get random color for variety
        const colors = ['yellow', 'blue', 'pink', 'green', 'orange', 'purple'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        await createNote({
          note_text: newNoteText.trim(),
          color: randomColor
        });
      } catch (error) {
        console.warn('Failed to create note in database, falling back to local:', error);
        // Fallback to local storage only if database fails
        setLocalNotes(prev => [...prev, newNoteText.trim()]);
      }
      setNewNoteText("");
    }
  };

  if (!selectedChild) {
    return (
      <div className="mb-4 relative">
        <div className="sticky-note-loading animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress and stats
  const progressPercent = dashboardStats.totalItems > 0 ? dashboardStats.overallCompletionPercent : 0;
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });
  
  // Calculate weekly progress (this would ideally come from props)
  const weeklyProgress = Math.min(100, Math.round(progressPercent + 10)); // Simplified calculation
  
  return (
    <header className="mb-4 relative">
      {/* Sticky Note Container */}
      <div className="sticky-note-container">
        <div className="sticky-note">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-full">
            {/* Left Section - Student Overview */}
            <div className="space-y-1">
              <h1 className="sticky-note-title text-lg font-bold text-gray-800">
                {selectedChild.name}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Grade {selectedChild.grade || "N/A"}
                </span>
                <span className="text-xs text-gray-600">
                  {currentDate}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                This week&apos;s focus: Math & Reading
              </p>
            </div>

            {/* Center Section - Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-white/50 rounded p-2 border border-yellow-200">
                <div className="font-bold text-lg text-gray-800">
                  {dashboardStats.overdue + dashboardStats.dueSoon || 0}
                </div>
                <div className="text-gray-600">Today&apos;s Tasks</div>
              </div>
              <div className="bg-white/50 rounded p-2 border border-yellow-200">
                <div className="font-bold text-lg text-green-600">
                  {weeklyProgress}%
                </div>
                <div className="text-gray-600">Week Progress</div>
              </div>
              <div className="bg-white/50 rounded p-2 border border-yellow-200">
                <div className={`font-bold text-lg ${dashboardStats.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {dashboardStats.overdue || 0}
                </div>
                <div className="text-gray-600">Overdue</div>
              </div>
              <div className="bg-white/50 rounded p-2 border border-yellow-200">
                <div className="font-bold text-lg text-blue-600">
                  {progressPercent}%
                </div>
                <div className="text-gray-600">Complete</div>
              </div>
            </div>

            {/* Right Section - Notes & Actions */}
            <div className="space-y-2">
              {/* Quick Add Note */}
              <div className="bg-white/30 rounded p-3 border border-yellow-200">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newNoteText.trim()) {
                        addNote();
                      }
                    }}
                    placeholder="Quick note..."
                    className="flex-1 text-sm bg-white/50 border border-yellow-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-500"
                    maxLength="120"
                  />
                  <button
                    onClick={addNote}
                    disabled={!newNoteText.trim()}
                    className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded transition-colors"
                    title="Add Note"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Link
                  href="/subject-management"
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  title="Manage Subjects"
                >
                  <BookOpenIcon className="h-4 w-4" />
                  <span>Subjects</span>
                </Link>
                <Button
                  onClick={onAddMaterial}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                  title="Add Learning Material"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Add Material</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Note Styles */}
      <style jsx>{`
        .sticky-note-container {
          position: relative;
        }
        
        .sticky-note {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 16px;
          min-height: 80px;
          transform: rotate(0deg);
          box-shadow: 
            0 2px 4px rgba(0,0,0,0.1),
            0 4px 8px rgba(0,0,0,0.05),
            inset 0 1px 0 rgba(255,255,255,0.3);
          position: relative;
          transition: transform 0.2s ease;
        }
        
        .sticky-note:hover {
          transform: rotate(0deg);
          box-shadow: 
            0 4px 8px rgba(0,0,0,0.15),
            0 8px 16px rgba(0,0,0,0.1),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }
        
        
        .sticky-note-title {
          font-family: 'Comic Sans MS', cursive, sans-serif;
          color: #374151;
        }
        
        .sticky-note-loading {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border: 1px solid #f59e0b;
          border-radius: 2px;
          padding: 16px;
          min-height: 80px;
          transform: rotate(-0.5deg);
        }
        
        @media (max-width: 768px) {
          .sticky-note {
            transform: rotate(0deg);
            padding: 12px;
          }
        }
      `}</style>
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
  }).isRequired,
  onAddMaterial: PropTypes.func.isRequired
};

export default StudentHeader;
