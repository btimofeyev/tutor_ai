// hooks/useMultiChildScheduleManagement.js
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export function useMultiChildScheduleManagement(selectedChildrenIds, subscriptionPermissions, allChildren) {
  // Combined state for all selected children's schedule entries
  const [allScheduleEntries, setAllScheduleEntries] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for AI scheduling
  const [aiScheduling, setAiScheduling] = useState(false);
  const [aiScheduleResults, setAiScheduleResults] = useState(null);

  // State for batch operations to prevent flickering
  const [batchMode, setBatchMode] = useState(false);

  // State for modals and UI
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
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
        allEvents.push({
          id: `${childId}-${entry.id}`,
          title: entry.material?.title || entry.subject_name || 'Study Time',
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
            type: entry.material?.content_type || 'study_time',
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
        console.error('No childId provided for update');
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
      console.error('Update schedule entry error in multi-child mode:', err);
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

  // Generate AI schedule for multiple children using existing single-child endpoint
  const generateMultiChildAISchedule = async (parameters = {}) => {
    if (!subscriptionPermissions?.hasAIAccess) {
      setError('AI scheduling requires AI access - upgrade your plan or add Klio AI Pack');
      return { success: false, error: 'AI scheduling requires AI access - upgrade your plan or add Klio AI Pack' };
    }

    try {
      setAiScheduling(true);
      
      // Generate schedule for each child individually using existing endpoint
      const allScheduleResults = {};
      const combinedSuggestions = [];
      
      for (const childId of parameters.selected_children || selectedChildrenIds) {
        try {
          
          const requestData = {
            child_id: childId,
            start_date: parameters.start_date,
            end_date: parameters.end_date,
            focus_subjects: parameters.focus_subjects,
            weekly_hours: parameters.weekly_hours,
            session_duration: parameters.session_duration,
            priority_mode: parameters.priority_mode,
            materials: parameters.materials
          };
          
          const response = await api.post('/schedule/ai-generate', requestData);
          
          allScheduleResults[childId] = response.data;
          
          // Add child info to each suggestion
          if (response.data?.suggestions) {
            const childSuggestions = response.data.suggestions.map(suggestion => ({
              ...suggestion,
              child_id: childId,
              childName: allChildren.find(c => c.id === childId)?.name || 'Unknown Child'
            }));
            combinedSuggestions.push(...childSuggestions);
          }
        } catch (childError) {
          // Continue with other children even if one fails
        }
      }
      
      // Combine results into format expected by UI
      const combinedResults = {
        suggestions: combinedSuggestions,
        metadata: {
          total_children: parameters.selected_children?.length || selectedChildrenIds.length,
          individual_results: allScheduleResults
        }
      };
      
      setAiScheduleResults(combinedResults);
      setError(null);
      return { success: true, data: combinedResults };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to generate AI schedule';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setAiScheduling(false);
    }
  };

  // Apply AI schedule results for multiple children
  const applyAISchedule = async (scheduleData) => {
    try {
      setLoading(true);
      
      if (!scheduleData || !Array.isArray(scheduleData)) {
        throw new Error('Invalid schedule data provided');
      }
      
      // Group schedule data by child
      const schedulesByChild = {};
      scheduleData.forEach(entry => {
        const childId = entry.child_id;
        if (!schedulesByChild[childId]) {
          schedulesByChild[childId] = [];
        }
        schedulesByChild[childId].push(entry);
      });
      
      // Try API first, but fallback to local state if it fails
      try {
        // Create multiple schedule entries for each child
        const allNewEntries = {};
        
        for (const [childId, childEntries] of Object.entries(schedulesByChild)) {
          const promises = childEntries.map(entry => 
            api.post('/schedule', { ...entry, child_id: childId })
          );
          
          const responses = await Promise.all(promises);
          const newEntries = responses.map(response => response.data);
          
          allNewEntries[childId] = newEntries;
        }
        
        // Update local state with new entries for each child
        setAllScheduleEntries(prev => {
          const updated = { ...prev };
          Object.entries(allNewEntries).forEach(([childId, entries]) => {
            updated[childId] = [...(prev[childId] || []), ...entries];
          });
          return updated;
        });
        
        setAiScheduleResults(null); // Clear AI results
        setError(null);
        
        return { success: true, data: allNewEntries };
      } catch (apiError) {
        
        // Create local entries if API fails
        const allLocalEntries = {};
        let idCounter = Date.now();
        
        Object.entries(schedulesByChild).forEach(([childId, childEntries]) => {
          const localEntries = childEntries.map(entry => ({
            id: (idCounter++).toString(),
            child_id: childId,
            material_id: entry.material_id || null,
            subject_name: entry.subject_name || 'Study Time',
            scheduled_date: entry.scheduled_date,
            start_time: entry.start_time,
            duration_minutes: entry.duration_minutes,
            status: 'scheduled',
            created_by: 'ai',
            notes: entry.notes || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          
          allLocalEntries[childId] = localEntries;
        });
        
        // Add to local state for each child
        setAllScheduleEntries(prev => {
          const updated = { ...prev };
          Object.entries(allLocalEntries).forEach(([childId, entries]) => {
            updated[childId] = [...(prev[childId] || []), ...entries];
          });
          return updated;
        });
        
        setAiScheduleResults(null); // Clear AI results
        setError(null);
        
        return { success: true, data: allLocalEntries };
      }
    } catch (err) {
      const errorMessage = 'Failed to apply AI schedule';
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

  const openAIModal = () => {
    setShowAIModal(true);
  };

  const closeAIModal = () => {
    setShowAIModal(false);
    setAiScheduleResults(null);
  };

  // Load data when selected children change
  useEffect(() => {
    if (selectedChildrenIds && selectedChildrenIds.length > 0) {
      fetchMultipleChildrenSchedules(selectedChildrenIds);
    } else {
      // Clear all entries if no children selected
      setAllScheduleEntries({});
    }
  }, [selectedChildrenIds, fetchMultipleChildrenSchedules]);

  return {
    // Data
    allScheduleEntries,
    calendarEvents: getCombinedCalendarEvents(),
    
    // Loading states
    loading,
    error,
    aiScheduling,
    aiScheduleResults,
    
    // Modal states
    showCreateModal,
    showEditModal,
    showSettingsModal,
    showAIModal,
    editingEntry,
    
    // CRUD operations
    createScheduleEntry,
    createScheduleEntriesBatch,
    updateScheduleEntry,
    deleteScheduleEntry,
    
    // AI scheduling
    generateMultiChildAISchedule,
    applyAISchedule,
    
    // Status updates
    markEntryCompleted,
    
    // Modal controls
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    openSettingsModal,
    closeSettingsModal,
    openAIModal,
    closeAIModal,
    
    // Refresh
    refresh: () => {
      fetchMultipleChildrenSchedules(selectedChildrenIds);
    }
  };
}