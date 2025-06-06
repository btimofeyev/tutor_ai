const supabase = require('./supabaseClient');
const { getCurrentWeekStart } = require('./dateUtils');

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