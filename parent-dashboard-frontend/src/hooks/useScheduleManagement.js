// hooks/useScheduleManagement.js
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export function useScheduleManagement(childId, subscriptionPermissions) {
  // State for schedule entries
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [schedulePreferences, setSchedulePreferences] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  

  // State for batch operations to prevent flickering
  const [batchMode, setBatchMode] = useState(false);

  // State for modals and UI
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);


  // Fetch schedule entries for a child
  const fetchScheduleEntries = useCallback(async (childId) => {
    if (!childId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/schedule/${childId}`);
      setScheduleEntries(response.data || []);
      setError(null);
    } catch (err) {
      
      // Don't clear existing entries if API fails - keep local state
      // This prevents losing locally created entries when the API is unavailable
      
      // Only clear error for now, don't show scary messages
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch schedule preferences for a child
  const fetchSchedulePreferences = useCallback(async (childId) => {
    if (!childId) return;
    
    try {
      const response = await api.get(`/schedule/preferences/${childId}`);
      setSchedulePreferences(response.data);
    } catch (err) {
      // Set default preferences if API fails (database not set up yet)
      setSchedulePreferences({
        preferred_start_time: '09:00',
        preferred_end_time: '15:00',
        max_daily_study_minutes: 240,
        break_duration_minutes: 15,
        difficult_subjects_morning: true,
        study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      });
    }
  }, []);

  // Create a new schedule entry
  const createScheduleEntry = async (entryData) => {
    try {
      setLoading(true);
      
      // Try API first, but fallback to local state if it fails
      try {
        const response = await api.post('/schedule', {
          ...entryData,
          child_id: childId
        });
        
        // Add the new entry to the local state (skip if in batch mode)
        if (!batchMode) {
          setScheduleEntries(prev => [...prev, response.data]);
        }
        setError(null);
        return { success: true, data: response.data };
      } catch (apiError) {
        // If it's a conflict error (409), don't create local entry - return the error
        if (apiError.response?.status === 409) {
          const errorMessage = apiError.response?.data?.error || 'Scheduling conflict detected';
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }
        
        // For other API errors, create a local entry as fallback
        const localEntry = {
          id: Date.now().toString(), // Simple ID generation
          child_id: childId,
          material_id: entryData.material_id || null,
          subject_name: entryData.subject_name || 'Study Time',
          scheduled_date: entryData.scheduled_date,
          start_time: entryData.start_time,
          duration_minutes: entryData.duration_minutes,
          status: 'scheduled',
          created_by: 'parent',
          notes: entryData.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Add to local state (skip if in batch mode)
        if (!batchMode) {
          setScheduleEntries(prev => [...prev, localEntry]);
        }
        setError(null);
        return { success: true, data: localEntry };
      }
    } catch (err) {
      const errorMessage = 'Failed to create schedule entry';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update an existing schedule entry
  const updateScheduleEntry = async (entryId, updateData, childIdParam) => {
    try {
      setLoading(true);
      
      // Use provided childId or fall back to the current childId
      const targetChildId = childIdParam || childId;
      
      
      // Try API first, but fallback to local state if it fails
      try {
        const response = await api.put(`/schedule/${entryId}`, updateData);
        
        // Update the entry in local state
        setScheduleEntries(prev => 
          prev.map(entry => entry.id === entryId ? response.data : entry)
        );
        setError(null);
        return { success: true, data: response.data };
      } catch (apiError) {
        
        // Update local entry if API fails
        setScheduleEntries(prev => 
          prev.map(entry => {
            if (entry.id === entryId) {
              return {
                ...entry,
                ...updateData,
                updated_at: new Date().toISOString()
              };
            }
            return entry;
          })
        );
        setError(null);
        return { success: true, localOnly: true };
      }
    } catch (err) {
      const errorMessage = 'Failed to update schedule entry';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Delete a schedule entry
  const deleteScheduleEntry = async (entryId) => {
    try {
      setLoading(true);
      
      // Try API first, but fallback to local state if it fails
      try {
        await api.delete(`/schedule/${entryId}`);
        
        // Remove the entry from local state
        setScheduleEntries(prev => prev.filter(entry => entry.id !== entryId));
        setError(null);
        return { success: true };
      } catch (apiError) {
        
        // Remove from local state if API fails
        setScheduleEntries(prev => prev.filter(entry => entry.id !== entryId));
        setError(null);
        return { success: true };
      }
    } catch (err) {
      const errorMessage = 'Failed to delete schedule entry';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update schedule preferences
  const updateSchedulePreferences = async (preferences) => {
    try {
      setLoading(true);
      const response = await api.post(`/schedule/preferences/${childId}`, preferences);
      setSchedulePreferences(response.data);
      setError(null);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to update preferences';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };


  // Batch create multiple schedule entries (prevents individual refreshes)
  const createScheduleEntriesBatch = async (entriesData) => {
    try {
      setLoading(true);
      setBatchMode(true); // Enable batch mode to prevent individual state updates
      
      const results = [];
      const successfulEntries = [];
      
      // Create entries one by one but don't update state individually
      for (const entryData of entriesData) {
        try {
          const result = await createScheduleEntry(entryData);
          results.push(result);
          if (result.success) {
            successfulEntries.push(result.data);
          }
        } catch (error) {
          results.push({ success: false, error });
        }
      }
      
      // Update state with all successful entries at once
      if (successfulEntries.length > 0) {
        setScheduleEntries(prev => [...prev, ...successfulEntries]);
      }
      
      return {
        success: successfulEntries.length > 0,
        results,
        entriesCreated: successfulEntries.length,
        entriesFailed: entriesData.length - successfulEntries.length
      };
    } catch (err) {
      const errorMessage = 'Failed to create schedule entries in batch';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setBatchMode(false); // Disable batch mode
      setLoading(false);
    }
  };

  // Convert schedule entries to calendar events
  const getCalendarEvents = () => {
    return scheduleEntries.map(entry => {
      // Extract material info from lesson container
      const lesson = entry.lesson;
      const materials = lesson?.materials || [];
      
      // Sort materials consistently by title to ensure reproducible ordering
      const sortedMaterials = [...materials].sort((a, b) => {
        const titleA = a.title || '';
        const titleB = b.title || '';
        return titleA.localeCompare(titleB);
      });
      
      // Try to get the specific material from metadata in notes
      let specificMaterial = null;
      let displayTitle;
      let materialMetadata = null;
      
      try {
        if (entry.notes && typeof entry.notes === 'string' && entry.notes.startsWith('{')) {
          materialMetadata = JSON.parse(entry.notes);
          
          if (materialMetadata.specific_material_id) {
            // Find the specific material that was scheduled
            specificMaterial = sortedMaterials.find(m => m.id === materialMetadata.specific_material_id);
            
            if (specificMaterial) {
              displayTitle = `${entry.subject_name}: ${specificMaterial.title}`;
            } else if (materialMetadata.material_title) {
              // Fallback to the title stored in metadata
              displayTitle = `${entry.subject_name}: ${materialMetadata.material_title}`;
            }
          }
        }
      } catch (e) {
        // Failed to parse metadata, will use fallback logic
      }
      
      // Fallback logic if no specific material found
      if (!displayTitle) {
        const firstMaterial = sortedMaterials[0]; // Take first material if multiple exist
        if (firstMaterial) {
          // Show specific material title
          displayTitle = `${entry.subject_name}: ${firstMaterial.title}`;
        } else if (lesson) {
          // Show lesson container title
          displayTitle = `${entry.subject_name}: ${lesson.title}`;
        } else {
          // Fallback to general study
          displayTitle = entry.subject_name || 'Study Time';
        }
      }
      
      const displayMaterial = specificMaterial || sortedMaterials[0]; // Use specific material or fallback to first
      
      return {
        id: entry.id,
        title: displayTitle,
        subject: entry.subject_name,
        subject_name: entry.subject_name, // Add this for compatibility
        date: entry.scheduled_date,
        startTime: entry.start_time,
        start_time: entry.start_time, // Add this for compatibility
        duration: entry.duration_minutes,
        duration_minutes: entry.duration_minutes, // Keep both for compatibility
        status: entry.status,
        notes: entry.notes,
        child_id: entry.child_id, // Add the child_id field
        material: displayMaterial, // Include the correct material (specific or first)
        lesson: lesson, // Include lesson container info
        materials: specificMaterial ? [specificMaterial] : materials, // Include only the scheduled material, or all if not specific
        content_type: displayMaterial?.content_type, // For styling/icons
        // Also keep the original calendar format for compatibility
        start: new Date(`${entry.scheduled_date}T${entry.start_time}`),
        end: new Date(new Date(`${entry.scheduled_date}T${entry.start_time}`).getTime() + (entry.duration_minutes * 60000)),
        resource: {
          ...entry,
          subject: entry.subject_name,
          type: displayMaterial?.content_type || 'study_time',
          status: entry.status
        },
        // Add metadata for debugging
        originalEntry: entry
      };
    });
  };

  // Mark schedule entry as completed with sync notification
  const markEntryCompleted = async (entryId) => {
    const result = await updateScheduleEntry(entryId, { status: 'completed' });
    
    // Show success message if materials were synced
    if (result.success && result.data?.synced_materials > 0) {
    }
    
    return result;
  };

  // Mark schedule entry as skipped
  const markEntrySkipped = async (entryId) => {
    return updateScheduleEntry(entryId, { status: 'skipped' });
  };

  // Helper functions for modals
  const openCreateModal = (slotInfo = null) => {
    setEditingEntry(slotInfo);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingEntry(null);
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingEntry(null);
  };

  const openSettingsModal = () => {
    setShowSettingsModal(true);
  };

  const closeSettingsModal = () => {
    setShowSettingsModal(false);
  };


  // Load data when childId changes
  useEffect(() => {
    if (childId) {
      fetchScheduleEntries(childId);
      fetchSchedulePreferences(childId);
    }
  }, [childId, fetchScheduleEntries, fetchSchedulePreferences]);

  return {
    // Data
    scheduleEntries,
    schedulePreferences,
    calendarEvents: getCalendarEvents(),
    
    // Loading states
    loading,
    error,
    
    // Modal states
    showCreateModal,
    showEditModal,
    showSettingsModal,
    editingEntry,

    
    // CRUD operations
    createScheduleEntry,
    createScheduleEntriesBatch,
    updateScheduleEntry,
    updateEvent: updateScheduleEntry, // Alias for drag-and-drop compatibility
    deleteScheduleEntry,
    updateSchedulePreferences,
    
    // Status updates
    markEntryCompleted,
    markEntrySkipped,
    
    // Modal controls
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    openSettingsModal,
    closeSettingsModal,
    
    // Refresh - only if we have API connectivity, otherwise keep local state
    refresh: () => {
      // Only refresh if we don't have local entries or if we want to sync with server
      fetchScheduleEntries(childId);
    },
    refreshEvents: () => {
      // Alias for refresh for compatibility
      fetchScheduleEntries(childId);
    }
  };
}