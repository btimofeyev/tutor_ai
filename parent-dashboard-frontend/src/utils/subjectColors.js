// Centralized subject color management
// This ensures consistent colors across the entire application

// Available colors for subjects
export const SUBJECT_COLORS = [
  { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500', name: 'Red' },
  { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', name: 'Blue' },
  { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500', name: 'Green' },
  { bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500', name: 'Purple' },
  { bg: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500', name: 'Yellow' },
  { bg: 'bg-indigo-500', text: 'text-indigo-500', border: 'border-indigo-500', name: 'Indigo' },
  { bg: 'bg-pink-500', text: 'text-pink-500', border: 'border-pink-500', name: 'Pink' },
  { bg: 'bg-teal-500', text: 'text-teal-500', border: 'border-teal-500', name: 'Teal' },
  { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', name: 'Orange' },
  { bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500', name: 'Cyan' }
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