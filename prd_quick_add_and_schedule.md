# PRD: Quick Add & Schedule

**Author:** Ben (via Gemini)
**Date:** July 25, 2025
**Status:** Draft

## 1. Introduction & Problem Statement

The current process for a parent to add learning materials to a child's curriculum is powerful but complex. It requires the parent to navigate a multi-step modal and understand the `Subject -> Unit -> Lesson Container` hierarchy before they can even upload a file. This creates a high cognitive load and can be a barrier for parents who simply want to upload a document and schedule it for their child to complete.

The goal of this feature is to dramatically simplify this core workflow, making it fast and intuitive for parents to add materials and schedule them without getting bogged down in the details of curriculum organization.

## 2. Goals & Objectives

*   **Primary Goal:** To create the fastest, most intuitive path for a parent to upload a learning material and schedule it for their child.
*   **Secondary Goal:** To reduce the cognitive load required to add new materials to the system.
*   **Business Goal:** To increase user engagement and satisfaction by making the most common task in the application easier and more enjoyable.

## 3. User Stories

*   **As a busy parent,** I want to be able to quickly upload a worksheet, assign it to a subject, and schedule it for my child to complete tomorrow, so I can spend less time managing the curriculum and more time helping my child learn.
*   **As a new user,** I want an obvious and easy way to add my existing materials to the application without having to first learn a complex organizational system, so I can get started quickly and see the value of the platform right away.
*   **As a power-user parent,** I want the option to quickly add materials without having to place them in a specific unit or lesson container, so I can organize them later when I have more time.

## 4. Proposed Solution: The "Quick Add & Schedule" Workflow

We will introduce a new, streamlined workflow that combines the uploading and scheduling of materials into a single, seamless process. This will be achieved through a dedicated "Upload & Schedule" page or a prominent drag-and-drop section on the main dashboard.

### The Workflow

1.  **Upload:** The parent drags and drops one or more files (e.g., `math-worksheet.pdf`, `history-reading.png`) into the upload area.
2.  **Staging:** The files appear in a temporary "staging list." The system immediately begins the AI analysis for each file in the background.
3.  **Minimal Configuration:** For each item in the staging list, the parent sees a simple, single-line form with the following fields:
    *   **Title:** Pre-filled by the AI as soon as it's done. Editable.
    *   **Subject:** A dropdown menu. **This is the only required organizational field.**
    *   **Schedule For:** A calendar date picker.
    *   **Assign To:** (If multiple children) A dropdown for the child.
4.  **Add to Plan:** A single button, "Add All to Plan," saves all the staged items. For each item, the system:
    *   Saves the material to the database.
    *   Automatically categorizes the material into a default "General Materials" unit for the selected subject.
    *   If a date is selected, creates a corresponding entry in the schedule.

## 5. Key Features & Requirements

*   **Drag-and-Drop Upload Area:** A new UI component for uploading files.
*   **Staging List:** A temporary list of uploaded files with their configuration options.
*   **Background AI Analysis:** The AI analysis should run in the background without blocking the user from configuring the other items in the list.
*   **Simplified Configuration Form:** A single-line form for each staged item with fields for Title, Subject, Schedule For, and Assign To.
*   **Default Categorization:** Materials added through this workflow will be automatically placed in a default "General Materials" unit for the selected subject.
*   **Automatic Scheduling:** If a date is selected, the system will automatically create a schedule entry for the material.
*   **Progressive Organization:** Parents will still be able to move materials from the "General Materials" unit to other units and lesson containers at a later time.

## 6. Success Metrics

*   **Time to Add and Schedule a Material:** A significant reduction in the average time it takes for a user to upload a material and schedule it.
*   **Feature Adoption:** A high percentage of new materials being added through the "Quick Add & Schedule" workflow.
*   **User Satisfaction:** An increase in user satisfaction scores, as measured by surveys or other feedback channels.

## 7. Out of Scope

*   **Complex Editing:** This workflow is for adding new materials. Editing existing materials will still be done through the existing modals.
*   **Advanced Scheduling Options:** The initial version of this feature will only support scheduling for a specific date. More advanced options (e.g., recurring events, time-of-day scheduling) will be considered for future iterations.
*   **Hierarchy Management:** This feature is designed to bypass the need for immediate hierarchy management. Managing units and lesson containers will still be done through the existing `SubjectCard` and `UnitManagementModal`.
