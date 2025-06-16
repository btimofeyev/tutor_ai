// parent-dashboard-frontend/src/utils/subscriptionErrors.js
import api from './api';

export const handleSubscriptionError = (error, onUpgrade) => {
    if (!error.response?.data) return false;
  
    const { code, currentPlan } = error.response.data;
  
    switch (code) {
      case 'CHILD_LIMIT_EXCEEDED':
        const upgradeMessage = currentPlan === 'free' 
          ? 'Upgrade to Family Plan to add up to 3 children'
          : 'Upgrade to Academy Plan for more children';
        
        if (confirm(`${error.response.data.error}\n\n${upgradeMessage}\n\nWould you like to upgrade now?`)) {
          onUpgrade(currentPlan === 'free' ? 'family' : 'academy');
        }
        return true;
  
      case 'AI_ACCESS_REQUIRED':
        if (confirm(`${error.response.data.error}\n\n${error.response.data.upgradeMessage}\n\nWould you like to add AI access now?`)) {
          onUpgrade('klio_addon');
        }
        return true;
  
      case 'CHILD_LOGIN_ACCESS_REQUIRED':
        if (confirm(`${error.response.data.error}\n\n${error.response.data.upgradeMessage}\n\nWould you like to upgrade now?`)) {
          onUpgrade('family');
        }
        return true;
  
      case 'MATERIAL_LIMIT_EXCEEDED':
        const materialUpgradeMsg = currentPlan === 'free'
          ? 'Add AI Pack for 100 materials or upgrade to Family Plan for 500'
          : 'Upgrade to Family Plan for 500 materials per child';
        
        if (confirm(`${error.response.data.error}\n\n${materialUpgradeMsg}\n\nWould you like to upgrade now?`)) {
          onUpgrade(currentPlan === 'free' ? 'klio_addon' : 'family');
        }
        return true;
  
      default:
        return false;
    }
  };
  
  // Helper to create upgrade function
  export const createUpgradeHandler = () => {
    const handleUpgrade = async (targetPlan) => {
      try {
        const priceIds = {
          klio_addon: 'price_1RVZczD8TZAZUMMAQWokffCi',
          family: 'price_1RVZT4D8TZAZUMMA3YIJeWWE',
          academy: 'price_1RVZTrD8TZAZUMMAiUuoU72d'
        };
  
        const response = await api.post('/stripe/create-checkout-session', {
          price_id: priceIds[targetPlan],
          success_url: `${window.location.origin}${window.location.pathname}?upgraded=true`,
          cancel_url: window.location.href
        });
        
        window.location.href = response.data.checkout_url;
      } catch (error) {
        alert('Failed to start upgrade process. Please try again.');
      }
    };
  
    return handleUpgrade;
  };
