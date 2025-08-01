'use client';
import React, { useState } from 'react';
import { 
  XMarkIcon, 
  PencilSquareIcon,
  BookOpenIcon,
  ClockIcon,
  AcademicCapIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import Button from '../../../components/ui/Button';

export default function LessonViewModal({
  lesson,
  onClose,
  onEdit,
  onToggleComplete
}) {
  const [isToggling, setIsToggling] = useState(false);

  if (!lesson) return null;

  const lessonJson = lesson.lesson_json || {};
  const isCompleted = !!lesson.completed_at;
  
  // Check if this is the new structured lesson format from AI
  const isStructuredFormat = lessonJson.Objective && lessonJson.ai_model === 'gpt-4o-files-api';
  
  const handleToggleComplete = async () => {
    if (!onToggleComplete) return;
    
    setIsToggling(true);
    try {
      await onToggleComplete(lesson.id, !isCompleted);
    } catch (error) {
      console.error('Failed to toggle completion:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const formatContentType = (contentType) => {
    return contentType ? contentType.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : 'Material';
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString + 'T00:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-start p-6 pb-4 border-b border-gray-200">
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-3 mb-2">
              <BookOpenIcon className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
              {isCompleted && (
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1">
                <AcademicCapIcon className="h-4 w-4" />
                {formatContentType(lesson.content_type)}
              </span>
              
              {lesson.due_date && (
                <span className="inline-flex items-center gap-1">
                  <ClockIcon className="h-4 w-4" />
                  Due: {formatDueDate(lesson.due_date)}
                </span>
              )}
              
              {lessonJson.estimated_time_minutes && (
                <span className="inline-flex items-center gap-1">
                  <ClockIcon className="h-4 w-4" />
                  {lessonJson.estimated_time_minutes} minutes
                </span>
              )}
            </div>
          </div>
          
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isStructuredFormat ? (
            // New structured lesson format - matching AI analysis display
            <div className="space-y-6">
              {/* Learning Objectives */}
              {lessonJson.Objective && lessonJson.Objective.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <AcademicCapIcon className="h-5 w-5" />
                    Learning Objectives
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    {lessonJson.Objective.map((obj, index) => (
                      <li key={index}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Introduction */}
              {lessonJson.Introduction && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Lesson Introduction</h3>
                  <div className="text-gray-700">
                    {typeof lessonJson.Introduction === 'object' ? 
                      lessonJson.Introduction.Overview || JSON.stringify(lessonJson.Introduction, null, 2) : 
                      lessonJson.Introduction}
                  </div>
                </div>
              )}

              {/* Theme Information */}
              {lessonJson.ThemeInfo && (
                <div className="bg-indigo-50 rounded-lg p-4">
                  <h3 className="font-semibold text-indigo-900 mb-3">Theme & Topic</h3>
                  <div className="text-indigo-800">
                    {typeof lessonJson.ThemeInfo === 'object' ? 
                      lessonJson.ThemeInfo.Discussion || JSON.stringify(lessonJson.ThemeInfo, null, 2) : 
                      lessonJson.ThemeInfo}
                  </div>
                </div>
              )}

              {/* Main Content Concepts */}
              {lessonJson.TypesOfSentences && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3">Main Content Concepts</h3>
                  <div className="text-green-800">
                    {Array.isArray(lessonJson.TypesOfSentences) ? 
                      lessonJson.TypesOfSentences.map((item, index) => (
                        <div key={index} className="mb-3 last:mb-0">
                          {typeof item === 'object' ? 
                            Object.entries(item).map(([key, value]) => (
                              <div key={key} className="mb-1">
                                <strong>{key}:</strong> {value}
                              </div>
                            )) : item}
                        </div>
                      )) : 
                      <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(lessonJson.TypesOfSentences, null, 2)}</pre>}
                  </div>
                </div>
              )}

              {/* Guided Practice */}
              {lessonJson.GuidedPractice && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-3">Guided Practice Exercises</h3>
                  <div className="text-yellow-800">
                    {lessonJson.GuidedPractice.Exercises ? (
                      <div>
                        <p className="mb-3 font-medium">Practice Sentences:</p>
                        <div className="space-y-2">
                          {lessonJson.GuidedPractice.Exercises.map((exercise, index) => (
                            <div key={index} className="bg-white/50 rounded p-2">
                              <span className="text-blue-600 font-medium">&quot;{exercise.Sentence}&quot;</span>
                              <span className="text-gray-600 ml-2">- <em>{exercise.Type}</em></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(lessonJson.GuidedPractice, null, 2)}</pre>
                    )}
                  </div>
                </div>
              )}

              {/* Independent Practice */}
              {lessonJson.IndependentPractice && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-3">Independent Practice</h3>
                  <div className="text-purple-800">
                    {lessonJson.IndependentPractice.Exercises ? (
                      <div>
                        {lessonJson.IndependentPractice.Paragraph && (
                          <p className="mb-3 font-medium">{lessonJson.IndependentPractice.Paragraph}</p>
                        )}
                        <div className="space-y-2">
                          {lessonJson.IndependentPractice.Exercises.map((exercise, index) => (
                            <div key={index} className="bg-white/50 rounded p-2">
                              <span className="text-purple-600 font-medium">&quot;{exercise.Sentence}&quot;</span>
                              <span className="text-gray-600 ml-2">- <em>{exercise.Type}</em></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : lessonJson.IndependentPractice.Paragraph ? (
                      <div>
                        <p className="mb-3 font-medium">{lessonJson.IndependentPractice.Paragraph}</p>
                        {lessonJson.IndependentPractice.Exercises && (
                          <div className="space-y-2">
                            {lessonJson.IndependentPractice.Exercises.map((exercise, index) => (
                              <div key={index} className="bg-white/50 rounded p-2">
                                <span className="text-purple-600 font-medium">&quot;{exercise.Sentence}&quot;</span>
                                <span className="text-gray-600 ml-2">- <em>{exercise.Type}</em></span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : typeof lessonJson.IndependentPractice === 'string' ? (
                      <p>{lessonJson.IndependentPractice}</p>
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(lessonJson.IndependentPractice, null, 2)}</pre>
                    )}
                  </div>
                </div>
              )}

              {/* Teaching Guidance */}
              {lessonJson.TeacherForUnderstanding && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 mb-3">Teaching Guidance</h3>
                  <ul className="list-disc list-inside space-y-1 text-orange-800">
                    {Array.isArray(lessonJson.TeacherForUnderstanding) ? 
                      lessonJson.TeacherForUnderstanding.map((guidance, index) => (
                        <li key={index}>{guidance}</li>
                      )) : 
                      <li>{lessonJson.TeacherForUnderstanding}</li>}
                  </ul>
                </div>
              )}

              {/* Assessment Questions */}
              {lessonJson.Questions && lessonJson.Questions.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-3">Assessment Questions</h3>
                  <ul className="list-disc list-inside space-y-1 text-red-800">
                    {lessonJson.Questions.map((question, index) => (
                      <li key={index}>{question}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            // Legacy format or manual content
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><strong>Content Type:</strong> {formatContentType(lesson.content_type)}</div>
                  {lessonJson.estimated_time_minutes && (
                    <div><strong>Estimated Time:</strong> {lessonJson.estimated_time_minutes} minutes</div>
                  )}
                  {lessonJson.difficulty_level && (
                    <div><strong>Difficulty:</strong> {lessonJson.difficulty_level}</div>
                  )}
                  {lesson.grade_max_value && (
                    <div><strong>Total Points:</strong> {lesson.grade_max_value}</div>
                  )}
                </div>
              </div>

              {/* Learning Objectives */}
              {lessonJson.learning_objectives && lessonJson.learning_objectives.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <AcademicCapIcon className="h-5 w-5" />
                    Learning Objectives
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    {lessonJson.learning_objectives.map((obj, index) => (
                      <li key={index}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Terms */}
              {lessonJson.key_terms && lessonJson.key_terms.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3">Key Terms</h3>
                  <div className="flex flex-wrap gap-2">
                    {lessonJson.key_terms.map((term, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 border border-green-200">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Problems with Context */}
              {lessonJson.problems_with_context && lessonJson.problems_with_context.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-3">
                    Problems & Exercises ({lessonJson.problems_with_context.length} problems)
                  </h3>
                  <div className="space-y-3">
                    {lessonJson.problems_with_context.map((problem, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-purple-200">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-purple-700">Problem {problem.problem_number}</span>
                          <div className="flex gap-2">
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
                          <p className="text-xs text-gray-600 mb-1"><strong>Visual:</strong> {problem.visual_elements}</p>
                        )}
                        {problem.solution_hint && (
                          <p className="text-xs text-gray-600"><strong>Hint:</strong> {problem.solution_hint}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Content Summary */}
              {lessonJson.main_content_summary_or_extract && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Content Summary</h3>
                  <p className="text-gray-700">{lessonJson.main_content_summary_or_extract}</p>
                </div>
              )}

              {/* Subject Keywords */}
              {lessonJson.subject_keywords_or_subtopics && lessonJson.subject_keywords_or_subtopics.length > 0 && (
                <div className="bg-indigo-50 rounded-lg p-4">
                  <h3 className="font-semibold text-indigo-900 mb-3">Topics Covered</h3>
                  <div className="flex flex-wrap gap-2">
                    {lessonJson.subject_keywords_or_subtopics.map((topic, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleToggleComplete}
              variant={isCompleted ? "secondary" : "primary"}
              disabled={isToggling}
              className="flex items-center gap-2"
            >
              <CheckCircleIcon className="h-4 w-4" />
              {isToggling ? 'Updating...' : isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
            </Button>
            
            {lesson.grade_max_value && !lesson.grade_value && isCompleted && (
              <span className="text-sm text-orange-600 font-medium">
                Needs grading
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
            {onEdit && (
              <Button onClick={() => onEdit(lesson)} variant="outline" className="flex items-center gap-2">
                <PencilSquareIcon className="h-4 w-4" />
                Edit Details
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}