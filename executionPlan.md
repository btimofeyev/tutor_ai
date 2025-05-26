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


















The goal here is to get your API endpoints working with the new schema. Test each controller with Postman/Insomnia after refactoring.
childrenController.js & subjectsController.js (Minor Adjustments):
Action: Review these controllers. The changes to the children and subjects tables were mostly adding new nullable columns or is_predefined. The core CRUD operations for listing, creating basic children, and creating global subjects might not need extensive changes unless you are now strictly enforcing created_by_user_id for subjects or handling child_username during child creation.
Your addSubject in subjectsController.js should now also be able to set is_predefined = false (or true if you have an admin interface for predefined ones).
Ensure listChildren still returns the necessary info.
The crucial change is how child_subjects are handled, which is next.
childSubjectsController.js (NEW or Heavily Refactor subjectsController.js parts):
Action: Create a new controller or refactor parts of subjectsController.js that dealt with assigning subjects to children. This controller will manage the child_subjects junction table.
Endpoints:
POST /api/child-subjects/assign: Assign a subject_id to a child_id. Creates a record in child_subjects.
DELETE /api/child-subjects/unassign: Unassign (body might contain child_id, subject_id, or it could be DELETE /api/child-subjects/:child_subject_id_pk).
GET /api/child-subjects/child/:child_id: List all assigned subjects (now child_subjects records, joining with subjects to get names) for a child. This replaces your old /api/subjects/child/:child_id.
PUT /api/child-subjects/:child_subject_id_pk: To update custom_subject_name_override.
Update childrenRoutes.js and subjectsRoutes.js or create childSubjectsRoutes.js.
unitsController.js (CRUD for Units):
Action: Implement full CRUD for the new units table.
Endpoints:
POST /api/units (Body: child_subject_id, name, description, sequence_order)
GET /api/units/subject/:child_subject_id (Lists units for a child_subject_id)
PUT /api/units/:unit_id
DELETE /api/units/:unit_id
Ensure child_subject_id is correctly validated and used.
lessonsContainerController.js (CRUD for Lesson Containers - the new lessons table):
Action: Implement full CRUD for the new lessons table.
Endpoints:
POST /api/lessons (Body: unit_id, title, lesson_number, description, sequence_order)
GET /api/lessons/unit/:unit_id (Lists lesson containers for a unit_id)
PUT /api/lessons/:lesson_id
DELETE /api/lessons/:lesson_id
Ensure unit_id is correctly validated.
materialsController.js (Refactor from old lessonsController.js):
Action: This is a major refactor.
Rename the file and all internal references from "lesson" to "material" where appropriate (e.g., saveMaterial, listMaterialsForLesson).
Key Change: All functions creating or updating materials now need to accept a lesson_id (the ID of the lesson container) instead of the old unit_id. The child_subject_id on the materials table is now mostly for denormalization/easier querying but the primary link is lesson_id.
uploadLesson (now uploadMaterialFile or similar): The output lesson_json will be associated with a material that belongs to a lesson container.
saveMaterial: Takes lesson_id, child_subject_id (ensure consistency), title, content_type, lesson_json, etc.
updateMaterialDetails: Takes lesson_id to potentially re-assign.
listMaterialsForLesson: GET /api/materials/lesson/:lesson_id
deleteMaterial: DELETE /api/materials/:material_id (already planned).
toggleMaterialCompletion: PUT /api/materials/:material_id/toggle-complete (rename from toggleLessonCompletion).
Update routes in materialsRoutes.js (old lessonsRoutes.js).
weightsController.js (Minor Adjustment):
Ensure it still correctly references child_subject_id from the child_subjects table. The core logic should remain the same.
Phase 2: Frontend - Adapting Core Data Flow & UI (Iterative)
Start with DashboardPage.js as it's the central hub.
DashboardPage.js - Data Fetching (refreshChildSpecificData):
Action: This is the absolute first frontend part to tackle.
Modify refreshChildSpecificData to:
Fetch assigned subjects (now child_subjects records which include the child_subject_id PK).
For each child_subject_id, fetch its units from /api/units/subject/:child_subject_id. Store in unitsBySubject.
For each unit.id, fetch its lessons (containers) from /api/lessons/unit/:unit_id. Store in a new state, e.g., lessonsByUnit: { [unitId]: [lessonContainerObjects] }.
For each lessonContainer.id, fetch its materials from /api/materials/lesson/:lesson_id. Store in a new state, e.g., materialsByLesson: { [lessonContainerId]: [materialObjects] }.
Alternative for fetching materials: Fetch all materials for a child_subject_id once using a modified /api/materials/subject/:child_subject_id endpoint (you'd need to create this) and then group them client-side by lesson_id. This can be more efficient than many small calls if a subject has many lessons.
Update gradeWeights fetching if its dependency on child_subject_id changes path.
DashboardPage.js - State Management:
Introduce unitsBySubject, lessonsByUnit, materialsByLesson states.
The old lessonsBySubject will effectively be replaced by materialsByLesson (or how you decide to structure the final display data).
SubjectCard.js:
Action: This component will now receive units (for the subject) and potentially nested data for lessons and materials, or it will use the new global states like lessonsByUnit and materialsByLesson keyed by appropriate IDs.
Refactor its rendering logic to display:
Unit Name (collapsible)
Lesson Container Name/Number (collapsible)
List of Materials (MaterialListItem.js)
The "Manage Units" button (onManageUnits) will still be here.
The "Quick Complete" for materials will involve updating materialsByLesson.
AddMaterialForm.js & EditMaterialModal.js:
Action: These are significant.
Unit & Lesson Selection: They need dropdowns:
Select Subject (as before, provides child_subject_id).
Select Unit (filters based on child_subject_id, provides unit_id).
Select Lesson Container (filters based on unit_id, provides lesson_id for the material).
The payload sent to save/update a material now includes lesson_id.
lessonJsonForApproval and editForm will still handle the material's specific details.
"Manage Units" Modal (in DashboardPage.js):
Action: This modal needs to be enhanced.
When a unit is selected/expanded within this modal:
List its "Lesson Containers".
Allow CRUD operations for these Lesson Containers (calling the new /api/lessons/... endpoints).
The UI for adding/editing/deleting units themselves remains.
Update filteredAndSortedLessonsBySubject (now filteredAndSortedMaterials):
Action: This useMemo hook needs to be adapted. It previously worked on a flat list of "lessons" (which were materials) per subject. Now it needs to:
Either operate on a flattened list of all materials for a subject (if you choose to fetch all materials for a subject and then group client-side for display).
Or, if filtering/sorting is to be done within each lesson container, the logic moves into how SubjectCard processes the materials for each lesson.
For MVP, keeping a subject-wide filter/sort on a flattened list of all materials might be easier to adapt first. The lessons prop to SubjectCard would then be this pre-filtered/sorted flat list, and SubjectCard would be responsible for grouping them by unit_id and lesson_id for display.
Update subjectStats and dashboardStats:
Action: Ensure these useMemo hooks are now correctly iterating over the materials data (likely from materialsByLesson or a flattened equivalent) to calculate completion and grades.
Starting Point for Refactoring:
I recommend starting with the Backend Refactor, in the order listed (1-6). Get your API endpoints working correctly with the new schema and test them thoroughly with Postman/Insomnia. This ensures your data layer is solid before touching the frontend.