// Custom hook for managing children data and selection
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { defaultWeightsForNewSubject } from '../utils/dashboardConstants';

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
      console.warn('Failed to save dashboard data to localStorage:', error);
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
      console.warn('Failed to load dashboard data from localStorage:', error);
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
      
      // Auto-select first child if none selected
      if (childrenData.length > 0 && !selectedChild) {
        setSelectedChild(childrenData[0]);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      setChildren([]);
    } finally {
      setLoadingInitial(false);
    }
  }, [session, selectedChild]);

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
        console.log(`Loaded data from localStorage for child ${selectedChild.id}`);
        
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
      console.log(`Using cached data for child ${selectedChild.id}`);
      return;
    }
    
    setLoadingChildData(true);
    
    try {
      // Fetch child subjects
      const childSubjectsRes = await api.get(`/child-subjects/child/${selectedChild.id}`);
      const subjects = childSubjectsRes.data || [];
      setChildSubjects(prev => ({ ...prev, [selectedChild.id]: subjects }));
      
      // Initialize data structures for each subject
      const newLessonsByUnit = { ...lessonsByUnit };
      const newLessonsBySubject = { ...lessonsBySubject };
      const newGradeWeights = { ...gradeWeights };
      const newUnitsBySubject = { ...unitsBySubject };
      
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
              console.error(`Error fetching lessons for unit ${unit.id}:`, err);
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
          console.error(`Error fetching data for subject ${subject.name}:`, err);
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
      console.error("Error refreshing child data:", error);
    } finally {
      setLoadingChildData(false);
    }
  }, [selectedChild, session, isCacheValid, childDataCache, lessonsByUnit, lessonsBySubject, gradeWeights, unitsBySubject, loadFromStorage, saveToStorage]);

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

  // Invalidate cache for a specific child (useful when data is modified)
  const invalidateChildCache = useCallback((childId) => {
    setChildDataCache(prev => ({ ...prev, [childId]: false }));
    setLastFetchTime(prev => ({ ...prev, [childId]: 0 }));
    
    // Clear localStorage as well
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(getStorageKey(childId, 'data'));
      } catch (error) {
        console.warn('Failed to clear localStorage for child:', childId, error);
      }
    }
  }, []);

  // Refresh child data when selected child changes
  useEffect(() => {
    if (selectedChild) {
      refreshChildSpecificData();
    }
  }, [selectedChild, refreshChildSpecificData]);

  return {
    // Children data
    children,
    selectedChild,
    setSelectedChild,
    
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
    refreshChildSpecificData,
    fetchChildren,
    invalidateChildCache,
    
    // Cache utilities
    isCacheValid,
    
    // Computed values
    assignedSubjectsForCurrentChild: childSubjects[selectedChild?.id] || []
  };
}