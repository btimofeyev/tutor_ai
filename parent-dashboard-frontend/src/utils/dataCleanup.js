// Data cleanup utilities
// Helps fix orphaned data and cache issues

import api from './api';
import { removeFromLocalStorage, getFromLocalStorage } from './commonHelpers';

// Clear all cached data for deleted children
export const clearOrphanedCache = () => {
  if (typeof window === 'undefined') return;
  
  try {
    const keys = Object.keys(localStorage);
    const tutorAiKeys = keys.filter(key => key.startsWith('tutor_ai_dashboard_'));
    
    tutorAiKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('Error removing cache key:', key, error);
      }
    });
    
    console.log(`Cleared ${tutorAiKeys.length} cached entries`);
  } catch (error) {
    console.warn('Error clearing orphaned cache:', error);
  }
};

// Force refresh all child data by invalidating cache
export const forceRefreshAllData = async () => {
  clearOrphanedCache();
  
  // Force page reload to ensure clean state
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
};

// Utility to check for orphaned lessons in localStorage
export const checkForOrphanedLessons = (activeChildIds) => {
  if (typeof window === 'undefined') return [];
  
  const orphanedEntries = [];
  
  try {
    const keys = Object.keys(localStorage);
    const tutorAiKeys = keys.filter(key => key.startsWith('tutor_ai_dashboard_'));
    
    tutorAiKeys.forEach(key => {
      try {
        // Extract child ID from key (format: tutor_ai_dashboard_{childId}_data)
        const match = key.match(/tutor_ai_dashboard_(.+)_data/);
        if (match) {
          const childId = match[1];
          if (!activeChildIds.includes(childId)) {
            orphanedEntries.push({ key, childId });
          }
        }
      } catch (error) {
        console.warn('Error checking cache key:', key, error);
      }
    });
    
  } catch (error) {
    console.warn('Error checking for orphaned lessons:', error);
  }
  
  return orphanedEntries;
};

// Clean up orphaned cache entries for specific child IDs
export const cleanupOrphanedEntries = (orphanedChildIds) => {
  if (typeof window === 'undefined') return 0;
  
  let cleanedCount = 0;
  
  try {
    orphanedChildIds.forEach(childId => {
      const key = `tutor_ai_dashboard_${childId}_data`;
      try {
        localStorage.removeItem(key);
        cleanedCount++;
      } catch (error) {
        console.warn('Error removing orphaned entry:', key, error);
      }
    });
  } catch (error) {
    console.warn('Error cleaning up orphaned entries:', error);
  }
  
  return cleanedCount;
};

// Server-side cleanup for orphaned lessons (if backend endpoint exists)
export const requestServerCleanup = async () => {
  try {
    const response = await api.post('/cleanup/orphaned-data');
    return {
      success: true,
      message: response.data.message || 'Cleanup completed',
      cleanedItems: response.data.cleanedItems || 0
    };
  } catch (error) {
    // If endpoint doesn't exist, that's okay
    if (error.response?.status === 404) {
      return {
        success: false,
        error: 'Server cleanup endpoint not available'
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Server cleanup failed'
    };
  }
};

// Comprehensive data cleanup function
export const performDataCleanup = async (activeChildren = []) => {
  const activeChildIds = activeChildren.map(child => child.id);
  
  // 1. Check for orphaned cache entries
  const orphanedEntries = checkForOrphanedLessons(activeChildIds);
  
  // 2. Clean up orphaned cache entries
  const orphanedChildIds = orphanedEntries.map(entry => entry.childId);
  const cleanedCacheCount = cleanupOrphanedEntries(orphanedChildIds);
  
  // 3. Try server-side cleanup
  const serverCleanup = await requestServerCleanup();
  
  // 4. Clear all cache to ensure fresh data
  clearOrphanedCache();
  
  return {
    orphanedCacheEntries: orphanedEntries.length,
    cleanedCacheEntries: cleanedCacheCount,
    serverCleanup: serverCleanup,
    totalCleaned: cleanedCacheCount + (serverCleanup.cleanedItems || 0)
  };
};