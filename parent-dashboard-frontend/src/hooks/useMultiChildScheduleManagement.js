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
          console.error(`Error fetching schedule for child ${childId}:`, err);
          return { data: [] }; // Return empty data on error
        })
      );
      
      const responses = await Promise.all(promises);
      
      // Organize entries by child ID
      const entriesByChild = {};
      childrenIds.forEach((childId, index) => {
        entriesByChild[childId] = responses[index]?.data || [];
      });
      
      setAllScheduleEntries(entriesByChild);
      setError(null);
    } catch (err) {
      console.error('Error fetching multiple children schedules:', err);
      // Keep existing entries if API fails
      console.log('API unavailable, keeping existing local entries');
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get combined calendar events for all selected children
  const getCombinedCalendarEvents = useCallback(() => {
    const allEvents = [];
    
    Object.entries(allScheduleEntries).forEach(([childId, entries]) => {
      const child = allChildren.find(c => c.id === childId);
      const childName = child?.name || 'Unknown';
      
      entries.forEach(entry => {
        allEvents.push({
          id: `${childId}-${entry.id}`,
          title: entry.material?.title || entry.subject_name || 'Study Time',
          subject: entry.subject_name,
          childId: childId,
          childName: childName,
          date: entry.scheduled_date,
          startTime: entry.start_time,
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
  }, [allScheduleEntries, allChildren]);

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
        
        // Add the new entry to the local state for the specific child
        setAllScheduleEntries(prev => ({
          ...prev,
          [targetChildId]: [...(prev[targetChildId] || []), response.data]
        }));
        setError(null);
        return { success: true, data: response.data };
      } catch (apiError) {
        console.log('API not available, saving to local state:', apiError.message);
        
        // Create a local entry if API fails
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
        
        // Add to local state for the specific child
        setAllScheduleEntries(prev => ({
          ...prev,
          [targetChildId]: [...(prev[targetChildId] || []), localEntry]
        }));
        setError(null);
        return { success: true, data: localEntry };
      }
    } catch (err) {
      console.error('Error creating schedule entry:', err);
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
        console.log('API not available, updating local state:', apiError.message);
        
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
        return { success: true };
      }
    } catch (err) {
      console.error('Error updating schedule entry:', err);
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
        console.log('API not available, deleting from local state:', apiError.message);
        
        // Remove from local state if API fails
        setAllScheduleEntries(prev => ({
          ...prev,
          [childId]: (prev[childId] || []).filter(entry => entry.id !== entryId)
        }));
        setError(null);
        return { success: true };
      }
    } catch (err) {
      console.error('Error deleting schedule entry:', err);
      const errorMessage = 'Failed to delete schedule entry';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Generate AI schedule for multiple children
  const generateMultiChildAISchedule = async (parameters = {}) => {
    if (!subscriptionPermissions?.hasAIAccess) {
      setError('AI scheduling requires AI access - upgrade your plan or add Klio AI Pack');
      return { success: false, error: 'AI scheduling requires AI access - upgrade your plan or add Klio AI Pack' };
    }

    try {
      setAiScheduling(true);
      console.log('Starting multi-child AI schedule generation with parameters:', parameters);
      
      const requestData = {
        children_ids: selectedChildrenIds,
        ...parameters
      };
      console.log('Request data:', requestData);
      
      const response = await api.post('/schedule/ai-generate-multi', requestData);
      console.log('Multi-child AI schedule response:', response.data);
      
      setAiScheduleResults(response.data);
      setError(null);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error generating multi-child AI schedule:', err);
      console.error('Error details:', err.response?.data);
      const errorMessage = err.response?.data?.error || 'Failed to generate AI schedule';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setAiScheduling(false);
    }
  };

  // Mark schedule entry as completed with sync notification
  const markEntryCompleted = async (entryId, childId) => {
    const result = await updateScheduleEntry(entryId, { status: 'completed' }, childId);
    
    // Show success message if materials were synced
    if (result.success && result.data?.synced_materials > 0) {
      console.log(`Schedule entry completed and synced with ${result.data.synced_materials} material(s)`);
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
    updateScheduleEntry,
    deleteScheduleEntry,
    
    // AI scheduling
    generateMultiChildAISchedule,
    
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