// Modern semantic subject color management with gradients and enhanced visual design
// This ensures consistent, meaningful colors across the entire application

// Semantic color mapping for specific subjects with modern gradients
export const SEMANTIC_SUBJECT_COLORS = {
  // Core Academic Subjects - Beautiful, modern colors
  'Mathematics': {
    bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300',
    bgDark: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    gradient: 'bg-gradient-to-br from-blue-100 to-blue-200',
    accent: 'blue', icon: '🔢', name: 'Mathematics'
  },
  'Math': {
    bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300',
    bgDark: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    gradient: 'bg-gradient-to-br from-blue-100 to-blue-200',
    accent: 'blue', icon: '🔢', name: 'Mathematics'
  },
  'English Language Arts': {
    bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300',
    bgDark: 'bg-gradient-to-br from-emerald-500 to-green-600',
    gradient: 'bg-gradient-to-br from-green-100 to-green-200',
    accent: 'green', icon: '📚', name: 'English Language Arts'
  },
  'English': {
    bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300',
    bgDark: 'bg-gradient-to-br from-emerald-500 to-green-600',
    gradient: 'bg-gradient-to-br from-green-100 to-green-200',
    accent: 'green', icon: '📚', name: 'English'
  },
  'Science': {
    bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300',
    bgDark: 'bg-gradient-to-br from-purple-500 to-violet-600',
    gradient: 'bg-gradient-to-br from-purple-100 to-purple-200',
    accent: 'purple', icon: '🔬', name: 'Science'
  },
  'Bible': {
    bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300',
    bgDark: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    gradient: 'bg-gradient-to-br from-yellow-100 to-yellow-200',
    accent: 'yellow', icon: '✝️', name: 'Bible'
  },
  'History': {
    bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300',
    bgDark: 'bg-gradient-to-br from-orange-500 to-amber-600',
    gradient: 'bg-gradient-to-br from-amber-100 to-amber-200',
    accent: 'amber', icon: '🏛️', name: 'History'
  },
  'Geography': {
    bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300',
    bgDark: 'bg-gradient-to-br from-teal-500 to-cyan-600',
    gradient: 'bg-gradient-to-br from-teal-100 to-teal-200',
    accent: 'teal', icon: '🌍', name: 'Geography'
  },

  // Creative & Arts Subjects - Soft, artistic colors
  'Art': {
    bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300',
    bgDark: 'bg-gradient-to-br from-pink-400 to-rose-500',
    gradient: 'bg-gradient-to-br from-pink-100 to-pink-200',
    accent: 'pink', icon: '🎨', name: 'Art'
  },
  'Music': {
    bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300',
    bgDark: 'bg-gradient-to-br from-indigo-500 to-purple-600',
    gradient: 'bg-gradient-to-br from-indigo-100 to-indigo-200',
    accent: 'indigo', icon: '🎵', name: 'Music'
  },
  'Literature': {
    bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300',
    bgDark: 'bg-gradient-to-br from-rose-500 to-pink-600',
    gradient: 'bg-gradient-to-br from-rose-100 to-rose-200',
    accent: 'rose', icon: '📖', name: 'Literature'
  },

  // Physical & Practical Subjects - Energetic, warm colors
  'Physical Education': {
    bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300',
    bgDark: 'bg-gradient-to-br from-orange-500 to-red-500',
    gradient: 'bg-gradient-to-br from-orange-100 to-orange-200',
    accent: 'orange', icon: '⚽', name: 'Physical Education'
  },
  'PE': {
    bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300',
    bgDark: 'bg-gradient-to-br from-orange-500 to-red-500',
    gradient: 'bg-gradient-to-br from-orange-100 to-orange-200',
    accent: 'orange', icon: '⚽', name: 'Physical Education'
  },
  'Foreign Language': {
    bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300',
    bgDark: 'bg-gradient-to-br from-sky-500 to-cyan-600',
    gradient: 'bg-gradient-to-br from-cyan-100 to-cyan-200',
    accent: 'cyan', icon: '🌐', name: 'Foreign Language'
  }
};

