// utils/lessonUtils.js
// Utility functions for lesson management and display

/**
 * Extracts lesson number from lesson title using various patterns
 * @param {string} title - The lesson title
 * @returns {string} - Extracted lesson number or abbreviated title
 */
export function extractLessonNumber(title) {
  if (!title) return 'L?';

  // Common patterns to extract lesson numbers
  const patterns = [
    /lesson\s*(\d+)/i,           // "Lesson 10", "lesson 5"
    /^l(\d+)/i,                  // "L10", "l5"
    /chapter\s*(\d+)/i,          // "Chapter 5", "chapter 12"
    /^ch\s*(\d+)/i,              // "Ch 5", "ch12"
    /unit\s*(\d+)/i,             // "Unit 3", "unit 7"
    /^u(\d+)/i,                  // "U3", "u7"
    /part\s*(\d+)/i,             // "Part 2", "part 4"
    /^p(\d+)/i,                  // "P2", "p4"
    /section\s*(\d+)/i,          // "Section 8", "section 3"
    /^s(\d+)/i,                  // "S8", "s3"
    /(\d+)/                      // Any number in the title
  ];

  // Try each pattern
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      return `L${match[1]}`;
    }
  }

  // If no number found, create abbreviation from first letters
  const words = title.split(' ').filter(word => word.length > 0);
  if (words.length === 1) {
    // Single word - take first 3 characters
    return words[0].substring(0, 3).toUpperCase();
  } else if (words.length >= 2) {
    // Multiple words - take first letter of each, max 3
    return words.slice(0, 3).map(word => word[0].toUpperCase()).join('');
  }

  return 'L?';
}

/**
 * Gets child initials from child name
 * @param {string} childName - The child's name
 * @returns {string} - Child initials (max 2 characters)
 */
export function getChildInitials(childName) {
  if (!childName) return '?';

  const words = childName.trim().split(' ').filter(word => word.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 1).toUpperCase();
  } else {
    return words.slice(0, 2).map(word => word[0].toUpperCase()).join('');
  }
}

/**
 * Gets a child-specific color based on child name
 * @param {string} childName - The child's name
 * @returns {object} - Color configuration object
 */
export function getChildColor(childName) {
  if (!childName) {
    return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
  }

  // Generate consistent color based on name hash
  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', ring: 'ring-blue-400' },
    { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', ring: 'ring-green-400' },
    { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', ring: 'ring-purple-400' },
    { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300', ring: 'ring-pink-400' },
    { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', ring: 'ring-yellow-400' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', ring: 'ring-indigo-400' },
    { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', ring: 'ring-teal-400' },
    { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', ring: 'ring-orange-400' }
  ];

  // Simple hash function for consistent color selection
  let hash = 0;
  for (let i = 0; i < childName.length; i++) {
    hash = ((hash << 5) - hash + childName.charCodeAt(i)) & 0xffffffff;
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Formats lesson progress for display
 * @param {object} lessonContainerInfo - Lesson container information
 * @returns {string} - Formatted progress string
 */
export function formatLessonProgress(lessonContainerInfo) {
  if (!lessonContainerInfo) return '';

  const { completed_materials, total_materials, progress_percentage } = lessonContainerInfo;

  if (total_materials && total_materials > 0) {
    return `${completed_materials || 0}/${total_materials}`;
  }

  if (progress_percentage !== undefined) {
    return `${progress_percentage}%`;
  }

  return '';
}

/**
 * Determines if a lesson is complete based on lesson container info
 * @param {object} lessonContainerInfo - Lesson container information
 * @returns {boolean} - Whether the lesson is complete
 */
export function isLessonComplete(lessonContainerInfo) {
  if (!lessonContainerInfo) return false;

  const { completed_materials, total_materials, progress_percentage } = lessonContainerInfo;

  // Check if all materials are completed
  if (total_materials && total_materials > 0) {
    return (completed_materials || 0) >= total_materials;
  }

  // Check if progress is 100%
  if (progress_percentage !== undefined) {
    return progress_percentage >= 100;
  }

  return false;
}
