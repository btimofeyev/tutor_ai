# Execution Plan: Parent Dashboard & Content Ingestion (MVP)

## Project Goal
Deliver the MVP of the Parent Dashboard & Content Ingestion feature as defined in the PRD, enabling parents to upload, process, and manage curriculum content for the AI tutor.

## Assumed Team Structure (for planning purposes)
- Product Owner (PO)
- Tech Lead (TL)
- 1-2 Backend Developers (BE)
- 1-2 Frontend Developers (FE)
- 1 QA Engineer
- (DevOps/Platform support as needed, likely covered by TL/BE with Supabase)

## Development Phases & Sprints (Approx. 2-week sprints)

### Sprint 0: Foundation & Setup (1 Week)
**Goal**: Establish core infrastructure, project setup, and initial data models.

**Tasks**:
- DevOps/TL:
  - Set up Supabase project (Auth, Database, Storage).
  - Initialize Git repository, CI/CD pipeline basics.
  - Define initial project structure (frontend, backend).
  - Research and select core libraries/frameworks for frontend and backend (e.g., Next.js/React for FE, Node.js/Python for BE).
- BE/TL:
  - Implement basic Supabase schema based on PRD Data Model (MVP) - children, subjects, lessons, assignments, grades.
  - Initial setup for Supabase Auth integration (email/password).
- All:
  - Development environment setup for all team members.
  - Familiarization with Supabase SDKs.

**Deliverables**:
- Functional Supabase project.
- Git repository with basic structure.
- Initial DB schema deployed.

### Sprint 1: Core Authentication & Basic CRUD (2 Weeks)
**Goal**: Implement parent authentication and foundational CRUD for child and subject management.

**Tasks**:
- BE:
  - Implement Parent Registration API endpoint (integrating with Supabase Auth).
  - Implement Parent Login/Logout API endpoint (integrating with Supabase Auth).
  - Implement Child Profile CRUD API endpoints (create, read, update, delete - respecting max 5 per family).
  - Implement Subject CRUD API endpoints (add/remove subjects per child - requires join table or array field).
- FE:
  - Develop Parent Registration UI.
  - Develop Parent Login UI.
  - Develop basic authenticated Parent Dashboard shell.
  - Develop Child Profile Management UI (list, add, edit, delete).
  - Develop Subject Management UI within child context (list, add, remove).
- QA:
  - Develop test cases for authentication and basic CRUD.
  - Perform initial testing.

**Deliverables**:
- Parents can register and log in.
- Parents can create, view, update, and delete child profiles.
- Parents can add/remove subjects for each child.
- PRD Features Addressed: 5.1, 5.2, 5.3 (partially - curriculum settings TBD)

### Sprint 2: Content Upload & Raw Storage (2 Weeks)
**Goal**: Enable parents to upload various file types and store them raw.

**Tasks**:
- BE:
  - Develop API endpoint for file upload (PDF, PNG/JPG, DOCX).
  - Integrate with Supabase Storage:
    - Create user-specific buckets (or structure within a bucket).
    - Store raw uploaded files.
    - Return file metadata/URL.
  - Initial setup for triggering the (yet-to-be-built) processing pipeline.
- FE:
  - Develop file upload UI:
    - Drag-and-drop area.
    - File input selector.
    - Interface for mobile camera capture (may require research/specific libraries).
  - UI to select associated child & subject for the upload.
  - Display upload progress and confirmation/error.
- QA:
  - Test file uploads with various types and sizes.
  - Test mobile camera capture flow (if implemented).

**Deliverables**:
- Parents can upload curriculum files (PDF, PNG/JPG, DOCX).
- Files are stored raw in Supabase Storage.
- UI for associating uploads with child/subject.
- PRD Features Addressed: 5.4, 5.5 (Store raw file step)

### Sprint 3: Content Processing Pipeline - OCR & LLM (Part 1) (2 Weeks)
**Goal**: Implement OCR for PDFs and Images, and initial LLM structuring (without full validation/review yet).

