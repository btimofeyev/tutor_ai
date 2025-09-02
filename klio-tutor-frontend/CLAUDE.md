# Klio AI Tutor Frontend - Context-Aware Learning Assistant

## Overview
The Klio AI Tutor is a Next.js-based educational frontend that provides personalized AI tutoring for K-12 students. This system is designed to integrate deeply with the parent dashboard's learning management system, creating a context-aware AI tutor that knows exactly what assignments students are working on and can reference actual lesson content.

## Current Architecture

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **UI**: React 19 with Tailwind CSS
- **AI**: OpenAI GPT-4o-mini for cost-effective tutoring
- **Authentication**: JWT-based child authentication with PIN
- **Backend**: Express.js API at localhost:5000
- **Database**: Supabase PostgreSQL with comprehensive learning schema
- **Math Rendering**: KaTeX for mathematical expressions

### Project Structure
```
klio-tutor-frontend/
├── app/
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginPage.js          # Child PIN authentication
│   │   └── tutor/
│   │       └── SimpleChatInterface.js # Main chat interface
│   ├── contexts/
│   │   └── AuthContext.js           # Authentication state management
│   ├── globals.css                  # Tailwind + custom styles
│   ├── layout.js                    # Root layout with AuthProvider
│   └── page.js                      # Main routing logic
├── package.json                     # Dependencies
└── CLAUDE.md                       # This documentation
```

## Current Features

### 1. Child Authentication System
- **PIN-based Login**: Simple 4-digit PIN interface designed for children
- **Username + PIN**: Secure but child-friendly authentication
- **Session Management**: JWT tokens with automatic refresh
- **Parent Integration**: Links to parent accounts in main dashboard

### 2. AI Chat Interface
- **GPT-4o-mini Integration**: Cost-effective AI model optimized for education
- **Educational Prompts**: Socratic method guidance, age-appropriate responses
- **Conversation History**: Persistent sessions with sidebar navigation
- **Math Support**: KaTeX rendering for mathematical expressions
- **Markdown Support**: Rich formatting for educational content

### 3. Session Management
- **Persistent Sessions**: Conversations survive page refreshes
- **Response Chaining**: OpenAI conversation storage for context continuity
- **History Sidebar**: Access to previous learning sessions
- **Auto-cleanup**: Old sessions cleaned up automatically

## 🚀 THE REVOLUTIONARY UPGRADE: Context-Aware Learning

### The Vision
Transform the AI tutor from a generic chatbot into a **context-aware learning companion** that:
- Knows exactly what assignments the student needs to complete
- Can reference actual worksheet questions and lesson content
- Understands the teaching context from lesson plans
- Provides targeted help based on the student's current progress

### Database Schema Understanding

The learning management system has this hierarchy:
```
children (students)
├── child_subjects (Math, Science, etc.)
    ├── units (Fractions, Algebra, etc.)
        ├── lesson_groups (teacher's lesson plans)
            └── materials (student worksheets, assignments, tests)
```

### Key Database Tables for Integration

#### `materials` Table (Student Work)
```sql
- id: unique identifier
- lesson_id: links to lesson_groups (teacher content)
- child_subject_id: which subject this belongs to
- title: "Fractions Worksheet", "Chapter 5 Quiz"
- content_type: worksheet, assignment, quiz, test
- lesson_json: AI-extracted content with actual questions
- completed_at: NULL = incomplete (next work to do)
- grade_value: student's score
- grade_max_value: points possible
- material_order: sequence within lesson
```

#### `lesson_groups` Table (Teacher Lessons)
```sql
- id: unique identifier
- unit_id: which unit this lesson belongs to
- title: "Converting Fractions to Decimals"
- description: lesson plan content
- sequence_order: lesson sequence
```

#### `learning_sessions` Table (Study Tracking)
```sql
- id: session identifier
- child_id: which student
- material_id: what they're working on
- problems_attempted/correct: progress tracking
```

## Implementation Plan

### Phase 1: Backend Learning Context Service

