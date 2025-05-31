// backend/src/controllers/progressController.js
const supabase = require('../utils/supabaseClient');

// Helper to get parent_id from request header
function getParentId(req) {
  return req.header('x-parent-id');
}

// Simple practice session tracking
exports.startPracticeSession = async (req, res) => {
  const parent_id = getParentId(req);
  const child_id = req.child?.child_id; // From child auth middleware
  const { session_type = 'practice', problems_count = 0 } = req.body;

  if (!child_id && !parent_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const actual_child_id = child_id || req.body.child_id;

  try {
    // Create a new practice session
    const { data, error } = await supabase
      .from('practice_sessions')
      .insert([{
        child_id: actual_child_id,
        session_type,
        problems_count,
        started_at: new Date().toISOString(),
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      session: data
    });
  } catch (error) {
    console.error('Error starting practice session:', error);
    res.status(500).json({ error: 'Failed to start practice session' });
  }
};

// Record a problem attempt
exports.recordProblemAttempt = async (req, res) => {
  const child_id = req.child?.child_id;
  const { 
    session_id, 
    problem_text, 
    is_correct, 
    student_work = null,
    problem_type = 'general',
    time_spent_seconds = null 
  } = req.body;

  if (!child_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Record the attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('practice_attempts')
      .insert([{
        child_id,
        session_id,
        problem_text,
        problem_type,
        is_correct,
        student_work,
        time_spent_seconds,
        attempted_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (attemptError) throw attemptError;

    // Get current session stats to calculate streak
    const { data: sessionStats, error: statsError } = await supabase
      .from('practice_attempts')
      .select('is_correct, attempted_at')
      .eq('session_id', session_id)
      .order('attempted_at', { ascending: true });

    if (statsError) throw statsError;

    // Calculate current streak (consecutive correct answers)
    let currentStreak = 0;
    for (let i = sessionStats.length - 1; i >= 0; i--) {
      if (sessionStats[i].is_correct) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate session totals
    const totalCorrect = sessionStats.filter(s => s.is_correct).length;
    const totalAttempts = sessionStats.length;

    // Get child's best streak ever
    const { data: bestStreakData } = await supabase
      .from('practice_attempts')
      .select('is_correct, attempted_at, session_id')
      .eq('child_id', child_id)
      .order('attempted_at', { ascending: true });

    let bestStreak = 0;
    if (bestStreakData) {
      let tempStreak = 0;
      bestStreakData.forEach(attempt => {
        if (attempt.is_correct) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      });
    }

    // Update session with latest stats
    await supabase
      .from('practice_sessions')
      .update({
        current_streak: currentStreak,
        total_correct: totalCorrect,
        total_attempts: totalAttempts,
        best_streak: Math.max(bestStreak, currentStreak),
        last_activity: new Date().toISOString()
      })
      .eq('id', session_id);

    res.json({
      success: true,
      attempt: attempt,
      session_stats: {
        currentStreak,
        totalCorrect,
        totalAttempts,
        bestStreak: Math.max(bestStreak, currentStreak)
      }
    });

  } catch (error) {
    console.error('Error recording problem attempt:', error);
    res.status(500).json({ error: 'Failed to record attempt' });
  }
};

// Get current session stats
exports.getSessionStats = async (req, res) => {
  const child_id = req.child?.child_id;
  const { session_id } = req.params;

  if (!child_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get session info
    const { data: session, error: sessionError } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('child_id', child_id)
      .single();

    if (sessionError) throw sessionError;
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Get attempts for this session
    const { data: attempts, error: attemptsError } = await supabase
      .from('practice_attempts')
      .select('*')
      .eq('session_id', session_id)
      .order('attempted_at', { ascending: true });

    if (attemptsError) throw attemptsError;

    res.json({
      success: true,
      session,
      attempts: attempts || [],
      stats: {
        currentStreak: session.current_streak || 0,
        totalCorrect: session.total_correct || 0,
        totalAttempts: session.total_attempts || 0,
        bestStreak: session.best_streak || 0,
        problemsCompleted: attempts ? attempts.length : 0
      }
    });

  } catch (error) {
    console.error('Error getting session stats:', error);
    res.status(500).json({ error: 'Failed to get session stats' });
  }
};

// End practice session
exports.endPracticeSession = async (req, res) => {
  const child_id = req.child?.child_id;
  const { session_id } = req.params;

  if (!child_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Update session as completed
    const { data, error } = await supabase
      .from('practice_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', session_id)
      .eq('child_id', child_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Session not found' });

    res.json({
      success: true,
      session: data,
      message: 'Great work! Session completed! 🎉'
    });

  } catch (error) {
    console.error('Error ending practice session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
};

// Get child's overall progress
exports.getChildProgress = async (req, res) => {
  const parent_id = getParentId(req);
  const child_id = req.child?.child_id;
  const target_child_id = child_id || req.params.child_id;

  if (!target_child_id || (!child_id && !parent_id)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // If parent is requesting, verify they own this child
    if (parent_id && !child_id) {
      const { data: ownership } = await supabase
        .from('children')
        .select('id')
        .eq('id', target_child_id)
        .eq('parent_id', parent_id)
        .single();

      if (!ownership) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get recent sessions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentSessions, error: sessionsError } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('child_id', target_child_id)
      .gte('started_at', thirtyDaysAgo.toISOString())
      .order('started_at', { ascending: false });

    if (sessionsError) throw sessionsError;

    // Get all-time best streak
    const { data: allAttempts, error: attemptsError } = await supabase
      .from('practice_attempts')
      .select('is_correct, attempted_at')
      .eq('child_id', target_child_id)
      .order('attempted_at', { ascending: true });

    if (attemptsError) throw attemptsError;

    // Calculate all-time best streak
    let allTimeBestStreak = 0;
    let tempStreak = 0;
    (allAttempts || []).forEach(attempt => {
      if (attempt.is_correct) {
        tempStreak++;
        allTimeBestStreak = Math.max(allTimeBestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    });

    // Calculate totals
    const totalSessions = recentSessions ? recentSessions.length : 0;
    const totalCorrect = (recentSessions || []).reduce((sum, s) => sum + (s.total_correct || 0), 0);
    const totalAttempts = (recentSessions || []).reduce((sum, s) => sum + (s.total_attempts || 0), 0);
    const averageAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    res.json({
      success: true,
      progress: {
        totalSessions,
        totalCorrect,
        totalAttempts,
        averageAccuracy,
        allTimeBestStreak,
        recentSessions: recentSessions || []
      }
    });

  } catch (error) {
    console.error('Error getting child progress:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
};