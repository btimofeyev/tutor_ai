// Centralized subscription and pricing constants
export const PRICE_IDS = {
  klio_addon: 'price_1RVZczD8TZAZUMMAQWokffCi',
  family: 'price_1RVZT4D8TZAZUMMA3YIJeWWE',
  academy: 'price_1RVZT4D8TZAZUMMA3YIJeWWF' // Add academy plan if needed
};

export const PLAN_TYPES = {
  FREE: 'free',
  KLIO_ADDON: 'klio_addon',
  FAMILY: 'family',
  ACADEMY: 'academy'
};

export const PLAN_FEATURES = {
  [PLAN_TYPES.FREE]: {
    maxChildren: 1,
    hasAIAccess: false,
    hasChildLogin: false,
    hasAdvancedFeatures: false,
    hasAdvancedReporting: false,
    hasUnlimitedStorage: false,
    hasPrioritySupport: false,
    hasCustomBranding: false
  },
  [PLAN_TYPES.KLIO_ADDON]: {
    maxChildren: 1,
    hasAIAccess: true,
    hasChildLogin: true,
    hasAdvancedFeatures: false,
    hasAdvancedReporting: false,
    hasUnlimitedStorage: false,
    hasPrioritySupport: false,
    hasCustomBranding: false
  },
  [PLAN_TYPES.FAMILY]: {
    maxChildren: 3,
    hasAIAccess: true,
    hasChildLogin: true,
    hasAdvancedFeatures: true,
    hasAdvancedReporting: false,
    hasUnlimitedStorage: true,
    hasPrioritySupport: true,
    hasCustomBranding: false
  },
  [PLAN_TYPES.ACADEMY]: {
    maxChildren: 10,
    hasAIAccess: true,
    hasChildLogin: true,
    hasAdvancedFeatures: true,
    hasAdvancedReporting: true,
    hasUnlimitedStorage: true,
    hasPrioritySupport: true,
    hasCustomBranding: true
  }
};