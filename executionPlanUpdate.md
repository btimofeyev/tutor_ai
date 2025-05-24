pdated Execution Plan: Parent Dashboard, Content Ingestion & MCP Integration (MVP)
Project Goal
Deliver the MVP, enabling parents to upload, process, and manage curriculum content, AND allow an AI tutor (MCP Server) to access this structured content for personalized learning.
Development Phases & Sprints (Approx. 2-week sprints)
(Sprints 0-4 are largely accomplished, with some areas for future refinement noted)
Sprint 0: Foundation & Setup (1 Week) - ✅ LARGELY DONE
Supabase, Git, Project Structure, Libraries: DONE
Basic Schema, Auth Setup: DONE
Sprint 1: Core Authentication & Basic CRUD (2 Weeks) - ✅ LARGELY DONE
Parent Auth API & UI: DONE
Child Profile CRUD API & Basic UI: DONE (FE for edit/delete specific profiles from UI less prominent but backend supports).
Subject CRUD API & UI (Global subjects, assign/unassign to child, create custom global subjects): DONE
Sprint 2: Content Upload & Initial Processing (2 Weeks) - ✅ CORE DONE, REFINEMENTS PENDING
File Upload API (PDF, Images, DOCX, TXT - single & multi-image, multi-text): DONE
Supabase Storage Integration: DEFERRED/SIMPLIFIED (Currently processing on server, direct Storage upload + Functions is a scalability improvement).
File Upload UI (Selector, Child/Subject Assoc.): DONE. (Drag-and-drop, mobile camera are future enhancements).
Upload Progress/Confirmation: Basic states exist. PARTIALLY DONE.
Sprint 3: Content Processing Pipeline - OCR & LLM (Part 1) (2 Weeks) - ✅ CORE DONE, REFINEMENTS PENDING
OCR (pdf-parse, mammoth, OpenAI Vision for images): DONE.
LLM Structuring (GPT-4o, prompt engineering, lesson_json schema): DONE.
Asynchronous Processing: DEFERRED/SIMPLIFIED (Currently synchronous. Functions/workers for scalability).
Sprint 4: Content Processing - DB Insertion & Parent Review UI (2 Weeks) - ✅ LARGELY DONE
JSON Schema Validation (Ajv): NOT DONE (Formal validation would improve robustness).
DB Insertion Logic (lessons table, lesson_json): DONE.
API to Fetch/Save Processed Content: DONE.
Content Review & Edit UI (AddMaterialForm.js for new, EditMaterialModal.js for existing, with individual field editing): DONE.
➡️ NEXT FOCUS: Sprints for MCP Integration & Advanced Dashboard Features
Sprint 5 (REVISED): MCP Server - Core Read API & Initial Data Modeling (2-3 Weeks)
Goal: Design and implement the core read-only API endpoints for the MCP server to access curriculum data. Define data structures for student progress tracking by the MCP.
Tasks:
BE/TL:
Design MCP API Endpoints (Read-Only MVP):
GET /api/mcp/child/:child_id/subject/:subject_id/current-lesson (Logic to determine "current" based on due dates, completion, sequence)
GET /api/mcp/lesson/:lesson_id/details (Full lesson_json and metadata)
GET /api/mcp/child/:child_id/subject/:subject_id/units (List units with their lessons - perhaps summarized)
GET /api/mcp/child/:child_id/upcoming-assignments?days=X
Implement these Read API Endpoints:
Secure these endpoints (e.g., API key, or a service role if MCP is internal).
Efficiently query PostgreSQL, joining lessons, units, child_subjects, children as needed.
Structure clear JSON responses tailored for MCP consumption.
Define Initial student_progress Data Model:
New table: student_lesson_progress (id, lesson_id FK, child_id FK, status (e.g., 'not_started', 'in_progress', 'completed_by_student', 'needs_review_by_parent'), tutor_feedback TEXT, student_score TEXT, started_at TIMESTAMPTZ, submitted_at TIMESTAMPTZ, last_accessed_by_tutor_at TIMESTAMPTZ).
This table will be written to by the MCP server in a later sprint. For now, define it.
FE/TL:
(No direct FE tasks for MCP API, but FE team can provide input on data needs if they were to display MCP-driven progress).
QA:
Develop test cases for new MCP API endpoints.
Test with various query parameters.
Verify API security.
Deliverables:
Documented and implemented read-only API endpoints for MCP.
Defined (but not yet fully implemented for write) student_lesson_progress table schema.
PRD Features Addressed: "MCP server exposes read/write tools" (read part).
Sprint 6 (REVISED): Parent Dashboard - Unit Management Refinement & Lesson Sequencing UI (2 Weeks)
Goal: Enhance curriculum organization for parents within the existing dashboard.
Tasks:
FE:
Refine "Manage Units" Modal:
Implement drag-and-drop reordering for units (update sequence_order).
Ensure smooth editing of unit names and descriptions.
Lesson Sequencing within Units (Initial UI):
In the "Manage Units" modal (or a new "View Unit Details" modal/page), display lessons assigned to that unit.
Allow drag-and-drop reordering of these lessons.
BE:
DB: Add sequence_order (INTEGER, default 0) to the lessons table.
API to Update Lesson Sequence:
POST /api/lessons/reorder (takes an array of lesson_ids in their new order for a given unit/subject).
QA:
Test unit creation, editing, reordering, deletion.
Test lesson reordering within units.
Deliverables:
More intuitive unit management (drag-and-drop reorder).
Parents can define the sequence of lessons within a unit.
lessons table updated with sequence_order.
Sprint 7 (NEW): MCP Server - Write API & Basic Progress Tracking (2-3 Weeks)
Goal: Enable the MCP server to update student progress on lessons.
Tasks:
BE/TL:
Design & Implement MCP Write API Endpoints:
POST /api/mcp/lesson/:lesson_id/progress (MCP sends updates like status, score, tutor feedback to store in student_lesson_progress).
POST /api/mcp/lesson/:lesson_id/start (MCP indicates student started a lesson).
Implement Logic in these Endpoints:
Authenticate/authorize MCP server requests.
Insert/Update records in student_lesson_progress.
Potentially update lessons.completed_at if MCP marks it fully complete.
FE:
(No direct FE tasks, but this sets up data for future display of MCP-driven progress).
QA:
Test MCP write endpoints thoroughly.
Verify data integrity in student_lesson_progress.
Deliverables:
MCP server can record student progress and feedback against specific lessons.
student_lesson_progress table is actively used.
PRD Features Addressed: "MCP server exposes read/write tools" (write part).
Sprint 8 (NEW): Parent Dashboard - Displaying MCP-Driven Progress & Advanced Analytics (2 Weeks)
Goal: Show parents the progress and feedback coming from the MCP, and enhance analytics.
Tasks:
FE:
Display student_lesson_progress:
On MaterialListItem.js or EditMaterialModal.js, show status set by MCP (e.g., "In Progress by Tutor"), tutor feedback.
If MCP provides a score, display it (might be separate from parent's grade).
Advanced Analytics Dashboard UI:
Grade Trend Chart (per subject): Display grades over time.
Time-Spent Metrics: If MCP can track/estimate time, display this. (Requires MCP to send this data).
Mastery Gaps (Initial): If MCP can identify areas of difficulty based on interaction/scores, display these (e.g., "Struggling with 'fractions' in Math Unit 2"). This is complex and might be very high-level initially.
BE:
Refine Analytics Data Aggregation: Create/improve backend queries/functions if client-side aggregation becomes too slow or complex, especially for mastery gaps or time-spent.
QA:
Verify accuracy and presentation of MCP-driven progress on the parent dashboard.
Test new analytics charts/visualizations.
Deliverables:
Parents can see student progress as updated by the tutor.
Enhanced analytics on the dashboard.
PRD Features Addressed: 5.8 (Avg score, time-spent, mastery gaps - initial versions).
Sprint 9+ (Future Sprints): Further Refinements, Scalability, Advanced Features
Asynchronous Upload Processing (from original Sprint 3): Move OCR/LLM to Supabase Functions.
Supabase Storage for Raw Files (from original Sprint 2).
Formal JSON Schema Validation (Ajv) (from original Sprint 4).
Version History & Rollback (from original Sprint 6).
CSV/PDF Report Exports (from original Sprint 5).
More advanced curriculum planning tools (calendars, term planning).
Rubrics, detailed feedback mechanisms.
Student portal.
Notifications.
Performance optimizations and full-scale testing.