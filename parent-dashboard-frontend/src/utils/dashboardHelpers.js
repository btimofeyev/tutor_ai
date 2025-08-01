// Dashboard utility functions extracted from dashboard page

/**
 * Date utility functions
 */
export const isDateOverdue = (dateString) => {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Parse as local date, not UTC
  const dueDate = new Date(dateString + "T00:00:00");
  return dueDate < today;
};

export const isDateDueSoon = (dateString, days = 7) => {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Parse as local date, not UTC
  const dueDate = new Date(dateString + "T00:00:00");
  const soonCutoff = new Date(today);
  soonCutoff.setDate(today.getDate() + days);
  return dueDate >= today && dueDate <= soonCutoff;
};

/**
 * Validation functions
 */
export const validateChildCredentials = (username, pin, confirmPin) => {
  const errors = [];
  
  if (!username || username.trim().length < 3) {
    errors.push("Username must be at least 3 characters long");
  }
  
  if (!pin || pin.length < 4) {
    errors.push("PIN must be at least 4 digits long");
  }
  
  if (pin !== confirmPin) {
    errors.push("PINs do not match");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateLessonData = (lessonData) => {
  const errors = [];
  
  if (!lessonData.title || lessonData.title.trim().length === 0) {
    errors.push("Lesson title is required");
  }
  
  if (!lessonData.content_type) {
    errors.push("Content type is required");
  }
  
  if (lessonData.grade_max_value && isNaN(Number(lessonData.grade_max_value))) {
    errors.push("Max points must be a valid number");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Data transformation functions
 */
export const calculateGradeStats = (lessons, weights) => {
  if (!lessons || lessons.length === 0) return { avgGradePercent: 0, gradableItemsCount: 0 };
  
  const gradableItems = lessons.filter(lesson => 
    lesson.grade_value !== null && 
    lesson.grade_max_value !== null && 
    lesson.grade_max_value > 0
  );
  
  if (gradableItems.length === 0) return { avgGradePercent: 0, gradableItemsCount: 0 };
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  gradableItems.forEach(lesson => {
    const weight = weights.find(w => w.content_type === lesson.content_type)?.weight || 0;
    if (weight > 0) {
      const percentage = (lesson.grade_value / lesson.grade_max_value) * 100;
      totalWeightedScore += percentage * weight;
      totalWeight += weight;
    }
  });
  
  const avgWeightedGradePercent = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  
  return {
    avgGradePercent: Math.round(avgWeightedGradePercent * 100) / 100,
    gradableItemsCount: gradableItems.length
  };
};

export const calculateCompletionStats = (lessons) => {
  if (!lessons || lessons.length === 0) return { completionPercent: 0, completedCount: 0, totalCount: 0 };
  
  const completedCount = lessons.filter(lesson => lesson.completed_at).length;
  const totalCount = lessons.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  return {
    completionPercent,
    completedCount,
    totalCount
  };
};

/**
 * Filtering and sorting functions
 */
export const filterLessonsByStatus = (lessons, filterStatus) => {
  if (filterStatus === "all") return lessons;
  
  return lessons.filter((lesson) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(today.getDate() + 7);
    
    switch (filterStatus) {
      case "complete":
        return !!lesson.completed_at;
      case "incomplete":
        return !lesson.completed_at;
      case "overdue":
        return !lesson.completed_at && isDateOverdue(lesson.due_date);
      case "dueSoon":
        return !lesson.completed_at && isDateDueSoon(lesson.due_date, 7) && !isDateOverdue(lesson.due_date);
      
      // New smart filters
      case "needsAttention":
        // Overdue items or completed items that need grading
        return (!lesson.completed_at && isDateOverdue(lesson.due_date)) ||
               (lesson.completed_at && lesson.grade_max_value && !lesson.grade_value);
      
      case "todaysWork":
        // Due today or scheduled for today
        if (!lesson.due_date) return false;
        const dueDate = new Date(lesson.due_date + 'T00:00:00');
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime() && !lesson.completed_at;
      
      case "thisWeek":
        // Due within the next 7 days (including today)
        if (!lesson.due_date) return false;
        const dueDateThisWeek = new Date(lesson.due_date + 'T00:00:00');
        return dueDateThisWeek >= today && dueDateThisWeek <= weekFromNow && !lesson.completed_at;
      
      case "readyToGrade":
        // Completed assignments that have max points but no grade yet
        return lesson.completed_at && lesson.grade_max_value && !lesson.grade_value;
      
      default:
        return true;
    }
  });
};

export const filterLessonsByContentType = (lessons, filterContentType) => {
  if (filterContentType === "all") return lessons;
  return lessons.filter(lesson => lesson.content_type === filterContentType);
};

export const sortLessons = (lessons, sortBy) => {
  const sortedLessons = [...lessons];
  
  switch (sortBy) {
    case "dueDateAsc":
      sortedLessons.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });
      break;
    case "dueDateDesc":
      sortedLessons.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(b.due_date) - new Date(a.due_date);
      });
      break;
    case "titleAsc":
      sortedLessons.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;
    case "titleDesc":
      sortedLessons.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
      break;
    case "createdAtAsc":
      sortedLessons.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case "createdAtDesc":
    default:
      sortedLessons.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
  }
  
  return sortedLessons;
};