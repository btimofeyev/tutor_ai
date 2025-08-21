const express = require('express');
const router = express.Router();
const parentSummaryService = require('../services/parentSummaryService');
const { authenticateParent } = require('../middleware/auth');
const logger = require('../utils/logger')('parentRoutes');

// Apply authentication to all parent routes
router.use(authenticateParent);

/**
 * GET /api/parent/children/:childId/summaries
 * Get conversation summaries for a specific child
 */
router.get('/children/:childId/summaries', async (req, res) => {
  try {
    const { childId } = req.params;
    const { limit = 30 } = req.query;
    const parentId = req.user.id;

    // Verify parent has access to this child
    const hasAccess = await verifyParentChildAccess(parentId, childId);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied to this child\'s data'
      });
    }

    const summaries = await parentSummaryService.getSummariesForChild(
      parseInt(childId), 
      parseInt(limit)
    );

    res.json({
      success: true,
      summaries,
      total: summaries.length
    });

  } catch (error) {
    logger.error('Error getting child summaries:', error);
    res.status(500).json({
      error: 'Failed to get conversation summaries',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/parent/children/:childId/summary-stats
 * Get summary statistics for a specific child
 */
router.get('/children/:childId/summary-stats', async (req, res) => {
  try {
    const { childId } = req.params;
    const { days = 7 } = req.query;
    const parentId = req.user.id;

    // Verify parent has access to this child
    const hasAccess = await verifyParentChildAccess(parentId, childId);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied to this child\'s data'
      });
    }

    const stats = await parentSummaryService.getSummaryStats(
      parseInt(childId), 
      parseInt(days)
    );

    if (!stats) {
      return res.status(500).json({
        error: 'Failed to calculate summary statistics'
      });
    }

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Error getting summary stats:', error);
    res.status(500).json({
      error: 'Failed to get summary statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/parent/generate-summaries
 * Force generate summaries (admin/testing endpoint)
 */
router.post('/generate-summaries', async (req, res) => {
  try {
    // Only allow admin users to force generate summaries
    if (!req.user.is_admin) {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }

    const result = await parentSummaryService.forceGenerateSummaries();

    res.json({
      success: true,
      result
    });

  } catch (error) {
    logger.error('Error forcing summary generation:', error);
    res.status(500).json({
      error: 'Failed to generate summaries',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/parent/summary-service/health
 * Get summary service health status
 */
router.get('/summary-service/health', async (req, res) => {
  try {
    const health = parentSummaryService.getHealthStatus();
    
    res.json({
      success: true,
      health
    });

  } catch (error) {
    logger.error('Error getting summary service health:', error);
    res.status(500).json({
      error: 'Failed to get service health',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Helper function to verify parent has access to child
 */
async function verifyParentChildAccess(parentId, childId) {
  try {
    const supabase = require('../utils/supabaseClient');
    
    const { data, error } = await supabase
      .from('children')
      .select('id')
      .eq('id', childId)
      .eq('user_id', parentId)
      .single();

    if (error) {
      logger.error('Error verifying parent-child access:', error);
      return false;
    }

    return !!data;
    
  } catch (error) {
    logger.error('Error in verifyParentChildAccess:', error);
    return false;
  }
}

module.exports = router;