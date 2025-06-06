const supabase = require('./supabaseClient');

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
        .select('lifetime_correct, current_streak, best_streak')
        .eq('id', childId)
        .single();

      if (fetchError) {
        console.warn('Failed to fetch child progress:', fetchError);
        return;
      }

      const currentStats = {
        lifetime_correct: child?.lifetime_correct || 0,
        current_streak: child?.current_streak || 0,
        best_streak: child?.best_streak || 0
      };

      let newStats = { ...currentStats };

      if (isCorrect) {
        // Increment lifetime correct count and current streak
        newStats.lifetime_correct = currentStats.lifetime_correct + 1;
        newStats.current_streak = currentStats.current_streak + 1;
        
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
          updated_at: new Date().toISOString()
        })
        .eq('id', childId);

      if (updateError) {
        console.warn('Failed to update child progress:', updateError);
      } else {
        console.log(`📊 Updated lifetime progress: correct=${newStats.lifetime_correct}, streak=${newStats.current_streak}, best=${newStats.best_streak}`);
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

    // Update workspace stats (only count if wasn't already correct)
    if (!wasCorrect) {
      this.currentWorkspace.stats.completed++;
      this.currentWorkspace.stats.correct++;
      this.currentWorkspace.stats.streak++;
      this.currentWorkspace.stats.bestStreak = Math.max(
        this.currentWorkspace.stats.bestStreak,
        this.currentWorkspace.stats.streak
      );

      // Update lifetime progress for this child
      await this.updateLifetimeProgress(childId, true);
    }

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

    // Reset workspace streak on incorrect answer
    this.currentWorkspace.stats.streak = 0;

    // Update lifetime progress (resets current streak)
    await this.updateLifetimeProgress(childId, false);

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