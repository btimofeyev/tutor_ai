// Custom hook for managing dashboard filters and sorting
import { useState, useMemo } from 'react';
import { FILTER_OPTIONS } from '../utils/dashboardConstants';
import { 
  filterLessonsByStatus, 
  filterLessonsByContentType, 
  sortLessons,
  calculateGradeStats,
  calculateCompletionStats,
  isDateOverdue,
  isDateDueSoon
} from '../utils/dashboardHelpers';

export function useFiltersAndSorting(lessonsBySubject, gradeWeights, childSubjects, selectedChild) {
  // Filter and sort state
  const [filterStatus, setFilterStatus] = useState(FILTER_OPTIONS.STATUS.ALL);
  const [filterContentType, setFilterContentType] = useState(FILTER_OPTIONS.CONTENT_TYPE.ALL);
  const [sortBy, setSortBy] = useState(FILTER_OPTIONS.SORT.CREATED_DESC);

  // Compute dashboard statistics
  const dashboardStats = useMemo(() => {
    if (!selectedChild || Object.keys(lessonsBySubject).length === 0) return {};
    
    const stats = {};
    const subjectsForChild = childSubjects[selectedChild.id] || [];
    
    subjectsForChild.forEach(subject => {
      const subjectLessons = lessonsBySubject[subject.child_subject_id] || [];
      const subjectWeights = gradeWeights[subject.child_subject_id] || [];
      
      if (subjectLessons.length > 0) {
        const completionStats = calculateCompletionStats(subjectLessons);
        const gradeStats = calculateGradeStats(subjectLessons, subjectWeights);
        
        stats[subject.child_subject_id] = {
          ...subject,
          completionPercent: completionStats.completionPercent,
          completedCount: completionStats.completedCount,
          totalCount: completionStats.totalCount,
          avgGradePercent: gradeStats.avgGradePercent,
          gradableItemsCount: gradeStats.gradableItemsCount,
        };
      }
    });
    
    return stats;
  }, [selectedChild, lessonsBySubject, gradeWeights, childSubjects]);

  // Compute filtered and sorted lessons
  const filteredAndSortedLessonsBySubject = useMemo(() => {
    if (Object.keys(lessonsBySubject).length === 0) return {};
    
    const result = {};
    
    for (const childSubjectId in lessonsBySubject) {
      let subjectLessons = [...(lessonsBySubject[childSubjectId] || [])];
      
      // Apply filters
      subjectLessons = filterLessonsByStatus(subjectLessons, filterStatus);
      subjectLessons = filterLessonsByContentType(subjectLessons, filterContentType);
      
      // Apply sorting
      subjectLessons = sortLessons(subjectLessons, sortBy);
      
      result[childSubjectId] = subjectLessons;
    }
    
    return result;
  }, [lessonsBySubject, filterStatus, filterContentType, sortBy]);

  // Get total counts across all subjects for current child
  const totalStats = useMemo(() => {
    const subjectsForChild = childSubjects[selectedChild?.id] || [];
    let totalLessons = 0;
    let completedLessons = 0;
    let totalGradableItems = 0;
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;
    
    subjectsForChild.forEach(subject => {
      const subjectLessons = lessonsBySubject[subject.child_subject_id] || [];
      const subjectWeights = gradeWeights[subject.child_subject_id] || [];
      
      totalLessons += subjectLessons.length;
      completedLessons += subjectLessons.filter(lesson => lesson.completed_at).length;
      
      // Calculate due soon and overdue counts (only for incomplete lessons)
      subjectLessons.forEach(lesson => {
        if (!lesson.completed_at && lesson.due_date) {
          if (isDateOverdue(lesson.due_date)) {
            overdueCount++;
          } else if (isDateDueSoon(lesson.due_date, 7)) {
            dueSoonCount++;
          }
        }
      });
      
      const gradableItems = subjectLessons.filter(lesson => 
        lesson.grade !== null && 
        lesson.max_points !== null && 
        lesson.max_points > 0
      );
      
      totalGradableItems += gradableItems.length;
      
      gradableItems.forEach(lesson => {
        const weight = subjectWeights.find(w => w.content_type === lesson.content_type)?.weight || 0;
        if (weight > 0) {
          const percentage = (lesson.grade / lesson.max_points) * 100;
          totalWeightedScore += percentage * weight;
          totalWeight += weight;
        }
      });
    });
    
    const overallCompletionPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const overallGradePercent = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) / 100 : 0;
    
    return {
      totalItems: totalLessons,
      completedItems: completedLessons,
      overallCompletionPercent,
      dueSoon: dueSoonCount,
      overdue: overdueCount,
      totalGradableItems,
      overallGradePercent,
      // Keep legacy names for backward compatibility
      totalLessons,
      completedLessons
    };
  }, [selectedChild, lessonsBySubject, gradeWeights, childSubjects]);

  // Reset filters
  const resetFilters = () => {
    setFilterStatus(FILTER_OPTIONS.STATUS.ALL);
    setFilterContentType(FILTER_OPTIONS.CONTENT_TYPE.ALL);
    setSortBy(FILTER_OPTIONS.SORT.CREATED_DESC);
  };

  return {
    // Filter state
    filterStatus,
    setFilterStatus,
    filterContentType,
    setFilterContentType,
    sortBy,
    setSortBy,
    
    // Computed data
    dashboardStats,
    filteredAndSortedLessonsBySubject,
    totalStats,
    
    // Actions
    resetFilters,
    
    // Filter options (for dropdowns)
    filterOptions: FILTER_OPTIONS
  };
}