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

    let updatedWorkspace = currentWorkspace;

    actions.forEach((action, index) => {

      switch (action.action) {
        case 'create_workspace':
          updatedWorkspace = this.handleCreateWorkspace(action);
          break;

        case 'add_content':
          updatedWorkspace = this.handleAddContent(action, updatedWorkspace);
          break;

        case 'add_problems':
          updatedWorkspace = this.handleAddProblems(action, updatedWorkspace);
          break;

        case 'evaluate_content':
          this.handleEvaluateContent(action);
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
      }
    });

    return updatedWorkspace;
  }

  handleCreateWorkspace(action) {

    // Handle creative writing toolkit, subject workspaces, and legacy math workspaces
    const workspace = action.workspace;
    const isCreativeWritingToolkit = workspace.type === 'creative_writing_toolkit';
    const isSubjectWorkspace = workspace.subject && workspace.content;

    let workspaceContent;

    if (isCreativeWritingToolkit) {
      // Creative Writing Toolkit
      workspaceContent = {
        type: 'creative_writing_toolkit',
        prompt_type: workspace.prompt_type,
        title: workspace.title,
        sessionId: workspace.sessionId,
        brainstorming_section: workspace.brainstorming_section,
        planning_sections: workspace.planning_sections,
        progress: workspace.progress,
        createdAt: workspace.createdAt
      };
    } else if (isSubjectWorkspace) {
      // NEW: Subject-agnostic workspace
      workspaceContent = {
        type: 'function_calling_workspace',
        subject: workspace.subject,
        workspace_type: workspace.type,
        title: workspace.title,
        explanation: workspace.explanation,
        sessionId: workspace.sessionId,
        learning_objectives: workspace.learning_objectives || [],
        content: workspace.content.map((item, index) => ({
          id: item.id,
          index: item.index,
          text: item.text,
          type: item.type,
          hint: item.hint,
          difficulty: item.difficulty,
          status: item.status,
          feedback: item.feedback,
          evaluation_criteria: item.evaluation_criteria,
          rubric_scores: item.rubric_scores,
          evidence_quality: item.evidence_quality,
          isFunctionControlled: true
        })),
        stats: workspace.stats,
        createdAt: workspace.createdAt
      };
    } else {
      // LEGACY: Math-only workspace (backward compatibility)
      workspaceContent = {
        type: 'function_calling_workspace',
        subject: 'math',
        workspace_type: 'math_problems',
        title: workspace.title,
        explanation: workspace.explanation,
        sessionId: workspace.sessionId,
        problems: workspace.problems.map((problem, index) => ({
          id: problem.id,
          index: problem.index,
          text: problem.text,
          type: problem.type,
          hint: problem.hint,
          difficulty: problem.difficulty,
          status: problem.status,
          feedback: problem.feedback,
          isFunctionControlled: true
        })),
        stats: workspace.stats,
        createdAt: workspace.createdAt
      };
    }

    this.setWorkspaceContent(workspaceContent);
    return action.workspace;
  }

  handleAddProblems(action, currentWorkspace) {

    // Update the existing workspace content, or create from currentWorkspace if none exists
    this.setWorkspaceContent(prevContent => {
      // If no existing workspace content but we have currentWorkspace from backend, create it
      if (!prevContent && currentWorkspace) {
        return {
          type: 'function_calling_workspace',
          title: currentWorkspace.title,
          explanation: currentWorkspace.explanation,
          sessionId: currentWorkspace.sessionId,
          problems: currentWorkspace.problems.map(problem => ({
            ...problem,
            isFunctionControlled: true
          })),
          stats: currentWorkspace.stats,
          createdAt: currentWorkspace.createdAt
        };
      }

      // If no workspace content and no currentWorkspace, can't add problems
      if (!prevContent) {
        return prevContent;
      }

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

  // NEW: Handle adding content to subject workspaces
  handleAddContent(action, currentWorkspace) {

    // Update the existing workspace content
    this.setWorkspaceContent(prevContent => {
      // If no existing workspace content but we have currentWorkspace from backend, create it
      if (!prevContent && currentWorkspace) {
        return {
          type: 'function_calling_workspace',
          subject: currentWorkspace.subject || 'math',
          workspace_type: currentWorkspace.type,
          title: currentWorkspace.title,
          explanation: currentWorkspace.explanation,
          sessionId: currentWorkspace.sessionId,
          learning_objectives: currentWorkspace.learning_objectives || [],
          content: currentWorkspace.content ? currentWorkspace.content.map(item => ({
            ...item,
            isFunctionControlled: true
          })) : currentWorkspace.problems?.map(problem => ({
            ...problem,
            isFunctionControlled: true
          })) || [],
          stats: currentWorkspace.stats,
          createdAt: currentWorkspace.createdAt
        };
      }

      if (!prevContent) {
        return prevContent;
      }

      const newContent = action.newContent.map(item => ({
        id: item.id,
        index: item.index,
        text: item.text,
        type: item.type,
        hint: item.hint,
        difficulty: item.difficulty,
        status: item.status,
        feedback: item.feedback,
        evaluation_criteria: item.evaluation_criteria,
        isFunctionControlled: true
      }));

      // Add to content array (or problems array for legacy workspaces)
      const contentKey = prevContent.content ? 'content' : 'problems';

      return {
        ...prevContent,
        [contentKey]: [...(prevContent[contentKey] || []), ...newContent],
        stats: action.workspace.stats
      };
    });

    return action.workspace;
  }

  // NEW: Handle subject-agnostic content evaluation
  handleEvaluateContent(action) {

    // Update workspace content
    this.setWorkspaceContent(prevContent => {
      if (!prevContent) return prevContent;

      // Handle both content and problems arrays
      const contentKey = prevContent.content ? 'content' : 'problems';
      const updatedItems = [...(prevContent[contentKey] || [])];

      if (updatedItems[action.contentIndex]) {
        updatedItems[action.contentIndex] = {
          ...updatedItems[action.contentIndex],
          status: action.item.status,
          feedback: action.item.feedback,
          rubric_scores: action.item.rubric_scores,
          evidence_quality: action.item.evidence_quality
        };
      }

      return {
        ...prevContent,
        [contentKey]: updatedItems,
        stats: action.workspace.stats
      };
    });

    // Also update via workspace ref if available (for backward compatibility)
    if (this.workspaceRef?.current) {
      const item = action.item;
      if (item.status === 'correct' || item.status === 'excellent' || item.status === 'good') {
        if (this.workspaceRef.current.markProblemCorrect) {
          this.workspaceRef.current.markProblemCorrect(item.id);
        }
      } else if (item.status === 'incorrect' || item.status === 'needs_improvement') {
        if (this.workspaceRef.current.markProblemIncorrect) {
          this.workspaceRef.current.markProblemIncorrect(item.id);
        }
      }
    }
  }
}
