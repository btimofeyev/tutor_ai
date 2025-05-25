
const mcpClient = require('../services/mcpClient');
const supabase = require('../utils/supabaseClient');

// Middleware to add MCP context to requests
exports.enrichWithMCPContext = async (req, res, next) => {
  const childId = req.child?.child_id;
  
  if (!childId) {
    return next();
  }

  try {
    // Get current subjects
    const { data: childSubjects } = await supabase
      .from('child_subjects')
      .select(`
        id,
        subjects:subject_id (id, name)
      `)
      .eq('child_id', childId);

    // Get current/upcoming lessons from MCP
    const [currentLessons, upcomingAssignments] = await Promise.all([
      mcpClient.getChildLessons(childId, 'active'),
      mcpClient.getUpcomingAssignments(childId, 7)
    ]);

    // Find the most immediate lesson/assignment
    let currentFocus = null;
    if (currentLessons.length > 0) {
      currentFocus = currentLessons[0];
    } else if (upcomingAssignments.length > 0) {
      currentFocus = {
        type: 'assignment',
        ...upcomingAssignments[0]
      };
    }

    // Add to request object
    req.mcpContext = {
      childSubjects: childSubjects || [],
      currentLessons,
      upcomingAssignments,
      currentFocus
    };
    console.log('enrichWithMCPContext - childId:', childId);
    console.log('childSubjects:', JSON.stringify(childSubjects, null, 2));
    console.log('currentLessons:', JSON.stringify(currentLessons, null, 2));
    console.log('upcomingAssignments:', JSON.stringify(upcomingAssignments, null, 2));
    next();
  } catch (error) {
    console.error('MCP context enrichment error:', error);
    // Continue without MCP context on error
    req.mcpContext = null;
    next();
  }
};

