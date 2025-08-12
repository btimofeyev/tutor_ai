// hooks/useMultiChildScheduleManagement.js
import { useState, useEffect, useCallback } from 'react';
import api, { uploadApi } from '../utils/api';

export function useMultiChildScheduleManagement(selectedChildrenIds, subscriptionPermissions, allChildren) {
  // Combined state for all selected children's schedule entries
  const [allScheduleEntries, setAllScheduleEntries] = useState({});
  const [schedulePreferences, setSchedulePreferences] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for batch operations to prevent flickering
  const [batchMode, setBatchMode] = useState(false);

  // State for modals and UI
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Fetch schedule entries for multiple children
  const fetchMultipleChildrenSchedules = useCallback(async (childrenIds) => {
    if (!childrenIds || childrenIds.length === 0) return;

    setLoading(true);
    try {
      const promises = childrenIds.map(childId =>
        api.get(`/schedule/${childId}`).catch(err => {
          return { data: [] }; // Return empty data on error
        })
      );

      const responses = await Promise.all(promises);

      // Organize entries by child ID - only include selected children
      const entriesByChild = {};
      childrenIds.forEach((childId, index) => {
        entriesByChild[childId] = responses[index]?.data || [];
      });

      // Replace entire state with only selected children's data
      setAllScheduleEntries(entriesByChild);
      setError(null);
    } catch (err) {
      // Keep existing entries if API fails
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get combined calendar events for all selected children
  const getCombinedCalendarEvents = useCallback(() => {
    const allEvents = [];

    // Only process entries for currently selected children
    selectedChildrenIds.forEach(childId => {
      const entries = allScheduleEntries[childId] || [];
      const child = allChildren.find(c => c.id === childId);
      const childName = child?.name || 'Unknown';

      entries.forEach(entry => {
        // Extract material info from lesson container (matches single-child hook logic)
        const lesson = entry.lesson;
        const materials = lesson?.materials || [];

        // Sort materials consistently by title to ensure reproducible ordering
        const sortedMaterials = [...materials].sort((a, b) => {
          const titleA = a.title || '';
          const titleB = b.title || '';
          return titleA.localeCompare(titleB);
        });

        // Try to get the specific material from metadata in notes (SAME AS SINGLE-CHILD HOOK)
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

        // Fallback logic if no specific material found (SAME AS SINGLE-CHILD HOOK)
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

        allEvents.push({
          id: `${childId}-${entry.id}`,
          title: displayTitle,
          subject: entry.subject_name,
          subject_name: entry.subject_name, // Add for compatibility
          child_id: childId, // Use child_id to match calendar components
          childId: childId, // Keep childId for backward compatibility
          childName: childName,
          date: entry.scheduled_date,
          startTime: entry.start_time,
          start_time: entry.start_time, // Add for compatibility
          duration: entry.duration_minutes,
          duration_minutes: entry.duration_minutes,
          status: entry.status,
          notes: entry.notes,
          material: displayMaterial, // Include the correct material (specific or first)
          lesson: lesson, // Include lesson container info
          materials: sortedMaterials, // Include all materials in the lesson (sorted)
          content_type: displayMaterial?.content_type, // For styling/icons
          originalEntry: entry, // Keep reference to original entry
          // Also keep the original calendar format for compatibility
          start: new Date(`${entry.scheduled_date}T${entry.start_time}`),
          end: new Date(new Date(`${entry.scheduled_date}T${entry.start_time}`).getTime() + (entry.duration_minutes * 60000)),
          resource: {
            ...entry,
            child_id: childId,
            childId: childId,
            childName: childName,
            subject: entry.subject_name,
            type: displayMaterial?.content_type || 'study_time',
            status: entry.status
          }
        });
      });
    });

    return allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [allScheduleEntries, allChildren, selectedChildrenIds]);

  // Create a new schedule entry for a specific child
  const createScheduleEntry = async (entryData, targetChildId) => {
    try {
      setLoading(true);

      // Try API first, but fallback to local state if it fails
      try {
        const response = await api.post('/schedule', {
          ...entryData,
          child_id: targetChildId
        });

        // Add the new entry to the local state for the specific child (skip if in batch mode)
        if (!batchMode) {
          setAllScheduleEntries(prev => ({
            ...prev,
            [targetChildId]: [...(prev[targetChildId] || []), response.data]
          }));
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
          id: Date.now().toString(),
          child_id: targetChildId,
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

        // Add to local state for the specific child (skip if in batch mode)
        if (!batchMode) {
          setAllScheduleEntries(prev => ({
            ...prev,
            [targetChildId]: [...(prev[targetChildId] || []), localEntry]
          }));
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
  const updateScheduleEntry = async (entryId, updateData, childId) => {
    try {
      setLoading(true);

      // Ensure we have a valid childId
      if (!childId) {
        const errorMessage = 'Cannot update entry: missing child information';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Try API first, but fallback to local state if it fails
      try {
        const response = await api.put(`/schedule/${entryId}`, updateData);

        // Update the entry in local state for the specific child
        setAllScheduleEntries(prev => ({
          ...prev,
          [childId]: (prev[childId] || []).map(entry =>
            entry.id === entryId ? response.data : entry
          )
        }));
        setError(null);
        return { success: true, data: response.data };
      } catch (apiError) {

        // Update local entry if API fails
        setAllScheduleEntries(prev => ({
          ...prev,
          [childId]: (prev[childId] || []).map(entry => {
            if (entry.id === entryId) {
              return {
                ...entry,
                ...updateData,
                updated_at: new Date().toISOString()
              };
            }
            return entry;
          })
        }));
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
  const deleteScheduleEntry = async (entryId, childId) => {
    try {
      setLoading(true);

      // Try API first, but fallback to local state if it fails
      try {
        await api.delete(`/schedule/${entryId}`);

        // Remove the entry from local state for the specific child
        setAllScheduleEntries(prev => ({
          ...prev,
          [childId]: (prev[childId] || []).filter(entry => entry.id !== entryId)
        }));
        setError(null);
        return { success: true };
      } catch (apiError) {

        // Remove from local state if API fails
        setAllScheduleEntries(prev => ({
          ...prev,
          [childId]: (prev[childId] || []).filter(entry => entry.id !== entryId)
        }));
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

  // Batch create multiple schedule entries for specific children (prevents individual refreshes)
  const createScheduleEntriesBatch = async (entriesWithChildIds) => {
    try {
      setLoading(true);
      setBatchMode(true); // Enable batch mode to prevent individual state updates

      const results = [];
      const successfulEntriesByChild = {};

      // Create entries one by one but don't update state individually
      for (const { entryData, targetChildId } of entriesWithChildIds) {
        try {
          const result = await createScheduleEntry(entryData, targetChildId);
          results.push({ ...result, childId: targetChildId });
          if (result.success) {
            if (!successfulEntriesByChild[targetChildId]) {
              successfulEntriesByChild[targetChildId] = [];
            }
            successfulEntriesByChild[targetChildId].push(result.data);
          }
        } catch (error) {
          results.push({ success: false, error, childId: targetChildId });
        }
      }

      // Update state with all successful entries at once
      if (Object.keys(successfulEntriesByChild).length > 0) {
        setAllScheduleEntries(prev => {
          const updated = { ...prev };
          Object.entries(successfulEntriesByChild).forEach(([childId, entries]) => {
            updated[childId] = [...(prev[childId] || []), ...entries];
          });
          return updated;
        });
      }

      const totalSuccessful = Object.values(successfulEntriesByChild).flat().length;

      return {
        success: totalSuccessful > 0,
        results,
        entriesCreated: totalSuccessful,
        entriesFailed: entriesWithChildIds.length - totalSuccessful,
        entriesByChild: successfulEntriesByChild
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

  // Mark schedule entry as completed with sync notification
  const markEntryCompleted = async (entryId, childId) => {
    const result = await updateScheduleEntry(entryId, { status: 'completed' }, childId);

    // Show success message if materials were synced
    if (result.success && result.data?.synced_materials > 0) {
    }

    return result;
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

  // Fetch schedule preferences for multiple children
  const fetchMultipleChildrenPreferences = useCallback(async (childrenIds) => {
    if (!childrenIds || childrenIds.length === 0) return;

    try {
      const promises = childrenIds.map(childId =>
        api.get(`/schedule/preferences/${childId}`).catch(err => {
          // Return default preferences on error
          return {
            data: {
              preferred_start_time: '09:00',
              preferred_end_time: '15:00',
              max_daily_study_minutes: 240,
              break_duration_minutes: 15,
              difficult_subjects_morning: true,
              study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
              subject_frequencies: {}
            }
          };
        })
      );

      const responses = await Promise.all(promises);

      // Organize preferences by child ID
      const preferencesByChild = {};
      childrenIds.forEach((childId, index) => {
        preferencesByChild[childId] = responses[index]?.data || {};
      });

      setSchedulePreferences(preferencesByChild);
    } catch (err) {
      console.error('Error fetching preferences:', err);
      // Set default preferences for all children
      const defaultPrefs = {};
      childrenIds.forEach(childId => {
        defaultPrefs[childId] = {
          preferred_start_time: '09:00',
          preferred_end_time: '15:00',
          max_daily_study_minutes: 240,
          break_duration_minutes: 15,
          difficult_subjects_morning: true,
          study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          subject_frequencies: {}
        };
      });
      setSchedulePreferences(defaultPrefs);
    }
  }, []);

  // Update schedule preferences for a specific child
  const updateSchedulePreferences = async (preferences, childId) => {
    try {
      setLoading(true);
      const response = await api.post(`/schedule/preferences/${childId}`, preferences);

      // Update the preferences in local state
      setSchedulePreferences(prev => ({
        ...prev,
        [childId]: response.data
      }));

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

  // Generate AI-powered schedule for multiple children
  const generateAISchedule = async (options = {}) => {
    try {
      setLoading(true);

      const {
        start_date = new Date().toISOString().split('T')[0], // Default to today
        days_to_schedule = 7,
        preferences = {}
      } = options;

      if (!selectedChildrenIds || selectedChildrenIds.length === 0) {
        throw new Error('No children selected for AI scheduling');
      }

      // Deep clean function to remove any non-serializable data
      const deepClean = (obj, path = 'root') => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return obj;
        if (obj instanceof Date) return obj.toISOString();
        if (Array.isArray(obj)) {
          return obj.map((item, index) => deepClean(item, `${path}[${index}]`));
        }
        if (typeof obj === 'object') {
          // Check if it's a DOM element or has circular references
          if (obj.nodeType || obj.window || obj.ownerDocument || obj.constructor?.name?.includes('HTML')) {
            console.warn(`Removing DOM element found at path: ${path}`, obj.constructor?.name);
            return undefined;
          }
          if (obj.target && obj.preventDefault && obj.stopPropagation) {
            console.warn(`Removing event object found at path: ${path}`);
            return undefined;
          }
          const cleaned = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              const cleanedValue = deepClean(obj[key], `${path}.${key}`);
              if (cleanedValue !== undefined) {
                cleaned[key] = cleanedValue;
              }
            }
          }
          return cleaned;
        }
        if (typeof obj === 'function') {
          console.warn(`Removing function found at path: ${path}`);
          return undefined;
        }
        return undefined; // Other non-serializable types
      };

      const cleanPreferences = deepClean(preferences, 'preferences') || {};

      // Ensure child IDs are clean strings
      const safeChildIds = selectedChildrenIds.filter(id => id && typeof id === 'string');

      const requestPayload = {
        child_ids: safeChildIds,
        start_date: String(start_date),
        days_to_schedule: Number(days_to_schedule),
        preferences: cleanPreferences
      };

      // Add debug logging to catch any circular reference issues before they happen
      try {
        const testStringify = JSON.stringify(requestPayload);
        } catch (circularError) {
        console.error('Circular reference detected before API call:', circularError);
        throw new Error(`Cannot serialize request data: ${circularError.message}`);
      }

      const response = await uploadApi.post('/schedule/ai-generate', requestPayload);

      // Refresh the schedule entries for all selected children
      await fetchMultipleChildrenSchedules(selectedChildrenIds);

      setError(null);
      return {
        success: true,
        data: response.data,
        message: response.data.message,
        entriesCreated: response.data.entries_created
      };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to generate AI schedule';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Load data when selected children change
  useEffect(() => {
    if (selectedChildrenIds && selectedChildrenIds.length > 0) {
      fetchMultipleChildrenSchedules(selectedChildrenIds);
      fetchMultipleChildrenPreferences(selectedChildrenIds);
    } else {
      // Clear all entries if no children selected
      setAllScheduleEntries({});
      setSchedulePreferences({});
    }
  }, [selectedChildrenIds, fetchMultipleChildrenSchedules, fetchMultipleChildrenPreferences]);

  return {
    // Data
    allScheduleEntries,
    schedulePreferences,
    calendarEvents: getCombinedCalendarEvents(),

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
    deleteScheduleEntry,
    updateSchedulePreferences,
    generateAISchedule,

    // Status updates
    markEntryCompleted,

    // Modal controls
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    openSettingsModal,
    closeSettingsModal,

    // Refresh
    refresh: () => {
      fetchMultipleChildrenSchedules(selectedChildrenIds);
      fetchMultipleChildrenPreferences(selectedChildrenIds);
    }
  };
}
