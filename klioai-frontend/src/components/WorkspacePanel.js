// Enhanced WorkspacePanel with Chat Integration
// Replace your existing WorkspacePanel component with this version

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMaximize2, FiMinimize2, FiCopy, FiCheck, FiBookOpen, FiGrid, FiPenTool, FiTrash2, FiEdit3, FiPlus, FiMinus, FiX, FiDivide, FiSend, FiHelpCircle } from 'react-icons/fi';

const WorkspacePanel = ({ workspaceContent, onToggleSize, isExpanded, onClose, onSendToChat }) => {
  const [copied, setCopied] = useState(false);
  const [workNotes, setWorkNotes] = useState({});

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
    switch (type) {
      case 'addition':
        return {
          bg: 'var(--accent-green-15-opacity)',
          border: 'var(--accent-green-50-opacity-for-border)',
          accent: 'var(--accent-green)',
          text: 'var(--text-primary)'
        };
      case 'subtraction':
        return {
          bg: 'var(--accent-orange-15-opacity)',
          border: 'var(--accent-orange-50-opacity-for-border)',
          accent: 'var(--accent-orange)',
          text: 'var(--text-primary)'
        };
      case 'multiplication':
      case 'fractions':
        return {
          bg: 'var(--accent-blue-15-opacity)',
          border: 'var(--accent-blue-40-opacity-for-border)',
          accent: 'var(--accent-blue)',
          text: 'var(--text-primary)'
        };
      case 'division':
        return {
          bg: 'var(--accent-red-15-opacity)',
          border: 'var(--accent-red-30-opacity-for-border)',
          accent: 'var(--accent-red)',
          text: 'var(--text-primary)'
        };
      default:
        return {
          bg: 'var(--accent-blue-15-opacity)',
          border: 'var(--accent-blue-40-opacity-for-border)',
          accent: 'var(--accent-blue)',
          text: 'var(--text-primary)'
        };
    }
  };

  // Enhanced fraction renderer
  const renderFraction = (numerator, denominator) => (
    <div className="inline-flex flex-col items-center mx-1">
      <div className="text-2xl font-bold border-b-2 border-current pb-1 px-3">
        {numerator}
      </div>
      <div className="text-2xl font-bold pt-1 px-3">
        {denominator}
      </div>
    </div>
  );

  // Enhanced math expression renderer
  const renderMathExpression = (text, type) => {
    // Handle different types of math expressions
    if (type === 'fraction_multiplication' || text.includes('frac') || (text.includes('/') && text.includes('×'))) {
      // Handle LaTeX-style fractions: \frac{2}{3}
      const latexFractionPattern = /\\frac\{(\d+)\}\{(\d+)\}/g;
      // Handle simple fractions: 2/3
      const simpleFractionPattern = /(\d+)\/(\d+)/g;
      
      let processedText = text.replace(latexFractionPattern, (match, num, den) => {
        return `FRACTION_${num}_${den}`;
      });
      
      const tokens = processedText.split(/(\s+|×|\*|=)/);
      
      return (
        <div className="flex items-center justify-center flex-wrap gap-3 text-3xl">
          {tokens.map((token, index) => {
            if (token.startsWith('FRACTION_')) {
              const [, num, den] = token.split('_');
              return (
                <div key={index} className="text-[var(--accent-blue)]">
                  {renderFraction(num, den)}
                </div>
              );
            } else if (token.match(simpleFractionPattern)) {
              const [num, den] = token.split('/');
              return (
                <div key={index} className="text-[var(--accent-blue)]">
                  {renderFraction(num, den)}
                </div>
              );
            } else if (token === '×' || token === '*') {
              return <span key={index} className="text-[var(--accent-green)] font-bold text-4xl">×</span>;
            } else if (token === '=') {
              return <span key={index} className="text-[var(--accent-orange)] font-bold text-4xl">=</span>;
            } else if (token.trim()) {
              return <span key={index} className="text-[var(--text-primary)]">{token}</span>;
            }
            return <span key={index}>{token}</span>;
          })}
        </div>
      );
    } else {
      // Handle regular arithmetic
      const parts = text.split(/(\s*[\+\-\*×÷\/]\s*|=)/);
      
      return (
        <div className="flex items-center justify-center flex-wrap gap-4 text-4xl font-bold">
          {parts.map((part, index) => {
            const trimmed = part.trim();
            if (/^\d+$/.test(trimmed)) {
              return <span key={index} className="text-[var(--text-primary)]">{trimmed}</span>;
            } else if (trimmed === '+') {
              return <span key={index} className="text-[var(--accent-green)]">+</span>;
            } else if (trimmed === '-') {
              return <span key={index} className="text-[var(--accent-orange)]">−</span>;
            } else if (trimmed === '*' || trimmed === '×') {
              return <span key={index} className="text-[var(--accent-blue)]">×</span>;
            } else if (trimmed === '/' || trimmed === '÷') {
              return <span key={index} className="text-[var(--accent-red)]">÷</span>;
            } else if (trimmed === '=') {
              return <span key={index} className="text-[var(--text-secondary)]">=</span>;
            }
            return <span key={index}>{part}</span>;
          })}
        </div>
      );
    }
  };

  // Get steps based on problem type
  const getStepsForType = (type, text) => {
    switch (type) {
      case 'addition':
        return [
          { color: 'green', text: 'Line up the numbers by place value (ones, tens, hundreds)' },
          { color: 'blue', text: 'Start adding from the rightmost column (ones place)' },
          { color: 'yellow', text: 'If the sum is 10 or more, carry over to the next column' },
          { color: 'orange', text: 'Continue adding each column from right to left' }
        ];
      case 'subtraction':
        return [
          { color: 'orange', text: 'Line up the numbers by place value' },
          { color: 'red', text: 'Start subtracting from the rightmost column' },
          { color: 'yellow', text: 'If you need to borrow, take 1 from the next column' },
          { color: 'green', text: 'Continue subtracting each column from right to left' }
        ];
      case 'multiplication':
        return [
          { color: 'blue', text: 'Multiply each digit of the bottom number by the top number' },
          { color: 'green', text: 'Start with the ones place, then tens, then hundreds' },
          { color: 'yellow', text: 'Add all the partial products together' },
          { color: 'orange', text: 'Check your answer by estimating or using a different method' }
        ];
      case 'division':
        return [
          { color: 'red', text: 'Set up the division: dividend ÷ divisor' },
          { color: 'blue', text: 'How many times does the divisor go into the first digits?' },
          { color: 'green', text: 'Multiply and subtract, then bring down the next digit' },
          { color: 'yellow', text: 'Repeat until all digits are used' }
        ];
      case 'fractions':
      case 'fraction_multiplication':
        return [
          { color: 'green', text: 'Multiply the numerators (top numbers) together' },
          { color: 'yellow', text: 'Multiply the denominators (bottom numbers) together' },
          { color: 'orange', text: 'Simplify the fraction if possible' }
        ];
      default:
        return [
          { color: 'blue', text: 'Read the problem carefully' },
          { color: 'green', text: 'Identify what operation you need to use' },
          { color: 'yellow', text: 'Work step by step' },
          { color: 'orange', text: 'Check your answer' }
        ];
    }
  };

  // Render individual problem
  const renderMathProblem = (problem, index) => {
    const colors = getTypeColors(problem.type);
    const steps = getStepsForType(problem.type, problem.text);
    const currentWork = workNotes[`problem-${index}`] || '';
    
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
              style={{ backgroundColor: colors.accent }}
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
              className="text-[var(--text-tertiary)] hover:text-[var(--accent-orange)] transition-colors p-1"
              title="Ask Klio for help"
            >
              <FiHelpCircle size={28} />
            </button>
            <button
              onClick={() => copyToClipboard(problem.text)}
              className="text-[var(--text-tertiary)] hover:text-[var(--accent-blue)] transition-colors p-1"
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
            className="p-6 rounded-xl border-2"
            style={{ 
              backgroundColor: colors.bg,
              borderColor: colors.border 
            }}
          >
            {renderMathExpression(problem.text, problem.type)}
          </div>
        </div>

        {/* Steps to solve */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Steps to solve:</h4>
          <div className="space-y-3">
            {steps.map((step, stepIndex) => {
              const stepColors = getTypeColors(step.color);
              return (
                <div
                  key={stepIndex}
                  className="p-4 rounded-lg border-l-4"
                  style={{
                    backgroundColor: stepColors.bg,
                    borderLeftColor: stepColors.accent
                  }}
                >
                  <strong>Step {stepIndex + 1}:</strong> {step.text}
                </div>
              );
            })}
          </div>
        </div>

        {/* ENHANCED: Work Area with Chat Integration */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-[var(--text-secondary)] flex items-center">
              <FiEdit3 size={14} className="mr-2" />
              Your Work:
            </h4>
            {currentWork.trim() && (
              <button
                onClick={() => sendWorkToChat(index, problem.text, currentWork)}
                className="text-xs bg-[var(--accent-green-10-opacity)] text-[var(--accent-green)] px-3 py-1 rounded-full hover:bg-[var(--accent-green-20-opacity)] transition-colors flex items-center space-x-1 border border-[var(--accent-green-50-opacity-for-border)]"
                title="Send your work to Klio for checking"
              >
                <FiSend size={12} />
                <span>Check My Work</span>
              </button>
            )}
          </div>
          <textarea
            value={currentWork}
            onChange={(e) => updateWorkNote(`problem-${index}`, e.target.value)}
            placeholder={`Show your work here... ${getPlaceholderForType(problem.type)}`}
            className="w-full h-32 p-4 border-2 border-[var(--border-input)] rounded-lg bg-white font-mono text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)]"
            style={{ 
              backgroundImage: 'linear-gradient(transparent 31px, #e5e7eb 32px)',
              backgroundSize: '100% 32px',
              lineHeight: '32px'
            }}
          />
        </div>

        {/* Hint */}
        {problem.hint && (
          <div 
            className="text-sm p-4 rounded-lg border-l-4"
            style={{
              backgroundColor: colors.bg,
              borderLeftColor: colors.accent,
              color: colors.text
            }}
          >
            <strong style={{ color: colors.accent }}>💡 Hint:</strong> {problem.hint}
          </div>
        )}
      </motion.div>
    );
  };

  // Get placeholder text for different problem types
  const getPlaceholderForType = (type) => {
    switch (type) {
      case 'addition': return '(e.g., 9 + 6 = 15)';
      case 'subtraction': return '(e.g., 15 - 6 = 9)';
      case 'multiplication': return '(e.g., 12 × 4 = 48)';
      case 'division': return '(e.g., 84 ÷ 7 = 12)';
      case 'fractions': return '(e.g., 2 × 4 = 8, 3 × 5 = 15, so 8/15)';
      default: return '';
    }
  };

  // Rest of the component remains the same...
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