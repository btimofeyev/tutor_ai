// Utility functions for managing dashboard refresh signals
// This helps coordinate when the dashboard should refresh its data

/**
 * Signal that the dashboard should refresh when the user returns
 * Call this after operations that modify child/subject/curriculum data
 */
export function signalDashboardRefresh() {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('needsDashboardRefresh', 'true');
  }
}

/**
 * Check if dashboard refresh is needed and clear the signal
 * @returns {boolean} True if refresh is needed
 */
export function checkAndClearRefreshSignal() {
  if (typeof window !== 'undefined') {
    const needsRefresh = sessionStorage.getItem('needsDashboardRefresh') === 'true';
    if (needsRefresh) {
      sessionStorage.removeItem('needsDashboardRefresh');
    }
    return needsRefresh;
  }
  return false;
}

/**
 * Get time-based refresh recommendation
 * @param {number} lastVisibleTime - Timestamp when page was last visible
 * @param {number} threshold - Time threshold in milliseconds (default: 5 minutes)
 * @returns {boolean} True if enough time has passed to warrant refresh
 */
export function shouldRefreshBasedOnTime(lastVisibleTime, threshold = 5 * 60 * 1000) {
  const timeSinceLastVisible = Date.now() - lastVisibleTime;
  return timeSinceLastVisible > threshold;
}

/**
 * Check if user is coming from a page that modifies curriculum data
 * @returns {boolean} True if coming from a page that typically modifies data
 */
export function isComingFromDataModifyingPage() {
  if (typeof document === 'undefined') return false;
  
  const dataModifyingPages = [
    '/subject-management',
    '/subject-settings',
    '/schedule'
  ];
  
  return dataModifyingPages.some(page => document.referrer.includes(page));
}