'use client';
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useParentNotes } from '../../../hooks/useParentNotes';
import { useToast } from '../../../hooks/useToast';

// Available note colors with their CSS classes
const NOTE_COLORS = [
  { name: 'yellow', bg: 'bg-yellow-200', border: 'border-yellow-300', text: 'text-yellow-900' },
  { name: 'blue', bg: 'bg-blue-200', border: 'border-blue-300', text: 'text-blue-900' },
  { name: 'pink', bg: 'bg-pink-200', border: 'border-pink-300', text: 'text-pink-900' },
  { name: 'green', bg: 'bg-green-200', border: 'border-green-300', text: 'text-green-900' },
  { name: 'orange', bg: 'bg-orange-200', border: 'border-orange-300', text: 'text-orange-900' },
  { name: 'purple', bg: 'bg-purple-200', border: 'border-purple-300', text: 'text-purple-900' }
];

// Get color classes by name
const getColorClasses = (colorName) => {
  return NOTE_COLORS.find(color => color.name === colorName) || NOTE_COLORS[0];
};

// Individual compact sticky note component
const CompactStickyNote = ({ note, onEdit, onDelete, isEditing, onSave, onCancel }) => {
  const [editText, setEditText] = useState(note.note_text);
  const colorClasses = getColorClasses(note.color);

  const handleSave = () => {
    if (editText.trim()) {
      onSave(note.id, { note_text: editText.trim() });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(note.note_text);
      onCancel();
    }
  };

  const handleNoteClick = () => {
    if (!isEditing) {
      onEdit(note.id);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevent note edit when clicking delete
    onDelete(note.id);
  };

  // Truncate text for compact display
  const displayText = note.note_text.length > 80 ? note.note_text.substring(0, 77) + "..." : note.note_text;

  return (
    <div className="compact-sticky-note-container group relative">
      <div className={`compact-sticky-note ${colorClasses.bg} ${colorClasses.border} ${colorClasses.text} p-3 rounded-lg border-2 shadow-sm hover:shadow-md transition-all duration-200 relative w-full h-28 ${isEditing ? 'cursor-text' : 'cursor-pointer'}`}
           onClick={handleNoteClick}>
        {/* Push pin decoration */}
        <div className="push-pin absolute -top-1 right-3 w-3 h-3 bg-red-500 rounded-full shadow-sm border border-red-600 z-10"></div>
        <div className="push-pin-hole absolute -top-0.5 right-3.5 w-1.5 h-1.5 bg-red-700 rounded-full z-20"></div>

        {/* Delete button - show on hover */}
        {!isEditing && (
          <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleDeleteClick}
              className="p-1 bg-white/80 hover:bg-red-100 rounded-full shadow-sm transition-colors"
              title="Delete note"
            >
              <TrashIcon className="h-3 w-3 text-red-600" />
            </button>
          </div>
        )}

        {/* Note content */}
        <div className="h-full flex flex-col justify-center px-1">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`w-full bg-white/50 border border-gray-300 rounded p-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 ${colorClasses.text}`}
                rows={3}
                maxLength={120}
                autoFocus
                placeholder="Quick note..."
              />
              <div className="flex gap-1 justify-center">
                <button
                  onClick={handleSave}
                  className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditText(note.note_text);
                    onCancel();
                  }}
                  className="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white text-xs rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs leading-tight font-medium whitespace-pre-wrap break-words overflow-hidden text-center">
              {displayText}
            </p>
          )}
        </div>
      </div>

      {/* CSS for handwriting effect */}
      <style jsx>{`
        .compact-sticky-note {
          font-family: 'Comic Sans MS', 'Chalkduster', cursive, sans-serif;
          transform: rotate(-1deg);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .compact-sticky-note:hover {
          transform: rotate(0deg) translateY(-1px);
        }

        .compact-sticky-note:nth-child(2n) {
          transform: rotate(1deg);
        }

        .compact-sticky-note:nth-child(3n) {
          transform: rotate(-0.5deg);
        }

        .push-pin {
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }

        .push-pin-hole {
          box-shadow: inset 0 0.5px 1px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

// Main ParentNotesSection component
const ParentNotesSection = ({ selectedChild }) => {
  const [editingNoteId, setEditingNoteId] = useState(null);
  const { showSuccess, showError } = useToast();

  // Use global notes (not child-specific)
  const {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    clearError
  } = useParentNotes(null, true); // Pass null for childId and true for isGlobal

  // Handle updating note
  const handleUpdateNote = async (noteId, updateData) => {
    try {
      await updateNote(noteId, updateData);
      setEditingNoteId(null);
      showSuccess('Note updated successfully!');
    } catch (err) {
      showError('Failed to update note. Please try again.');
    }
  };

  // Handle deleting note
  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(noteId);
      showSuccess('Note deleted successfully!');
    } catch (err) {
      showError('Failed to delete note. Please try again.');
    }
  };

  // Error state
  if (error) {
    return (
      <section className="mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600 text-sm">Failed to load notes: {error}</p>
          <button
            onClick={() => {
              clearError();
              window.location.reload();
            }}
            className="mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="mb-4" aria-labelledby="parent-notes-heading">
      <div className="mb-3">
        <h3 id="parent-notes-heading" className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <span className="text-sm" aria-hidden="true">📝</span>
          Quick Notes (All Children) {notes.length > 0 && <span className="text-xs text-gray-500">({notes.length})</span>}
        </h3>
      </div>

      {loading && notes.length === 0 ? (
        // Loading state
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-yellow-200 border-2 border-yellow-300 p-2 rounded-lg h-24 animate-pulse">
              <div className="space-y-1">
                <div className="h-2 bg-yellow-300 rounded w-3/4"></div>
                <div className="h-2 bg-yellow-300 rounded w-1/2"></div>
                <div className="h-2 bg-yellow-300 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Compact notes grid - responsive layout
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {/* Existing notes */}
          {notes.slice(0, 6).map((note) => (
            <CompactStickyNote
              key={note.id}
              note={note}
              onEdit={setEditingNoteId}
              onDelete={handleDeleteNote}
              isEditing={editingNoteId === note.id}
              onSave={handleUpdateNote}
              onCancel={() => setEditingNoteId(null)}
            />
          ))}

          {/* Empty state placeholder */}
          {notes.length === 0 && !loading && (
            <div className="col-span-full text-center py-6 text-gray-500">
              <div className="text-2xl mb-2">📝</div>
              <p className="text-xs">
                Add notes using the sticky note section in the header above
              </p>
            </div>
          )}

          {/* Show more indicator if there are more notes */}
          {notes.length > 6 && (
            <div className="border-2 border-gray-200 rounded-lg h-24 flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="text-lg font-bold text-gray-600">+{notes.length - 6}</span>
              <span className="text-xs text-gray-500">more</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

ParentNotesSection.propTypes = {
  selectedChild: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired
  })
};

CompactStickyNote.propTypes = {
  note: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    note_text: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    created_at: PropTypes.string.isRequired
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  isEditing: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default ParentNotesSection;
