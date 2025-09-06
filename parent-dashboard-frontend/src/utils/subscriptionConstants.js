// Centralized subscription and pricing constants
import { getEnabledFeaturesForPlan } from './featureFlags';

// Environment-aware price IDs
const PRICE_IDS_CONFIG = {
  test: {
    klio_addon: 'price_1RVZRXD8TZAZUMMArgc7APlB',
    family: 'price_1S41eFD8TZAZUMMA4iSm2ARo',
    academy: 'price_1RVZTrD8TZAZUMMAiUuoU72d'
  },
  production: {
    klio_addon: 'price_1RLSENDII9A9349oeB2FplDR',
    family: 'price_1QVLUbDII9A9349oEK9fzVp1',
    academy: 'price_1S3yY6DII9A9349oB9Nh4upr'
  }
};

// Detect environment - in development, we use test mode
const isTestMode = process.env.NODE_ENV === 'development' || 
                   (typeof window !== 'undefined' && (
                     window.location.hostname === 'localhost' || 
                     window.location.hostname.includes('127.0.0.1') ||
                     window.location.port === '3000'
                   ));

export const PRICE_IDS = isTestMode ? PRICE_IDS_CONFIG.test : PRICE_IDS_CONFIG.production;

export const PLAN_TYPES = {
  FREE: 'free',
  KLIO_ADDON: 'klio_addon',
  FAMILY: 'family',
  ACADEMY: 'academy'
};

// Plan features now dynamically determined by feature flags
export const PLAN_FEATURES = {
  [PLAN_TYPES.FREE]: getEnabledFeaturesForPlan('free'),
  [PLAN_TYPES.KLIO_ADDON]: getEnabledFeaturesForPlan('klio_addon'),
  [PLAN_TYPES.FAMILY]: getEnabledFeaturesForPlan('family'),
  [PLAN_TYPES.ACADEMY]: getEnabledFeaturesForPlan('academy')
};
