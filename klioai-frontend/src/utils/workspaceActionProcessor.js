// Process workspace actions from function calls
export class WorkspaceActionProcessor {
  constructor(setWorkspaceContent, workspaceRef) {
    this.setWorkspaceContent = setWorkspaceContent;
    this.workspaceRef = workspaceRef;
  }

  processWorkspaceActions(actions, currentWorkspace) {
    if (!actions || actions.length === 0) {
      return null;
    }

    console.log(`🔄 Processing ${actions.length} workspace actions`);

    let updatedWorkspace = currentWorkspace;

    actions.forEach((action, index) => {
      console.log(`Processing action ${index + 1}:`, action.action);

      switch (action.action) {
        case 'create_workspace':
          updatedWorkspace = this.handleCreateWorkspace(action);
          break;
        
        case 'add_problems':
          updatedWorkspace = this.handleAddProblems(action, updatedWorkspace);
          break;
          
        case 'mark_correct':
          this.handleMarkCorrect(action);
          break;
          
        case 'mark_incorrect':
          this.handleMarkIncorrect(action);
          break;
          
        case 'clear_workspace':
          updatedWorkspace = null;
          break;
          
        case 'error':
          console.error('Workspace action error:', action.message);
          break;
          
        default:
          console.warn('Unknown workspace action:', action.action);
      }
    });

    return updatedWorkspace;
  }

  handleCreateWorkspace(action) {
    console.log('✨ Creating new workspace:', action.workspace.title);
    
    const workspaceContent = {
      type: 'function_calling_workspace',
      title: action.workspace.title,
      explanation: action.workspace.explanation,
      sessionId: action.workspace.sessionId,
      problems: action.workspace.problems.map((problem, index) => ({
        id: problem.id,
        index: problem.index,
        text: problem.text,
        type: problem.type,
        hint: problem.hint,
        difficulty: problem.difficulty,
        status: problem.status,
        feedback: problem.feedback,
        isFunctionControlled: true // Mark as function-controlled
      })),
      stats: action.workspace.stats,
      createdAt: action.workspace.createdAt
    };

    this.setWorkspaceContent(workspaceContent);
    return action.workspace;
  }

  handleAddProblems(action, currentWorkspace) {
    console.log(`➕ Adding ${action.newProblems.length} problems to workspace`);
    
    // Update the existing workspace content
    this.setWorkspaceContent(prevContent => {
      if (!prevContent) return prevContent;
      
      const newProblems = action.newProblems.map(problem => ({
        id: problem.id,
        index: problem.index,
        text: problem.text,
        type: problem.type,
        hint: problem.hint,
        difficulty: problem.difficulty,
        status: problem.status,
        feedback: problem.feedback,
        isFunctionControlled: true
      }));

      return {
        ...prevContent,
        problems: [...prevContent.problems, ...newProblems],
        stats: action.workspace.stats
      };
    });

    return action.workspace;
  }

  handleMarkCorrect(action) {
    console.log(`✅ Marking problem ${action.problemIndex} as correct`);
    
    // Update workspace content
    this.setWorkspaceContent(prevContent => {
      if (!prevContent) return prevContent;
      
      const updatedProblems = [...prevContent.problems];
      if (updatedProblems[action.problemIndex]) {
        updatedProblems[action.problemIndex] = {
          ...updatedProblems[action.problemIndex],
          status: 'correct',
          feedback: action.problem.feedback
        };
      }

      return {
        ...prevContent,
        problems: updatedProblems,
        stats: action.workspace.stats
      };
    });

    // Also update via workspace ref if available
    if (this.workspaceRef?.current?.markProblemCorrect) {
      this.workspaceRef.current.markProblemCorrect(action.problem.id);
    }
  }

  handleMarkIncorrect(action) {
    console.log(`❌ Marking problem ${action.problemIndex} as incorrect`);
    
    // Update workspace content
    this.setWorkspaceContent(prevContent => {
      if (!prevContent) return prevContent;
      
      const updatedProblems = [...prevContent.problems];
      if (updatedProblems[action.problemIndex]) {
        updatedProblems[action.problemIndex] = {
          ...updatedProblems[action.problemIndex],
          status: 'incorrect',
          feedback: action.problem.feedback
        };
      }

      return {
        ...prevContent,
        problems: updatedProblems,
        stats: action.workspace.stats
      };
    });

    // Also update via workspace ref if available
    if (this.workspaceRef?.current?.markProblemIncorrect) {
      this.workspaceRef.current.markProblemIncorrect(action.problem.id);
    }
  }
}