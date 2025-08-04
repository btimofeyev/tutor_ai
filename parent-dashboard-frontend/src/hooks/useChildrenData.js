// Custom hook for managing children data and selection
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { defaultWeightsForNewSubject } from '../utils/dashboardConstants';
import { performDataCleanup, clearOrphanedCache } from '../utils/dataCleanup';

export function useChildrenData(session) {
  // Children state
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  
  // Child-specific data with caching
  const [childSubjects, setChildSubjects] = useState({});
  const [lessonsByUnit, setLessonsByUnit] = useState({});
  const [lessonsBySubject, setLessonsBySubject] = useState({});
  const [gradeWeights, setGradeWeights] = useState({});
  const [unitsBySubject, setUnitsBySubject] = useState({});
  
  // Cache metadata to track data freshness
  const [childDataCache, setChildDataCache] = useState({});
  const [lastFetchTime, setLastFetchTime] = useState({});
  
  // Loading states
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingChildData, setLoadingChildData] = useState(false);
  
  // Track if initial child selection has been done
  const [hasAutoSelectedChild, setHasAutoSelectedChild] = useState(false);
  
  // Cache expiry time (5 minutes)
  const CACHE_EXPIRY_MS = 5 * 60 * 1000;
  
  // localStorage keys
  const STORAGE_PREFIX = 'tutor_ai_dashboard_';
  const getStorageKey = (childId, dataType) => `${STORAGE_PREFIX}${childId}_${dataType}`;
  
  // Save data to localStorage
  const saveToStorage = useCallback((childId, data) => {
    if (typeof window === 'undefined') return;
    try {
      const storageData = {
        ...data,
        timestamp: Date.now()
      };
      localStorage.setItem(getStorageKey(childId, 'data'), JSON.stringify(storageData));
    } catch (error) {
    }
  }, []);
  
  // Load data from localStorage
  const loadFromStorage = useCallback((childId) => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(getStorageKey(childId, 'data'));
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      if (!data.timestamp) return null;
      
      // Check if data is still fresh
      if (Date.now() - data.timestamp > CACHE_EXPIRY_MS) {
        localStorage.removeItem(getStorageKey(childId, 'data'));
        return null;
      }
      
      return data;
    } catch (error) {
      return null;
    }
  }, [CACHE_EXPIRY_MS]);

  // Add child form state
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildGrade, setNewChildGrade] = useState("");

  // Fetch children data
  const fetchChildren = useCallback(async () => {
    if (!session) return;
    
    try {
      const response = await api.get('/children');
      const childrenData = response.data || [];
      setChildren(childrenData);
      
      // Auto-select first child if none selected (handled in separate useEffect)
    } catch (error) {
      setChildren([]);
    } finally {
      setLoadingInitial(false);
    }
  }, [session]);

  // Check if cached data is still fresh
  const isCacheValid = useCallback((childId) => {
    const lastFetch = lastFetchTime[childId];
    if (!lastFetch) return false;
    return (Date.now() - lastFetch) < CACHE_EXPIRY_MS;
  }, [lastFetchTime, CACHE_EXPIRY_MS]);

  // Fetch child-specific data when child is selected
  const refreshChildSpecificData = useCallback(async (forceRefresh = false) => {
    if (!selectedChild?.id || !session) return;
    
    // First, try to load from localStorage
    if (!forceRefresh) {
      const storedData = loadFromStorage(selectedChild.id);
      if (storedData) {
        
        // Apply stored data
        setChildSubjects(prev => ({ ...prev, [selectedChild.id]: storedData.subjects || [] }));
        setUnitsBySubject(prev => ({ ...prev, ...storedData.unitsBySubject }));
        setLessonsByUnit(prev => ({ ...prev, ...storedData.lessonsByUnit }));
        setLessonsBySubject(prev => ({ ...prev, ...storedData.lessonsBySubject }));
        setGradeWeights(prev => ({ ...prev, ...storedData.gradeWeights }));
        
        // Update cache metadata
        setChildDataCache(prev => ({ ...prev, [selectedChild.id]: true }));
        setLastFetchTime(prev => ({ ...prev, [selectedChild.id]: storedData.timestamp }));
        
        return;
      }
    }
    
    // Check if we have fresh cached data and don't need to refetch
    if (!forceRefresh && isCacheValid(selectedChild.id) && childDataCache[selectedChild.id]) {
      return;
    }
    
    setLoadingChildData(true);
    
    try {
      // Fetch child subjects
      const childSubjectsRes = await api.get(`/child-subjects/child/${selectedChild.id}`);
      const subjects = childSubjectsRes.data || [];
      setChildSubjects(prev => ({ ...prev, [selectedChild.id]: subjects }));
      
      // Initialize data structures for each subject
      // Clear existing data for the current child's subjects first
      const currentChildSubjects = childSubjects[selectedChild.id] || [];
      const currentChildSubjectIds = currentChildSubjects.map(s => s.child_subject_id);
      
      const newLessonsByUnit = { ...lessonsByUnit };
      const newLessonsBySubject = { ...lessonsBySubject };
      const newGradeWeights = { ...gradeWeights };
      const newUnitsBySubject = { ...unitsBySubject };
      
      // Clear data for current child's subjects to prevent stale data
      currentChildSubjectIds.forEach(subjectId => {
        delete newLessonsBySubject[subjectId];
        delete newGradeWeights[subjectId];
        delete newUnitsBySubject[subjectId];
      });
      
      // Create all API calls for parallel execution
      const subjectPromises = subjects.map(async (subject) => {
        if (!subject.child_subject_id) return null;
        
        try {
          // Fetch units, materials, and weights in parallel for each subject
          const [unitsRes, materialsRes, weightsRes] = await Promise.all([
            api.get(`/units/subject/${subject.child_subject_id}`),
            api.get(`/materials/subject/${subject.child_subject_id}`),
            api.get(`/weights/${subject.child_subject_id}`)
          ]);
          
          const units = unitsRes.data || [];
          const materials = materialsRes.data || [];
          const weights = weightsRes.data || [...defaultWeightsForNewSubject];
          
          // Fetch lesson containers for all units in parallel
          const lessonContainerPromises = units.map(async (unit) => {
            try {
              const lessonsRes = await api.get(`/lesson-containers/unit/${unit.id}`);
              return { unitId: unit.id, lessons: lessonsRes.data || [] };
            } catch (err) {
              return { unitId: unit.id, lessons: [] };
            }
          });
          
          const lessonContainerResults = await Promise.all(lessonContainerPromises);
          
          // Process materials to ensure they have proper subject names
          const materialsWithSubject = materials.map(material => ({
            ...material,
            subject_name: material.subject_name || subject.name
          }));
          
          return {
            subjectId: subject.child_subject_id,
            subjectName: subject.name,
            units,
            materials: materialsWithSubject,
            weights,
            lessonContainers: lessonContainerResults
          };
          
        } catch (err) {
          return {
            subjectId: subject.child_subject_id,
            subjectName: subject.name,
            units: [],
            materials: [],
            weights: [...defaultWeightsForNewSubject],
            lessonContainers: []
          };
        }
      });
      
      // Wait for all subject data to load in parallel
      const subjectResults = await Promise.all(subjectPromises);
      
      // Update state with all results
      subjectResults.forEach(result => {
        if (result) {
          newUnitsBySubject[result.subjectId] = result.units;
          newLessonsBySubject[result.subjectId] = result.materials;
          newGradeWeights[result.subjectId] = result.weights;
          
          // Update lesson containers by unit
          result.lessonContainers.forEach(({ unitId, lessons }) => {
            newLessonsByUnit[unitId] = lessons;
          });
        }
      });
      
      // Update all state at once
      setUnitsBySubject(newUnitsBySubject);
      setLessonsByUnit(newLessonsByUnit);
      setLessonsBySubject(newLessonsBySubject);
      setGradeWeights(newGradeWeights);
      
      // Save to localStorage
      const dataToStore = {
        subjects,
        unitsBySubject: newUnitsBySubject,
        lessonsByUnit: newLessonsByUnit,
        lessonsBySubject: newLessonsBySubject,
        gradeWeights: newGradeWeights
      };
      saveToStorage(selectedChild.id, dataToStore);
      
      // Update cache metadata
      setChildDataCache(prev => ({ ...prev, [selectedChild.id]: true }));
      setLastFetchTime(prev => ({ ...prev, [selectedChild.id]: Date.now() }));
      
    } catch (error) {
    } finally {
      setLoadingChildData(false);
    }
  }, [selectedChild, session, isCacheValid, childDataCache, loadFromStorage, saveToStorage]);

  // Add new child
  const handleAddChild = useCallback(async (childData) => {
    try {
      const response = await api.post('/children', childData);
      const newChild = response.data;
      
      // Refresh children list
      await fetchChildren();
      
      // Select the new child
      if (newChild) {
        setSelectedChild(newChild);
      }
      
      return { success: true, child: newChild };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || "Failed to add child",
        code: error.response?.data?.code 
      };
    }
  }, [fetchChildren]);

  // Initial data fetch
  useEffect(() => {
    if (session) {
      fetchChildren();
    }
  }, [session, fetchChildren]);

  // Auto-select child when children are first loaded (not on subsequent updates)
  useEffect(() => {
    if (children.length > 0 && !selectedChild && !hasAutoSelectedChild) {
      // Check if there's a persisted selectedChild ID from sessionStorage
      const persistedChildId = typeof window !== 'undefined' ? 
        sessionStorage.getItem('tutor_ai_selected_child_id') : null;
      
      if (persistedChildId) {
        // Try to find the persisted child in the current children list
        const persistedChild = children.find(child => child.id.toString() === persistedChildId);
        if (persistedChild) {
          setSelectedChild(persistedChild);
          setHasAutoSelectedChild(true);
          return;
        }
      }
      
      // Fallback to first child if no valid persisted child found
      setSelectedChild(children[0]);
      setHasAutoSelectedChild(true);
    }
  }, [children.length, selectedChild, hasAutoSelectedChild]); // Use children.length instead of children array

  // Invalidate cache for a specific child (useful when data is modified)
  const invalidateChildCache = useCallback((childId) => {
    setChildDataCache(prev => ({ ...prev, [childId]: false }));
    setLastFetchTime(prev => ({ ...prev, [childId]: 0 }));
    
    // Clear localStorage as well
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(getStorageKey(childId, 'data'));
      } catch (error) {
      }
    }
  }, []);

  // Delete child
  const deleteChild = useCallback(async (childId) => {
    try {
      const response = await api.delete(`/children/${childId}`);
      
      // Clear the child's cached data
      invalidateChildCache(childId);
      
      // Clear all cached data to ensure no orphaned lessons
      clearOrphanedCache();
      
      // Clear all state related to the deleted child
      setChildSubjects(prev => {
        const newState = { ...prev };
        delete newState[childId];
        return newState;
      });
      
      setLessonsBySubject(prev => {
        const newState = { ...prev };
        // Remove any lessons that might be associated with deleted child's subjects
        Object.keys(newState).forEach(subjectId => {
          // We'll let the server cleanup handle this, but clear local state
          delete newState[subjectId];
        });
        return {};
      });
      
      setLessonsByUnit(prev => ({})); // Clear all lesson unit associations
      setUnitsBySubject(prev => ({})); // Clear all unit associations
      setGradeWeights(prev => ({})); // Clear all grade weights
      
      // Refresh children list
      await fetchChildren();
      
      // Get updated children list to perform cleanup
      const remainingChildren = children.filter(child => child.id !== childId);
      
      // Perform comprehensive data cleanup
      const cleanupResult = await performDataCleanup(remainingChildren);
      console.log('Data cleanup completed:', cleanupResult);
      
      // If the deleted child was selected, select the first remaining child or null
      if (selectedChild?.id === childId) {
        setSelectedChild(remainingChildren.length > 0 ? remainingChildren[0] : null);
      }
      
      return { 
        success: true, 
        message: response.data.message || 'Child deleted successfully',
        deleted_child: response.data.deleted_child,
        cleanup: cleanupResult
      };
    } catch (error) {
      console.error('Delete child error:', error.response?.data);
      return { 
        success: false, 
        error: error.response?.data?.error || error.response?.data?.message || "Failed to delete child" 
      };
    }
  }, [selectedChild, children, fetchChildren, invalidateChildCache]);

  // Refresh child data when selected child changes
  useEffect(() => {
    if (selectedChild) {
      refreshChildSpecificData();
    }
  }, [selectedChild]); // Only depend on selectedChild, not the function

  // Create a wrapped setSelectedChild that persists to sessionStorage
  const setSelectedChildWithPersistence = useCallback((child) => {
    setSelectedChild(child);
    if (typeof window !== 'undefined' && child) {
      sessionStorage.setItem('tutor_ai_selected_child_id', child.id.toString());
    }
  }, []);

  // Also persist when selectedChild changes internally (like from auto-selection)
  useEffect(() => {
    if (selectedChild && typeof window !== 'undefined') {
      sessionStorage.setItem('tutor_ai_selected_child_id', selectedChild.id.toString());
    }
  }, [selectedChild]);

  return {
    // Children data
    children,
    selectedChild,
    setSelectedChild: setSelectedChildWithPersistence,
    
    // Child-specific data
    childSubjects,
    lessonsByUnit,
    setLessonsByUnit,
    lessonsBySubject,
    gradeWeights,
    unitsBySubject,
    setUnitsBySubject,
    
    // Loading states
    loadingInitial,
    loadingChildData,
    
    // Add child form
    showAddChild,
    setShowAddChild,
    newChildName,
    setNewChildName,
    newChildGrade,
    setNewChildGrade,
    
    // Actions
    handleAddChild,
    deleteChild,
    refreshChildSpecificData,
    fetchChildren,
    invalidateChildCache,
    
    // Cache utilities
    isCacheValid,
    
    // Computed values
    assignedSubjectsForCurrentChild: childSubjects[selectedChild?.id] || []
  };
}