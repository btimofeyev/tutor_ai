// Accessibility utilities and helpers
// Provides consistent ARIA labels, focus management, and screen reader support

// Focus management utilities
export const focusManagement = {
  // Trap focus within a modal or container
  trapFocus: (container) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }

      if (e.key === 'Escape') {
        const closeButton = container.querySelector('[data-close-modal]');
        if (closeButton) closeButton.click();
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  },

  // Focus first error in a form
  focusFirstError: (formContainer) => {
    const firstError = formContainer.querySelector('[aria-invalid="true"], .error-field');
    if (firstError) {
      firstError.focus();
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  // Restore focus to a previous element
  restoreFocus: (previousElement) => {
    if (previousElement && typeof previousElement.focus === 'function') {
      previousElement.focus();
    }
  }
};

// ARIA label generators
export const ariaLabels = {
  // Generate comprehensive ARIA label for status indicators
  statusIndicator: (status, item) => {
    const statusMap = {
      complete: `${item} completed`,
      incomplete: `${item} not completed`,
      overdue: `${item} overdue`,
      dueSoon: `${item} due soon`
    };
    return statusMap[status] || `${item} status: ${status}`;
  },

  // Generate ARIA label for progress indicators
  progress: (completed, total, itemType = 'items') => {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return `Progress: ${completed} of ${total} ${itemType} completed (${percentage}%)`;
  },

  // Generate ARIA label for interactive buttons
  actionButton: (action, target, additionalContext = '') => {
    const context = additionalContext ? ` ${additionalContext}` : '';
    return `${action} ${target}${context}`;
  },

  // Generate ARIA label for form fields
  formField: (fieldName, required = false, helpText = '') => {
    let label = fieldName;
    if (required) label += ' (required)';
    if (helpText) label += `. ${helpText}`;
    return label;
  }
};

// Screen reader announcements
export const announcements = {
  // Announce dynamic content changes
  announce: (message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement is made
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  // Announce loading states
  loading: (action = 'Loading') => {
    announcements.announce(`${action}. Please wait.`, 'assertive');
  },

  // Announce completion of actions
  success: (action = 'Action') => {
    announcements.announce(`${action} completed successfully.`, 'polite');
  },

  // Announce errors
  error: (message) => {
    announcements.announce(`Error: ${message}`, 'assertive');
  }
};

// Keyboard navigation helpers
export const keyboardNav = {
  // Handle common keyboard patterns
  handleKeyDown: (e, handlers = {}) => {
    const {
      onEnter,
      onSpace,
      onEscape,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight
    } = handlers;

    switch (e.key) {
      case 'Enter':
        if (onEnter) {
          e.preventDefault();
          onEnter(e);
        }
        break;
      case ' ':
        if (onSpace) {
          e.preventDefault();
          onSpace(e);
        }
        break;
      case 'Escape':
        if (onEscape) {
          e.preventDefault();
          onEscape(e);
        }
        break;
      case 'ArrowUp':
        if (onArrowUp) {
          e.preventDefault();
          onArrowUp(e);
        }
        break;
      case 'ArrowDown':
        if (onArrowDown) {
          e.preventDefault();
          onArrowDown(e);
        }
        break;
      case 'ArrowLeft':
        if (onArrowLeft) {
          e.preventDefault();
          onArrowLeft(e);
        }
        break;
      case 'ArrowRight':
        if (onArrowRight) {
          e.preventDefault();
          onArrowRight(e);
        }
        break;
    }
  }
};

// Color accessibility helpers
export const colorA11y = {
  // Generate text alternatives for color-only indicators
  statusText: (status) => {
    const statusMap = {
      complete: '✓ Complete',
      incomplete: '○ Incomplete',
      overdue: '⚠ Overdue',
      dueSoon: '⏰ Due Soon'
    };
    return statusMap[status] || status;
  },

  // Generate icon alternatives for colors
  statusIcon: (status) => {
    const iconMap = {
      complete: '✓',
      incomplete: '○',
      overdue: '⚠',
      dueSoon: '⏰'
    };
    return iconMap[status] || '●';
  }
};

// Semantic HTML helpers
export const semanticHelpers = {
  // Generate proper heading levels
  headingLevel: (level) => {
    const validLevels = [1, 2, 3, 4, 5, 6];
    return validLevels.includes(level) ? `h${level}` : 'h2';
  },

  // Generate ARIA roles for custom components
  role: (componentType) => {
    const roleMap = {
      button: 'button',
      link: 'link',
      tab: 'tab',
      tabpanel: 'tabpanel',
      dialog: 'dialog',
      alertdialog: 'alertdialog',
      status: 'status',
      alert: 'alert'
    };
    return roleMap[componentType];
  }
};

// Form accessibility helpers
export const formA11y = {
  // Generate comprehensive form field props
  fieldProps: (fieldName, options = {}) => {
    const {
      required = false,
      invalid = false,
      helpText = '',
      errorMessage = ''
    } = options;

    const id = `field-${fieldName.toLowerCase().replace(/\s+/g, '-')}`;
    const props = {
      id,
      'aria-label': ariaLabels.formField(fieldName, required, helpText),
      'aria-required': required,
      'aria-invalid': invalid
    };

    if (helpText) {
      props['aria-describedby'] = `${id}-help`;
    }

    if (invalid && errorMessage) {
      props['aria-describedby'] = `${id}-error`;
    }

    return props;
  },

  // Generate error message props
  errorProps: (fieldName) => ({
    id: `field-${fieldName.toLowerCase().replace(/\s+/g, '-')}-error`,
    role: 'alert',
    'aria-atomic': 'true'
  }),

  // Generate help text props
  helpProps: (fieldName) => ({
    id: `field-${fieldName.toLowerCase().replace(/\s+/g, '-')}-help`
  })
};
