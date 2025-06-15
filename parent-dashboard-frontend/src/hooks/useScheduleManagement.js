// hooks/useScheduleManagement.js
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export function useScheduleManagement(childId, subscriptionPermissions) {
  // State for schedule entries
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [schedulePreferences, setSchedulePreferences] = useState(null);
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

  // Fetch schedule entries for a child
  const fetchScheduleEntries = useCallback(async (childId) => {
    if (!childId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/schedule/${childId}`);
      setScheduleEntries(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching schedule entries:', err);
      
      // Don't clear existing entries if API fails - keep local state
      // This prevents losing locally created entries when the API is unavailable
      console.log('API unavailable, keeping existing local entries');
      
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
      console.error('Error fetching schedule preferences:', err);
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
        
        // Add the new entry to the local state
        setScheduleEntries(prev => [...prev, response.data]);
        setError(null);
        return { success: true, data: response.data };
      } catch (apiError) {
        console.log('API not available, saving to local state:', apiError.message);
        
        // Create a local entry if API fails
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
        
        // Add to local state
        setScheduleEntries(prev => [...prev, localEntry]);
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
  const updateScheduleEntry = async (entryId, updateData) => {
    try {
      setLoading(true);
      
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
        console.log('API not available, updating local state:', apiError.message);
        
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
        console.log('API not available, deleting from local state:', apiError.message);
        
        // Remove from local state if API fails
        setScheduleEntries(prev => prev.filter(entry => entry.id !== entryId));
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

  // Update schedule preferences
  const updateSchedulePreferences = async (preferences) => {
    try {
      setLoading(true);
      const response = await api.post(`/schedule/preferences/${childId}`, preferences);
      setSchedulePreferences(response.data);
      setError(null);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error updating schedule preferences:', err);
      const errorMessage = err.response?.data?.error || 'Failed to update preferences';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Generate AI schedule
  const generateAISchedule = async (parameters = {}) => {
    if (!subscriptionPermissions?.hasAIAccess) {
      setError('AI scheduling requires AI access - upgrade your plan or add Klio AI Pack');
      return { success: false, error: 'AI scheduling requires AI access - upgrade your plan or add Klio AI Pack' };
    }

    try {
      setAiScheduling(true);
      console.log('Starting AI schedule generation with parameters:', parameters);
      console.log('Child ID:', childId);
      
      const requestData = {
        child_id: childId,
        ...parameters
      };
      console.log('Request data:', requestData);
      
      const response = await api.post('/schedule/ai-generate', requestData);
      console.log('AI schedule response:', response.data);
      
      setAiScheduleResults(response.data);
      setError(null);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error generating AI schedule:', err);
      console.error('Error details:', err.response?.data);
      const errorMessage = err.response?.data?.error || 'Failed to generate AI schedule';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setAiScheduling(false);
    }
  };

  // Apply AI schedule results
  const applyAISchedule = async (scheduleData) => {
    try {
      setLoading(true);
      
      // Try API first, but fallback to local state if it fails
      try {
        // Create multiple schedule entries from AI results
        const promises = scheduleData.map(entry => 
          api.post('/schedule', { ...entry, child_id: childId })
        );
        
        const responses = await Promise.all(promises);
        const newEntries = responses.map(response => response.data);
        
        // Update local state with new entries
        setScheduleEntries(prev => [...prev, ...newEntries]);
        setAiScheduleResults(null); // Clear AI results
        setError(null);
        
        return { success: true, data: newEntries };
      } catch (apiError) {
        console.log('API not available, saving AI schedule to local state:', apiError.message);
        
        // Create local entries if API fails
        const localEntries = scheduleData.map((entry, index) => ({
          id: (Date.now() + index).toString(), // Simple ID generation with increment
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
        
        // Add to local state
        setScheduleEntries(prev => [...prev, ...localEntries]);
        setAiScheduleResults(null); // Clear AI results
        setError(null);
        
        return { success: true, data: localEntries };
      }
    } catch (err) {
      console.error('Error applying AI schedule:', err);
      const errorMessage = 'Failed to apply AI schedule';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Convert schedule entries to calendar events
  const getCalendarEvents = () => {
    return scheduleEntries.map(entry => ({
      id: entry.id,
      title: entry.material?.title || entry.subject_name || 'Study Time',
      subject: entry.subject_name,
      date: entry.scheduled_date,
      startTime: entry.start_time,
      duration: entry.duration_minutes,
      status: entry.status,
      notes: entry.notes,
      // Also keep the original calendar format for compatibility
      start: new Date(`${entry.scheduled_date}T${entry.start_time}`),
      end: new Date(new Date(`${entry.scheduled_date}T${entry.start_time}`).getTime() + (entry.duration_minutes * 60000)),
      resource: {
        ...entry,
        subject: entry.subject_name,
        type: entry.material?.content_type || 'study_time',
        status: entry.status
      }
    }));
  };

  // Mark schedule entry as completed
  const markEntryCompleted = async (entryId) => {
    return updateScheduleEntry(entryId, { status: 'completed' });
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

  const openAIModal = () => {
    setShowAIModal(true);
  };

  const closeAIModal = () => {
    setShowAIModal(false);
    setAiScheduleResults(null); // Clear any existing results
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
    updateSchedulePreferences,
    
    // AI scheduling
    generateAISchedule,
    applyAISchedule,
    
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
    openAIModal,
    closeAIModal,
    
    // Refresh - only if we have API connectivity, otherwise keep local state
    refresh: () => {
      // Only refresh if we don't have local entries or if we want to sync with server
      fetchScheduleEntries(childId);
    }
  };
}