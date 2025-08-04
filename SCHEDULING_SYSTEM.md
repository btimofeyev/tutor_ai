# Tutor AI Scheduling System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Features](#features)
5. [API Reference](#api-reference)
6. [AI Scheduling Engine](#ai-scheduling-engine)
7. [User Workflows](#user-workflows)
8. [Technical Implementation](#technical-implementation)
9. [Database Schema](#database-schema)
10. [Performance & Optimization](#performance--optimization)

## Overview

The Tutor AI Scheduling System is a comprehensive, AI-powered calendar and scheduling solution designed specifically for homeschool education. It provides intelligent schedule generation, drag-and-drop calendar management, multi-child coordination, and template-based scheduling patterns.

### Key Capabilities
- **AI-Powered Scheduling**: Intelligent schedule generation based on cognitive load theory
- **Multi-Child Support**: Coordinate schedules across multiple children
- **Drag-and-Drop Interface**: 15-minute precision scheduling with visual feedback
- **Template System**: Pre-built and custom schedule patterns
- **Real-time Conflict Detection**: Prevent scheduling conflicts across family
- **Multiple Views**: Week, multi-week, and month calendar views
- **PDF Export**: Generate printable schedules

## Architecture

### Frontend Architecture
```
parent-dashboard-frontend/src/app/schedule/
├── page.js                          # Main schedule page component
├── components/
│   ├── AdvancedScheduleCalendar.js  # Main calendar with drag-drop
│   ├── EnhancedScheduleManager.js   # View manager and coordinator
│   ├── AIScheduleConfigModal.js     # AI configuration interface
│   ├── ScheduleTemplatesManager.js  # Template management
│   ├── CreateScheduleEntryModal.js  # Entry creation form
│   ├── EditScheduleEntryModal.js    # Entry editing form
│   ├── ScheduleSettingsModal.js     # Preferences configuration
│   ├── PDFGenerator.js              # PDF export functionality
│   └── ScheduleExportManager.js     # Export options interface

hooks/
├── useScheduleManagement.js         # Single-child scheduling hook
└── useMultiChildScheduleManagement.js # Multi-child coordination hook
```

### Backend Architecture
```
backend/src/
├── routes/scheduleRoutes.js         # API endpoint definitions
├── controllers/scheduleController.js # Request handlers
└── services/schedulingService.js    # AI scheduling logic
```

### State Management
The system uses a custom hooks-based architecture for state management:
- **Local-first approach**: Data cached in localStorage with 5-minute expiry
- **Batch operations**: Prevents UI flickering during bulk updates
- **Optimistic updates**: Immediate UI feedback with background sync
- **Multi-child state**: Separate state management for family coordination

## Core Components

### AdvancedScheduleCalendar
The main calendar component with advanced features:
- **Drag-and-drop**: Built with @dnd-kit for smooth interactions
- **Multiple views**: Week (default), Multi-week (2-4 weeks), Month
- **Time slots**: 15-minute increments for precise scheduling
- **Visual feedback**: Hover states, drop zones, conflict indicators
- **Local persistence**: Remembers last viewed date/settings

Key Features:
```javascript
// Calendar views
const VIEW_TYPES = {
  WEEK: 'week',        // 7-day view with time slots
  MULTI_WEEK: 'multi-week', // 2-4 week overview
  MONTH: 'month'       // Traditional month calendar
};

// Time slot configuration (15-minute increments)
const timeSlots = ['09:00', '09:15', '09:30', '09:45', '10:00', ...];
```

### EnhancedScheduleManager
Container component managing different views and features:
- **View switching**: Calendar, Templates, Settings
- **Template application**: Batch schedule creation with conflict resolution
- **PDF generation**: Export schedules for printing
- **Loading states**: Skeleton loaders during operations

### AIScheduleConfigModal
Configuration interface for AI schedule generation:
- **Start date options**: Today, Tomorrow, Next Monday, Custom
- **Duration settings**: 1 week, 2 weeks, 1 month
- **Subject frequencies**: Configure lessons per week per subject
- **Study intensity**: Light (1-2), Balanced (2-3), Intensive (3+) subjects/day
- **Advanced options**: 
  - Difficulty distribution (morning/afternoon/balanced)
  - Session length preferences
  - Multi-child coordination modes

### ScheduleTemplatesManager
Template creation and management system:
- **Pre-built templates**: Morning Focus, Balanced Daily, Subject-Intensive
- **Custom templates**: Save current schedule as reusable template
- **Category organization**: Weekly, Subject-focused, Grade-specific
- **Batch application**: Apply to multiple children simultaneously

## Features

### 1. Calendar Views

#### Week View (Default)
- **Grid layout**: 7 days × time slots (15-min increments)
- **Time range**: Based on schedule preferences (default 9 AM - 3 PM)
- **Event display**: Color-coded by subject with duration visualization
- **Click actions**: 
  - Weekday headers: AI schedule generation prompt
  - Time slots: Create new entry
  - Events: Edit existing entry

#### Multi-Week View
- **Options**: 2, 3, or 4 weeks display
- **Compact layout**: Shows event titles and counts
- **Overview focus**: Quick assessment of schedule density
- **Navigation**: Jump between week ranges

#### Month View
- **Traditional calendar**: Full month grid
- **Event preview**: Shows 2 events + count
- **Current month highlight**: Grays out other months
- **Quick navigation**: Click any day to schedule

### 2. Drag-and-Drop Scheduling

**Implementation**:
```javascript
// Drag-and-drop with 15-minute precision
const handleDragEnd = async (event) => {
  const [dayStr, timeStr] = dropTargetId.split('_');
  await updateScheduleEntry(entryId, {
    scheduled_date: dayStr,
    start_time: timeStr
  });
};
```

**Features**:
- **Visual feedback**: Drag preview, drop zones, hover states
- **Conflict prevention**: Real-time validation during drag
- **Multi-child awareness**: Shows child names on events
- **Undo support**: Local state allows reverting changes

### 3. AI Schedule Generation

**Multi-Stage Process**:
1. **Context Analysis**: Analyze available materials and preferences
2. **Time Slot Generation**: Create optimal learning windows
3. **Subject Assignment**: Match subjects to cognitive load patterns
4. **Conflict Resolution**: Ensure family-wide compatibility
5. **Optimization**: Balance workload and variety

**Configuration Options**:
- **Cognitive Load Distribution**: Morning focus vs. balanced
- **Session Durations**: 30-45min (short), 45-60min (medium), 60+min (long)
- **Multi-Child Coordination**:
  - Sequential: One child at a time
  - Parallel: Different subjects simultaneously
  - Balanced: AI optimizes for family

### 4. Template System

**Default Templates**:
1. **Morning Focus**: High-cognitive subjects early, lighter afternoon
2. **Balanced Daily**: Even distribution throughout day
3. **Math Intensive**: Extra mathematics with supporting subjects
4. **Science Explorer**: Hands-on experiments with journaling

**Template Application**:
```javascript
const handleApplyTemplate = async (template, startDate) => {
  // Convert template to schedule entries
  const scheduleEntries = template.sessions.map(session => ({
    subject_name: session.subject,
    scheduled_date: calculateDateForDay(startDate, session.day),
    start_time: session.time,
    duration_minutes: session.duration
  }));
  
  // Batch create with conflict resolution
  await createScheduleEntriesBatch(scheduleEntries);
};
```

### 5. Multi-Child Coordination

**Features**:
- **Checkbox filtering**: Show/hide individual children
- **Color coding**: Visual distinction per child
- **Conflict detection**: Prevents overlapping family time
- **Batch operations**: Apply changes to multiple children

**State Management**:
```javascript
// Separate entries per child
const [allScheduleEntries, setAllScheduleEntries] = useState({
  'child-id-1': [...entries],
  'child-id-2': [...entries]
});

// Combined calendar events
const getCombinedCalendarEvents = () => {
  return selectedChildrenIds.flatMap(childId => 
    formatEntriesForCalendar(allScheduleEntries[childId])
  );
};
```

## API Reference

### Schedule Endpoints

#### GET /api/schedule/:child_id
Fetch schedule entries for a specific child.

**Response**:
```json
[
  {
    "id": "uuid",
    "child_id": "uuid",
    "subject_name": "Mathematics",
    "scheduled_date": "2024-08-03",
    "start_time": "09:00",
    "duration_minutes": 45,
    "status": "scheduled",
    "lesson": { /* lesson details */ },
    "materials": [ /* associated materials */ ]
  }
]
```

#### POST /api/schedule
Create new schedule entry.

**Request**:
```json
{
  "child_id": "uuid",
  "subject_name": "Science",
  "scheduled_date": "2024-08-03",
  "start_time": "10:00",
  "duration_minutes": 60,
  "lesson_id": "uuid (optional)",
  "notes": "Chapter 3 experiments"
}
```

#### PUT /api/schedule/:id
Update existing schedule entry.

#### DELETE /api/schedule/:id
Remove schedule entry.

### AI Generation Endpoint

#### POST /api/schedule/ai-generate
Generate AI-powered schedule.

**Request**:
```json
{
  "child_ids": ["uuid1", "uuid2"],
  "start_date": "2024-08-03",
  "days_to_schedule": 7,
  "preferences": {
    "preferred_start_time": "09:00",
    "preferred_end_time": "15:00",
    "subject_frequencies": {
      "Mathematics": 5,
      "Science": 3,
      "English": 4
    },
    "study_intensity": "balanced",
    "coordination_mode": "balanced"
  }
}
```

### Preferences Endpoints

#### GET /api/schedule/preferences/:child_id
Fetch scheduling preferences.

#### POST /api/schedule/preferences/:child_id
Update scheduling preferences.

## AI Scheduling Engine

### Cognitive Load Theory Implementation

The AI scheduler uses cognitive load weights to optimize learning:

```javascript
const COGNITIVE_LOAD_WEIGHTS = {
  // High cognitive load (0.90-0.95) - Best in morning
  'Mathematics': 0.95,
  'Science': 0.90,
  
  // Medium cognitive load (0.65-0.70) - Good for mid-day
  'English Language Arts': 0.70,
  'Social Studies': 0.65,
  
  // Lower cognitive load (0.30-0.40) - Suitable for afternoon
  'Art': 0.40,
  'Physical Education': 0.35,
  'Music': 0.30
};
```

### Learning Windows

Optimal time slots based on cognitive science:

```javascript
const LEARNING_WINDOWS = {
  HIGH_COGNITIVE: { 
    start: '09:00', 
    end: '11:30', 
    efficiency: 1.0 
  },
  MEDIUM_COGNITIVE: { 
    start: '11:30', 
    end: '14:00', 
    efficiency: 0.8 
  },
  LOW_COGNITIVE: { 
    start: '14:00', 
    end: '17:00', 
    efficiency: 0.6 
  }
};
```

### Multi-Stage Reasoning Process

1. **Context Analysis**
   - Available materials per subject
   - Child preferences and constraints
   - Existing schedule conflicts

2. **Time Slot Generation**
   - Create available slots based on preferences
   - Apply break times and lunch periods
   - Consider family-wide constraints

3. **AI Subject Assignment**
   - Match high-cognitive subjects to morning slots
   - Distribute subjects based on frequency requirements
   - Balance daily cognitive load

4. **Conflict Resolution**
   - Check family-wide availability
   - Adjust for multi-child coordination
   - Maintain minimum break times

5. **Final Optimization**
   - Ensure variety (avoid same subject consecutively)
   - Balance weekly distribution
   - Apply interdependency rules

## User Workflows

### Creating a Schedule Entry

1. **Click Methods**:
   - Click empty time slot in calendar
   - Click "Add Lesson" button
   - Click day header for AI scheduling

2. **Entry Form**:
   - Select subject from assigned subjects
   - Choose specific lesson/material (optional)
   - Set duration (15-minute increments)
   - Add notes

3. **Conflict Detection**:
   - Real-time validation
   - Visual indicators for conflicts
   - Suggest alternative times

### Using AI Scheduling

1. **Access AI Config**:
   - Click "Configure AI Schedule" button
   - Or click weekday header in calendar

2. **Configure Settings**:
   - Choose start date (presets available)
   - Select duration (1 week, 2 weeks, 1 month)
   - Adjust subject frequencies
   - Set intensity level

3. **Advanced Options**:
   - Difficulty distribution
   - Session length preferences
   - Multi-child coordination mode

4. **Generate & Review**:
   - AI creates optimal schedule
   - Preview before applying
   - Manual adjustments available

### Applying Templates

1. **Access Templates**:
   - Click "Templates" tab
   - Or "Save as Template" for current schedule

2. **Select Template**:
   - Browse pre-built options
   - Filter by category
   - Preview sessions

3. **Configure Application**:
   - Choose start date
   - Select target children
   - Review conflicts

4. **Apply & Adjust**:
   - Batch create entries
   - Automatic conflict resolution
   - Manual fine-tuning

## Technical Implementation

### State Management Pattern

```javascript
// Multi-child state structure
const scheduleState = {
  allScheduleEntries: {
    'child-1': [...entries],
    'child-2': [...entries]
  },
  schedulePreferences: {
    'child-1': {...prefs},
    'child-2': {...prefs}
  },
  loading: false,
  error: null,
  batchMode: false // Prevents flickering
};
```

### Caching Strategy

```javascript
// localStorage with expiry
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key) => {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_DURATION) {
    localStorage.removeItem(key);
    return null;
  }
  
  return data;
};
```

### Batch Operations

```javascript
// Prevent UI flickering during bulk updates
const createScheduleEntriesBatch = async (entries) => {
  setBatchMode(true);
  
  try {
    // Create all entries
    const results = await Promise.all(
      entries.map(entry => createSingleEntry(entry))
    );
    
    // Update state once
    setAllScheduleEntries(prev => ({
      ...prev,
      [childId]: [...prev[childId], ...results]
    }));
    
  } finally {
    setBatchMode(false);
  }
};
```

### Drag-Drop Implementation

```javascript
// Using @dnd-kit for smooth drag-drop
const handleDragEnd = async (event) => {
  const { active, over } = event;
  
  // Parse drop target
  const [date, time] = over.id.split('_');
  
  // Extract real IDs (handles composite IDs)
  const entryId = extractRealEntryId(active.id);
  const childId = extractChildId(active.id);
  
  // Update with conflict check
  await updateScheduleEntry(entryId, {
    scheduled_date: date,
    start_time: time
  }, childId);
};
```

## Database Schema

### Core Tables

#### schedule_entries
```sql
CREATE TABLE schedule_entries (
  id UUID PRIMARY KEY,
  child_id UUID REFERENCES children(id),
  lesson_id UUID REFERENCES lessons(id),
  subject_name VARCHAR(255),
  scheduled_date DATE,
  start_time TIME,
  duration_minutes INTEGER,
  status VARCHAR(50), -- 'scheduled', 'completed', 'missed'
  notes TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### schedule_preferences
```sql
CREATE TABLE schedule_preferences (
  id UUID PRIMARY KEY,
  child_id UUID REFERENCES children(id),
  preferred_start_time TIME DEFAULT '09:00',
  preferred_end_time TIME DEFAULT '15:00',
  max_daily_study_minutes INTEGER DEFAULT 240,
  break_duration_minutes INTEGER DEFAULT 15,
  difficult_subjects_morning BOOLEAN DEFAULT true,
  study_days JSONB DEFAULT '["monday","tuesday","wednesday","thursday","friday"]',
  subject_frequencies JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Performance & Optimization

### Rendering Optimizations

1. **Memoization**: Heavy calculations cached with useMemo
2. **Virtualization**: Considered for large calendars
3. **Batch Updates**: Prevent multiple re-renders
4. **Lazy Loading**: Components loaded on demand

### Data Fetching

1. **Parallel Fetching**: Multiple children loaded simultaneously
2. **Optimistic Updates**: Immediate UI feedback
3. **Error Boundaries**: Graceful failure handling
4. **Retry Logic**: Automatic retry on network failures

### Calendar Performance

```javascript
// Optimize event filtering
const getEventsForDay = useCallback((day) => {
  const dayString = format(day, 'yyyy-MM-dd');
  return calendarEvents.filter(event => 
    event.date === dayString
  );
}, [calendarEvents]);

// Memoize expensive calculations
const timeSlots = useMemo(() => 
  generateTimeSlots(preferences), 
  [preferences]
);
```

## Troubleshooting

### Common Issues

1. **Schedule not updating**
   - Check network connection
   - Verify localStorage isn't full
   - Clear cache and refresh

2. **Drag-drop not working**
   - Ensure events have unique IDs
   - Check for console errors
   - Verify permissions

3. **AI generation fails**
   - Ensure materials are uploaded
   - Check subject assignments
   - Verify API key configuration

4. **Multi-child conflicts**
   - Review coordination settings
   - Check time preferences
   - Use sequential mode for testing

### Debug Tools

```javascript
// Enable debug logging
localStorage.setItem('schedule_debug', 'true');

// Clear all caches
localStorage.removeItem('schedule_cache');
localStorage.removeItem('schedule-calendar-date');

// Force refresh
window.location.reload();
```

## Future Enhancements

1. **Real-time Collaboration**: WebSocket support for live updates
2. **Mobile App**: Native mobile experience
3. **Calendar Integrations**: Sync with Google Calendar, iCal
4. **Advanced Analytics**: Learning progress visualization
5. **Voice Commands**: "Schedule math for tomorrow morning"
6. **Recurring Events**: Weekly/monthly patterns
7. **Resource Booking**: Shared family resources (computer, lab space)
8. **Notification System**: Reminders and alerts

---

*Last Updated: August 2025*
*Version: 1.0*