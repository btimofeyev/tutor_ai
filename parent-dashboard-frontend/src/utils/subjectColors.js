// Centralized subject color management
// This ensures consistent colors across the entire application

// Soft pastel colors aligned with student app design system
export const SUBJECT_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', name: 'Blue', bgDark: 'bg-blue-200' },
  { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', name: 'Green', bgDark: 'bg-green-200' },
  { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', name: 'Yellow', bgDark: 'bg-yellow-200' },
  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', name: 'Purple', bgDark: 'bg-purple-200' },
  { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', name: 'Pink', bgDark: 'bg-pink-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', name: 'Indigo', bgDark: 'bg-indigo-200' },
  { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', name: 'Teal', bgDark: 'bg-teal-200' },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', name: 'Orange', bgDark: 'bg-orange-200' },
  { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', name: 'Red', bgDark: 'bg-red-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', name: 'Cyan', bgDark: 'bg-cyan-200' }
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
 * Get consistent color for a subject based on its position in the child's subjects list
 * @param {string} subjectName - Name of the subject
 * @param {Array} childSubjects - Array of child's subjects
 * @returns {Object} Color object with bg, text, border classes
 */
export function getSubjectColor(subjectName, childSubjects) {
  const subjectIndex = childSubjects.findIndex(s => s.name === subjectName);
  if (subjectIndex !== -1) {
    return SUBJECT_COLORS[subjectIndex % SUBJECT_COLORS.length];
  }
  
  // Check for predefined generic subject colors
  if (GENERIC_SUBJECT_COLORS[subjectName]) {
    return GENERIC_SUBJECT_COLORS[subjectName];
  }
  
  // Enhanced fallback - use a pleasant default color instead of grey
  return { bg: 'bg-neutral-100', text: 'text-neutral-700', border: 'border-neutral-200', name: 'Neutral', bgDark: 'bg-neutral-200' };
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
export function getMultiChildSubjectStyle(subjectName, childId, childSubjects, allChildren) {
  const baseColor = getSubjectColor(subjectName, childSubjects);
  const childIndex = allChildren.findIndex(child => child.id === childId);
  const childVariation = CHILD_VARIATIONS[childIndex % CHILD_VARIATIONS.length];
  
  return {
    ...baseColor,
    opacity: childVariation.opacity,
    border: childVariation.border,
    childVariation: childVariation.name
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