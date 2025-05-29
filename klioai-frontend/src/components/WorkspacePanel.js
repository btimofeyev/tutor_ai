// Replace your existing WorkspacePanel component with this enhanced version
// This keeps the same component name but adds the whiteboard functionality

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMaximize2, FiMinimize2, FiCopy, FiCheck, FiBookOpen, FiGrid, FiPenTool, FiTrash2, FiEdit3 } from 'react-icons/fi';

const WorkspacePanel = ({ workspaceContent, onToggleSize, isExpanded, onClear }) => {
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

  // Enhanced fraction renderer with proper visual display
  const renderFraction = (numerator, denominator) => (
    <div className="inline-flex flex-col items-center mx-1">
      <div className="text-lg font-bold border-b-2 border-current pb-1 px-2">
        {numerator}
      </div>
      <div className="text-lg font-bold pt-1 px-2">
        {denominator}
      </div>
    </div>
  );

  // Parse and render math expressions with proper fraction display
  const renderMathExpression = (text) => {
    // Handle LaTeX-style fractions: \frac{2}{3}
    const latexFractionPattern = /\\frac\{(\d+)\}\{(\d+)\}/g;
    // Handle simple fractions: 2/3
    const simpleFractionPattern = /(\d+)\/(\d+)/g;
    // Handle multiplication symbols
    const timesPattern = /\\times|×/g;

    let parts = [];
    let lastIndex = 0;

    // First handle LaTeX fractions
    let match;
    const processedText = text.replace(latexFractionPattern, (match, num, den) => {
      return `FRACTION_${num}_${den}`;
    });

    // Split by spaces and process each part
    const tokens = processedText.split(/(\s+)/);
    
    return (
      <div className="flex items-center justify-center flex-wrap gap-2 text-2xl">
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
          } else if (token.match(timesPattern) || token === '×') {
            return (
              <span key={index} className="text-[var(--accent-green)] font-bold text-3xl">
                ×
              </span>
            );
          } else if (token === '=') {
            return (
              <span key={index} className="text-[var(--accent-orange)] font-bold text-3xl">
                =
              </span>
            );
          } else if (token.trim()) {
            return (
              <span key={index} className="text-[var(--text-primary)]">
                {token}
              </span>
            );
          }
          return <span key={index}>{token}</span>;
        })}
      </div>
    );
  };

  const renderFractionProblem = (problem, index) => {
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="bg-white border-2 border-[var(--border-subtle)] rounded-xl p-6 mb-4 shadow-lg"
        style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <span className="text-sm font-semibold text-white bg-[var(--accent-blue)] px-3 py-1 rounded-full">
            Problem {index + 1}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => copyToClipboard(problem.text)}
              className="text-[var(--text-tertiary)] hover:text-[var(--accent-blue)] transition-colors p-1"
              title="Copy problem"
            >
              {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
            </button>
          </div>
        </div>

        {/* Problem Statement with Enhanced Math Rendering */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Problem:</h4>
          <div className="p-6 bg-[var(--accent-blue-10-opacity)] rounded-xl border-2 border-[var(--accent-blue-40-opacity-for-border)]">
            {renderMathExpression(problem.text)}
          </div>
        </div>

        {/* Step-by-step breakdown for fraction multiplication */}
        {problem.text.includes('×') && (problem.text.includes('/') || problem.text.includes('frac')) && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Steps to solve:</h4>
            <div className="space-y-3">
              <div className="bg-[var(--accent-green-15-opacity)] p-4 rounded-lg border-l-4 border-[var(--accent-green)]">
                <strong>Step 1:</strong> Multiply the numerators (top numbers) together
              </div>
              <div className="bg-[var(--accent-yellow-15-opacity)] p-4 rounded-lg border-l-4 border-[var(--accent-yellow)]">
                <strong>Step 2:</strong> Multiply the denominators (bottom numbers) together
              </div>
              <div className="bg-[var(--accent-orange-15-opacity)] p-4 rounded-lg border-l-4 border-[var(--accent-orange)]">
                <strong>Step 3:</strong> Simplify the fraction if possible
              </div>
            </div>
          </div>
        )}

        {/* Work Area with lined paper effect */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center">
            <FiEdit3 size={14} className="mr-2" />
            Your Work:
          </h4>
          <textarea
            value={workNotes[`problem-${index}`] || ''}
            onChange={(e) => updateWorkNote(`problem-${index}`, e.target.value)}
            placeholder="Show your work here... (e.g., 2 × 4 = 8, 3 × 5 = 15, so 8/15)"
            className="w-full h-32 p-4 border-2 border-[var(--border-input)] rounded-lg bg-white font-mono text-[var(--text-primary)] resize-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)]"
            style={{ 
              backgroundImage: 'linear-gradient(transparent 31px, #e5e7eb 32px)',
              backgroundSize: '100% 32px',
              lineHeight: '32px'
            }}
          />
        </div>

        {problem.hint && (
          <div className="text-sm text-[var(--text-primary)] bg-[var(--accent-yellow-15-opacity)] p-4 rounded-lg border-l-4 border-[var(--accent-yellow)]">
            <strong className="text-[var(--accent-yellow-darker-for-border)]">💡 Hint:</strong> {problem.hint}
          </div>
        )}
      </motion.div>
    );
  };

  const renderStepByStepExplanation = (content) => {
    return (
      <div className="bg-white border-2 border-[var(--border-subtle)] rounded-xl p-6 mb-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FiBookOpen className="text-[var(--accent-green)] mr-2" size={20} />
            <span className="font-semibold text-lg text-[var(--text-primary)]">How to Multiply Fractions</span>
          </div>
        </div>
        
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--accent-green-10-opacity)] border-2 border-[var(--accent-green-50-opacity-for-border)] rounded-lg p-4"
          >
            <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center">
              <span className="bg-[var(--accent-green)] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">1</span>
              Multiply the numerators
            </h4>
            <p className="text-[var(--text-secondary)] mb-2">Multiply the top numbers together</p>
            <div className="text-lg font-mono bg-white p-3 rounded border text-[var(--accent-green)] text-center">
              2 × 4 = 8
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[var(--accent-yellow-10-opacity)] border-2 border-[var(--accent-yellow-50-opacity-for-border)] rounded-lg p-4"
          >
            <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center">
              <span className="bg-[var(--accent-yellow-darker-for-border)] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">2</span>
              Multiply the denominators
            </h4>
            <p className="text-[var(--text-secondary)] mb-2">Multiply the bottom numbers together</p>
            <div className="text-lg font-mono bg-white p-3 rounded border text-[var(--accent-yellow-darker-for-border)] text-center">
              3 × 5 = 15
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[var(--accent-orange-10-opacity)] border-2 border-[var(--accent-orange-50-opacity-for-border)] rounded-lg p-4"
          >
            <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center">
              <span className="bg-[var(--accent-orange-border)] text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">3</span>
              Simplify if possible
            </h4>
            <p className="text-[var(--text-secondary)] mb-2">Check if the fraction can be reduced</p>
            <div className="text-lg font-mono bg-white p-3 rounded border text-[var(--accent-orange-border)] text-center">
              8/15 (already simplified)
            </div>
          </motion.div>
        </div>

        {/* Visual Example */}
        <div className="mt-6 p-6 bg-[var(--background-main)] rounded-xl border-2 border-dashed border-[var(--border-input)]">
          <h4 className="font-medium text-[var(--text-secondary)] mb-4 text-center">Visual Example:</h4>
          <div className="flex items-center justify-center space-x-6 text-3xl">
            <div className="text-[var(--accent-blue)]">
              {renderFraction('2', '3')}
            </div>
            <span className="text-[var(--accent-green)] font-bold">×</span>
            <div className="text-[var(--accent-blue)]">
              {renderFraction('4', '5')}
            </div>
            <span className="text-[var(--accent-orange)] font-bold">=</span>
            <div className="text-[var(--accent-green)]">
              {renderFraction('8', '15')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!workspaceContent) {
    return (
      <div className="flex flex-col h-full bg-[var(--background-main)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-white">
          <h3 className="font-semibold text-[var(--text-primary)] flex items-center">
            <FiPenTool className="mr-2 text-[var(--accent-blue)]" size={18} />
            Workspace
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
            <p className="text-sm">Problems and visual aids will appear here</p>
            <p className="text-xs mt-2 text-[var(--text-tertiary)]">Like a digital whiteboard! ✨</p>
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
          {onClear && (
            <button
              onClick={onClear}
              className="text-[var(--text-tertiary)] hover:text-[var(--accent-red)] transition-colors p-2 rounded-lg hover:bg-[var(--accent-red-10-opacity)]"
              title="Clear workspace"
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
          {/* Handle fraction explanations */}
          {workspaceContent.type === 'fraction_steps' && 
            renderStepByStepExplanation(workspaceContent.content)
          }

          {/* Handle math problems */}
          {workspaceContent.type === 'math_problems' && 
            workspaceContent.problems.map((problem, i) => renderFractionProblem(problem, i))
          }
          
          {/* Handle mixed content */}
          {workspaceContent.type === 'mixed' && 
            workspaceContent.content.map((item, i) => {
              if (item.type === 'math_problem') return renderFractionProblem(item, i);
              if (item.type === 'fraction_steps') return renderStepByStepExplanation(item.content);
              return null;
            })
          }
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WorkspacePanel;