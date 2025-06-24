# CLAUDE.md - Tutor AI Parent Dashboard Reference

## Project Overview
A comprehensive homeschool management platform with AI-powered content analysis, scheduling, and multi-child coordination. Built with Next.js 15, React 19, and Supabase.

## Architecture Stack
- **Frontend**: Next.js 15.3.2 with App Router, React 19.0.0
- **Styling**: Tailwind CSS v4 with custom CSS variables
- **Authentication**: Supabase with session management
- **Database**: Supabase (PostgreSQL)
- **API**: Express.js backend at localhost:5000
- **AI**: OpenAI GPT-4.1-mini for content analysis
- **File Processing**: multer, pdf-parse, mammoth

## Directory Structure
```
tutor_ai/
├── parent-dashboard-frontend/     # Next.js parent interface
│   ├── src/app/                  # App Router pages
│   ├── src/components/           # Reusable UI components
│   ├── src/hooks/               # Custom React hooks
│   └── src/utils/               # API client & utilities
├── klioai-frontend/             # Child-friendly interface
├── backend/                     # Express.js API server
│   ├── src/controllers/         # Route handlers
│   ├── src/routes/             # API endpoints
│   └── src/utils/              # AI prompts & utilities
└── CLAUDE.md                   # This reference file
```

## Key Features

### 1. Authentication System
- **Supabase Integration**: Email/password authentication
- **Session Management**: Global SupabaseProvider with automatic token refresh
- **Multi-Child Support**: Parent accounts with child PIN authentication
- **Subscription Tiers**: Free → Klio AI Pack ($9.99) → Family ($19) → Academy
- **Feature Gating**: Subscription-based access control

### 2. Materials Management
- **File Upload**: PDF, DOCX, images, text files (up to 10 files)
- **AI Content Analysis**: GPT-4.1-mini extracts learning objectives, difficulty, time estimates
- **Hierarchical Organization**: Subject → Unit → Lesson Container → Materials
- **Progress Tracking**: Completion status, grades, due dates
- **Approval Workflow**: User reviews and approves AI-extracted content

### 3. Schedule Management
- **Dual Calendar System**: 
  - ScheduleCalendar: Static weekly grid view
  - DragDropScheduleCalendar: Interactive drag-and-drop
- **AI Schedule Generation**: Multi-stage reasoning with cognitive load optimization
- **Template System**: Reusable schedule patterns with batch application
- **Conflict Resolution**: Family-wide time slot checking
- **Export Options**: PDF generation for printed schedules

### 4. State Management Architecture
- **Custom Hooks Pattern**: Centralized business logic
- **Local-First Approach**: localStorage caching with 5-minute expiry
- **Offline Capability**: Graceful degradation with automatic sync
- **Batch Operations**: Prevents UI flickering during bulk updates
- **Error Resilience**: Multiple fallback strategies

## API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - Session termination

### Children Management
- `GET /api/children` - List all children for parent
- `POST /api/children` - Create new child account
- `PUT /api/children/:id` - Update child information
- `DELETE /api/children/:id` - Remove child account

### Materials
- `POST /api/materials/upload` - Multi-file upload with AI analysis
- `GET /api/materials/subject/:id` - Get materials by subject
- `PUT /api/materials/:id` - Update material metadata
- `DELETE /api/materials/:id` - Remove material

### Schedule
- `GET /api/schedule/:child_id` - Fetch schedule entries
- `POST /api/schedule` - Create schedule entry with conflict checking
- `PUT /api/schedule/:id` - Update entry
- `DELETE /api/schedule/:id` - Remove entry
- `POST /api/schedule/ai-generate` - AI-powered schedule generation

### Units & Lessons
- `GET /api/units/subject/:id` - Get units for subject
- `POST /api/units` - Create new unit
- `GET /api/lessons/unit/:id` - Get lesson containers

## Custom Hooks Reference

### useScheduleManagement
- **Purpose**: Single-child schedule operations
- **Key Methods**: `createScheduleEntry`, `updateScheduleEntry`, `deleteScheduleEntry`
- **Features**: Offline support, conflict detection, local caching

### useMultiChildScheduleManagement  
- **Purpose**: Multi-child coordination and batch operations
- **Key Methods**: `createMultiChildEntry`, `applyTemplate`, `generateAISchedule`
- **Features**: Family conflict resolution, parallel data fetching