#### 1. Create `learningContextService.js`
```javascript
// backend/src/services/learningContextService.js

class LearningContextService {
  // Get next incomplete assignments
  async getNextAssignments(childId, limit = 5) {
    const { data } = await supabase
      .from('materials')
      .select(`
        *,
        lesson_groups!inner(title, description),
        child_subjects!inner(*, subjects(name)),
        units!lesson_groups(name)
      `)
      .eq('child_subjects.child_id', childId)
      .is('completed_at', null)
      .order('material_order')
      .limit(limit);
    
    return data;
  }

  // Get full context for current material
  async getMaterialContext(materialId) {
    const { data } = await supabase
      .from('materials')
      .select(`
        *,
        lesson_groups!inner(*),
        child_subjects!inner(*, subjects(name))
      `)
      .eq('id', materialId)
      .single();
    
    return data;
  }

  // Get recent grades for encouragement
  async getRecentProgress(childId, days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const { data } = await supabase
      .from('materials')
      .select('title, grade_value, grade_max_value, completed_at')
      .eq('child_subject_id.child_id', childId)
      .not('completed_at', 'is', null)
      .gte('completed_at', cutoff.toISOString())
      .order('completed_at', { ascending: false });
    
    return data;
  }
}
```

#### 2. Enhance AI Service Integration
```javascript
// backend/src/services/simpleOpenAIService.js

async sendMessage(sessionId, message, childName) {
  // Detect if student needs assignment help
  const needsContext = this.detectHomeworkIntent(message);
  
  if (needsContext) {
    // Get student's current learning context
    const context = await learningContextService.getNextAssignments(childId);
    
    // Build context-aware system prompt
    const contextPrompt = this.buildContextAwarePrompt(childName, context);
  }
  
  // Continue with normal AI processing...
}

detectHomeworkIntent(message) {
  const homeworkKeywords = [
    'homework', 'assignment', 'worksheet', 'problem', 'question',
    'next', 'help', 'stuck', "don't understand", 'quiz', 'test'
  ];
  
  return homeworkKeywords.some(word => 
    message.toLowerCase().includes(word)
  );
}

buildContextAwarePrompt(childName, context) {
  let prompt = this.buildStudyAssistantPrompt(childName);
  
  if (context && context.length > 0) {
    const current = context[0];
    prompt += `

CURRENT LEARNING CONTEXT:
Subject: ${current.child_subjects.subjects.name}
Unit: ${current.units.name}
Lesson: "${current.lesson_groups.title}"
Assignment: "${current.title}"

ASSIGNMENT DETAILS:
${JSON.stringify(current.lesson_json, null, 2)}

TEACHING CONTEXT:
${current.lesson_groups.description}

When helping, reference the specific assignment and guide using educational methods.
Don't give direct answers - help the student think through the problem.`;
  }
  
  return prompt;
}
```

#### 3. New API Endpoints
```javascript
// backend/src/routes/aiTutorRoutes.js

