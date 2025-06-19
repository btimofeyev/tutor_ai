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
  
  // Fallback for subjects not in child's list
  return { bg: 'bg-gray-400', text: 'text-gray-400', border: 'border-gray-400', name: 'Gray' };
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