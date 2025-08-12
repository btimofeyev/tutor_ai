// Dashboard constants extracted from dashboard page
export const APP_CONTENT_TYPES = [
  "lesson",
  "worksheet",
  "assignment",
  "review",
  "test",
  "quiz",
  "notes",
  "reading_material",
  "other",
];

export const APP_GRADABLE_CONTENT_TYPES = [
  "worksheet",
  "assignment",
  "review",
  "test",
  "quiz",
];

// Realistic weight distribution that adds up to 100%
export const defaultWeightsForNewSubject = APP_CONTENT_TYPES.map((ct) => {
  const weightMap = {
    // Gradable content types - total 100%
    "worksheet": 0.20,     // 20% - Regular practice work
    "assignment": 0.25,    // 25% - Assignments and projects
    "review": 0.25,        // 25% - Chapter/unit reviews
    "test": 0.20,          // 20% - Tests and major assessments
    "quiz": 0.10,          // 10% - Quick assessments and checks
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

// Utility function to merge standard content types with custom categories
export const mergeContentTypesWithCustomCategories = (customCategories = []) => {
  const merged = { ...CONTENT_TYPES_EXTENDED };

  // Add custom categories as content types
  customCategories.forEach(category => {
    const categoryKey = `custom_${category.id}`;
    merged[categoryKey] = {
      label: category.category_name,
      description: 'Custom grade category',
      icon: '📝',
      color: 'purple',
      isGradable: true,
      isCustom: true,
      customId: category.id
    };
  });

  return merged;
};

// Extended content type definitions with metadata for UI components
export const CONTENT_TYPES_EXTENDED = {
  lesson: {
    label: 'Lesson',
    description: 'Teaching material or instruction',
    icon: '📖',
    color: 'blue',
    isGradable: false
  },
  worksheet: {
    label: 'Worksheet',
    description: 'Practice exercises and problems',
    icon: '📝',
    color: 'green',
    isGradable: true
  },
  assignment: {
    label: 'Assignment',
    description: 'Homework or project work',
    icon: '📋',
    color: 'orange',
    isGradable: true
  },
  review: {
    label: 'Review',
    description: 'Review materials and practice',
    icon: '🔍',
    color: 'yellow',
    isGradable: true
  },
  test: {
    label: 'Test',
    description: 'Major assessment or exam',
    icon: '🧪',
    color: 'red',
    isGradable: true
  },
  quiz: {
    label: 'Quiz',
    description: 'Short assessment or check',
    icon: '❓',
    color: 'pink',
    isGradable: true
  },
  notes: {
    label: 'Notes',
    description: 'Reference material and notes',
    icon: '📔',
    color: 'gray',
    isGradable: false
  },
  reading_material: {
    label: 'Reading Material',
    description: 'Books, articles, and texts',
    icon: '📚',
    color: 'indigo',
    isGradable: false
  },
  other: {
    label: 'Other',
    description: 'Miscellaneous materials',
    icon: '📄',
    color: 'slate',
    isGradable: false
  }
};

// Utility to format content type names for display
export const formatContentTypeName = (contentType, customCategories = []) => {
  if (contentType?.startsWith('custom_')) {
    const categoryId = parseInt(contentType.replace('custom_', ''));
    const category = customCategories.find(cat => cat.id === categoryId);
    return category ? category.category_name : contentType;
  }

  const typeInfo = CONTENT_TYPES_EXTENDED[contentType];
  return typeInfo ? typeInfo.label : contentType?.charAt(0).toUpperCase() + contentType?.slice(1).replace(/_/g, ' ');
};

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