// Get learning context for AI tutor
router.get('/context/:childId', enforceAIAccess, async (req, res) => {
  try {
    const context = await learningContextService.getNextAssignments(
      req.params.childId
    );
    res.json({ success: true, context });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific material context
router.get('/material/:materialId/context', enforceAIAccess, async (req, res) => {
  try {
    const context = await learningContextService.getMaterialContext(
      req.params.materialId
    );
    res.json({ success: true, context });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### Phase 2: Frontend Context Integration

#### 1. Enhanced Quick Suggestions
```javascript
// app/components/tutor/SimpleChatInterface.js

const [quickSuggestions, setQuickSuggestions] = useState([]);
const [learningContext, setLearningContext] = useState(null);

// Load learning context on component mount
useEffect(() => {
  if (childData?.id) {
    fetchLearningContext();
  }
}, [childData]);

const fetchLearningContext = async () => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/tutor/context/${childData.id}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('child_token')}`
        }
      }
    );
    
    const data = await response.json();
    if (data.success) {
      setLearningContext(data.context);
      updateQuickSuggestions(data.context);
    }
  } catch (error) {
    console.error('Error fetching learning context:', error);
  }
};

const updateQuickSuggestions = (context) => {
  if (context && context.length > 0) {
    const current = context[0];
    setQuickSuggestions([
      `Help with ${current.title}`,
      "What's my next assignment?",
      "I'm stuck on a problem",
      "Explain this lesson's concept"
    ]);
  } else {
    // Fallback to generic suggestions
    setQuickSuggestions([
      "Help me with my homework",
      "Explain this concept",
      "Practice problems",
      "Check my progress"
    ]);
  }
};
```

#### 2. Context Display Component
```javascript
// New component to show current assignment context

const LearningContextCard = ({ context }) => {
  if (!context || context.length === 0) return null;
  
  const current = context[0];
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center mb-2">
        <FiBook className="text-blue-600 mr-2" />
        <span className="text-sm font-medium text-blue-800">
          Currently Working On
        </span>
      </div>
      <h3 className="font-semibold text-gray-800">{current.title}</h3>
      <p className="text-sm text-gray-600">
        {current.child_subjects.subjects.name} • {current.lesson_groups.title}
      </p>
      {current.lesson_json?.questions && (
        <p className="text-xs text-blue-600 mt-2">
          {current.lesson_json.questions.length} questions to work through
        </p>
      )}
    </div>
  );
};
```

### Phase 3: Smart Features

#### 1. Automatic Problem Detection
```javascript
// Detect when student asks about specific problems
const detectProblemReference = (message) => {
  const problemPatterns = [
    /question (\d+)/i,
    /problem (\d+)/i,
    /number (\d+)/i,
    /#(\d+)/
  ];
  
  for (const pattern of problemPatterns) {
    const match = message.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return null;
};
```

#### 2. Progress Tracking Integration
```javascript
// Track when students complete problems
const markProblemAttempted = async (materialId, problemNumber) => {
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/problem-attempt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('child_token')}`
    },
    body: JSON.stringify({
      materialId,
      problemNumber,
      attemptedAt: new Date().toISOString()
    })
  });
};
```

## Example User Experience After Implementation

### Before (Current State):
**Student**: "I need help with homework"  
**AI**: "What subject do you need help with?"  
**Student**: "Math"  
**AI**: "What specific math problem?"

### After (Context-Aware):
**Student**: "I need help with homework"  
**AI**: "I see you're working on the Fractions Worksheet from yesterday's lesson on 'Converting Fractions to Decimals'. You have 7 questions remaining.

Looking at question #4: 'Convert 5/8 to a decimal. Show your work.'

Your teacher showed two methods in the lesson. Would you like to try the division method or the equivalent fraction method first?"

**Student**: "Division method"  
**AI**: "Perfect! So we need to divide 5 by 8. Since 5 is smaller than 8, what do you think happens when we try to divide? Remember what happens with decimal points..."

## Development Environment

### Prerequisites
- Node.js 18+
- Backend API running on localhost:5000
- Supabase database with learning schema

### Setup Commands
```bash
cd klio-tutor-frontend
npm install
npm run dev  # Starts on port 3001
```

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Testing the Integration

### Test Scenarios
1. **Login as a child** with materials in database
2. **Ask "help with homework"** - should show context-aware response
3. **Reference specific questions** - AI should know the content
4. **Check quick suggestions** - should be dynamic based on assignments

### Database Test Data
Ensure test database has:
- Child account with PIN
- Materials with `completed_at = NULL`
- `lesson_json` with actual question content
- Parent lesson content in `lesson_groups`

## Success Metrics

### Quantitative Goals
- 90% reduction in "What homework?" clarification questions
- 50% faster time to get specific help
- 80% of conversations reference actual assignment content

### Qualitative Goals
- Students feel AI "knows" their work
- Parents see immediate value in integration
- Natural conversation flow about specific problems

## Future Enhancements

### Phase 4: Advanced Features
- **Voice Support**: Text-to-speech for younger students
- **Image Recognition**: Upload photos of worksheet problems
- **Progress Visualization**: Show completion progress in chat
- **Parent Notifications**: Alert parents when student struggles

### Phase 5: Learning Analytics
- **Concept Mastery Tracking**: Update `concept_mastery` table
- **Difficulty Prediction**: Identify problems student will struggle with
- **Adaptive Difficulty**: Suggest easier/harder problems based on performance

## Architecture Notes

### Performance Considerations
- Cache learning context for 5 minutes to reduce DB queries
- Lazy load lesson content only when needed
- Batch problem attempts to reduce API calls

### Security
- All context fetched through authenticated API endpoints
- Children can only access their own materials
- No sensitive grade information exposed in frontend cache

### Error Handling
- Graceful degradation when learning context unavailable
- Fallback to generic tutoring when DB connection fails
- Clear error messages for authentication issues

## 📋 Implementation Progress Tracker

### Phase 1: Backend Learning Context Service
- [ ] Create `backend/src/services/learningContextService.js`
  - [ ] Implement `getNextAssignments(childId)` method
  - [ ] Implement `getMaterialContext(materialId)` method  
  - [ ] Implement `getRecentProgress(childId)` method
  - [ ] Add proper error handling and logging
- [ ] Enhance `backend/src/services/simpleOpenAIService.js`
  - [ ] Add `detectHomeworkIntent(message)` method
  - [ ] Add `buildContextAwarePrompt(childName, context)` method
  - [ ] Modify `sendMessage()` to include learning context
  - [ ] Test context integration with AI responses
- [ ] Add new API endpoints in `backend/src/routes/aiTutorRoutes.js`
  - [ ] Add `GET /context/:childId` endpoint
  - [ ] Add `GET /material/:materialId/context` endpoint
  - [ ] Add `POST /problem-attempt` endpoint for tracking
  - [ ] Test all endpoints with authentication

### Phase 2: Frontend Context Integration
- [ ] Enhance `app/components/tutor/SimpleChatInterface.js`
  - [ ] Add learning context state management
  - [ ] Implement `fetchLearningContext()` function
  - [ ] Add dynamic quick suggestions based on assignments
  - [ ] Add context refresh on new sessions
- [ ] Create `LearningContextCard` component
  - [ ] Display current assignment information
  - [ ] Show progress indicators
  - [ ] Add visual assignment status
- [ ] Update quick suggestions system
  - [ ] Make suggestions dynamic based on incomplete materials
  - [ ] Add fallback for when no context available
  - [ ] Test suggestion updates

### Phase 3: Smart Features
- [ ] Implement problem detection
  - [ ] Add `detectProblemReference(message)` function
  - [ ] Parse question numbers from student messages
  - [ ] Link specific problems to material context
- [ ] Add progress tracking
  - [ ] Implement `markProblemAttempted()` function
  - [ ] Track study sessions per material
  - [ ] Update learning analytics tables
- [ ] Enhanced AI responses
  - [ ] Reference specific question numbers
  - [ ] Include lesson context in explanations
  - [ ] Provide step-by-step guidance based on teaching methods

### Phase 4: Testing & Refinement
- [ ] Database setup for testing
  - [ ] Create test child accounts with PIN authentication
  - [ ] Add sample materials with `completed_at = NULL`
  - [ ] Populate `lesson_json` with realistic question content
  - [ ] Create lesson_groups with teaching context
- [ ] Integration testing
  - [ ] Test login → context fetch → AI response flow
  - [ ] Verify homework intent detection works
  - [ ] Test dynamic suggestions update correctly
  - [ ] Validate specific question referencing
- [ ] User experience validation
  - [ ] Compare before/after conversation flows
  - [ ] Measure reduction in clarification questions
  - [ ] Test with multiple subjects and assignment types

### Phase 5: Performance & Polish
- [ ] Performance optimizations
  - [ ] Add 5-minute context caching
  - [ ] Implement lazy loading for lesson content
  - [ ] Batch problem attempt updates
- [ ] Error handling improvements
  - [ ] Graceful degradation when context unavailable
  - [ ] Fallback to generic tutoring on DB failures
  - [ ] Clear error messages for auth issues
- [ ] Security validation
  - [ ] Verify children only access own materials
  - [ ] Test authentication on all new endpoints
  - [ ] Validate no grade information leaks in frontend

### Completion Checklist
- [ ] All backend services implemented and tested
- [ ] All frontend components updated with context awareness
- [ ] Database queries optimized and indexed
- [ ] User testing shows dramatic improvement in experience
- [ ] Documentation updated with final implementation details
- [ ] Success metrics achieved (90% reduction in "What homework?" questions)

---

### Implementation Notes
- **Start with Phase 1** - Backend foundation is crucial
- **Test early and often** - Each phase should be functional before moving to next
- **Use real data** - Test with actual lesson content and assignments
- **Focus on user experience** - The AI should feel "magical" in knowing student's work

---

*This documentation serves as the blueprint for transforming the Klio AI Tutor from a generic educational chatbot into a revolutionary context-aware learning companion that truly understands and assists with the student's actual schoolwork.*