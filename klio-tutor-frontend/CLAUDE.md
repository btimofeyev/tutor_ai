# Klio Tutor Frontend - Adaptive Learning System

## Overview
Advanced AI-powered adaptive tutoring interface built with Next.js and GPT-5-nano. This frontend provides personalized, cost-effective learning experiences that automatically adjust to each child's needs, learning style, and progress in real-time.

## Architecture
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19 with Tailwind CSS
- **AI Model**: GPT-5-nano via OpenAI Responses API (80% cost reduction)
- **Authentication**: JWT-based child authentication
- **API Integration**: RESTful backend with adaptive learning features
- **Styling**: Custom child-friendly design system
- **Adaptive Engine**: Real-time difficulty adjustment and personalization

## Project Structure
```
klio-tutor-frontend/
├── app/
│   ├── components/
│   │   ├── LoginPage.js       # Child login with username/PIN
│   │   └── TutorPage.js       # Main chat interface
│   ├── contexts/
│   │   └── AuthContext.js     # Authentication state management
│   ├── globals.css            # Tailwind CSS + custom styles
│   ├── layout.js             # Root layout with AuthProvider
│   └── page.js               # Main app routing logic
├── tailwind.config.js        # Tailwind configuration
├── postcss.config.js         # PostCSS configuration
├── next.config.mjs          # Next.js configuration
└── package.json             # Dependencies and scripts
```

## Technology Stack
- **Next.js 15**: React framework with App Router
- **React 19**: UI library with hooks and context
- **Tailwind CSS 3**: Utility-first CSS framework
- **Fredoka Font**: Child-friendly Google Font
- **OpenAI GPT-5-nano**: Most cost-effective AI model ($0.05/M input, $0.40/M output)
- **Responses API**: Advanced chain-of-thought reasoning preservation
- **MCP Server**: Educational data context provider for personalized learning
- **Supabase Integration**: Real-time access to assignments, grades, and progress
- **React Markdown**: Rich formatting for educational content
- **Framer Motion**: Smooth animations
- **React Icons**: Icon library

## Environment Configuration

### Environment Variables (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000  # Backend API URL
```

### API Endpoints Used
- `POST /api/auth/child/login` - Child authentication
- `POST /api/tutor/chat` - Educational AI tutoring chat with GPT-5-nano and MCP context
- `GET /api/health` - Backend health check

### MCP Server Integration
The backend connects to an MCP (Model Context Protocol) server that provides:
- Real-time access to student assignments and grades
- Lesson content with actual worksheet questions
- Performance analytics for targeted tutoring
- Smart recommendations based on completion status

### Educational Tutoring API Format
```javascript
// Request with chain-of-thought preservation
{
  message: "Help me with math problems",
  sessionHistory: [...previousMessages],
  previousResponseId: "response_12345" // For reasoning chain continuity
}

// Response with educational guidance
{
  success: true,
  response: "Let me help you with math step by step. First, can you tell me what kind of math problem you're working on?",
  responseId: "response_12346",
  timestamp: "2025-08-18T00:00:00.000Z"
}
```

## Design System

### Colors
- **Accent Blue**: `#B3E0F8` - Primary interface color
- **Accent Yellow**: `#FFE6A7` - Highlights and accents
- **Accent Green**: `#A7F3D0` - Success states
- **Accent Red**: `#FDA4AF` - Error states
- **Text Primary**: `#232323` - Main text color
- **Text Secondary**: `#757575` - Secondary text

### Typography
- **Primary Font**: Fredoka (Google Fonts)
- **Fallback**: system-ui, sans-serif
- **Weight Range**: 300-700

### Components
- **Input Base**: Rounded inputs with focus states
- **Button Primary**: Blue accent buttons with hover effects
- **Loading Dots**: Animated loading indicators
- **Bounce Gentle**: Subtle bounce animations

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 3001)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Authentication Flow

### Child Login Process
1. Child enters username and PIN on LoginPage
2. Frontend sends POST request to `/api/auth/child/login`
3. Backend validates credentials and returns JWT tokens
4. Frontend stores tokens and child data in localStorage
5. App navigates to TutorPage with authenticated session

### Token Management
- **Access Token**: Short-lived (2 hours) for API requests
- **Refresh Token**: Long-lived (7 days) for token renewal
- **Session ID**: Database session tracking
- **Child Data**: Basic profile information

### Protected Routes
- All tutor functionality requires valid child authentication
- Automatic token validation on app initialization
- Logout clears all stored authentication data

## Key Features

### 🎓 Educational Tutoring System
- **Socratic Method**: AI guides students to discover answers through questions and hints
- **Step-by-Step Learning**: Breaks down complex problems into manageable steps
- **Educational Guidance**: Never gives direct answers - helps students think through problems
- **Cost Optimization**: GPT-5-nano provides high-quality tutoring at minimal cost
- **MCP Integration**: Real-time access to student's actual coursework, assignments, and grades
- **Personalized Context**: AI references specific assignments and performance data

### 🤖 GPT-5-nano Integration
- **Chain of Thought**: Preserves reasoning across conversations for better context continuity
- **Minimal Reasoning Mode**: Fast responses optimized for educational conversations
- **Educational System Prompt**: Specifically designed to guide learning, not provide answers
- **Conversation Continuity**: Maintains context across the entire tutoring session
- **Real Assignment Content**: AI works with actual lesson questions and worksheet content
- **Smart Context Detection**: Automatically fetches relevant coursework when students mention assignments

