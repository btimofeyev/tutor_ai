# Smart Scheduler/Planner Feature Implementation Plan

## Overview
Add an intelligent weekly/monthly scheduler that allows parents to:
- View all assignments/lessons in calendar format
- Auto-schedule workload using LLM analysis
- Drag-and-drop manual scheduling
- Track time allocation per subject
- Get AI-powered scheduling recommendations

## Implementation Status

### ✅ Phase 1 - Basic Calendar UI and Manual Scheduling (COMPLETED)

#### Frontend Implementation
- [x] **New Page & Navigation**
  - `/schedule` route created with full layout
  - Updated `StudentSidebar` with Schedule navigation item (📅 Schedule)
  - Responsive calendar view with weekly/monthly toggles

- [x] **New Components Created**
  - `ScheduleCalendar.js` - Main calendar interface with react-big-calendar
  - `ScheduleSettings.js` - Placeholder for configuration modal
  - Custom calendar styling matching app design system

- [x] **State Management**
  - `useScheduleManagement.js` - Comprehensive hook for schedule CRUD, time calculations, LLM calls
  - Calendar event handling (create/edit/delete)
  - Modal state management
  - Loading and error states

#### Backend Implementation
- [x] **Database Schema**
  ```sql
  -- schedule_entries table for scheduled time blocks
  -- child_schedule_preferences table for study preferences
  -- Indexes for performance optimization
  -- Triggers for automatic timestamp updates
  ```

- [x] **API Endpoints**
  - `GET /api/schedule/:child_id` - Get child's schedule
  - `POST /api/schedule` - Create schedule entry
  - `PUT /api/schedule/:id` - Update schedule entry  
  - `DELETE /api/schedule/:id` - Delete schedule entry
  - `POST /api/schedule/ai-generate` - LLM auto-scheduling (placeholder)
  - `GET/POST /api/schedule/preferences/:child_id` - Schedule preferences

- [x] **Controllers & Services**
  - `scheduleController.js` - Handle schedule CRUD operations with ownership verification
  - Route integration in main server.js
  - Conflict detection for overlapping time slots

#### Technical Achievements
- [x] **Calendar Features**
  - Interactive calendar with time slot selection
  - Color-coded subjects (Math=red, Science=green, English=purple, History=yellow)
  - Event creation by clicking time slots
  - Event editing by clicking existing events
  - Week/Month/Day view toggles
  - Responsive design with mobile support

- [x] **Dependencies Installed**
  - `react-big-calendar` for calendar UI
  - `date-fns` for date manipulation  
  - `@dnd-kit` libraries for drag-and-drop (React 19 compatible)

### 🚧 Phase 2 - Modal Components and Enhanced UX (NEXT)

#### Planned Components
- [ ] `CreateScheduleEntryModal.js` - Form for scheduling new study time
- [ ] `EditScheduleEntryModal.js` - Edit existing schedule entries
- [ ] `ScheduleSettingsModal.js` - Configure child study preferences
- [ ] `ScheduleStatsWidget.js` - Time allocation analytics

#### Planned Features
- [ ] **Create Schedule Entry Modal**
  - Subject/material selection dropdown
  - Date and time pickers
  - Duration slider/input
  - Notes/description field
  - Validation and conflict checking

- [ ] **Edit Schedule Entry Modal**
  - Pre-populated form fields
  - Status updates (completed/skipped/rescheduled)
  - Delete confirmation
  - Time adjustment with conflict detection

- [ ] **Schedule Settings Modal**
  - Preferred study hours (start/end time)
  - Maximum daily study minutes
  - Break duration preferences
  - Study days selection (weekday checkboxes)
  - Difficult subjects morning preference

### 📅 Phase 3 - LLM Integration for AI Scheduling (PLANNED)

#### AI Scheduling Features
- [ ] **Smart Scheduling Algorithm**
  - Analyze child's current workload and due dates
  - Consider subject difficulty and time requirements
  - Review learning patterns and progress data
  - Apply parent-set preferences and constraints

- [ ] **AI Scheduling Prompt Engineering**
  ```
  Create intelligent scheduling based on:
  - Child's current workload and due dates
  - Subject difficulty and time requirements  
  - Learning patterns and progress data
  - Parent-set preferences and constraints
  ```

- [ ] **Smart Recommendations**
  - Optimal time slots for different subject types
  - Workload balancing across the week
  - Buffer time for challenging assignments
  - Study session duration recommendations

- [ ] **AI Schedule Wizard Component**
  - Parameter selection (date range, focus subjects)
  - Preview AI suggestions before applying
  - Explanation of scheduling reasoning
  - Batch application with conflict resolution

### 📊 Phase 4 - Advanced Analytics and Features (PLANNED)

#### Analytics Dashboard
- [ ] **Schedule Statistics**
  - Weekly study time by subject
  - Completion rate trends  
  - Schedule adherence metrics
  - Subject performance correlation