**Tasks**:
- BE/TL:
  - OCR Step:
    - Integrate pdfminer.six for PDF to text extraction.
    - Integrate OpenAI Vision API for Image to text.
    - Integrate Tesseract as a fallback for image OCR (consider complexity vs. OpenAI Vision reliability).
    - Develop logic to choose OCR method based on file type.
  - LLM Categorization (Initial):
    - Define the strict JSON schema for lesson_json (lesson_number, title, pages, objectives, etc.).
    - Develop prompt engineering for GPT-4o function calling using the defined schema.
    - Implement API calls to GPT-4o with extracted text.
    - Develop a basic asynchronous processing flow (e.g., Supabase Functions, or a separate microservice/worker).
- QA:
  - Prepare test files for OCR (various PDFs, images).
  - Manually verify OCR output quality.
  - Manually verify initial LLM JSON output against schema (spot checks).

**Deliverables**:
- Backend service can process uploaded PDFs/images through OCR.
- Extracted text is sent to GPT-4o, which attempts to structure it into the predefined JSON schema.
- Raw JSON output from LLM is available (e.g., logged or stored temporarily).
- PRD Features Addressed: 5.5 (OCR step, LLM Categorization - initial implementation)

### Sprint 4: Content Processing Pipeline - Validation, DB Insertion & Review UI (2 Weeks)
**Goal**: Validate LLM output, allow parent review/edit, and store processed content in PostgreSQL.

**Tasks**:
- BE:
  - Validation:
    - Integrate Ajv for JSON schema validation against the lesson_json schema.
    - Develop logic: if validation fails, flag for parent review.
  - Insertion:
    - Implement upsert logic into lessons (and potentially assignments if distinguishable at this stage) tables with foreign keys to child_id, subject_id. Store structured JSON in lesson_json (JSONB).
    - API endpoint to fetch processed (or pending review) content for a specific upload.
    - API endpoint to save edited/approved content.
