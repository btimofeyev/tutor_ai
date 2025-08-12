// Common utility functions used across dashboard components
// Extracted to reduce code duplication and improve maintainability

// Error handling utilities
export const handleApiError = (error, defaultMessage = "An error occurred") => {
  const message = error.response?.data?.error ||
                  error.response?.data?.message ||
                  error.message ||
                  defaultMessage;

  const code = error.response?.data?.code;

  return {
    success: false,
    error: message,
    code: code,
    status: error.response?.status
  };
};

export const createSuccessResponse = (data, message = "Operation successful") => ({
  success: true,
  data,
  message
});

export const createErrorResponse = (error, message = "Operation failed") => ({
  success: false,
  error: typeof error === 'string' ? error : error.message,
  message
});

// Date formatting utilities
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };

  try {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(undefined, { ...defaultOptions, ...options });
  } catch (error) {
    return dateString;
  }
};

export const formatDueDate = (dueDateString) => {
  if (!dueDateString) return '';

  try {
    const dueDate = new Date(dueDateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due Today';
    if (diffDays === 1) return 'Due Tomorrow';
    if (diffDays <= 7) return `Due in ${diffDays} days`;

    return formatDate(dueDateString, { month: 'short', day: 'numeric' });
  } catch (error) {
    return dueDateString;
  }
};

export const isOverdue = (dueDateString) => {
  if (!dueDateString) return false;

  try {
    const dueDate = new Date(dueDateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  } catch (error) {
    return false;
  }
};

export const isDueSoon = (dueDateString, daysThreshold = 7) => {
  if (!dueDateString) return false;

  try {
    const dueDate = new Date(dueDateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= 0 && diffDays <= daysThreshold;
  } catch (error) {
    return false;
  }
};

// Validation utilities
export const validatePin = (pin) => {
  if (!pin) return { valid: false, error: "PIN cannot be empty." };
  if (!/^\d{4,6}$/.test(pin)) return { valid: false, error: "PIN must be 4 to 6 digits." };
  return { valid: true };
};

export const validateUsername = (username) => {
  if (!username || !username.trim()) return { valid: false, error: "Username cannot be empty." };
  if (username.trim().length < 3) return { valid: false, error: "Username must be at least 3 characters." };
  return { valid: true };
};

export const validateGrade = (grade) => {
  if (!grade) return { valid: true }; // Grade is optional

  const numericGrade = parseFloat(grade);
  if (isNaN(numericGrade)) return { valid: false, error: "Grade must be a number." };
  if (numericGrade < 0) return { valid: false, error: "Grade cannot be negative." };

  return { valid: true };
};

export const validateEmail = (email) => {
  if (!email) return { valid: false, error: "Email is required." };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { valid: false, error: "Please enter a valid email address." };

  return { valid: true };
};

// String utilities
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const formatContentType = (contentType) => {
  if (!contentType) return '';
  return contentType
    .split('_')
    .map(word => capitalizeFirst(word))
    .join(' ');
};

// Array utilities
export const sortByProperty = (array, property, direction = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[property];
    const bVal = b[property];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (direction === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });
};

export const groupBy = (array, keyFunction) => {
  return array.reduce((groups, item) => {
    const key = keyFunction(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
};

// Debounce utility for performance
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Local storage utilities
export const getFromLocalStorage = (key, defaultValue = null) => {
  if (typeof window === 'undefined') return defaultValue;

  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn('Error reading from localStorage:', error);
    return defaultValue;
  }
};

export const saveToLocalStorage = (key, value) => {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('Error saving to localStorage:', error);
    return false;
  }
};

export const removeFromLocalStorage = (key) => {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn('Error removing from localStorage:', error);
    return false;
  }
};

// Form utilities
export const createFormData = (files, additionalData = {}) => {
  const formData = new FormData();

  // Add files
  if (files instanceof FileList) {
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i], files[i].name);
    }
  } else if (Array.isArray(files)) {
    files.forEach(file => {
      formData.append("files", file, file.name);
    });
  }

  // Add additional data
  Object.entries(additionalData).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return formData;
};

// Number utilities
export const calculatePercentage = (completed, total) => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined) return '0';
  return Number(num).toFixed(decimals);
};

// Async utilities
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i === maxRetries) break;

      const delay = baseDelay * Math.pow(2, i);
      await wait(delay);
    }
  }

  throw lastError;
};

// File utilities
export const getFileExtension = (filename) => {
  if (!filename) return '';
  return filename.split('.').pop().toLowerCase();
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isValidFileType = (filename, allowedTypes = []) => {
  if (!allowedTypes.length) return true;

  const extension = getFileExtension(filename);
  return allowedTypes.includes(extension);
};
