// Custom hook for managing children data and selection
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { defaultWeightsForNewSubject } from '../utils/dashboardConstants';

export function useChildrenData(session) {
  // Children state
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  
  // Child-specific data
  const [childSubjects, setChildSubjects] = useState({});
  const [lessonsByUnit, setLessonsByUnit] = useState({});
  const [lessonsBySubject, setLessonsBySubject] = useState({});
  const [gradeWeights, setGradeWeights] = useState({});
  const [unitsBySubject, setUnitsBySubject] = useState({});
  
  // Loading states
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingChildData, setLoadingChildData] = useState(false);

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

  // Fetch child-specific data when child is selected
  const refreshChildSpecificData = useCallback(async () => {
    if (!selectedChild?.id || !session) return;
    
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
      
      // Fetch data for each subject
      for (const subject of subjects) {
        if (subject.child_subject_id) {
          try {
            // Fetch units for this subject
            const unitsRes = await api.get(`/units/subject/${subject.child_subject_id}`);
            const units = unitsRes.data || [];
            newUnitsBySubject[subject.child_subject_id] = units;
            
            // Fetch lessons for each unit
            for (const unit of units) {
              const lessonsRes = await api.get(`/lesson-containers/unit/${unit.id}`);
              newLessonsByUnit[unit.id] = lessonsRes.data || [];
            }
            
            // Fetch all materials/lessons for this subject
            const materialsRes = await api.get(`/materials/subject/${subject.child_subject_id}`);
            newLessonsBySubject[subject.child_subject_id] = materialsRes.data || [];
            
            // Fetch grade weights for this subject
            const weightsRes = await api.get(`/weights/${subject.child_subject_id}`);
            newGradeWeights[subject.child_subject_id] = weightsRes.data || [...defaultWeightsForNewSubject];
            
          } catch (err) {
            console.error(`Error fetching data for subject ${subject.name}:`, err);
            // Set defaults on error
            newLessonsBySubject[subject.child_subject_id] = [];
            newGradeWeights[subject.child_subject_id] = [...defaultWeightsForNewSubject];
            newUnitsBySubject[subject.child_subject_id] = [];
          }
        }
      }
      
      // Update all state at once
      setUnitsBySubject(newUnitsBySubject);
      setLessonsByUnit(newLessonsByUnit);
      setLessonsBySubject(newLessonsBySubject);
      setGradeWeights(newGradeWeights);
      
    } catch (error) {
      console.error("Error refreshing child data:", error);
    } finally {
      setLoadingChildData(false);
    }
  }, [selectedChild, session, lessonsByUnit, lessonsBySubject, gradeWeights, unitsBySubject]);

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
    lessonsBySubject,
    gradeWeights,
    unitsBySubject,
    
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
    
    // Computed values
    assignedSubjectsForCurrentChild: childSubjects[selectedChild?.id] || []
  };
}