### useChildrenData
- **Purpose**: Child data management with caching
- **Key Methods**: `fetchChildData`, `addChild`, `updateChild`
- **Features**: 5-minute cache, localStorage persistence, parallel loading

### useMaterialManagement
- **Purpose**: Material CRUD operations
- **Key Methods**: `uploadMaterials`, `updateMaterial`, `deleteMaterial`
- **Features**: AI analysis integration, grade tracking, due date management

### useSubscription
- **Purpose**: Subscription status and feature permissions
- **Features**: Feature gating, upgrade prompts, usage limits

## Component Architecture

### UI Components (`/src/components/ui/`)
- **Button.js**: Polymorphic button with multiple variants
- **SkeletonLoader.js**: Comprehensive loading states
- **Toast.js**: Notification system

### Feature Components
- **FeatureGate.js**: Subscription-based access control
- **SubscriptionManager.js**: Plan management interface
- **CreateScheduleEntryModal.js**: Schedule creation form
- **DragDropScheduleCalendar.js**: Interactive calendar

## Development Commands

### Parent Dashboard
```bash
cd parent-dashboard-frontend
npm run dev        # Development server (localhost:3000)
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint check
```

### Backend API
```bash
cd backend
npm run dev        # Development server (localhost:5000)
npm run start      # Production server
npm test           # Run test suite
```

## Configuration Files

### Next.js (`next.config.mjs`)
- Minimal configuration with Turbo mode
- App Router enabled
- Image optimization settings

### Tailwind (`tailwind.config.js`)
- Custom color system using CSS variables
- Extended animations and spacing
- Component-specific utilities

### API Client (`src/utils/api.js`)
- Axios instance with automatic auth headers
- Supabase session integration
- Request/response interceptors

## Database Schema Overview

### Core Tables
- **children**: Child accounts with parent relationships
- **child_subjects**: Subject areas per child
- **units**: Organizational containers within subjects
- **lessons**: Lesson containers within units
- **materials**: Individual learning materials
- **schedule_entries**: Calendar events and assignments

### Key Relationships
- Parent → Children (one-to-many)
- Child → Subjects → Units → Lessons → Materials (hierarchical)
- Schedule entries reference lesson containers

## AI Integration

### Content Analysis Pipeline
1. File upload and text extraction
2. GPT-4.1-mini analysis with structured prompts
3. JSON response with learning objectives, difficulty, time estimates
4. User approval workflow
5. Database storage with complete metadata

### Schedule Generation
- Multi-stage reasoning with cognitive load optimization
- Family coordination modes: balanced, sequential, parallel
- Fallback to rule-based scheduling on AI failure
- Automatic conflict resolution

## Performance Optimizations

### Caching Strategy
- **Memory Cache**: Runtime data with 5-minute expiry
- **localStorage**: Persistent client-side storage
- **API Caching**: Conditional requests with ETags

### Loading Patterns
- **Skeleton Loading**: Detailed loading states for all components
- **Progressive Loading**: Staggered animations reduce perceived load time
- **Parallel Fetching**: Multiple API calls in single requests
- **Batch Operations**: Prevent UI flickering during bulk updates

## Security Considerations

- **Token Management**: Supabase handles token refresh automatically
- **API Authentication**: Bearer tokens on all protected endpoints
- **Parent Ownership**: All operations verify parent access rights
- **Input Validation**: Server-side validation for all user inputs
- **File Processing**: Temporary storage with automatic cleanup

## Troubleshooting

### Common Issues
1. **Schedule conflicts**: Check family-wide availability
2. **Material upload failures**: Verify file formats and sizes
3. **AI analysis errors**: Fallback to manual entry
4. **Cache issues**: Clear localStorage for specific child
5. **Authentication problems**: Check Supabase session status

### Debug Commands
```bash
# Clear localStorage cache
localStorage.clear()

# Check API connectivity
curl http://localhost:5000/api/health

# Verify database connection
npm run db:status
```

## Recent Updates
- Fixed calendar flickering during template application
- Improved unit filtering in schedule modal
- Enhanced multi-child schedule coordination
- Added batch mode for bulk operations

## Next Steps
- WebSocket integration for real-time updates
- Enhanced offline synchronization
- Advanced analytics dashboard
- Mobile app development

---

*This file serves as a comprehensive reference for the Tutor AI parent dashboard system. Update it as features evolve.*