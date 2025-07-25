// Dashboard constants extracted from dashboard page
export const APP_CONTENT_TYPES = [
  "lesson",
  "worksheet", 
  "assignment",
  "test",
  "quiz",
  "notes",
  "reading_material",
  "other",
];

export const APP_GRADABLE_CONTENT_TYPES = [
  "worksheet",
  "assignment", 
  "test",
  "quiz",
];

export const defaultWeightsForNewSubject = APP_CONTENT_TYPES.map((ct) => ({
  content_type: ct,
  weight: APP_GRADABLE_CONTENT_TYPES.includes(ct) ? 0.1 : 0.0,
}));

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