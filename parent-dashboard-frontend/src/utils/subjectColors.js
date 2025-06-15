// Centralized subject color management
// This ensures consistent colors across the entire application

// Available soft pastel colors for subjects - perfect for educational/school theme
export const SUBJECT_COLORS = [
  { bg: 'bg-rose-200', text: 'text-rose-700', border: 'border-rose-300', name: 'Rose', bgDark: 'bg-rose-300' },
  { bg: 'bg-sky-200', text: 'text-sky-700', border: 'border-sky-300', name: 'Sky', bgDark: 'bg-sky-300' },
  { bg: 'bg-emerald-200', text: 'text-emerald-700', border: 'border-emerald-300', name: 'Emerald', bgDark: 'bg-emerald-300' },
  { bg: 'bg-violet-200', text: 'text-violet-700', border: 'border-violet-300', name: 'Violet', bgDark: 'bg-violet-300' },
  { bg: 'bg-amber-200', text: 'text-amber-700', border: 'border-amber-300', name: 'Amber', bgDark: 'bg-amber-300' },
  { bg: 'bg-indigo-200', text: 'text-indigo-700', border: 'border-indigo-300', name: 'Indigo', bgDark: 'bg-indigo-300' },
  { bg: 'bg-pink-200', text: 'text-pink-700', border: 'border-pink-300', name: 'Pink', bgDark: 'bg-pink-300' },
  { bg: 'bg-teal-200', text: 'text-teal-700', border: 'border-teal-300', name: 'Teal', bgDark: 'bg-teal-300' },
  { bg: 'bg-orange-200', text: 'text-orange-700', border: 'border-orange-300', name: 'Orange', bgDark: 'bg-orange-300' },
  { bg: 'bg-cyan-200', text: 'text-cyan-700', border: 'border-cyan-300', name: 'Cyan', bgDark: 'bg-cyan-300' }
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
 * Get background color class for a subject
 * @param {string} subjectName - Name of the subject
 * @param {Array} childSubjects - Array of child's subjects
 * @returns {string} Background color class
 */
export function getSubjectBgColor(subjectName, childSubjects) {
  return getSubjectColor(subjectName, childSubjects).bg;
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
 * Get border color class for a subject
 * @param {string} subjectName - Name of the subject
 * @param {Array} childSubjects - Array of child's subjects
 * @returns {string} Border color class
 */
export function getSubjectBorderColor(subjectName, childSubjects) {
  return getSubjectColor(subjectName, childSubjects).border;
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
 * Generate color assignment when subjects are first assigned to a child
 * This can be used in the subject assignment UI to show preview colors
 * @param {Array} subjects - Array of subject names to assign colors to
 * @returns {Array} Array of subjects with assigned colors
 */
export function assignColorsToSubjects(subjects) {
  return subjects.map((subject, index) => ({
    ...subject,
    color: SUBJECT_COLORS[index % SUBJECT_COLORS.length]
  }));
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