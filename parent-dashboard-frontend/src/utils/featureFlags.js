// Feature flags for controlling feature availability
// Set to false to disable features that aren't ready for production

export const FEATURE_FLAGS = {
  // AI-related features
  AI_TUTORING: true,
  AI_CHAT_INSIGHTS: true,
  CHILD_LOGIN: true,
  KLIO_AI_ADDON: true,
  
  // Other features that might need gating
  ADVANCED_SCHEDULING: true,
  GRADEBOOK: true,
  MULTI_CHILD_SUPPORT: true,
  
  // Development/Debug features
  DEBUG_MODE: process.env.NODE_ENV === 'development',
  SHOW_FEATURE_PREVIEWS: true, // Show disabled features with "coming soon" overlays
};

// Helper functions for feature checking
export const isFeatureEnabled = (featureName) => {
  return FEATURE_FLAGS[featureName] === true;
};

export const isAIFeatureEnabled = () => {
  return FEATURE_FLAGS.AI_TUTORING;
};

export const shouldShowFeaturePreviews = () => {
  return FEATURE_FLAGS.SHOW_FEATURE_PREVIEWS;
};

// Subscription plan feature mapping
export const getEnabledFeaturesForPlan = (planType) => {
  const baseFatures = {
    maxChildren: 1,
    hasAdvancedFeatures: false,
    hasAdvancedReporting: false,
    hasUnlimitedStorage: false,
    hasPrioritySupport: false,
    hasCustomBranding: false
  };

  // AI features are disabled regardless of plan until ready
  const aiFeatures = {
    hasAIAccess: isFeatureEnabled('AI_TUTORING'),
    hasChildLogin: isFeatureEnabled('CHILD_LOGIN'),
  };

  switch (planType) {
    case 'free':
      return {
        ...baseFatures,
        ...aiFeatures,
        maxChildren: 1,
      };
    
    case 'klio_addon':
      return {
        ...baseFatures,
        ...aiFeatures,
        maxChildren: 1,
      };
    
    case 'family':
      return {
        ...baseFatures,
        ...aiFeatures,
        maxChildren: 3,
        hasAdvancedFeatures: true,
        hasUnlimitedStorage: true,
        hasPrioritySupport: true,
      };
    
    case 'academy':
      return {
        ...baseFatures,
        ...aiFeatures,
        maxChildren: 10,
        hasAdvancedFeatures: true,
        hasAdvancedReporting: true,
        hasUnlimitedStorage: true,
        hasPrioritySupport: true,
        hasCustomBranding: true,
      };
    
    default:
      return {
        ...baseFatures,
        ...aiFeatures,
      };
  }
};