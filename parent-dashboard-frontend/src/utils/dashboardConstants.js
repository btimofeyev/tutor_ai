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

// Form styling constants
export const FORM_STYLES = {
  inputBaseClass: "block w-full border-border-input focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue rounded-lg bg-background-card text-text-primary placeholder-text-tertiary shadow-sm",
  inputPaddingClass: "py-2 px-3", 
  inputSizeClass: "text-sm",
  labelClass: "block text-xs font-medium text-text-secondary mb-1"
};

// Computed form styles
export const formInputStyles = `${FORM_STYLES.inputBaseClass} ${FORM_STYLES.inputPaddingClass} ${FORM_STYLES.inputSizeClass}`;
export const formLabelStyles = FORM_STYLES.labelClass;

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