// Stripe configuration with environment-aware price IDs
const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');

const PRICE_IDS = {
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

// Get the appropriate price IDs based on environment
const getPriceIds = () => isTestMode ? PRICE_IDS.test : PRICE_IDS.production;

// Create price-to-plan mapping for webhook processing
const createPriceToPlanMap = () => {
  const priceIds = getPriceIds();
  return {
    [priceIds.klio_addon]: 'klio_addon',
    [priceIds.family]: 'family',
    [priceIds.academy]: 'academy'
  };
};

module.exports = {
  getPriceIds,
  createPriceToPlanMap,
  isTestMode,
  PRICE_IDS
};