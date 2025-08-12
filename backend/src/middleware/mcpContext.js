// backend/src/middleware/mcpContext.js - SIMPLIFIED VERSION
const mcpClient = require('../services/mcpClientWrapper');
const contextService = require('../services/contextService');

// 🎯 DELEGATED QUERY DETECTION AND CONTEXT FORMATTING
exports.isLessonQuery = contextService.isLessonQuery.bind(contextService);
exports.isGradeQuery = contextService.isGradeQuery.bind(contextService);
exports.formatLearningContextForAI = contextService.formatLearningContextForAI.bind(contextService);

// 🚀 SIMPLIFIED MIDDLEWARE
exports.enrichWithMCPContext = async (req, res, next) => {
  const childId = req.child?.child_id;

  if (!childId) {
    return next();
  }

  try {
    const message = req.body?.message || '';
    const isGradeRelatedQuery = contextService.isGradeQuery(message);

    // Get appropriate context based on query type
    const learningContext = isGradeRelatedQuery
      ? await mcpClient.getEnhancedLearningContext(childId)
      : await mcpClient.getLearningContext(childId);

    // Add to request object
    req.mcpContext = learningContext;
    req.isGradeQuery = isGradeRelatedQuery;

    next();
  } catch (error) {
    console.error('❌ MCP context enrichment error:', error);
    
    // Continue with fallback context
    req.mcpContext = {
      currentMaterials: [],
      overdue: [],
      recentWork: [],
      currentFocus: null,
      gradeAnalysis: null,
      error: error.message
    };
    req.isGradeQuery = false;
    next();
  }
};
