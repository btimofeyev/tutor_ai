const supabase = require('./supabaseClient');
const { getCurrentWeekStart } = require('./dateUtils');
const { detectSubjectFromMaterial, getEvaluationTypeForSubject } = require('./workspaceTools');

class WorkspaceFunctionHandlers {
  constructor() {
    this.currentWorkspace = null;
    this.sessionId = null;
  }

  async handleCreateMathWorkspace(args, childId) {
    console.log('🎯 Creating new math workspace:', args.title);
    
    // Start new practice session
    try {
      // Create a simple session ID for tracking
      this.sessionId = `practice-${Date.now()}-${childId}`;
    } catch (error) {
      console.warn('Failed to create session ID, using local tracking');
      this.sessionId = `local-${Date.now()}`;
    }

    // Create workspace structure
    const workspace = {
      type: 'math_problems',
      title: args.title,
      explanation: args.explanation || null,
      sessionId: this.sessionId,
      problems: args.problems.map((problem, index) => ({
        id: `problem-${Date.now()}-${index}`,
        index: index,
        text: problem.text,
        type: problem.type,
        hint: problem.hint,
        difficulty: problem.difficulty || 'medium',
        status: 'pending', // pending, checking, correct, incorrect, helped
        studentWork: null,
        feedback: null
      })),
      stats: {
        totalProblems: args.problems.length,
        completed: 0,
        correct: 0,
        streak: 0,
        bestStreak: 0
      },
      createdAt: new Date().toISOString()
    };

    this.currentWorkspace = workspace;
    
    return {
      action: 'create_workspace',
      workspace: workspace,
      message: `Created "${args.title}" with ${args.problems.length} problems`
    };
  }

  async handleAddProblemsToWorkspace(args, childId) {
    if (!this.currentWorkspace) {
      return {
        action: 'error',
        message: 'No active workspace to add problems to'
      };
    }

    console.log(`➕ Adding ${args.problems.length} problems to workspace`);

    const newProblems = args.problems.map((problem, index) => ({
      id: `problem-${Date.now()}-${index}`,
      index: this.currentWorkspace.problems.length + index,
      text: problem.text,
      type: problem.type, 
      hint: problem.hint,
      difficulty: problem.difficulty || 'medium',
      status: 'pending',
      studentWork: null,
      feedback: null
    }));

    this.currentWorkspace.problems.push(...newProblems);
    this.currentWorkspace.stats.totalProblems += args.problems.length;

    return {
      action: 'add_problems',
      newProblems: newProblems,
      workspace: this.currentWorkspace,
      message: `Added ${args.problems.length} more problems to practice`
    };
  }

