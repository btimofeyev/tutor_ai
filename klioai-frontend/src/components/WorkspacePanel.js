// Enhanced WorkspacePanel with better math formatting and state management
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMaximize2, FiMinimize2, FiCopy, FiCheck, FiBookOpen, FiGrid, FiPenTool, FiTrash2, FiEdit3, FiPlus, FiMinus, FiX, FiDivide, FiSend, FiHelpCircle, FiRotateCcw } from 'react-icons/fi';

const WorkspacePanel = ({ workspaceContent, onToggleSize, isExpanded, onClose, onSendToChat }) => {
  const [copied, setCopied] = useState(false);
  const [workNotes, setWorkNotes] = useState({});
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null);

  // Clear work when new workspace content arrives
  useEffect(() => {
    if (workspaceContent) {
      const newWorkspaceId = JSON.stringify(workspaceContent);
      if (newWorkspaceId !== currentWorkspaceId) {
        console.log('🔄 New workspace content detected, clearing previous work');
        setWorkNotes({});
        setCurrentWorkspaceId(newWorkspaceId);
      }
    }
  }, [workspaceContent, currentWorkspaceId]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateWorkNote = (problemId, note) => {
    setWorkNotes(prev => ({
      ...prev,
      [problemId]: note
    }));
  };

  const clearWorkNote = (problemId) => {
    setWorkNotes(prev => {
      const newNotes = { ...prev };
      delete newNotes[problemId];
      return newNotes;
    });
  };

  // NEW: Send work to chat for checking
  const sendWorkToChat = (problemIndex, problemText, workNote) => {
    if (!workNote.trim()) {
      return;
    }
    
    const message = `Can you check my work on this problem?\n\nProblem: ${problemText}\nMy work: ${workNote}`;
    
    if (onSendToChat) {
      onSendToChat(message);
    }
  };

  // NEW: Ask for help with specific problem
  const askForHelp = (problemIndex, problemText) => {
    const message = `I need help with this problem: ${problemText}`;
    
    if (onSendToChat) {
      onSendToChat(message);
    }
  };

  // Get operation icon based on problem type
  const getOperationIcon = (type) => {
    switch (type) {
      case 'addition': return <FiPlus className="text-[var(--accent-green)]" size={20} />;
      case 'subtraction': return <FiMinus className="text-[var(--accent-orange)]" size={20} />;
      case 'multiplication': return <FiX className="text-[var(--accent-blue)]" size={20} />;
      case 'division': return <FiDivide className="text-[var(--accent-red)]" size={20} />;
      case 'fractions': return <span className="text-[var(--accent-blue)] font-bold">⁄</span>;
      default: return <FiGrid className="text-[var(--text-secondary)]" size={16} />;
    }
  };

  // Get color scheme based on problem type
  const getTypeColors = (type) => {
    const colorMap = {
      addition: {
        bg: 'rgba(167, 243, 208, 0.15)',
        border: 'rgba(167, 243, 208, 0.5)',
        accent: '#A7F3D0'
      },
      subtraction: {
        bg: 'rgba(253, 230, 138, 0.15)',
        border: 'rgba(253, 230, 138, 0.5)',
        accent: '#FDE68A'
      },
      multiplication: {
        bg: 'rgba(179, 224, 248, 0.15)',
        border: 'rgba(179, 224, 248, 0.4)',
        accent: '#B3E0F8'
      },
      division: {
        bg: 'rgba(253, 164, 175, 0.15)',
        border: 'rgba(253, 164, 175, 0.3)',
        accent: '#FDA4AF'
      },
      fractions: {
        bg: 'rgba(179, 224, 248, 0.15)',
        border: 'rgba(179, 224, 248, 0.4)',
        accent: '#B3E0F8'
      }
    };
    
    return colorMap[type] || colorMap.multiplication;
  };

  // Enhanced math work area with better formatting
  const renderMathWorkArea = (problem, index) => {
    const colors = getTypeColors(problem.type);
    const currentWork = workNotes[`problem-${index}`] || '';
    const problemId = `problem-${index}`;

    // Determine if this needs vertical layout
    const needsVerticalLayout = ['addition', 'subtraction', 'multiplication', 'division'].includes(problem.type);
    
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-[var(--text-secondary)] flex items-center">
            <FiEdit3 size={14} className="mr-2" />
            Your Work:
          </h4>
          <div className="flex items-center space-x-2">
            {currentWork.trim() && (
              <button
                onClick={() => sendWorkToChat(index, problem.text, currentWork)}
                className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors flex items-center space-x-1 border border-green-300"
                title="Send your work to Klio for checking"
              >
                <FiSend size={12} />
                <span>Check My Work</span>
              </button>
            )}
            {currentWork.trim() && (
              <button
                onClick={() => clearWorkNote(problemId)}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full hover:bg-gray-200 transition-colors"
                title="Clear your work"
              >
                <FiRotateCcw size={12} />
              </button>
            )}
          </div>
        </div>

        {needsVerticalLayout ? (
          <VerticalMathWorkArea 
            problem={problem}
            value={currentWork}
            onChange={(value) => updateWorkNote(problemId, value)}
            colors={colors}
          />
        ) : (
          <textarea
            value={currentWork}
            onChange={(e) => updateWorkNote(problemId, e.target.value)}
            placeholder={getPlaceholderForType(problem.type)}
            className="w-full h-32 p-4 border-2 rounded-lg bg-white font-mono text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{ 
              borderColor: colors.border,
              backgroundImage: 'linear-gradient(transparent 31px, #e5e7eb 32px)',
              backgroundSize: '100% 32px',
              lineHeight: '32px'
            }}
          />
        )}
      </div>
    );
  };

  // Vertical math work area for proper alignment
  const VerticalMathWorkArea = ({ problem, value, onChange, colors }) => {
    const [steps, setSteps] = useState([]);
    
    // Parse the problem to extract numbers
    const parseNumbers = (problemText) => {
      const match = problemText.match(/(\d+(?:\.\d+)?)\s*([+\-×÷*\/])\s*(\d+(?:\.\d+)?)/);
      if (match) {
        return {
          num1: match[1],
          operator: match[2],
          num2: match[3]
        };
      }
      return null;
    };

    const parsed = parseNumbers(problem.text);
    
    if (!parsed) {
      // Fallback to regular textarea for complex problems
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={getPlaceholderForType(problem.type)}
          className="w-full h-32 p-4 border-2 rounded-lg bg-white font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          style={{ borderColor: colors.border }}
        />
      );
    }

    return (
      <div 
        className="p-6 border-2 rounded-lg bg-white"
        style={{ borderColor: colors.border }}
      >
        {problem.type === 'addition' && (
          <VerticalAddition 
            num1={parsed.num1} 
            num2={parsed.num2} 
            value={value} 
            onChange={onChange}
          />
        )}
        {problem.type === 'subtraction' && (
          <VerticalSubtraction 
            num1={parsed.num1} 
            num2={parsed.num2} 
            value={value} 
            onChange={onChange}
          />
        )}
        {problem.type === 'multiplication' && (
          <VerticalMultiplication 
            num1={parsed.num1} 
            num2={parsed.num2} 
            value={value} 
            onChange={onChange}
          />
        )}
        {(problem.type === 'division') && (
          <LongDivision 
            dividend={parsed.num1} 
            divisor={parsed.num2} 
            value={value} 
            onChange={onChange}
          />
        )}
      </div>
    );
  };

  // Vertical addition layout
  const VerticalAddition = ({ num1, num2, value, onChange }) => (
    <div className="font-mono text-xl space-y-2">
      <div className="text-right pr-4">
        <div className="border-b border-gray-400 pb-1">
          <div>{num1.padStart(Math.max(num1.length, num2.length + 1), ' ')}</div>
          <div>+ {num2}</div>
        </div>
      </div>
      <div className="text-right pr-4">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 text-right border-none outline-none bg-transparent text-xl font-mono"
          placeholder="___"
        />
      </div>
    </div>
  );

  // Vertical subtraction layout
  const VerticalSubtraction = ({ num1, num2, value, onChange }) => (
    <div className="font-mono text-xl space-y-2">
      <div className="text-right pr-4">
        <div className="border-b border-gray-400 pb-1">
          <div>{num1.padStart(Math.max(num1.length, num2.length + 1), ' ')}</div>
          <div>- {num2}</div>
        </div>
      </div>
      <div className="text-right pr-4">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 text-right border-none outline-none bg-transparent text-xl font-mono"
          placeholder="___"
        />
      </div>
    </div>
  );

  // Vertical multiplication layout
  const VerticalMultiplication = ({ num1, num2, value, onChange }) => (
    <div className="font-mono text-xl space-y-2">
      <div className="text-right pr-4">
        <div className="border-b border-gray-400 pb-1">
          <div>{num1.padStart(Math.max(num1.length, num2.length + 1), ' ')}</div>
          <div>× {num2}</div>
        </div>
      </div>
      <div className="text-right pr-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-32 h-24 text-right border-none outline-none bg-transparent text-lg font-mono resize-none"
          placeholder="Show your work..."
        />
      </div>
    </div>
  );

  // Long division layout
  const LongDivision = ({ dividend, divisor, value, onChange }) => (
    <div className="font-mono text-xl">
      <div className="flex items-start">
        <div className="mr-4">
          <div className="border-b border-r border-gray-400 pb-1 pr-2">
            <span>{divisor}</span>
          </div>
        </div>
        <div>
          <div className="border-b border-gray-400 pb-1">
            <input
              type="text"
              value={value.split('\n')[0] || ''}
              onChange={(e) => {
                const lines = value.split('\n');
                lines[0] = e.target.value;
                onChange(lines.join('\n'));
              }}
              className="w-24 text-center border-none outline-none bg-transparent"
              placeholder="quotient"
            />
          </div>
          <div className="pt-1">{dividend}</div>
          <div className="mt-2">
            <textarea
              value={value.split('\n').slice(1).join('\n')}
              onChange={(e) => {
                const lines = value.split('\n');
                const newValue = [lines[0] || '', ...e.target.value.split('\n')].join('\n');
                onChange(newValue);
              }}
              className="w-32 h-20 border-none outline-none bg-transparent text-sm resize-none"
              placeholder="Show your work..."
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Get placeholder text for different problem types
  const getPlaceholderForType = (type) => {
    switch (type) {
      case 'addition': return 'Line up the numbers and add from right to left...';
      case 'subtraction': return 'Line up the numbers and subtract from right to left...';
      case 'multiplication': return 'Show your multiplication work...';
      case 'division': return 'Show your division work...';
      case 'fractions': return 'e.g., 2 × 4 = 8, 3 × 5 = 15, so 8/15';
      default: return 'Show your work here...';
    }
  };

  // Render individual problem with enhanced work area
  const renderMathProblem = (problem, index) => {
    const colors = getTypeColors(problem.type);
    const steps = getStepsForType(problem.type, problem.text);
    
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="bg-white border-2 rounded-xl p-6 mb-4 shadow-lg"
        style={{ 
          borderColor: colors.border,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }}
      >
        {/* Problem Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span 
              className="text-sm font-semibold text-white px-3 py-1 rounded-full flex items-center space-x-1"
              style={{ backgroundColor: colors.accent.replace('0.15', '1') }}
            >
              {getOperationIcon(problem.type)}
              <span>Problem {index + 1}</span>
            </span>
            <span className="text-xs text-[var(--text-secondary)] capitalize bg-[var(--background-card)] px-2 py-1 rounded">
              {problem.type.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => askForHelp(index, problem.text)}
              className="text-[var(--text-tertiary)] hover:text-orange-500 transition-colors p-1"
              title="Ask Klio for help"
            >
              <FiHelpCircle size={18} />
            </button>
            <button
              onClick={() => copyToClipboard(problem.text)}
              className="text-[var(--text-tertiary)] hover:text-blue-500 transition-colors p-1"
              title="Copy problem"
            >
              {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
            </button>
          </div>
        </div>

        {/* Problem Statement */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Problem:</h4>
          <div 
            className="p-6 rounded-xl border-2 text-center"
            style={{ 
              backgroundColor: colors.bg,
              borderColor: colors.border 
            }}
          >
            <div className="text-4xl font-bold text-[var(--text-primary)]">
              {problem.text}
            </div>
          </div>
        </div>

        {/* Steps to solve */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Steps to solve:</h4>
          <div className="space-y-2">
            {steps.map((step, stepIndex) => (
              <div
                key={stepIndex}
                className="p-3 rounded-lg border-l-4 text-sm"
                style={{
                  backgroundColor: colors.bg,
                  borderLeftColor: colors.accent
                }}
              >
                <strong>Step {stepIndex + 1}:</strong> {step.text}
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Work Area */}
        {renderMathWorkArea(problem, index)}

        {/* Hint */}
        {problem.hint && (
          <div 
            className="text-sm p-4 rounded-lg border-l-4 mt-4"
            style={{
              backgroundColor: colors.bg,
              borderLeftColor: colors.accent
            }}
          >
            <strong style={{ color: colors.accent.replace('0.15', '1') }}>💡 Hint:</strong> {problem.hint}
          </div>
        )}
      </motion.div>
    );
  };

  // Get steps based on problem type (same as before)
  const getStepsForType = (type, text) => {
    switch (type) {
      case 'addition':
        return [
          { text: 'Line up the numbers by place value (ones, tens, hundreds)' },
          { text: 'Start adding from the rightmost column (ones place)' },
          { text: 'If the sum is 10 or more, carry over to the next column' },
          { text: 'Continue adding each column from right to left' }
        ];
      case 'subtraction':
        return [
          { text: 'Line up the numbers by place value' },
          { text: 'Start subtracting from the rightmost column' },
          { text: 'If you need to borrow, take 1 from the next column' },
          { text: 'Continue subtracting each column from right to left' }
        ];
      case 'multiplication':
        return [
          { text: 'Multiply each digit of the bottom number by the top number' },
          { text: 'Start with the ones place, then tens, then hundreds' },
          { text: 'Add all the partial products together' },
          { text: 'Check your answer by estimating' }
        ];
      case 'division':
        return [
          { text: 'Set up the division: dividend ÷ divisor' },
          { text: 'How many times does the divisor go into the first digits?' },
          { text: 'Multiply and subtract, then bring down the next digit' },
          { text: 'Repeat until all digits are used' }
        ];
      case 'fractions':
        return [
          { text: 'Multiply the numerators (top numbers) together' },
          { text: 'Multiply the denominators (bottom numbers) together' },
          { text: 'Simplify the fraction if possible' }
        ];
      default:
        return [
          { text: 'Read the problem carefully' },
          { text: 'Identify what operation you need to use' },
          { text: 'Work step by step' },
          { text: 'Check your answer' }
        ];
    }
  };

  // Rest of component (empty state, etc.) remains the same
  if (!workspaceContent) {
    return (
      <div className="flex flex-col h-full bg-[var(--background-main)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-white">
          <h3 className="font-semibold text-[var(--text-primary)] flex items-center">
            <FiPenTool className="mr-2 text-[var(--accent-blue)]" size={18} />
            Math Workspace
          </h3>
          <button
            onClick={onToggleSize}
            className="text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors p-2 rounded-lg hover:bg-[var(--accent-blue-10-opacity)]"
          >
            {isExpanded ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center"
             style={{ 
               backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)',
               backgroundSize: '20px 20px'
             }}>
          <div className="text-[var(--text-tertiary)]">
            <FiPenTool size={64} className="mx-auto mb-6 opacity-30" />
            <h4 className="text-lg font-medium mb-2 text-[var(--text-secondary)]">Math Workspace</h4>
            <p className="text-sm">Math problems and visual aids will appear here</p>
            <p className="text-xs mt-2 text-[var(--text-tertiary)]">Your digital whiteboard for problem solving! ✨</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--background-main)]">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-white">
        <h3 className="font-semibold text-[var(--text-primary)] flex items-center">
          <FiPenTool className="mr-2 text-[var(--accent-blue)]" size={18} />
          Math Workspace
        </h3>
        <div className="flex items-center space-x-2">
          {onClose && (
            <button
              onClick={onClose}
              className="text-[var(--text-tertiary)] hover:text-[var(--accent-red)] transition-colors p-2 rounded-lg hover:bg-[var(--accent-red-10-opacity)]"
              title="Close workspace"
            >
              <FiTrash2 size={14} />
            </button>
          )}
          <button
            onClick={onToggleSize}
            className="text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors p-2 rounded-lg hover:bg-[var(--accent-blue-10-opacity)]"
          >
            {isExpanded ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4" 
           style={{ 
             backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)',
             backgroundSize: '20px 20px'
           }}>
        <AnimatePresence>
          {/* Handle math problems */}
          {workspaceContent.type === 'math_problems' && 
            workspaceContent.problems.map((problem, i) => renderMathProblem(problem, i))
          }
          
          {/* Handle mixed content */}
          {workspaceContent.type === 'mixed' && 
            workspaceContent.content.map((item, i) => {
              if (item.type === 'math_problem') return renderMathProblem(item, i);
              return null;
            })
          }
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WorkspacePanel;