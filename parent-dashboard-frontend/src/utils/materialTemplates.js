// parent-dashboard-frontend/src/utils/materialTemplates.js

export const MATERIAL_TEMPLATES = {
    math_worksheet: {
      name: "Math Worksheet",
      icon: "📊",
      defaults: {
        content_type: "worksheet",
        difficulty_level: "intermediate",
        estimated_time_minutes: 30,
        learning_objectives: "Practice mathematical concepts\nApply problem-solving skills",
        topics: "mathematics, problem solving",
        max_score: "100"
      }
    },
    
    reading_assignment: {
      name: "Reading Assignment",
      icon: "📖",
      defaults: {
        content_type: "assignment",
        difficulty_level: "intermediate",
        estimated_time_minutes: 45,
        learning_objectives: "Improve reading comprehension\nExpand vocabulary\nAnalyze text structure",
        topics: "reading, comprehension, vocabulary",
        max_score: ""
      }
    },
    
    science_experiment: {
      name: "Science Experiment",
      icon: "🔬",
      defaults: {
        content_type: "assignment",
        difficulty_level: "intermediate",
        estimated_time_minutes: 90,
        learning_objectives: "Understand scientific method\nMake observations and predictions\nAnalyze results",
        topics: "science, experiment, scientific method",
        max_score: "100"
      }
    },
    
    writing_assignment: {
      name: "Writing Assignment",
      icon: "✍️",
      defaults: {
        content_type: "assignment",
        difficulty_level: "intermediate",
        estimated_time_minutes: 60,
        learning_objectives: "Express ideas clearly in writing\nUse proper grammar and structure\nDevelop creative thinking",
        topics: "writing, grammar, creativity",
        max_score: "100"
      }
    },
    
    quiz: {
      name: "Quiz",
      icon: "❓",
      defaults: {
        content_type: "quiz",
        difficulty_level: "intermediate",
        estimated_time_minutes: 20,
        learning_objectives: "Assess understanding of recent lessons\nIdentify areas for review",
        topics: "assessment, review",
        max_score: "100"
      }
    },
    
    test: {
      name: "Test",
      icon: "📝",
      defaults: {
        content_type: "test",
        difficulty_level: "intermediate",
        estimated_time_minutes: 60,
        learning_objectives: "Demonstrate mastery of unit concepts\nApply knowledge to new situations",
        topics: "assessment, mastery",
        max_score: "100"
      }
    },
    
    research_project: {
      name: "Research Project",
      icon: "🔍",
      defaults: {
        content_type: "assignment",
        difficulty_level: "advanced",
        estimated_time_minutes: 180,
        learning_objectives: "Conduct independent research\nSynthesize information from multiple sources\nPresent findings clearly",
        topics: "research, analysis, presentation",
        max_score: "100"
      }
    },
    
    art_project: {
      name: "Art Project",
      icon: "🎨",
      defaults: {
        content_type: "assignment",
        difficulty_level: "intermediate",
        estimated_time_minutes: 90,
        learning_objectives: "Express creativity through art\nLearn artistic techniques\nDevelop fine motor skills",
        topics: "art, creativity, fine motor skills",
        max_score: "100"
      }
    },
    
    lesson_notes: {
      name: "Lesson Notes",
      icon: "📚",
      defaults: {
        content_type: "notes",
        difficulty_level: "intermediate",
        estimated_time_minutes: 30,
        learning_objectives: "Record important concepts\nOrganize learning materials",
        topics: "notes, organization",
        max_score: ""
      }
    },
    
    practice_problems: {
      name: "Practice Problems",
      icon: "💪",
      defaults: {
        content_type: "worksheet",
        difficulty_level: "intermediate",
        estimated_time_minutes: 45,
        learning_objectives: "Reinforce learned concepts\nBuild problem-solving confidence\nIdentify areas needing more practice",
        topics: "practice, reinforcement",
        max_score: "100"
      }
    }
  };
  
  // Helper function to apply template to form
  export function applyTemplate(templateKey, currentFormData = {}) {
    const template = MATERIAL_TEMPLATES[templateKey];
    if (!template) return currentFormData;
    
    return {
      ...currentFormData,
      ...template.defaults,
      // Don't override title or description if already set
      title: currentFormData.title || '',
      description: currentFormData.description || ''
    };
  }
  
  // Helper to get templates by subject (for smarter suggestions)
  export function getTemplatesBySubject(subjectName) {
    const subjectLower = subjectName.toLowerCase();
    
    if (subjectLower.includes('math')) {
      return ['math_worksheet', 'practice_problems', 'quiz', 'test'];
    } else if (subjectLower.includes('english') || subjectLower.includes('language')) {
      return ['reading_assignment', 'writing_assignment', 'lesson_notes', 'quiz'];
    } else if (subjectLower.includes('science')) {
      return ['science_experiment', 'lesson_notes', 'research_project', 'quiz'];
    } else if (subjectLower.includes('history') || subjectLower.includes('social')) {
      return ['research_project', 'reading_assignment', 'writing_assignment', 'test'];
    } else if (subjectLower.includes('art')) {
      return ['art_project', 'lesson_notes'];
    }
    
    // Default templates for any subject
    return ['lesson_notes', 'assignment', 'quiz', 'test'];
  }
  
  // Enhanced ManualMaterialForm component with templates
  // Add this to the ManualMaterialForm component:
  
  const TemplateSelector = ({ onSelectTemplate, subjectName }) => {
    const [showTemplates, setShowTemplates] = useState(false);
    
    // Get relevant templates based on subject
    const relevantTemplates = subjectName ? getTemplatesBySubject(subjectName) : Object.keys(MATERIAL_TEMPLATES);
    
    if (!showTemplates) {
      return (
        <div className="mb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTemplates(true)}
            className="w-full"
          >
            <DocumentPlusIcon className="h-4 w-4 mr-2" />
            Use Template for Quick Setup
          </Button>
        </div>
      );
    }
  
    return (
      <div className="mb-4 p-3 border border-dashed border-blue-300 rounded-md bg-blue-50/30">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-medium text-blue-800">Choose a Template</h4>
          <button
            type="button"
            onClick={() => setShowTemplates(false)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ✕
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {relevantTemplates.slice(0, 6).map(templateKey => {
            const template = MATERIAL_TEMPLATES[templateKey];
            return (
              <button
                key={templateKey}
                type="button"
                onClick={() => {
                  onSelectTemplate(templateKey);
                  setShowTemplates(false);
                }}
                className="flex items-center p-2 text-sm text-left border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
              >
                <span className="mr-2">{template.icon}</span>
                <span className="font-medium text-blue-800">{template.name}</span>
              </button>
            );
          })}
        </div>
        
        {relevantTemplates.length > 6 && (
          <p className="text-xs text-blue-600 mt-2">
            +{relevantTemplates.length - 6} more templates available
          </p>
        )}
      </div>
    );
  };