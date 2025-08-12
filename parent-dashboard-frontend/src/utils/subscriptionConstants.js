// Centralized subscription and pricing constants
import { getEnabledFeaturesForPlan } from './featureFlags';

export const PRICE_IDS = {
  klio_addon: 'price_1RVZczD8TZAZUMMAQWokffCi',
  family: 'price_1RVZT4D8TZAZUMMA3YIJeWWE',
  academy: 'price_1RVZTrD8TZAZUMMAiUuoU72d' // Fixed to match webhook handler
};

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
