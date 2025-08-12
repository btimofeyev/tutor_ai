// Custom hook for managing gradebook data across multiple children
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';
import { APP_GRADABLE_CONTENT_TYPES } from '../utils/dashboardConstants';
import { calculateGradeStats } from '../utils/dashboardHelpers';

export function useGradebookData(selectedChildrenIds, childrenData) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Gradebook-specific state
  const [needsGradingItems, setNeedsGradingItems] = useState([]);
  const [allGrades, setAllGrades] = useState({});

  // Filter states
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [searchTerm, setSearchTerm] = useState('');

  // Force refresh counter to trigger controlled updates
  const [forceRefresh, setForceRefresh] = useState(0);

  // Check if lesson data is loaded for the selected child
  const isLessonDataLoaded = useMemo(() => {
    if (!selectedChildrenIds?.length || !childrenData.selectedChild?.id) return false;

    const childSubjects = childrenData.childSubjects[childrenData.selectedChild.id] || [];
    if (childSubjects.length === 0) return false;

    // Check if we have lesson data for at least one subject
    return childSubjects.some(subject => {
      const lessons = childrenData.lessonsBySubject[subject.child_subject_id];
      return Array.isArray(lessons); // Even empty arrays indicate data was loaded
    });
  }, [
    selectedChildrenIds?.length,
    childrenData.selectedChild?.id,
    childrenData.childSubjects,
    childrenData.lessonsBySubject
  ]);

  // Process data function - controlled refresh to prevent infinite loops
  const processGradebookData = useCallback(() => {
    try {
      setError(null); // Clear any previous errors

      if (!selectedChildrenIds || selectedChildrenIds.length === 0 || !childrenData.children?.length) {
        setNeedsGradingItems([]);
        setAllGrades({});
        return;
      }

      // Wait for lesson data to be loaded before processing
      if (!isLessonDataLoaded) {
        setNeedsGradingItems([]);
        setAllGrades({});
        return;
      }

    const items = [];
    const grades = {};

    selectedChildrenIds.forEach(childId => {
      const child = childrenData.children.find(c => c.id === childId);
      if (!child) return;

      grades[childId] = {
        child_name: child.name,
        child_grade: child.grade,
        subjects: {}
      };

      const childSubjects = childrenData.childSubjects[childId] || [];

      childSubjects.forEach(subject => {
        const subjectLessons = childrenData.lessonsBySubject[subject.child_subject_id] || [];
        const subjectWeights = childrenData.gradeWeights[subject.child_subject_id] || [];

        // Filter for completed gradable items without grades (needs grading)
        const needsGrading = subjectLessons.filter(lesson =>
          lesson.completed_at &&
          (APP_GRADABLE_CONTENT_TYPES.includes(lesson.content_type) || lesson.content_type?.startsWith('custom_')) &&
          (lesson.grade_value === null || lesson.grade_value === undefined || lesson.grade_value === '')
        );

        // Add to needs grading items
        needsGrading.forEach(item => {
          items.push({
            ...item,
            child_name: child.name,
            child_id: child.id,
            subject_name: subject.name,
            subject_id: subject.child_subject_id,
            child_grade: child.grade
          });
        });

        // Filter for graded items
        const gradedItems = subjectLessons.filter(lesson =>
          lesson.grade_value !== null &&
          lesson.grade_value !== undefined &&
          lesson.grade_value !== ''
        );

        // Calculate subject statistics
        const gradeStats = calculateGradeStats(subjectLessons, subjectWeights);

        grades[childId].subjects[subject.child_subject_id] = {
          subject_name: subject.name,
          subject_id: subject.child_subject_id,
          materials: gradedItems.map(item => ({
            ...item,
            percentage: item.grade_max_value > 0
              ? Math.round((item.grade_value / item.grade_max_value) * 100)
              : item.grade_value
          })),
          stats: gradeStats,
          total_materials: subjectLessons.length,
          graded_count: gradedItems.length,
          ungraded_count: subjectLessons.filter(l =>
            (APP_GRADABLE_CONTENT_TYPES.includes(l.content_type) || l.content_type?.startsWith('custom_')) &&
            (l.grade_value === null || l.grade_value === undefined || l.grade_value === '')
          ).length
        };
      });
    });

    // Sort needs grading items
    const priorityOrder = {
      'test': 0,
      'quiz': 1,
      'assignment': 2,
      'review': 3,
      'worksheet': 4
    };

    items.sort((a, b) => {
      // Custom categories get medium priority (between assignment and review)
      const aPriority = a.content_type?.startsWith('custom_') ? 2.5 : (priorityOrder[a.content_type] || 99);
      const bPriority = b.content_type?.startsWith('custom_') ? 2.5 : (priorityOrder[b.content_type] || 99);

      const priorityDiff = aPriority - bPriority;
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.completed_at) - new Date(a.completed_at);
    });

      setNeedsGradingItems(items);
      setAllGrades(grades);
    } catch (error) {
      console.error('Error processing gradebook data:', error);
      setError('Failed to process gradebook data. Please try refreshing.');
      setNeedsGradingItems([]);
      setAllGrades({});
    }
  }, [forceRefresh, isLessonDataLoaded]); // Include data loaded state

  // Create a comprehensive hash to detect when lesson data changes for the selected child
  const lessonDataHash = useMemo(() => {
    if (!selectedChildrenIds?.length || !childrenData.selectedChild?.id) return '';

    const childSubjects = childrenData.childSubjects[childrenData.selectedChild.id] || [];
    const dataSignatures = childSubjects.map(subject => {
      const lessons = childrenData.lessonsBySubject[subject.child_subject_id] || [];

      // Create a signature that includes completion status, grades, and content
      const lessonSignature = lessons.map(lesson => {
        const completedState = lesson.completed_at ? '1' : '0';
        const gradeState = lesson.grade_value !== null && lesson.grade_value !== undefined && lesson.grade_value !== '' ? '1' : '0';
        const contentType = lesson.content_type || 'none';
        const isGradable = APP_GRADABLE_CONTENT_TYPES.includes(lesson.content_type) ? '1' : '0';

        return `${lesson.id}-${completedState}-${gradeState}-${contentType}-${isGradable}`;
      }).join(',');

      return `${subject.child_subject_id}:(${lessons.length}):[${lessonSignature}]`;
    }).join('|');

    return dataSignatures;
  }, [
    selectedChildrenIds?.length,
    childrenData.selectedChild?.id,
    childrenData.childSubjects,
    childrenData.lessonsBySubject
  ]);

  // Initial data processing and when selected children change
  useEffect(() => {
    if (selectedChildrenIds?.length > 0 && childrenData.children?.length > 0) {
      // Only show loading for actual data changes, not just dependency updates
      if (!isLessonDataLoaded || forceRefresh > 0) {
        setLoading(true);
      }

      processGradebookData();

      // Set loading to false with a small delay to prevent flashing
      const timer = setTimeout(() => {
        setLoading(false);
      }, isLessonDataLoaded ? 50 : 200);

      return () => clearTimeout(timer);
    } else {
      // If no children selected, don't show loading
      setLoading(false);
    }
  }, [selectedChildrenIds?.length, childrenData.children?.length, forceRefresh, lessonDataHash, isLessonDataLoaded, processGradebookData]);

  // Update a grade
  const updateGrade = useCallback(async (materialId, gradeData) => {
    try {
      const response = await api.put(`/materials/${materialId}`, {
        grade_value: gradeData.grade_value,
        grade_max_value: gradeData.grade_max_value || 100
      });

      return response.data;
    } catch (error) {
      console.error('Error updating grade:', error);
      throw error;
    }
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    let totalNeedsGrading = needsGradingItems.length;
    let totalGraded = 0;
    let totalScore = 0;
    let totalMaxScore = 0;
    let totalMaterials = 0;
    let completedMaterials = 0;

    // Process all grades for statistics
    Object.values(allGrades).forEach(childData => {
      Object.values(childData.subjects || {}).forEach(subjectData => {
        totalMaterials += subjectData.total_materials || 0;
        totalGraded += subjectData.graded_count || 0;

        // Calculate scores
        subjectData.materials?.forEach(material => {
          if (material.completed_at) {
            completedMaterials++;
          }
          if (material.grade_value !== null && material.grade_max_value) {
            totalScore += material.grade_value;
            totalMaxScore += material.grade_max_value;
          }
        });
      });
    });

    const averageGrade = totalMaxScore > 0
      ? Math.round((totalScore / totalMaxScore) * 100)
      : 0;

    const completionRate = totalMaterials > 0
      ? Math.round((completedMaterials / totalMaterials) * 100)
      : 0;

    return {
      needsGradingCount: totalNeedsGrading,
      totalGraded,
      averageGrade,
      completionRate,
      totalMaterials,
      completedMaterials
    };
  }, [needsGradingItems, allGrades]);

  // Filtered needs grading items
  const filteredNeedsGradingItems = useMemo(() => {
    let items = [...needsGradingItems];

    // Apply subject filter
    if (subjectFilter !== 'all') {
      items = items.filter(item => item.subject_id === subjectFilter);
    }

    // Apply content type filter
    if (contentTypeFilter !== 'all') {
      items = items.filter(item => item.content_type === contentTypeFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.title?.toLowerCase().includes(search) ||
        item.child_name?.toLowerCase().includes(search) ||
        item.subject_name?.toLowerCase().includes(search)
      );
    }

    // Apply date range filter
    if (dateRange.start) {
      items = items.filter(item => {
        const completedDate = new Date(item.completed_at);
        return completedDate >= dateRange.start;
      });
    }
    if (dateRange.end) {
      items = items.filter(item => {
        const completedDate = new Date(item.completed_at);
        return completedDate <= dateRange.end;
      });
    }

    return items;
  }, [needsGradingItems, subjectFilter, contentTypeFilter, searchTerm, dateRange]);

  // Filtered grades
  const filteredGrades = useMemo(() => {
    if (subjectFilter === 'all' && contentTypeFilter === 'all' && !searchTerm && !dateRange.start && !dateRange.end) {
      return allGrades;
    }

    const filtered = {};

    Object.entries(allGrades).forEach(([childId, childData]) => {
      const filteredChild = {
        ...childData,
        subjects: {}
      };

      Object.entries(childData.subjects || {}).forEach(([subjectId, subjectData]) => {
        // Apply subject filter
        if (subjectFilter !== 'all' && subjectId !== subjectFilter) {
          return;
        }

        let materials = [...(subjectData.materials || [])];

        // Apply content type filter
        if (contentTypeFilter !== 'all') {
          materials = materials.filter(item => item.content_type === contentTypeFilter);
        }

        // Apply search filter
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          materials = materials.filter(item =>
            item.title?.toLowerCase().includes(search)
          );
        }

        // Apply date range filter
        if (dateRange.start) {
          materials = materials.filter(item => {
            const completedDate = new Date(item.completed_at);
            return completedDate >= dateRange.start;
          });
        }
        if (dateRange.end) {
          materials = materials.filter(item => {
            const completedDate = new Date(item.completed_at);
            return completedDate <= dateRange.end;
          });
        }

        if (materials.length > 0) {
          filteredChild.subjects[subjectId] = {
            ...subjectData,
            materials
          };
        }
      });

      if (Object.keys(filteredChild.subjects).length > 0) {
        filtered[childId] = filteredChild;
      }
    });

    return filtered;
  }, [allGrades, subjectFilter, contentTypeFilter, searchTerm, dateRange]);

  // Refresh all gradebook data - triggers a refresh using forceRefresh counter
  const refreshGradebookData = useCallback(() => {
    try {
      setError(null); // Clear any existing errors
      setRefreshing(true);
      setForceRefresh(prev => prev + 1); // This will trigger the useEffect

      // Small delay to allow state to update
      setTimeout(() => {
        setRefreshing(false);
      }, 100);
    } catch (error) {
      console.error('Error refreshing gradebook data:', error);
      setError('Failed to refresh data. Please try again.');
      setRefreshing(false);
    }
  }, []);

  // Export grades to CSV
  const exportToCSV = useCallback(() => {
    const rows = [];
    rows.push(['Student', 'Grade Level', 'Subject', 'Material', 'Type', 'Due Date', 'Completed Date', 'Score', 'Max Score', 'Percentage']);

    Object.values(filteredGrades).forEach(childData => {
      Object.values(childData.subjects || {}).forEach(subjectData => {
        subjectData.materials?.forEach(material => {
          rows.push([
            childData.child_name,
            childData.child_grade || 'N/A',
            subjectData.subject_name,
            material.title,
            material.content_type,
            material.due_date || 'N/A',
            material.completed_at ? new Date(material.completed_at).toLocaleDateString() : 'N/A',
            material.grade_value || 'N/A',
            material.grade_max_value || 'N/A',
            material.percentage ? `${material.percentage}%` : 'N/A'
          ]);
        });
      });
    });

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gradebook_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [filteredGrades]);

  return {
    // State
    loading,
    refreshing,
    error,
    needsGradingItems: filteredNeedsGradingItems,
    allGrades: filteredGrades,
    stats,

    // Filters
    subjectFilter,
    setSubjectFilter,
    contentTypeFilter,
    setContentTypeFilter,
    dateRange,
    setDateRange,
    searchTerm,
    setSearchTerm,

    // Actions
    updateGrade,
    refreshGradebookData,
    exportToCSV
  };
}