  async updateLifetimeProgress(childId, isCorrect) {
    try {
      // Get current child progress stats
      const { data: child, error: fetchError } = await supabase
        .from('children')
        .select('lifetime_correct, current_streak, best_streak, weekly_correct, week_start_date')
        .eq('id', childId)
        .single();

      if (fetchError) {
        console.warn('Failed to fetch child progress:', fetchError);
        return;
      }

      const currentWeekStart = getCurrentWeekStart();
      const currentStats = {
        lifetime_correct: child?.lifetime_correct || 0,
        current_streak: child?.current_streak || 0,
        best_streak: child?.best_streak || 0,
        weekly_correct: child?.weekly_correct || 0,
        week_start_date: child?.week_start_date
      };

      let newStats = { ...currentStats };

      // Check if we need to reset weekly count (new week started)
      if (!currentStats.week_start_date || currentStats.week_start_date !== currentWeekStart) {
        console.log(`📅 New week detected - resetting weekly count. Previous: ${currentStats.weekly_correct}`);
        newStats.weekly_correct = 0;
        newStats.week_start_date = currentWeekStart;
      }

      if (isCorrect) {
        // Increment lifetime correct count and current streak
        newStats.lifetime_correct = currentStats.lifetime_correct + 1;
        newStats.current_streak = currentStats.current_streak + 1;
        newStats.weekly_correct = newStats.weekly_correct + 1;
        
        // Update best streak if current streak is better
        if (newStats.current_streak > currentStats.best_streak) {
          newStats.best_streak = newStats.current_streak;
        }
      } else {
        // Reset current streak on incorrect answer
        newStats.current_streak = 0;
      }

      // Update the database
      const { error: updateError } = await supabase
        .from('children')
        .update({
          lifetime_correct: newStats.lifetime_correct,
          current_streak: newStats.current_streak,
          best_streak: newStats.best_streak,
          weekly_correct: newStats.weekly_correct,
          week_start_date: newStats.week_start_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', childId);

      if (updateError) {
        console.warn('Failed to update child progress:', updateError);
      } else {
        console.log(`📊 Updated progress: lifetime=${newStats.lifetime_correct}, weekly=${newStats.weekly_correct}, streak=${newStats.current_streak}, best=${newStats.best_streak}`);
      }

      return newStats;
    } catch (error) {
      console.warn('Error updating lifetime progress:', error);
      return null;
    }
  }

  async handleMarkProblemCorrect(args, childId) {
    if (!this.currentWorkspace) {
      return { action: 'error', message: 'No active workspace' };
    }

    const problem = this.currentWorkspace.problems[args.problem_index];
    if (!problem) {
      return { action: 'error', message: 'Problem not found' };
    }

    console.log(`✅ Marking problem ${args.problem_index} correct`);

    // Update problem status
    const wasCorrect = problem.status === 'correct';
    problem.status = 'correct';
    problem.feedback = args.feedback || 'Correct! Great work! 🎉';

    // Simple feedback only - no progress tracking for MVP
    console.log(`✅ Problem ${args.problem_index} marked correct - no tracking needed`);

    return {
      action: 'mark_correct',
      problemIndex: args.problem_index,
      problem: problem,
      workspace: this.currentWorkspace,
      message: `Problem ${args.problem_index + 1} marked correct!`
    };
  }

  async handleMarkProblemIncorrect(args, childId) {
    if (!this.currentWorkspace) {
      return { action: 'error', message: 'No active workspace' };
    }

    const problem = this.currentWorkspace.problems[args.problem_index];
    if (!problem) {
      return { action: 'error', message: 'Problem not found' };
    }

    console.log(`❌ Marking problem ${args.problem_index} incorrect`);

    // Update problem status
    problem.status = 'incorrect';
    problem.feedback = args.guidance || 'Not quite right. Try again! 💪';

    // Simple feedback only - no progress tracking for MVP
    console.log(`❌ Problem ${args.problem_index} marked incorrect - no tracking needed`);

    return {
      action: 'mark_incorrect',
      problemIndex: args.problem_index,
      problem: problem,
      workspace: this.currentWorkspace,
      message: `Problem ${args.problem_index + 1} needs more work`
    };
  }

  async handleClearWorkspace(args, childId) {
    console.log('🗑️ Clearing workspace:', args.reason);
    
    const oldWorkspace = this.currentWorkspace;
    this.currentWorkspace = null;
    this.sessionId = null;

    return {
      action: 'clear_workspace',
      reason: args.reason,
      message: 'Workspace cleared',
      previousWorkspace: oldWorkspace
    };
  }

  // NEW: Subject-agnostic workspace creation
  async handleCreateSubjectWorkspace(args, childId) {
    console.log(`🎯 Creating new ${args.subject} workspace:`, args.title);
    
    // Start new practice session
    try {
      this.sessionId = `${args.subject}-${Date.now()}-${childId}`;
    } catch (error) {
      console.warn('Failed to create session ID, using local tracking');
      this.sessionId = `local-${Date.now()}`;
    }

    // Create subject-agnostic workspace structure
    const workspace = {
      type: args.workspace_type,
      subject: args.subject,
      title: args.title,
      explanation: args.explanation || null,
      sessionId: this.sessionId,
      learning_objectives: args.learning_objectives || [],
      content: args.content.map((item, index) => ({
        id: `content-${Date.now()}-${index}`,
        index: index,
        text: item.text,
        type: item.type,
        hint: item.hint,
        difficulty: item.difficulty || 'medium',
        evaluation_criteria: item.evaluation_criteria || { type: getEvaluationTypeForSubject(args.subject) },
        status: 'pending', // pending, checking, excellent, good, needs_improvement, incomplete, correct, incorrect
        studentWork: null,
        feedback: null,
        rubric_scores: null,
        evidence_quality: null
      })),
      stats: {
        totalItems: args.content.length,
        completed: 0,
        excellent: 0,
        good: 0,
        needsImprovement: 0,
        currentStreak: 0,
        bestStreak: 0
      },
      createdAt: new Date().toISOString()
    };

    this.currentWorkspace = workspace;
    
    return {
      action: 'create_workspace',
      workspace: workspace,
      message: `Created "${args.title}" with ${args.content.length} ${args.subject} activities`
    };
  }

  // NEW: Add content to any subject workspace
  async handleAddContentToWorkspace(args, childId) {
    if (!this.currentWorkspace) {
      return {
        action: 'error',
        message: 'No active workspace to add content to'
      };
    }

    console.log(`➕ Adding ${args.content.length} content items to workspace`);

    const newContent = args.content.map((item, index) => ({
      id: `content-${Date.now()}-${index}`,
      index: this.currentWorkspace.content.length + index,
      text: item.text,
      type: item.type, 
      hint: item.hint,
      difficulty: item.difficulty || 'medium',
      evaluation_criteria: item.evaluation_criteria || { type: 'binary' },
      status: 'pending',
      studentWork: null,
      feedback: null
    }));

    // Update workspace content - use 'content' for subject workspaces, 'problems' for legacy math
    if (this.currentWorkspace.content) {
      this.currentWorkspace.content.push(...newContent);
      this.currentWorkspace.stats.totalItems += args.content.length;
    } else {
      // Legacy math workspace compatibility
      this.currentWorkspace.problems = this.currentWorkspace.problems || [];
      this.currentWorkspace.problems.push(...newContent);
      this.currentWorkspace.stats.totalProblems += args.content.length;
    }

    return {
      action: 'add_content',
      newContent: newContent,
      workspace: this.currentWorkspace,
      message: `Added ${args.content.length} more activities to practice`
    };
  }

  // NEW: Subject-agnostic content evaluation
  async handleEvaluateContentItem(args, childId) {
    if (!this.currentWorkspace) {
      return { action: 'error', message: 'No active workspace' };
    }

    // Support both new 'content' array and legacy 'problems' array
    const contentArray = this.currentWorkspace.content || this.currentWorkspace.problems;
    const item = contentArray[args.content_index];
    
    if (!item) {
      return { action: 'error', message: 'Content item not found' };
    }

    console.log(`📝 Evaluating ${this.currentWorkspace.subject || 'math'} content item ${args.content_index} as: ${args.evaluation_result}`);

    // Update item status and feedback
    item.status = args.evaluation_result;
    item.feedback = args.feedback;
    
    // Handle different evaluation types
    if (args.rubric_scores) {
      item.rubric_scores = args.rubric_scores;
    }
    
    if (args.evidence_quality) {
      item.evidence_quality = args.evidence_quality;
    }

    // Update workspace stats based on evaluation type
    this.updateWorkspaceStats(args.evaluation_result);

    return {
      action: 'evaluate_content',
      contentIndex: args.content_index,
      item: item,
      workspace: this.currentWorkspace,
      message: `Content item ${args.content_index + 1} evaluated: ${args.evaluation_result}`
    };
  }

  // Helper method to update workspace stats based on evaluation result
  updateWorkspaceStats(evaluationResult) {
    if (!this.currentWorkspace.stats) return;

    // For legacy math workspaces
    if (evaluationResult === 'correct') {
      this.currentWorkspace.stats.correct = (this.currentWorkspace.stats.correct || 0) + 1;
      this.currentWorkspace.stats.completed = (this.currentWorkspace.stats.completed || 0) + 1;
    } else if (evaluationResult === 'incorrect') {
      this.currentWorkspace.stats.completed = (this.currentWorkspace.stats.completed || 0) + 1;
    }

    // For subject workspaces with multi-level evaluation
    if (evaluationResult === 'excellent') {
      this.currentWorkspace.stats.excellent = (this.currentWorkspace.stats.excellent || 0) + 1;
      this.currentWorkspace.stats.completed = (this.currentWorkspace.stats.completed || 0) + 1;
    } else if (evaluationResult === 'good') {
      this.currentWorkspace.stats.good = (this.currentWorkspace.stats.good || 0) + 1;
      this.currentWorkspace.stats.completed = (this.currentWorkspace.stats.completed || 0) + 1;
    } else if (evaluationResult === 'needs_improvement') {
      this.currentWorkspace.stats.needsImprovement = (this.currentWorkspace.stats.needsImprovement || 0) + 1;
      this.currentWorkspace.stats.completed = (this.currentWorkspace.stats.completed || 0) + 1;
    }
  }

  getCurrentWorkspace() {
    return this.currentWorkspace;
  }

  updateStudentWork(problemIndex, work) {
    if (this.currentWorkspace && this.currentWorkspace.problems[problemIndex]) {
      this.currentWorkspace.problems[problemIndex].studentWork = work;
      this.currentWorkspace.problems[problemIndex].status = 'checking';
    }
  }
}

// Singleton instance per session (per-child)
const workspaceHandlers = new Map(); // childId -> WorkspaceFunctionHandlers

function getWorkspaceHandler(childId) {
  if (!workspaceHandlers.has(childId)) {
    workspaceHandlers.set(childId, new WorkspaceFunctionHandlers());
  }
  return workspaceHandlers.get(childId);
}

module.exports = { WorkspaceFunctionHandlers, getWorkspaceHandler };