- [ ] **Visual Analytics**
  - Time allocation pie charts
  - Weekly completion bar graphs
  - Study pattern heatmaps
  - Progress trend lines

#### Advanced Features
- [ ] **Drag & Drop Scheduling**
  - Move events between time slots
  - Resize event duration
  - Copy/duplicate recurring sessions
  - Batch operations

- [ ] **Recurring Schedule Patterns**
  - Weekly recurring study blocks
  - Subject-specific routines
  - Template creation and application
  - Holiday/break scheduling

### 🎨 Phase 5 - Mobile Responsiveness and Polish (PLANNED)

#### Mobile Optimization
- [ ] **Responsive Calendar Views**
  - Touch-friendly time slot selection
  - Swipe navigation between dates
  - Optimized modal layouts for mobile
  - Collapsible calendar controls

- [ ] **Performance Optimizations**
  - Virtualized calendar for large datasets
  - Lazy loading of schedule data
  - Optimistic updates for better UX
  - Caching strategies

#### User Experience Polish
- [ ] **Visual Enhancements**
  - Loading animations and skeletons
  - Smooth transitions between views
  - Toast notifications for actions
  - Improved error messages

- [ ] **Accessibility Improvements**
  - Keyboard navigation support
  - Screen reader compatibility
  - High contrast mode support
  - Focus management in modals

## Subscription Integration

### Plan-Based Features
- **Free Plan:** Basic manual scheduling (1 child)
  - Create/edit/delete schedule entries
  - Basic calendar views
  - Manual time slot selection

- **Family Plan:** AI scheduling + multiple children  
  - All Free features
  - AI-powered schedule generation
  - Advanced analytics dashboard
  - Up to 3 children

- **Academy Plan:** Advanced analytics + enhanced features
  - All Family features  
  - Advanced analytics and reporting
  - Recurring schedule templates
  - Up to 10 children
  - Priority support

## Technical Architecture

### Frontend Stack
- **Calendar Library:** `react-big-calendar` with `date-fns` localizer
- **Drag & Drop:** `@dnd-kit` ecosystem (React 19 compatible)
- **State Management:** Custom hooks pattern following existing architecture
- **Styling:** Tailwind CSS with custom calendar styles
- **Responsive Design:** Mobile-first approach

### Backend Architecture
- **Database:** PostgreSQL with Supabase
- **API Pattern:** RESTful endpoints with ownership verification
- **Authentication:** Existing parent_id header pattern
- **Validation:** Input validation and conflict detection
- **Performance:** Indexed queries and optimized data fetching

### Integration Points
- **Existing Hooks:** Leverages `useSubscription`, `useChildrenData` patterns
- **UI Components:** Consistent with existing Button, Modal components  
- **API Client:** Uses existing `api.js` utility with Supabase auth
- **Routing:** Follows Next.js App Router conventions
- **Styling:** Matches existing CSS variable system

## Database Schema

### schedule_entries
```sql
- id (UUID, Primary Key)
- child_id (UUID, Foreign Key to children)
- material_id (UUID, Optional Foreign Key to lessons)
- subject_name (VARCHAR, for generic study time)
- scheduled_date (DATE)
- start_time (TIME)
- duration_minutes (INTEGER)
- status (ENUM: scheduled, completed, skipped)
- created_by (ENUM: parent, ai_suggestion)
- notes (TEXT)
- created_at, updated_at (TIMESTAMP)
```

### child_schedule_preferences  
```sql
- id (UUID, Primary Key)
- child_id (UUID, Foreign Key to children, Unique)
- preferred_start_time (TIME, default '09:00')
- preferred_end_time (TIME, default '15:00')
- max_daily_study_minutes (INTEGER, default 240)
- break_duration_minutes (INTEGER, default 15)
- difficult_subjects_morning (BOOLEAN, default true)
- study_days (JSONB, default weekdays array)
- created_at, updated_at (TIMESTAMP)
```

## Success Metrics

### User Engagement
- [ ] Time spent on schedule page
- [ ] Number of schedule entries created
- [ ] AI scheduling feature adoption rate
- [ ] Schedule adherence tracking

### Feature Adoption
- [ ] Percentage of users creating schedules
- [ ] AI vs manual scheduling ratio
- [ ] Settings customization usage
- [ ] Analytics dashboard engagement

### Performance Metrics
- [ ] Calendar load times
- [ ] API response times for schedule operations
- [ ] Mobile usability scores
- [ ] Error rates and user feedback

## Current Status Summary

**✅ COMPLETED:** Phase 1 - Basic calendar infrastructure, database schema, API endpoints, and interactive calendar UI

**🎯 NEXT:** Phase 2 - Modal components for creating and editing schedule entries

**📍 LOCATION:** 
- Frontend: http://localhost:3001/schedule  
- Backend: Schedule API endpoints ready
- Database: SQL schema provided (needs manual execution)

The foundation is solid and ready for the next phase of development!