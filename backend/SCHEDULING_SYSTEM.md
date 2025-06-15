# Enhanced AI Scheduling System

## Overview

The enhanced AI scheduling system provides sophisticated, multi-stage scheduling for educational activities with advanced features including:

- **Multi-stage AI reasoning** for optimal schedule generation
- **Cognitive load distribution** based on subject difficulty 
- **Optimal learning window detection** for peak performance timing
- **Subject interdependency mapping** for logical progression
- **Family-wide coordination** for multiple children
- **Advanced fallback algorithms** with mathematical optimization

## Key Improvements

### 1. **Multi-Stage AI Reasoning**
- **Stage 1**: Context analysis with AI-powered insights
- **Stage 2**: Optimal time slot generation
- **Stage 3**: Subject-to-slot assignment with AI reasoning
- **Stage 4**: Cognitive load optimization
- **Stage 5**: Final schedule refinement

### 2. **Cognitive Load Management**
- High cognitive load subjects (Math, Science) scheduled in morning hours
- Medium load subjects distributed throughout mid-day
- Low cognitive load activities (Art, Music) in afternoon
- Prevents cognitive overload on any single day

### 3. **Intelligent Time Distribution**
- Uses Golden Ratio (1.618) for optimal session lengths
- Considers break timing and duration
- Balances session variety (45-90 minute sessions)
- Respects individual learning preferences

### 4. **Subject Interdependency Awareness**
- Math → Physics, Chemistry, Science
- Science → Math, Biology, Chemistry, Physics  
- English → History, Geography
- Logical subject progression in scheduling

### 5. **Family Coordination**
- Detects scheduling conflicts between children
- Identifies shared study opportunities
- Optimizes parent supervision time
- Balances resource utilization

## API Endpoints

### Individual Child Scheduling
```
POST /api/schedule/ai-generate
```

**Request Body:**
```json
{
  "child_id": "uuid",
  "start_date": "2025-06-16", 
  "end_date": "2025-06-22",
  "focus_subjects": ["Math", "Science"],
  "weekly_hours": 15,
  "session_duration": "mixed", // "short", "long", "mixed"
  "priority_mode": "balanced", // "academic", "deadline", "balanced"
  "materials": [
    {
      "title": "Algebra Basics",
      "subject_name": "Math",
      "estimated_duration_minutes": 60,
      "due_date": "2025-06-18",
      "priority": "high"
    }
  ]
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "subject_name": "Math",
      "scheduled_date": "2025-06-16",
      "start_time": "09:00",
      "duration_minutes": 60,
      "material_id": null,
      "notes": "Scheduled during peak cognitive performance hours for high cognitive load subject",
      "created_by": "ai_suggestion"
    }
  ],
  "reasoning": "Advanced AI scheduling with cognitive load optimization",
  "confidence": 0.92,
  "analysis": {
    "scheduling_challenges": ["Multiple priority subjects", "Limited time window"],
    "cognitive_load_insights": "Math scheduled in morning for optimal performance"
  },
  "enhanced": true,
  "fallback": false
}
```

### Family Scheduling
```
POST /api/schedule/family-generate
```

**Request Body:**
```json
{
  "children_schedules": [
    {
      "child_id": "child1-uuid",
      "start_date": "2025-06-16",
      "end_date": "2025-06-22", 
      "focus_subjects": ["Math", "Science"],
      "weekly_hours": 15,
      "materials": [],
      "preferences": {
        "preferred_start_time": "09:00",
        "preferred_end_time": "15:00"
      }
    },
    {
      "child_id": "child2-uuid", 
      "start_date": "2025-06-16",
      "end_date": "2025-06-22",
      "focus_subjects": ["English", "History"],
      "weekly_hours": 12,
      "materials": [],
      "preferences": {
        "preferred_start_time": "10:00",
        "preferred_end_time": "16:00"
      }
    }
  ],
  "coordination_mode": "balanced" // "synchronized", "staggered", "balanced"
}
```

**Response:**
```json
{
  "family_schedule": [
    {
      "child_id": "child1-uuid",
      "coordinated_schedule": {
        "suggestions": [],
        "adjustments": [
          {
            "type": "conflict_resolution",
            "strategy": "staggered_scheduling"
          }
        ]
      }
    }
  ],
  "coordination_analysis": {
    "shared_study_opportunities": [
      {
        "type": "shared_subject", 
        "subject": "Math",
        "children": ["child1-uuid", "child2-uuid"]
      }
    ]
  },
  "conflict_resolutions": [],
  "optimization_insights": {
    "family_efficiency_score": 0.85
  }
}
```

## Cognitive Load Weights

The system uses scientifically-informed cognitive load weights:

- **Math**: 0.95 (Highest cognitive demand)
- **Science/Physics**: 0.90-0.95  
- **Chemistry**: 0.90
- **Biology**: 0.75
- **English**: 0.70
- **History**: 0.65
- **Geography**: 0.60
- **Art**: 0.40
- **Music**: 0.35
- **Physical Education**: 0.30 (Lowest cognitive demand)

## Optimal Learning Windows

- **High Cognitive (9:00-11:30)**: Math, Science, Physics
- **Medium Cognitive (11:30-14:00)**: English, History, Chemistry
- **Low Cognitive (14:00-17:00)**: Art, Music, Physical Activities
- **Creative (15:00-17:00)**: Art, Music, Creative Writing

## Fallback Systems

### Enhanced Rule-Based Fallback
- Mathematical optimization for time distribution
- Golden ratio session length calculation  
- Cognitive load balancing algorithms
- Subject interdependency awareness

### Simple Emergency Fallback
- Basic subject rotation
- Fixed session durations
- Minimal conflict checking
- Guaranteed schedule generation

## Configuration

The system can be configured through:

1. **Child Schedule Preferences** (Database)
   - Preferred study times
   - Break duration preferences
   - Study days selection
   - Difficult subjects timing preference

2. **System Constants** (Code)
   - Cognitive load weights
   - Learning window definitions
   - Subject interdependencies
   - Session duration parameters

## Performance Features

- **Parallel Processing**: Multiple AI calls when beneficial
- **Intelligent Caching**: Context reuse across stages
- **Graceful Degradation**: Multiple fallback levels
- **Error Recovery**: Automatic service switching

## Future Enhancements

1. **Adaptive Learning**: Schedule optimization based on completion rates
2. **Performance Analytics**: Track schedule effectiveness
3. **Resource Management**: Enhanced device/space coordination
4. **Collaborative Learning**: Smart peer study scheduling
5. **Parental Integration**: Parent availability optimization

## Testing

The system includes comprehensive error handling:
- AI service failures → Enhanced rule-based fallback
- Rule-based failures → Simple emergency fallback  
- Network issues → Cached/offline scheduling
- Invalid inputs → Graceful error responses

This ensures reliable schedule generation under all conditions.