### 💡 Clean Learning Interface
- **Simple Chat Design**: Clean, distraction-free interface focused on learning
- **Subject-Specific Suggestions**: Color-coded buttons for math, science, writing
- **Learning-Focused Prompts**: Encourages students to engage with the material
- **Markdown Support**: Rich formatting for mathematical expressions and educational content

### 🔐 Authentication & Security
- Child-friendly username + PIN authentication
- JWT token management with automatic refresh
- Session-based learning continuity
- Privacy-focused design for K-8 students

### 📱 Enhanced User Experience
- **Markdown Support**: Rich formatting for math steps and educational content
- **Responsive Design**: Works perfectly on tablets and phones
- **Accessibility**: Screen reader support and keyboard navigation
- **Performance**: Optimized bundle size and fast loading

## API Integration

### Authentication Headers
```javascript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`
};
```

### Error Handling
- Network error recovery
- Token expiration handling
- User-friendly error messages
- Automatic retry logic

## Development Guidelines

### Code Style
- Use functional components with hooks
- Implement proper error boundaries
- Follow React best practices
- Maintain consistent naming conventions

### Security Considerations
- Never expose sensitive data in console logs
- Validate all user inputs
- Use HTTPS in production
- Implement proper CORS policies

### Performance
- Optimize bundle size
- Lazy load components when appropriate
- Implement proper caching strategies
- Monitor Core Web Vitals

## Deployment

### Production Build
```bash
npm run build
```

### Environment Setup
- Set `NEXT_PUBLIC_API_URL` to production backend URL
- Ensure CORS is configured for production domain
- Test authentication flow in production environment

### PM2 Configuration
```bash
# Build the application
npm run build

# Start with PM2
pm2 start npm --name "klio-tutor-frontend" -- start

# Monitor logs
pm2 logs klio-tutor-frontend
```

## Troubleshooting

### Common Issues
1. **Login 404 Error**: Check API endpoint URL in environment variables
2. **CORS Errors**: Verify backend CORS configuration includes frontend URL
3. **Styling Issues**: Clear Next.js cache with `rm -rf .next`
4. **Token Errors**: Clear localStorage and try logging in again

### Debug Mode
```bash
# Run with verbose logging
npm run dev

# Check browser console for detailed error messages
# Verify network requests in browser dev tools
```

### Health Checks
- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:5000/api/health`
- Authentication: Test login with valid child credentials

## What We're Building

### 🎓 Vision: Accessible AI Educational Tutoring
We're creating a cost-effective AI tutoring system that guides students through learning using proven educational methods like the Socratic approach.

### 🚀 Current Capabilities (August 2025)
- **GPT-5-nano Powered**: Cost-effective AI tutoring with high-quality educational interactions
- **Socratic Tutoring**: AI guides students to discover answers rather than providing direct solutions
- **Conversation Continuity**: Chain-of-thought preservation maintains context across sessions
- **Multi-Subject Support**: Math, science, writing, reading with educational guidance
- **K-12 Focused**: Age-appropriate language and educational approaches
- **Real Coursework Integration**: AI works with actual assignments, worksheets, and lesson content
- **Performance-Aware Tutoring**: AI knows student grades and suggests review for low-scoring work
- **Smart Recommendations**: AI prioritizes incomplete work and areas needing improvement

### 💰 Cost Effectiveness
- **GPT-5-nano Model**: Most cost-effective reasoning model for educational applications
- **Minimal Reasoning Effort**: Optimized for fast, educational responses
- **Chain-of-Thought Caching**: Reduces repeated reasoning costs
- **Scalable Architecture**: Cost-effective enough for widespread educational deployment

### 🔮 Future Development Opportunities

#### Educational Enhancement
- **Learning Style Recognition**: Adapt explanations to different learning preferences
- **Progress Tracking**: Monitor student understanding and learning patterns
- **Curriculum Alignment**: Integration with educational standards
- **Parent Reporting**: Detailed insights into student learning sessions

#### Technical Improvements
- **Voice Integration**: Natural speech input/output for accessibility
- **Visual Learning**: Support for diagrams and mathematical notation
- **Advanced Reasoning**: Higher reasoning effort for complex problems
- **Multi-Modal Support**: Integration with images and documents

### 🎯 Current Goals
- **Accessible Tutoring**: Make quality educational guidance available to all students
- **Cost-Effective Solution**: Leverage GPT-5-nano for affordable AI tutoring
- **Educational Best Practices**: Implement proven teaching methods in AI form
- **Student-Centered Learning**: Guide discovery rather than provide answers

### 🌍 Impact Vision
- Make personalized tutoring accessible regardless of economic background
- Support students in developing critical thinking skills
- Complement traditional education with AI-powered guidance
- Create scalable educational technology that truly helps students learn

## Support

### Logs
- Browser console for frontend errors
- Network tab for API communication issues
- PM2 logs for production deployment issues

### Configuration Files
- `next.config.mjs` - Next.js settings
- `tailwind.config.js` - Styling configuration
- `package.json` - Dependencies and scripts