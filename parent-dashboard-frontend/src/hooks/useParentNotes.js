import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const CACHE_KEY_PREFIX = 'parent_notes_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Event names for cross-instance communication
const NOTES_EVENTS = {
  CREATED: 'parent_notes_created',
  UPDATED: 'parent_notes_updated', 
  DELETED: 'parent_notes_deleted'
};

// Available colors for sticky notes
const STICKY_NOTE_COLORS = [
  'yellow',
  'blue', 
  'pink',
  'green',
  'orange',
  'purple'
];

// Get random color for new notes
const getRandomColor = () => {
  return STICKY_NOTE_COLORS[Math.floor(Math.random() * STICKY_NOTE_COLORS.length)];
};

/**
 * Custom hook for managing parent notes with persistence and caching
 * @param {string|number} childId - The child ID to fetch notes for
 * @returns {Object} - Hook state and methods
 */
export const useParentNotes = (childId) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cacheKey = `${CACHE_KEY_PREFIX}${childId}`;

  // Broadcast note changes to other hook instances
  const broadcastNoteChange = useCallback((eventType, data = {}) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventType, {
        detail: { 
          childId, 
          timestamp: Date.now(),
          ...data 
        }
      }));
    }
  }, [childId]);

  // Get cached notes
  const getCachedNotes = useCallback(() => {
    if (!childId) return null;
    
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;
        if (!isExpired) {
          return data;
        }
        // Remove expired cache
        localStorage.removeItem(cacheKey);
      }
    } catch (error) {
      console.warn('Error reading cached notes:', error);
      localStorage.removeItem(cacheKey);
    }
    return null;
  }, [cacheKey, childId]);

  // Cache notes
  const cacheNotes = useCallback((notesData) => {
    if (!childId) return;
    
    try {
      const cacheData = {
        data: notesData,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error caching notes:', error);
    }
  }, [cacheKey, childId]);

  // Fetch notes from API
  const fetchNotes = useCallback(async (useCache = true) => {
    if (!childId) {
      setNotes([]);
      return;
    }

    // Try cache first if requested
    if (useCache) {
      const cachedNotes = getCachedNotes();
      if (cachedNotes) {
        setNotes(cachedNotes);
        setError(null);
        return cachedNotes;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/children/${childId}/notes`);
      const notesData = response.data || [];
      
      setNotes(notesData);
      cacheNotes(notesData);
      return notesData;
    } catch (err) {
      console.error('Error fetching parent notes:', err);
      setError(err.response?.data?.error || 'Failed to fetch notes');
      
      // Try to use cached data on error
      const cachedNotes = getCachedNotes();
      if (cachedNotes) {
        setNotes(cachedNotes);
      }
    } finally {
      setLoading(false);
    }
  }, [childId, getCachedNotes, cacheNotes]);

  // Create a new note
  const createNote = useCallback(async (noteData) => {
    if (!childId) return null;

    try {
      const response = await api.post(`/children/${childId}/notes`, noteData);
      const newNote = response.data;
      
      // Optimistic update
      const updatedNotes = [...notes, newNote];
      setNotes(updatedNotes);
      cacheNotes(updatedNotes);
      
      // Broadcast note creation to other hook instances
      broadcastNoteChange(NOTES_EVENTS.CREATED, { noteId: newNote.id });
      
      return newNote;
    } catch (err) {
      console.error('Error creating note:', err);
      setError(err.response?.data?.error || 'Failed to create note');
      throw err;
    }
  }, [childId, notes, cacheNotes, broadcastNoteChange]);

  // Update an existing note
  const updateNote = useCallback(async (noteId, updateData) => {
    if (!childId || !noteId) return null;

    try {
      const response = await api.put(`/children/${childId}/notes/${noteId}`, updateData);
      const updatedNote = response.data;
      
      // Optimistic update
      const updatedNotes = notes.map(note => 
        note.id === noteId ? updatedNote : note
      );
      setNotes(updatedNotes);
      cacheNotes(updatedNotes);
      
      // Broadcast note update to other hook instances
      broadcastNoteChange(NOTES_EVENTS.UPDATED, { noteId });
      
      return updatedNote;
    } catch (err) {
      console.error('Error updating note:', err);
      setError(err.response?.data?.error || 'Failed to update note');
      throw err;
    }
  }, [childId, notes, cacheNotes, broadcastNoteChange]);

  // Delete a note
  const deleteNote = useCallback(async (noteId) => {
    if (!childId || !noteId) return false;

    try {
      await api.delete(`/children/${childId}/notes/${noteId}`);
      
      // Optimistic update
      const updatedNotes = notes.filter(note => note.id !== noteId);
      setNotes(updatedNotes);
      cacheNotes(updatedNotes);
      
      // Broadcast note deletion to other hook instances
      broadcastNoteChange(NOTES_EVENTS.DELETED, { noteId });
      
      return true;
    } catch (err) {
      console.error('Error deleting note:', err);
      setError(err.response?.data?.error || 'Failed to delete note');
      throw err;
    }
  }, [childId, notes, cacheNotes, broadcastNoteChange]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Invalidate cache for this child
  const invalidateCache = useCallback(() => {
    localStorage.removeItem(cacheKey);
  }, [cacheKey]);

  // Initial fetch when childId changes
  useEffect(() => {
    fetchNotes(true);
  }, [fetchNotes]);

  // Listen for note changes from other hook instances
  useEffect(() => {
    if (!childId) return;

    const handleNoteChange = (event) => {
      const { childId: eventChildId } = event.detail;
      
      // Only refetch if the event is for the same child
      if (eventChildId === childId) {
        // Debounce refetches to prevent excessive API calls
        setTimeout(() => {
          fetchNotes(false); // Force refetch, bypass cache
        }, 100);
      }
    };

    // Listen for all note change events
    window.addEventListener(NOTES_EVENTS.CREATED, handleNoteChange);
    window.addEventListener(NOTES_EVENTS.UPDATED, handleNoteChange);
    window.addEventListener(NOTES_EVENTS.DELETED, handleNoteChange);

    return () => {
      window.removeEventListener(NOTES_EVENTS.CREATED, handleNoteChange);
      window.removeEventListener(NOTES_EVENTS.UPDATED, handleNoteChange);
      window.removeEventListener(NOTES_EVENTS.DELETED, handleNoteChange);
    };
  }, [childId, fetchNotes]);

  return {
    notes,
    loading,
    error,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    clearError,
    invalidateCache,
    // Computed values
    hasNotes: notes.length > 0,
    notesCount: notes.length
  };
};