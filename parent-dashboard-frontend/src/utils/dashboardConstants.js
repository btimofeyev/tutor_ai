// Dashboard constants extracted from dashboard page
export const APP_CONTENT_TYPES = [
  "lesson",
  "worksheet", 
  "review",
  "test",
  "quiz",
  "notes",
  "reading_material",
  "other",
];

export const APP_GRADABLE_CONTENT_TYPES = [
  "worksheet",
  "review",
  "test",
  "quiz",
];

// Realistic weight distribution that adds up to 100%
export const defaultWeightsForNewSubject = APP_CONTENT_TYPES.map((ct) => {
  const weightMap = {
    // Gradable content types - total 100% (redistributed from removing assignment)
    "worksheet": 0.25,     // 25% - Regular practice work (was 15%, +10% from removed assignment)
    "review": 0.30,        // 30% - Chapter/unit reviews (was 25%, +5% from removed assignment)
    "test": 0.25,          // 25% - Tests and major assessments (was 20%, +5% from removed assignment)
    "quiz": 0.20,          // 20% - Quick assessments and checks (was 15%, +5% from removed assignment)
    // Non-gradable content types - 0%
    "lesson": 0.0,         // Teaching materials
    "notes": 0.0,          // Reference materials
    "reading_material": 0.0, // Textbooks, articles
    "other": 0.0           // Miscellaneous
  };
  
  return {
    content_type: ct,
    weight: weightMap[ct] || 0.0
  };
});

// Form styles are now consolidated in dashboardStyles.js
// Import them from there to avoid duplication

// Filter and sort options
export const FILTER_OPTIONS = {
  STATUS: {
    ALL: "all",
    COMPLETE: "complete", 
    INCOMPLETE: "incomplete",
    OVERDUE: "overdue",
    DUE_SOON: "dueSoon"
  },
  CONTENT_TYPE: {
    ALL: "all",
    ...APP_CONTENT_TYPES.reduce((acc, type) => {
      acc[type.toUpperCase()] = type;
      return acc;
    }, {})
  },
  SORT: {
    CREATED_DESC: "createdAtDesc",
    CREATED_ASC: "createdAtAsc", 
    TITLE_ASC: "titleAsc",
    TITLE_DESC: "titleDesc",
    DUE_DATE_ASC: "dueDateAsc",
    DUE_DATE_DESC: "dueDateDesc"
  }
};