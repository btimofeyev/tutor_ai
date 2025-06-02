// backend/src/middleware/subscriptionEnforcement.js
const supabase = require('../utils/supabaseClient');

// Helper to get parent's subscription
async function getParentSubscription(parentId) {
  try {
    const { data: subscription, error } = await supabase
      .from('parent_subscriptions')
      .select('*')
      .eq('parent_id', parentId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return subscription;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}

// Helper to get parent's children count
async function getChildrenCount(parentId) {
  try {
    const { count, error } = await supabase
      .from('children')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', parentId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error counting children:', error);
    return 0;
  }
}

// Plan permissions
function getPlanPermissions(subscription) {
  const planType = subscription?.plan_type;
  const hasActiveSubscription = subscription && subscription.status === 'active';
  
  return {
    // Plan info
    isFreePlan: !hasActiveSubscription,
    hasAIAddon: hasActiveSubscription && planType === 'klio_addon',
    isFamilyPlan: hasActiveSubscription && planType === 'family',
    isAcademyPlan: hasActiveSubscription && planType === 'academy',
    
    // Feature permissions
    hasAIAccess: hasActiveSubscription && ['klio_addon', 'family', 'academy'].includes(planType),
    hasChildLogin: hasActiveSubscription && ['family', 'academy'].includes(planType),
    hasAdvancedFeatures: hasActiveSubscription && ['family', 'academy'].includes(planType),
    
    // Limits
    maxChildren: planType === 'academy' ? 10 : planType === 'family' ? 3 : 1,
    maxMaterialsPerChild: !hasActiveSubscription ? 50 : planType === 'klio_addon' ? 100 : 500,
  };
}

// Middleware to enforce child limits
exports.enforceChildLimit = async (req, res, next) => {
  const parentId = req.header('x-parent-id');
  
  if (!parentId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [subscription, childrenCount] = await Promise.all([
      getParentSubscription(parentId),
      getChildrenCount(parentId)
    ]);

    const permissions = getPlanPermissions(subscription);
    
    if (childrenCount >= permissions.maxChildren) {
      return res.status(403).json({ 
        error: `Plan limit reached: ${permissions.maxChildren} child${permissions.maxChildren !== 1 ? 'ren' : ''} maximum`,
        code: 'CHILD_LIMIT_EXCEEDED',
        currentPlan: subscription?.plan_type || 'free',
        maxChildren: permissions.maxChildren,
        currentChildren: childrenCount
      });
    }

    // Add subscription info to request for use in controllers
    req.subscription = subscription;
    req.permissions = permissions;
    req.childrenCount = childrenCount;
    
    next();
  } catch (error) {
    console.error('Error in child limit enforcement:', error);
    return res.status(500).json({ error: 'Failed to verify subscription limits' });
  }
};

// Middleware to enforce AI access
exports.enforceAIAccess = async (req, res, next) => {
  const parentId = req.header('x-parent-id');
  const childId = req.child?.child_id; // For child auth routes
  
  if (!parentId && !childId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let actualParentId = parentId;
    
    // If this is a child request, get the parent ID
    if (childId && !parentId) {
      const { data: child } = await supabase
        .from('children')
        .select('parent_id')
        .eq('id', childId)
        .single();
      
      actualParentId = child?.parent_id;
    }

    if (!actualParentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await getParentSubscription(actualParentId);
    const permissions = getPlanPermissions(subscription);
    
    if (!permissions.hasAIAccess) {
      return res.status(403).json({ 
        error: 'AI features not available on your current plan',
        code: 'AI_ACCESS_REQUIRED',
        currentPlan: subscription?.plan_type || 'free',
        upgradeMessage: 'Add the Klio AI Pack for $9.99/month to unlock AI tutoring'
      });
    }

    req.subscription = subscription;
    req.permissions = permissions;
    next();
  } catch (error) {
    console.error('Error in AI access enforcement:', error);
    return res.status(500).json({ error: 'Failed to verify AI access' });
  }
};

// Middleware to enforce child login access
exports.enforceChildLoginAccess = async (req, res, next) => {
  const parentId = req.header('x-parent-id');
  
  if (!parentId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const subscription = await getParentSubscription(parentId);
    const permissions = getPlanPermissions(subscription);
    
    if (!permissions.hasChildLogin) {
      return res.status(403).json({ 
        error: 'Child login accounts not available on your current plan',
        code: 'CHILD_LOGIN_ACCESS_REQUIRED',
        currentPlan: subscription?.plan_type || 'free',
        upgradeMessage: 'Upgrade to Family Plan to enable child login accounts'
      });
    }

    req.subscription = subscription;
    req.permissions = permissions;
    next();
  } catch (error) {
    console.error('Error in child login enforcement:', error);
    return res.status(500).json({ error: 'Failed to verify child login access' });
  }
};

// Middleware to enforce material limits
exports.enforceMaterialLimit = async (req, res, next) => {
  const parentId = req.header('x-parent-id');
  const childSubjectId = req.body.child_subject_id || req.params.child_subject_id;
  
  if (!parentId || !childSubjectId) {
    return res.status(401).json({ error: 'Unauthorized or missing child subject' });
  }

  try {
    const subscription = await getParentSubscription(parentId);
    const permissions = getPlanPermissions(subscription);
    
    // Count current materials for this child subject
    const { count: materialCount } = await supabase
      .from('materials')
      .select('*', { count: 'exact', head: true })
      .eq('child_subject_id', childSubjectId);

    if (materialCount >= permissions.maxMaterialsPerChild) {
      return res.status(403).json({ 
        error: `Material limit reached: ${permissions.maxMaterialsPerChild} materials per child maximum`,
        code: 'MATERIAL_LIMIT_EXCEEDED',
        currentPlan: subscription?.plan_type || 'free',
        maxMaterials: permissions.maxMaterialsPerChild,
        currentMaterials: materialCount
      });
    }

    req.subscription = subscription;
    req.permissions = permissions;
    req.materialCount = materialCount;
    next();
  } catch (error) {
    console.error('Error in material limit enforcement:', error);
    return res.status(500).json({ error: 'Failed to verify material limits' });
  }
};

// Helper function to check subscription for controllers
exports.checkSubscription = async (parentId) => {
  const subscription = await getParentSubscription(parentId);
  const permissions = getPlanPermissions(subscription);
  const childrenCount = await getChildrenCount(parentId);
  
  return {
    subscription,
    permissions,
    childrenCount
  };
};