
// Add this to a new file: backend/src/utils/dateUtils.js

const getCurrentDateInfo = () => {
    const now = new Date();

    // Get current date in user's timezone (assuming US Eastern for now)
    // You may want to make this configurable per user
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const currentDate = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const currentTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return {
      today,
      currentDate,
      currentTime,
      todayString: today.toISOString().split('T')[0] // YYYY-MM-DD format
    };
  };

  const calculateDaysDifference = (dueDateString, referenceDate = null) => {
    if (!dueDateString) return null;

    const reference = referenceDate || getCurrentDateInfo().today;

    // Parse due date as YYYY-MM-DD and create date object
    const dueDate = new Date(dueDateString + 'T00:00:00');
    dueDate.setHours(0, 0, 0, 0);

    // Calculate difference in days
    const diffTime = dueDate.getTime() - reference.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const getDueDateStatus = (dueDateString, referenceDate = null) => {
    const daysDiff = calculateDaysDifference(dueDateString, referenceDate);

    if (daysDiff === null) return { status: 'none', text: 'No due date', urgent: false };

    if (daysDiff < 0) {
      const overdueDays = Math.abs(daysDiff);
      return {
        status: 'overdue',
        text: `OVERDUE by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`,
        urgent: true,
        daysDiff
      };
    } else if (daysDiff === 0) {
      return {
        status: 'today',
        text: 'DUE TODAY',
        urgent: true,
        daysDiff
      };
    } else if (daysDiff === 1) {
      return {
        status: 'tomorrow',
        text: 'DUE TOMORROW',
        urgent: true,
        daysDiff
      };
    } else if (daysDiff <= 3) {
      return {
        status: 'soon',
        text: `Due in ${daysDiff} days`,
        urgent: true,
        daysDiff
      };
    } else if (daysDiff <= 7) {
      return {
        status: 'upcoming',
        text: `Due in ${daysDiff} days`,
        urgent: false,
        daysDiff
      };
    } else {
      return {
        status: 'future',
        text: `Due in ${daysDiff} days`,
        urgent: false,
        daysDiff
      };
    }
  };

  // Get the start of the current week (Sunday)
  const getWeekStart = (date = new Date()) => {
    const start = new Date(date);
    const day = start.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = start.getDate() - day; // Get days to subtract to reach Sunday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0); // Set to start of day
    return start;
  };

  // Check if a date is in the current week
  const isInCurrentWeek = (date, referenceDate = new Date()) => {
    const weekStart = getWeekStart(referenceDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const checkDate = new Date(date);
    return checkDate >= weekStart && checkDate <= weekEnd;
  };

  // Get week start as ISO string for database comparison
  const getCurrentWeekStart = () => {
    return getWeekStart().toISOString();
  };

  module.exports = {
    getCurrentDateInfo,
    calculateDaysDifference,
    getDueDateStatus,
    getWeekStart,
    isInCurrentWeek,
    getCurrentWeekStart
  };

