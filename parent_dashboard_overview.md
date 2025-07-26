# Parent Dashboard: Subject and Material Management Overview

This document provides a comprehensive overview of how the parent dashboard handles subject and material management, from the high-level UI components to the backend architecture.

## Core Concepts

The system uses a hierarchical structure to organize learning content:

1.  **Subjects:** The top-level category (e.g., "Math," "History"). Each child has their own set of assigned subjects.
2.  **Units:** Subjects are broken down into units (e.g., "Unit 1: Algebra," "Unit 2: Geometry"). These act as folders to group related lesson containers.
3.  **Lesson Containers (Lesson Groups):** Units are further divided into lesson containers, which group related learning materials (e.g., "Chapter 1: Introduction to Equations").
4.  **Materials:** These are the individual learning items, such as lessons, worksheets, assignments, quizzes, and notes.

### Hierarchy Example

```
Subject: Math
└── Unit 1: Algebra
    ├── Lesson Container 1: "Chapter 1: Introduction"
    │   ├── Material 1 (lesson): "Introduction to Algebra"
    │   ├── Material 2 (worksheet): "Algebra Worksheet 1"
    │   └── Material 3 (quiz): "Algebra Quiz 1"
    └── Lesson Container 2: "Chapter 2: Equations"
        ├── Material 4 (lesson): "Solving Equations"
        └── Material 5 (worksheet): "Equation Practice"
```

## User Interface (UI)

The parent dashboard provides a user-friendly interface for managing this hierarchy.

### `SubjectCard.js`

*   This is the main component for displaying a subject's content.
*   It provides a high-level overview of the subject, including statistics on total and completed materials.
*   It contains collapsible sections for each unit within the subject.
*   It has buttons for managing units and adjusting grade weights.

### `UnitManagementModal.js`

*   This modal is used to create, edit, and delete units for a subject.
*   It allows parents to organize the subject's content into logical blocks.

### `AddMaterialTabs.js`

*   This modal is used to add new materials.
*   It allows parents to:
    *   Upload files (PDF, DOCX, images).
    *   Create materials manually.
    *   Select the subject, unit, and lesson container for the new material.
    *   Create new units and lesson containers on the fly.

### `GradeInputModal.js`

*   This modal is used for grading materials.
*   It provides quick grade options (e.g., "Perfect," "Great Job") and allows for custom grade input.

### `TodayOverview.js`

*   This component provides a summary of the day's lessons and activities.
*   It shows overdue items, upcoming deadlines, and scheduled items for the day.

## Material Management

### Adding Materials

There are two ways to add materials:

1.  **File Upload:**
    *   Parents can upload files (PDF, DOCX, images).
    *   The backend processes the file, extracts the content (text or images), and sends it to the OpenAI API (`gpt-4.1-mini`) for analysis.
    *   The AI returns a structured JSON representation of the material, which is then saved to the database.
2.  **Manual Creation:**
    *   Parents can create materials manually without uploading a file.
    *   This is useful for creating simple materials like notes or assignments with instructions.

### Viewing Materials

*   Materials are displayed within their respective lesson containers in the `SubjectCard`.
*   The `LessonGroupedMaterials.js` component is used to display the materials for a specific lesson container, grouped by their relationship (e.g., primary lesson, worksheets, supplements).
*   Materials that are not assigned to a unit and lesson container are displayed in a "General Materials" section.

## Backend Architecture

The backend is built with Node.js and Express, and it uses a Supabase database. The following controllers and routes are key to the material management system:

### `materialsController.js` & `materialsRoutes.js`

*   Handles the uploading, processing, and saving of materials.
*   **Key Routes:**
    *   `POST /materials/upload`: Uploads and analyzes a file.
    *   `POST /materials/save`: Saves a new material to the database.
    *   `GET /materials/lesson/:lesson_id/grouped`: Retrieves materials for a lesson container, grouped by relationship.

### `unitsController.js` & `unitsRoutes.js`

*   Manages the CRUD operations for units.
*   **Key Routes:**
    *   `POST /units`: Creates a new unit.
    *   `GET /units/subject/:child_subject_id`: Lists all units for a subject.
    *   `DELETE /units/:unit_id`: Deletes a unit (only if it's empty).

### `lessonsContainerController.js` & `lessonContainersRoutes.js`

*   Manages the CRUD operations for lesson containers.
*   **Key Routes:**
    *   `POST /lesson-containers`: Creates a new lesson container.
    *   `GET /lesson-containers/unit/:unit_id`: Lists all lesson containers for a unit.
    *   `DELETE /lesson-containers/:lesson_id`: Deletes a lesson container (only if it's empty).

### `scheduleController.js` & `scheduleRoutes.js`

*   Manages the scheduling of lessons and other activities.
*   **Key Routes:**
    *   `POST /schedule`: Creates a new schedule entry.
    *   `GET /schedule/:child_id`: Retrieves the schedule for a child.

### `progressController.js` & `progressRoutes.js`

*   Tracks the child's progress, including practice sessions and achievements.
*   **Key Routes:**
    *   `POST /progress/start_session`: Starts a new practice session.
    *   `GET /progress/lifetime/:child_id`: Retrieves lifetime progress stats for a child.

### Ownership and Security

*   All backend routes are protected by ownership checks to ensure that parents can only access and modify data for their own children.
*   The `x-parent-id` header is used to identify the parent making the request.

## Database Schema

Based on the backend code, the following table structures can be inferred:

*   **`children`**: Stores information about the children.
*   **`subjects`**: Stores the predefined and custom subjects.
*   **`child_subjects`**: Links children to subjects.
*   **`units`**: Stores the units for each subject.
*   **`lessons`**: Stores the lesson containers for each unit.
*   **`materials`**: Stores the individual learning materials.
*   **`weights`**: Stores the grade weights for each subject.
*   **`schedule_entries`**: Stores the scheduled lessons and activities.
*   **`practice_sessions`**: Stores information about practice sessions.
*   **`practice_attempts`**: Stores the results of individual practice problems.