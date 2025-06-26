// Shared styling constants and utilities for the dashboard
// Extracted to eliminate code duplication across components

// Form styling constants - used across multiple components
export const formInputStyles = "block w-full border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--border-input-focus)] focus:border-[var(--border-input-focus)] rounded-[var(--radius-md)] bg-background-card text-text-primary placeholder-text-tertiary shadow-sm text-sm px-3 py-2";

export const formLabelStyles = "block text-sm font-medium text-text-primary mb-1";

export const formSelectStyles = "block w-full border-[var(--border-input)] focus:outline-none focus:ring-1 focus:ring-[var(--border-input-focus)] focus:border-[var(--border-input-focus)] rounded-[var(--radius-md)] bg-background-card text-text-primary shadow-sm text-sm px-3 py-2";

// Modal styling constants
export const modalBackdropStyles = "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 animate-fade-in";

export const modalContainerStyles = "bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col relative";

export const modalHeaderStyles = "bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100";

export const modalContentStyles = "flex-1 overflow-y-auto p-6";

export const modalCloseButtonStyles = "absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors";

// Button styling constants
export const buttonVariants = {
  primary: "bg-[var(--accent-blue)] text-[var(--text-on-accent)] border border-transparent hover:bg-[var(--accent-blue-hover)] focus:ring-2 focus:ring-[var(--accent-blue-darker-for-border)]",
  secondary: "bg-[var(--background-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--accent-yellow)] hover:border-transparent",
  danger: "bg-[var(--accent-red)] text-white border border-transparent hover:bg-[var(--accent-red-hover)]",
  ghost: "bg-transparent text-[var(--text-secondary)] border border-transparent hover:bg-[var(--accent-blue)]/20"
};

export const buttonSizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm", 
  lg: "px-6 py-3 text-base"
};

export const buttonBaseStyles = "inline-flex items-center justify-content font-medium rounded-[var(--radius-md)] transition-all duration-150 ease-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

// Card styling constants
export const cardStyles = "bg-[var(--background-card)] border border-[var(--border-subtle)] rounded-lg shadow-sm";

export const cardHeaderStyles = "p-4 border-b border-[var(--border-subtle)]";

export const cardContentStyles = "p-4";

// Status indicator styles
export const statusStyles = {
  complete: "bg-green-100 text-green-800",
  incomplete: "bg-gray-100 text-gray-800", 
  overdue: "bg-red-100 text-red-800",
  dueSoon: "bg-orange-100 text-orange-800"
};

// Z-index management for layered components
export const zIndexLevels = {
  dropdown: 10,
  sticky: 20,
  modal: 50,
  modalContent: 51,
  toast: 100,
  tooltip: 200
};

// Animation classes
export const animationClasses = {
  fadeIn: "animate-fade-in",
  slideIn: "transition-all duration-300 ease-in-out",
  scaleIn: "transition-transform duration-200",
  bounceIn: "animate-bounce"
};

// Grid and layout constants
export const gridStyles = {
  responsive2Col: "grid grid-cols-1 md:grid-cols-2 gap-4",
  responsive3Col: "grid grid-cols-1 md:grid-cols-3 gap-4", 
  responsive4Col: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
};

// Spacing constants
export const spacing = {
  section: "space-y-6",
  subsection: "space-y-4",
  items: "space-y-2",
  tight: "space-y-1"
};

// Utility function to combine classes safely
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// Common class combinations
export const combineClasses = {
  formField: (additionalClasses = '') => cn(formInputStyles, additionalClasses),
  button: (variant = 'primary', size = 'md', additionalClasses = '') => 
    cn(buttonBaseStyles, buttonVariants[variant], buttonSizes[size], additionalClasses),
  modal: (additionalClasses = '') => cn(modalContainerStyles, additionalClasses),
  card: (additionalClasses = '') => cn(cardStyles, additionalClasses)
};