// Beautiful fallback colors for subjects not in semantic mapping
export const SUBJECT_COLORS = [
  { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300', name: 'Slate', bgDark: 'bg-gradient-to-br from-slate-500 to-gray-600', gradient: 'bg-gradient-to-br from-slate-100 to-slate-200', accent: 'slate', icon: '📄' },
  { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', name: 'Red', bgDark: 'bg-gradient-to-br from-red-500 to-rose-600', gradient: 'bg-gradient-to-br from-red-100 to-red-200', accent: 'red', icon: '❤️' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', name: 'Emerald', bgDark: 'bg-gradient-to-br from-emerald-500 to-teal-600', gradient: 'bg-gradient-to-br from-emerald-100 to-emerald-200', accent: 'emerald', icon: '💎' },
  { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300', name: 'Sky', bgDark: 'bg-gradient-to-br from-sky-500 to-blue-600', gradient: 'bg-gradient-to-br from-sky-100 to-sky-200', accent: 'sky', icon: '☁️' },
  { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300', name: 'Violet', bgDark: 'bg-gradient-to-br from-violet-500 to-purple-600', gradient: 'bg-gradient-to-br from-violet-100 to-violet-200', accent: 'violet', icon: '💜' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-300', name: 'Fuchsia', bgDark: 'bg-gradient-to-br from-fuchsia-400 to-pink-500', gradient: 'bg-gradient-to-br from-fuchsia-100 to-fuchsia-200', accent: 'fuchsia', icon: '🌸' },
  { bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-300', name: 'Lime', bgDark: 'bg-gradient-to-br from-lime-500 to-green-600', gradient: 'bg-gradient-to-br from-lime-100 to-lime-200', accent: 'lime', icon: '🍋' },
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', name: 'Amber', bgDark: 'bg-gradient-to-br from-amber-500 to-orange-600', gradient: 'bg-gradient-to-br from-amber-100 to-amber-200', accent: 'amber', icon: '🌟' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', name: 'Rose', bgDark: 'bg-gradient-to-br from-rose-500 to-pink-600', gradient: 'bg-gradient-to-br from-rose-100 to-rose-200', accent: 'rose', icon: '🌹' },
  { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', name: 'Cyan', bgDark: 'bg-gradient-to-br from-cyan-500 to-teal-600', gradient: 'bg-gradient-to-br from-cyan-100 to-cyan-200', accent: 'cyan', icon: '🌊' }
];

// Predefined colors for common generic learning types
const GENERIC_SUBJECT_COLORS = {
  'Review': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', name: 'Emerald', bgDark: 'bg-emerald-200' },
  'Fun Learning': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', name: 'Amber', bgDark: 'bg-amber-200' },
  'Study Skills': { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', name: 'Violet', bgDark: 'bg-violet-200' },
  'Organization': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', name: 'Slate', bgDark: 'bg-slate-200' },
  'Break': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', name: 'Gray', bgDark: 'bg-gray-200' },
  'Free Time': { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200', name: 'Sky', bgDark: 'bg-sky-200' },
  'Reading Time': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', name: 'Rose', bgDark: 'bg-rose-200' },
  'Creative Time': { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-200', name: 'Fuchsia', bgDark: 'bg-fuchsia-200' },
  'Practice': { bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-200', name: 'Lime', bgDark: 'bg-lime-200' },
  'Assessment': { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200', name: 'Stone', bgDark: 'bg-stone-200' }
};

/**
 * Get consistent color for a subject with semantic mapping priority
 * @param {string} subjectName - Name of the subject
 * @param {Array} childSubjects - Array of child's subjects
 * @returns {Object} Color object with bg, text, border, gradient classes and icon
 */
export function getSubjectColor(subjectName, childSubjects = []) {
  // Handle the case where subjectName might be like "Bible: Lesson 3"
  // Extract just the subject part before the colon
  const baseSubjectName = subjectName?.split(':')[0]?.trim() || subjectName;

  // 1. First check semantic subject colors (priority mapping)
  if (SEMANTIC_SUBJECT_COLORS[baseSubjectName]) {
    return SEMANTIC_SUBJECT_COLORS[baseSubjectName];
  }
  if (SEMANTIC_SUBJECT_COLORS[subjectName]) {
    return SEMANTIC_SUBJECT_COLORS[subjectName];
  }

  // 2. Try to find subject by matching various name formats in child subjects
  // Ensure childSubjects is an array before calling findIndex
  const subjectIndex = Array.isArray(childSubjects) ? childSubjects.findIndex(s => {
    const displayName = s.custom_subject_name_override || s.subject?.name || s.name;
    const baseName = s.subject?.name || s.name;

    // Check multiple matching strategies
    return displayName === baseSubjectName ||
           baseName === baseSubjectName ||
           displayName === subjectName ||
           baseName === subjectName;
  }) : -1;

  if (subjectIndex !== -1) {
    return SUBJECT_COLORS[subjectIndex % SUBJECT_COLORS.length];
  }

  // 3. Check for predefined generic subject colors
  if (GENERIC_SUBJECT_COLORS[subjectName]) {
    return GENERIC_SUBJECT_COLORS[subjectName];
  }
  if (GENERIC_SUBJECT_COLORS[baseSubjectName]) {
    return GENERIC_SUBJECT_COLORS[baseSubjectName];
  }

  // 4. Enhanced fallback - use a pleasant default color
  return {
    bg: 'bg-neutral-100', text: 'text-neutral-800', border: 'border-neutral-300',
    name: 'Neutral', bgDark: 'bg-gradient-to-br from-neutral-400 to-neutral-600',
    gradient: 'bg-gradient-to-br from-neutral-100 to-neutral-200',
    accent: 'neutral', icon: '📄'
  };
}

/**
 * Get text color class for a subject
 * @param {string} subjectName - Name of the subject
 * @param {Array} childSubjects - Array of child's subjects
 * @returns {string} Text color class
 */
export function getSubjectTextColor(subjectName, childSubjects) {
  return getSubjectColor(subjectName, childSubjects).text;
}

/**
 * Get darker background color class for better contrast (used in calendar events)
 * @param {string} subjectName - Name of the subject
 * @param {Array} childSubjects - Array of child's subjects
 * @returns {string} Darker background color class
 */
export function getSubjectDarkBgColor(subjectName, childSubjects) {
  return getSubjectColor(subjectName, childSubjects).bgDark;
}

/**
 * Get gradient background class for modern calendar events
 * @param {string} subjectName - Name of the subject
 * @param {Array} childSubjects - Array of child's subjects
 * @returns {string} Gradient background class
 */
export function getSubjectGradient(subjectName, childSubjects) {
  return getSubjectColor(subjectName, childSubjects).gradient;
}

/**
 * Get subject icon/emoji for visual identification
 * @param {string} subjectName - Name of the subject
 * @param {Array} childSubjects - Array of child's subjects
 * @returns {string} Subject icon/emoji
 */
export function getSubjectIcon(subjectName, childSubjects) {
  return getSubjectColor(subjectName, childSubjects).icon || '📄';
}

/**
 * Get accent color name for theming
 * @param {string} subjectName - Name of the subject
 * @param {Array} childSubjects - Array of child's subjects
 * @returns {string} Accent color name
 */
export function getSubjectAccent(subjectName, childSubjects) {
  return getSubjectColor(subjectName, childSubjects).accent || 'neutral';
}

// Additional colors for child differentiation when multiple children are shown
const CHILD_VARIATIONS = [
  { opacity: 'opacity-100', border: 'border-2', name: 'Full' },
  { opacity: 'opacity-80', border: 'border-dashed border-2', name: 'Dashed' },
  { opacity: 'opacity-60', border: 'border-dotted border-2', name: 'Dotted' },
  { opacity: 'opacity-90', border: 'border-double border-4', name: 'Double' }
];

/**
 * Get unique styling for a child-subject combination in multi-child view
 * @param {string} subjectName - Name of the subject
 * @param {string} childId - ID of the child
 * @param {Array} childSubjects - Array of child's subjects
 * @param {Array} allChildren - Array of all children for consistent child ordering
 * @returns {Object} Style object with colors and variations
 */
export function getMultiChildSubjectStyle(subjectName, childId, childSubjects = [], allChildren = []) {
  const baseColor = getSubjectColor(subjectName, childSubjects);
  const childIndex = Array.isArray(allChildren) ? allChildren.findIndex(child => child.id === childId) : -1;
  const childVariation = CHILD_VARIATIONS[Math.max(0, childIndex) % CHILD_VARIATIONS.length];

  return {
    ...baseColor,
    opacity: childVariation.opacity,
    border: childVariation.border,
    childVariation: childVariation.name,
    // Enhanced visual differentiation
    bgWithVariation: `${baseColor.gradient} ${childVariation.opacity}`,
    borderWithVariation: `${baseColor.border} ${childVariation.border}`
  };
}

/**
 * Get child-specific color variation for legend display
 * @param {number} childIndex - Index of child in the children array
 * @returns {Object} Child variation styling
 */
export function getChildVariation(childIndex) {
  return CHILD_VARIATIONS[childIndex % CHILD_VARIATIONS.length];
}

/**
 * Get all available generic subject colors for reference
 * @returns {Object} All predefined generic subject colors
 */
export function getGenericSubjectColors() {
  return GENERIC_SUBJECT_COLORS;
}

/**
 * Check if a subject name has a predefined generic color
 * @param {string} subjectName - Name of the subject
 * @returns {boolean} True if subject has a predefined generic color
 */
export function hasGenericSubjectColor(subjectName) {
  return GENERIC_SUBJECT_COLORS.hasOwnProperty(subjectName);
}

// Color mapping for Chart.js - convert accent colors to actual CSS colors
const CHART_COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  purple: '#8B5CF6',
  yellow: '#F59E0B',
  amber: '#F59E0B',
  teal: '#14B8A6',
  pink: '#EC4899',
  indigo: '#6366F1',
  rose: '#F43F5E',
  orange: '#F97316',
  cyan: '#06B6D4',
  slate: '#64748B',
  red: '#EF4444',
  emerald: '#10B981',
  sky: '#0EA5E9',
  violet: '#8B5CF6',
  fuchsia: '#D946EF',
  lime: '#84CC16',
  neutral: '#737373',
  gray: '#6B7280'
};

/**
 * Get Chart.js compatible color string for a subject
 * @param {string} subjectName - Name of the subject
 * @param {Array} childSubjects - Array of child's subjects
 * @returns {string} Valid CSS color string for Chart.js
 */
export function getSubjectChartColor(subjectName, childSubjects = []) {
  const colorObj = getSubjectColor(subjectName, childSubjects);
  const accent = colorObj.accent || 'neutral';
  return CHART_COLORS[accent] || CHART_COLORS.neutral;
}