- FE:
  - Develop a "Content Review & Edit" UI:
    - Display the categorized JSON output in an editable form (JSON → form mapper).
    - Highlight fields that failed validation or are missing (if LLM couldn't fill them).
    - Allow parent to correct/add information.
    - "Save/Approve" button.
  - Integrate this UI into the post-upload flow or a separate "Pending Review" section.
- QA:
  - Test validation logic with malformed/incomplete JSON.
  - Test the review/edit UI for usability and functionality.
  - Verify data is correctly stored in PostgreSQL after approval.

**Deliverables**:
- LLM output is validated against the JSON schema.
- Parents can review and edit the auto-categorized content.
- Errors/missing fields are highlighted.
- Approved content is stored in PostgreSQL.
- PRD Features Addressed: 5.5 (Validation, Insertion), 5.6 (Inline JSON -> form mapper)
- Success Metric Check: Start tracking "% of mandatory JSON fields auto-filled".

### Sprint 5: Lesson Assignment, MCP Interface & Initial Analytics (2 Weeks)
**Goal**: Implement lesson assignment, expose data for the tutor, and build basic progress dashboards.

**Tasks**:
- BE:
  - Lesson Assignment:
    - Extend lessons or create a linking table for assignment/scheduling details (due date, self-paced).
    - API endpoints to assign lessons (auto to current week, manual date, self-paced).
  - MCP Server Interface:
    - Design and implement read-only API endpoints for the tutor agent to access structured lessons and assignments (e.g., by child_id, subject_id, current date).
    - Consider security/authentication for this agent.
  - Analytics Data Aggregation:
    - Develop queries/functions to calculate: Avg score/subject, time-spent (requires grades data), mastery gaps (requires more definition on how "mastery" is determined, likely from grades or tutor interaction).
    - API endpoints to serve this aggregated data.
- FE:
  - Lesson Assignment UI:
    - Integrate assignment options into the content management flow (e.g., after approval or from a lesson list).
    - Date picker, "self-paced" toggle.
  - Progress & Analytics Dashboard UI:
    - Display dashboard cards: Avg score/subject, time-spent, mastery gaps.
    - Implement CSV & PDF export functionality for reports (using grades and lessons data).
- QA:
  - Test lesson assignment and scheduling.
  - Test MCP server endpoints with sample requests.
  - Verify analytics data accuracy and report exports.

**Deliverables**:
- Parents can assign lessons with due dates or mark as self-paced.
- MCP server has API endpoints to read lesson/assignment data.
- Basic parent dashboard with progress metrics.
- CSV/PDF report export.
- PRD Features Addressed: 5.7, 5.8, "MCP server exposes read/write tools" (read part for now).

### Sprint 6: Refinement, Testing & Performance (2 Weeks)
**Goal**: Address bugs, improve performance, conduct thorough testing, and implement version history/rollback if feasible within MVP.

**Tasks**:
- BE/FE/TL:
  - Version History & Rollback (Stretch for MVP, but in PRD):
    - BE: Design data model changes or strategy for versioning lesson_json (e.g., audit table, or storing previous versions in an array). Implement rollback logic.
    - FE: UI to view version history and trigger rollback.
  - Performance optimization based on testing (e.g., optimize DB queries, processing pipeline speed).
  - Address any outstanding bugs.
  - Code cleanup and refactoring.
- QA:
  - Full regression testing.
  - Performance testing (Avg time to upload+save a lesson).
  - Usability testing for the entire workflow.
  - Test tutor response with correct lesson refs (requires coordination with tutor team/mocking).
- All:
  - Documentation updates (user guides, API docs).

**Deliverables**:
- A polished, performant, and well-tested MVP.
- Version history and rollback for content (if included).
- Meet or approach target success metrics.
- PRD Features Addressed: 5.6 (Version history and rollback), Goals & Success Metrics.

## Technology Stack Summary (as per PRD)
- **Authentication**: Supabase Auth (OAuth email/password)
- **Database**: PostgreSQL (via Supabase, JSONB for lesson_json)
- **Storage**: Supabase Storage (bucket per user ideally, or structured)
- **Backend**: Node.js/Express, Python/FastAPI, or Supabase Functions (Choice depends on team expertise and scaling needs for processing)
- **Frontend**: React/Next.js, Vue/Nuxt.js, or Angular (Choice depends on team expertise)
- **OCR**:
  - PDF: pdfminer.six
  - Image: OpenAI Vision API (Primary), Tesseract (Fallback)
- **LLM**: OpenAI GPT-4o (Function Calling)
- **JSON Validation**: Ajv
- **Deployment**: Supabase Platform, Vercel/Netlify for FE, potentially separate hosting for BE workers if not using Supabase Functions.

## Key Assumptions & Risks
- **OpenAI API Costs & Rate Limits**: Processing many documents can become expensive. Rate limits need to be managed.
- **OCR Accuracy**: OCR isn't perfect. The quality of uploaded documents will significantly impact accuracy. Fallbacks and clear error messaging are important.
- **LLM Structuring Reliability (GPT-4o)**: While good, it might not always perfectly adhere to the schema or might hallucinate. The review/edit step is crucial. Prompt engineering will be iterative.
- **Performance of Processing Pipeline**: OCR and LLM calls can be slow. Asynchronous processing is essential. The "≤ 90s" target for upload+save is ambitious and includes human review time if validation fails. The automated part needs to be much faster.
- **Scope Creep**: Stick to the MVP features. "Curriculum settings" per subject (5.3) is vague and could expand; for MVP, it might just be the subject name/description. "Mastery gaps" (5.8) needs clear definition.
- **Mobile Camera Capture Complexity**: Direct camera capture in a web app can have cross-browser/device inconsistencies. A simpler "upload photo from device" might be a safer MVP start if time is tight.
- **MCP Server "write tools"**: The PRD mentions "read/write tools". This plan focuses on read. Write tools for the tutor agent (e.g., tutor updating assignment status) would be a separate feature/epic.

## Success Metrics Tracking
- **Avg time to upload+save**: Implement logging for start of upload to final save (after review if any).
- **% of mandatory JSON fields auto-filled**: Track during LLM processing and after parent review (to see improvement).
- **Support tickets**: Requires a system for tracking support tickets post-launch.
- **Tutor responds with correct lesson ref**: Requires integration testing with the student-facing tutor.

This plan provides a structured approach. The PO and TL will need to refine task priorities within sprints based on team velocity and emerging challenges. Good luck!