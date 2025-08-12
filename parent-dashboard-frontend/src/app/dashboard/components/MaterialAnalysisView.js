'use client';
import React, { useState, useMemo } from 'react';
import {
  SparklesIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

/**
 * Rich, editable view of AI analysis results for materials
 * Reusable component for both upload review and material editing
 */
export default function MaterialAnalysisView({
  analysisData,
  isEditable = false,
  onDataChange,
  className = ""
}) {
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');

  // Parse analysis data if it's a string
  const analysis = useMemo(() => {
    if (typeof analysisData === 'string') {
      try {
        return JSON.parse(analysisData);
      } catch {
        return {};
      }
    }
    return analysisData || {};
  }, [analysisData]);

  // Determine if this is the new structured format
  const isNewStructuredFormat = analysis.Objective && analysis.ai_model === 'gpt-4o-files-api';

  // Handle field editing
  const startEditing = (field, currentValue) => {
    if (!isEditable) return;
    setEditingField(field);
    setTempValue(Array.isArray(currentValue) ? currentValue.join('\n') : currentValue || '');
  };

  const saveEdit = () => {
    if (!editingField || !onDataChange) return;

    let newValue = tempValue;

    // Handle array fields
    if (['learning_objectives', 'key_terms', 'subject_keywords_or_subtopics', 'prerequisites'].includes(editingField)) {
      newValue = tempValue.split('\n').map(item => item.trim()).filter(Boolean);
    }

    onDataChange(editingField, newValue);
    setEditingField(null);
    setTempValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setTempValue('');
  };

  // Editable field component
  const EditableField = ({ fieldName, label, value, isArray = false, isLarge = false }) => {
    const isEditing = editingField === fieldName;
    const displayValue = isArray ? (Array.isArray(value) ? value : []).join('\n') : (value || '');

    if (isEditing) {
      return (
        <div>
          <div className="flex items-center justify-between mb-2">
            <strong>{label}:</strong>
            <div className="flex space-x-1">
              <button
                onClick={saveEdit}
                className="p-1 text-green-600 hover:text-green-800"
                title="Save"
              >
                <CheckIcon className="h-4 w-4" />
              </button>
              <button
                onClick={cancelEdit}
                className="p-1 text-red-600 hover:text-red-800"
                title="Cancel"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          {isLarge ? (
            <textarea
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="w-full p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={isArray ? 4 : 6}
              placeholder={isArray ? "Enter each item on a new line" : "Enter content"}
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="w-full p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter value"
              autoFocus
            />
          )}
        </div>
      );
    }

    return (
      <div className={isEditable ? "group cursor-pointer" : ""} onClick={() => startEditing(fieldName, value)}>
        <div className="flex items-center justify-between">
          <strong>{label}:</strong>
          {isEditable && (
            <PencilIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        {isArray ? (
          <ul className="list-disc list-inside ml-4 mt-1">
            {(Array.isArray(value) ? value : []).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <div className="mt-1 text-gray-700">{displayValue || 'Not specified'}</div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-gray-50 rounded-lg p-6 ${className}`}>
      <div className="flex items-center mb-4">
        <SparklesIcon className="h-6 w-6 text-blue-500 mr-2" />
        <h4 className="font-semibold text-gray-900">AI Analysis Results</h4>
        {isEditable && (
          <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            Click to edit
          </span>
        )}
      </div>

      <div className="space-y-4 text-sm max-h-96 overflow-y-auto">
        {isNewStructuredFormat ? (
          // New structured lesson format
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField
                fieldName="title"
                label="Title"
                value={analysis.Objective?.[0] || 'Educational Lesson'}
              />
              <div><strong>Content Type:</strong> Lesson</div>
              <div><strong>Estimated Time:</strong> 45 minutes</div>
              <div><strong>Format:</strong> Comprehensive Educational Structure</div>
            </div>

            {/* Learning Objectives */}
            {analysis.Objective && analysis.Objective.length > 0 && (
              <EditableField
                fieldName="learning_objectives"
                label="Learning Objectives"
                value={analysis.Objective}
                isArray={true}
                isLarge={true}
              />
            )}

            {/* Introduction */}
            {analysis.Introduction && (
              <div>
                <strong>Lesson Introduction:</strong>
                <div className="ml-4 mt-1 p-2 bg-gray-50 rounded">
                  {typeof analysis.Introduction === 'object' ?
                    analysis.Introduction.Overview || JSON.stringify(analysis.Introduction, null, 2) :
                    analysis.Introduction}
                </div>
              </div>
            )}

            {/* Theme Information */}
            {analysis.ThemeInfo && (
              <div>
                <strong>Theme/Topic:</strong>
                <div className="ml-4 mt-1 p-2 bg-blue-50 rounded">
                  {typeof analysis.ThemeInfo === 'object' ?
                    analysis.ThemeInfo.Discussion || JSON.stringify(analysis.ThemeInfo, null, 2) :
                    analysis.ThemeInfo}
                </div>
              </div>
            )}

            {/* Main Content */}
            {analysis.TypesOfSentences && (
              <div>
                <strong>Main Content Concepts:</strong>
                <div className="ml-4 mt-1 p-2 bg-green-50 rounded">
                  {Array.isArray(analysis.TypesOfSentences) ?
                    analysis.TypesOfSentences.map((item, index) => (
                      <div key={index} className="mb-2">
                        {typeof item === 'object' ?
                          Object.entries(item).map(([key, value]) => (
                            <div key={key}><strong>{key}:</strong> {value}</div>
                          )) : item}
                      </div>
                    )) :
                    JSON.stringify(analysis.TypesOfSentences, null, 2)}
                </div>
              </div>
            )}

            {/* Guided Practice */}
            {analysis.GuidedPractice && (
              <div>
                <strong>Guided Practice Exercises:</strong>
                <div className="ml-4 mt-1 p-2 bg-yellow-50 rounded">
                  {analysis.GuidedPractice.Exercises ? (
                    <div>
                      <p className="mb-2 font-medium">Practice Sentences:</p>
                      {analysis.GuidedPractice.Exercises.map((exercise, index) => (
                        <div key={index} className="mb-1">
                          <span className="text-blue-600">&quot;{exercise.Sentence}&quot;</span> - <em>{exercise.Type}</em>
                        </div>
                      ))}
                    </div>
                  ) : (
                    JSON.stringify(analysis.GuidedPractice, null, 2)
                  )}
                </div>
              </div>
            )}

            {/* Independent Practice */}
            {analysis.IndependentPractice && (
              <div>
                <strong>Independent Practice:</strong>
                <div className="ml-4 mt-1 p-2 bg-purple-50 rounded">
                  {analysis.IndependentPractice.Exercises ? (
                    <div>
                      <p className="mb-2 font-medium">{analysis.IndependentPractice.Paragraph}</p>
                      <div className="space-y-1">
                        {analysis.IndependentPractice.Exercises.map((exercise, index) => (
                          <div key={index} className="text-sm">
                            <span className="text-purple-600">&quot;{exercise.Sentence}&quot;</span> - <em>{exercise.Type}</em>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">
                      {typeof analysis.IndependentPractice === 'string'
                        ? analysis.IndependentPractice
                        : JSON.stringify(analysis.IndependentPractice, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Teacher Guidance */}
            {analysis.TeacherForUnderstanding && (
              <EditableField
                fieldName="teaching_methodology"
                label="Teaching Guidance"
                value={Array.isArray(analysis.TeacherForUnderstanding) ? analysis.TeacherForUnderstanding : [analysis.TeacherForUnderstanding]}
                isArray={true}
                isLarge={true}
              />
            )}

            {/* Assessment Questions */}
            {analysis.Questions && analysis.Questions.length > 0 && (
              <EditableField
                fieldName="assessment_questions"
                label="Assessment Questions"
                value={analysis.Questions}
                isArray={true}
                isLarge={true}
              />
            )}
          </div>
        ) : (
          // Original format
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField
                fieldName="title"
                label="Title"
                value={analysis.title}
              />
              <div><strong>Content Type:</strong> {analysis.content_type_suggestion || analysis.content_type || 'Not specified'}</div>
              <div><strong>Estimated Time:</strong> {analysis.estimated_completion_time_minutes || analysis.estimated_time_minutes || 'Not specified'} minutes</div>
              <div><strong>Difficulty:</strong> {analysis.difficulty_level || 'Not specified'}</div>
              {analysis.grade_level_suggestion && (
                <div><strong>Grade Level:</strong> {analysis.grade_level_suggestion}</div>
              )}
              {analysis?.total_possible_points_suggestion && (
                <div><strong>Total Points:</strong> {analysis.total_possible_points_suggestion} <span className="text-green-600 text-xs">(detected by AI)</span></div>
              )}
            </div>

            {/* Learning Objectives */}
            {analysis.learning_objectives && analysis.learning_objectives.length > 0 && (
              <EditableField
                fieldName="learning_objectives"
                label="Learning Objectives"
                value={analysis.learning_objectives}
                isArray={true}
                isLarge={true}
              />
            )}

            {/* Subject Keywords */}
            {analysis.subject_keywords_or_subtopics && analysis.subject_keywords_or_subtopics.length > 0 && (
              <div>
                <strong>Topics Covered:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysis.subject_keywords_or_subtopics.map((topic, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Key Terms */}
            {analysis.key_terms && analysis.key_terms.length > 0 && (
              <div>
                <strong>Key Terms:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysis.key_terms.map((term, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Main Content Summary */}
            {analysis.main_content_summary_or_extract && (
              <EditableField
                fieldName="main_content_summary_or_extract"
                label="Content Summary"
                value={analysis.main_content_summary_or_extract}
                isLarge={true}
              />
            )}

            {/* Problems with Context - Most important! */}
            {analysis.problems_with_context && analysis.problems_with_context.length > 0 && (
              <div>
                <strong>Problems Extracted ({analysis.problems_with_context.length} problems found):</strong>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {analysis.problems_with_context.map((problem, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-blue-600">Problem {problem.problem_number}</span>
                        <div className="flex gap-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            problem.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {problem.difficulty}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            {problem.problem_type}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-800 mb-2">{problem.problem_text}</p>
                      {problem.concepts && problem.concepts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {problem.concepts.map((concept, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                              {concept}
                            </span>
                          ))}
                        </div>
                      )}
                      {problem.visual_elements && (
                        <p className="text-xs text-gray-600"><strong>Visual:</strong> {problem.visual_elements}</p>
                      )}
                      {problem.solution_hint && (
                        <p className="text-xs text-gray-600"><strong>Hint:</strong> {problem.solution_hint}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks/Questions (fallback if problems_with_context not available) */}
            {(!analysis.problems_with_context || analysis.problems_with_context.length === 0) &&
             analysis.tasks_or_questions && analysis.tasks_or_questions.length > 0 && (
              <EditableField
                fieldName="tasks_or_questions"
                label={`Tasks/Questions (${analysis.tasks_or_questions.length} items found)`}
                value={analysis.tasks_or_questions}
                isArray={true}
                isLarge={true}
              />
            )}

            {/* Teaching Methodology */}
            {analysis.teaching_methodology && (
              <EditableField
                fieldName="teaching_methodology"
                label="Teaching Approach"
                value={analysis.teaching_methodology}
                isLarge={true}
              />
            )}

            {/* Prerequisites */}
            {analysis.prerequisites && analysis.prerequisites.length > 0 && (
              <EditableField
                fieldName="prerequisites"
                label="Prerequisites"
                value={analysis.prerequisites}
                isArray={true}
                isLarge={true}
              />
            )}

            {/* Answer Key */}
            {analysis.answer_key && (
              <div>
                <strong>Answer Key Found:</strong>
                <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  {typeof analysis.answer_key === 'string' ?
                    analysis.answer_key :
                    JSON.stringify(analysis.answer_key)
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
