Project Goal: Refactor the database schema and application to support a hierarchical structure of Subject -> Unit -> Lesson (Container) -> Material, enabling better curriculum organization.
Assumed Starting Point: Your application is functional with the previous schema (where "lessons" table stored materials and "units" were directly linked to these materials).
Mini-Execution Plan: Schema Refactor & Hierarchical Curriculum (Approx. 2-3 Sprints)
This plan assumes a dedicated focus from your backend and frontend resources.
Sprint A: Database & Core Backend Refactor (1.5 - 2 Weeks)
Goal: Implement the new database schema. Refactor backend controllers and routes for materials (old lessons), new lessons (containers), and units to work with the new structure. Ensure basic CRUD for these entities is functional via API testing.
Tasks:
DBA/Backend Lead:
Backup Current Database (CRITICAL).
Schema Migration Script: Write SQL DDL scripts to:
ALTER TABLE lessons RENAME TO materials_old; (or drop and recreate if no critical data).
Create the new subjects table (with is_predefined, potentially created_by_user_id).
Create the new children table (with child_username, access_pin_hash).
Create the new child_subjects table (with custom_subject_name_override).
Create the new units table (FK to child_subjects.id).
Create the new lessons table (Lesson Containers, FK to units.id).
Create the new materials table (based on materials_old, now with FK to lessons.id instead of units.id).
Re-create/verify subject_grade_weights (FK to child_subjects.id).
(Optional) Create student_material_progress table.
Apply all necessary constraints (PK, FK, UNIQUE, CHECKS).
Add/verify updated_at triggers for all relevant tables.
Deploy Schema: Apply these scripts to your Supabase development/test environment.
Data Seeding (Optional but Recommended): Create seed scripts for predefined subjects. If you renamed lessons to materials_old, write a script to migrate relevant data from materials_old to the new materials table, trying to map to new lesson_ids (this part can be complex and might be simplified by manually re-adding some test data initially).
Backend Developer(s):
Refactor lessonsController.js to materialsController.js:
Rename the file.
Update all Supabase queries to target the materials table.
Endpoints that previously took/returned unit_id for a material will now take/return lesson_id.
saveMaterial: Input lesson_id.
updateMaterialDetails: Input lesson_id.
listMaterials: Likely fetched by lesson_id or child_subject_id (if keeping that direct link on materials).
Ensure uploadLesson (which creates lesson_json) still functions, though the subsequent saveMaterial will need the lesson_id.
Create lessonsContainerController.js (for the new lessons table - Lesson Containers):
Implement CRUD:
createLessonContainer(req, res): Takes unit_id, title, lesson_number, description, sequence_order.
listLessonsForUnit(req, res): Takes unit_id.
updateLessonContainer(req, res): Updates a lesson container.
deleteLessonContainer(req, res): Deletes a lesson container (and its materials due to ON DELETE CASCADE on materials.lesson_id).
Update unitsController.js:
Ensure it correctly references child_subject_id.
When a unit is deleted, its associated lessons (containers) should also be deleted due to ON DELETE CASCADE.
Update childrenController.js and subjectsController.js:
Adapt to any minor changes from the new children and subjects table structures (e.g., if created_by_user_id or is_predefined are used in queries).
Update Routes:
Rename lessonsRoutes.js to materialsRoutes.js and update paths.
Create lessonContainersRoutes.js.
Update server.js to use these new route files.
API Testing: Use Postman/Insomnia to thoroughly test all new and refactored CRUD endpoints for units, lessons (containers), and materials.
Deliverables for Sprint A:
New database schema deployed and functional.
Backend API refactored:
materialsController.js (old lessonsController) working with the materials table and lesson_id.
lessonsContainerController.js with full CRUD for lesson containers.
unitsController.js confirmed working with the new schema.
All backend API endpoints tested manually.
Sprint B: Frontend - Adapting Core Data Flow & Basic Display (2 Weeks)
Goal: Update the frontend to fetch and work with the new hierarchical data (Subjects -> Units -> Lessons -> Materials). Adapt the SubjectCard to display this hierarchy at a basic level. Update "Add Material" and "Edit Material" forms to select/assign to the new "Lesson Containers".
Tasks:
Frontend Developer(s):
Update DashboardPage.js Data Fetching (refreshChildSpecificData):
Fetch unitsBySubject (already done).
For each unit, fetch its "Lesson Containers" using the new /api/lessons/unit/:unit_id endpoint. Store this as lessonsByUnit (e.g., { [unitId]: [lessonContainerObjects] }).
For each "Lesson Container", fetch its "Materials" using /api/materials/lesson/:lesson_id (new endpoint needed in materialsController.js). Store this as materialsByLesson (e.g., { [lessonId]: [materialObjects] }).
Alternatively, for materialsByLesson, you could fetch all materials for a child_subject_id once and then group them client-side by lesson_id after fetching lessons. This might be more efficient than many small API calls.
Update AddMaterialForm.js:
Add a new dropdown: "Select Lesson (Container)". This dropdown is populated based on the selected Unit.
The onApprove handler in DashboardPage.js (handleApproveNewLesson) will now send the selected lesson_id (from the new dropdown) to the POST /api/materials/save endpoint.
Update EditMaterialModal.js:
Add a dropdown to change the "Lesson (Container)" a material is assigned to.
The save handler (handleSaveLessonEdit) will send the updated lesson_id to PUT /api/materials/:material_id.
Update SubjectCard.js Display:
Iterate through units for the subject.
For each unit, iterate through its lessons (containers) from lessonsByUnit.
For each lesson (container), display its title/number, and then list its materials (from materialsByLesson or the client-side grouped materials).
Implement basic collapsible sections for Units and Lessons.
Update filteredAndSortedLessonsBySubject: This useMemo hook now needs to operate on materialsByLesson or the structure you use to hold materials, and group/flatten them appropriately before filtering and sorting if filters apply across all materials in a subject. Or, filtering/sorting could happen within each lesson's material list. For MVP, filtering across all materials in a subject might be simpler to adapt first.
Backend Developer(s):
Create GET /api/materials/lesson/:lesson_id endpoint in materialsController.js to list materials for a specific lesson container.
Ensure saveMaterial and updateMaterialDetails in materialsController.js correctly handle lesson_id.
Deliverables for Sprint B:
Dashboard fetches and can conceptually store Units, Lesson Containers, and Materials.
Parents can select a Unit, then a Lesson Container when adding new material.
Parents can change the Lesson Container for existing material.
SubjectCard displays the basic hierarchy: Subject -> Unit -> Lesson -> Materials.
Existing filtering/sorting still works at the "all materials within a subject" level (further refinement later).
Sprint C: UI for Managing Lesson Containers & Refinements (1-2 Weeks)
Goal: Provide a user-friendly way for parents to create, edit, delete, and reorder "Lesson Containers" within their Units. Refine the display and delete functionality for materials.
Tasks:
Frontend Developer(s):
Enhance "Manage Units" Modal (in DashboardPage.js):
When a unit is listed in this modal, also list its "Lesson Containers" (fetched via /api/lessons/unit/:unit_id).
Add a form within the modal (perhaps per unit) to "Add New Lesson Container" (title, number, description) to a selected unit. This calls POST /api/lessons.
Allow editing of Lesson Container details (title, number, description). This calls PUT /api/lessons/:lesson_id.
Allow deleting a Lesson Container (with confirmation). This calls DELETE /api/lessons/:lesson_id.
Implement simple sequence_order editing for Lesson Containers within a unit (e.g., input field or up/down arrows).
Implement "Delete Material" Functionality:
Add a delete button to MaterialListItem.js (perhaps visible on hover or in an ellipsis menu) or ensure it's prominent in EditMaterialModal.js.
The click handler calls handleDeleteMaterial in DashboardPage.js.
handleDeleteMaterial calls DELETE /api/materials/:material_id.
Refine SubjectCard.js Display:
Ensure collapsible sections for Units and Lessons are user-friendly.
Make sure "Show More/Less" works correctly within this new nested structure.
Update filteredAndSortedLessonsBySubject (More Advanced):
Consider if filtering/sorting should apply within each lesson group or continue to flatten all materials for a subject before filtering. The latter is simpler to maintain from current logic.
Backend Developer(s):
Ensure all CRUD endpoints for lessons (containers) in lessonsContainerController.js are robust and include sequence_order handling.
Implement DELETE /api/materials/:material_id endpoint in materialsController.js.
Deliverables for Sprint C:
Parents can fully manage "Lesson Containers" (create, view, edit, delete, reorder) within each Unit.
Parents can delete individual materials.
Dashboard displays the full Subject -> Unit -> Lesson -> Material hierarchy clearly.
