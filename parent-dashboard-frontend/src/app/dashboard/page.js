// app/dashboard/page.js
"use client";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import api from "../../utils/api";

// Extracted hooks and utilities
import { useChildrenData } from "../../hooks/useChildrenData";
import { useLessonManagement } from "../../hooks/useLessonManagement";
import { useFiltersAndSorting } from "../../hooks/useFiltersAndSorting";
import { 
  APP_CONTENT_TYPES,
  APP_GRADABLE_CONTENT_TYPES,
  formInputStyles, 
  formLabelStyles 
} from "../../utils/dashboardConstants";

// Components
import StudentSidebar from "./components/StudentSidebar";
import StudentHeader from "./components/StudentHeader";
import SubjectCard from "./components/SubjectCard";
import AddMaterialForm from "./components/AddMaterialForm";
import EditMaterialModal from "./components/EditMaterialModal";
import ChildLoginSettingsModal from "./components/ChildLoginSettingsModal";
import UpgradePrompt from "../../components/UpgradePrompt";


import {
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";


export default function DashboardPage() {
  const session = useSession();
  const router = useRouter();

  // Use extracted custom hooks
  const childrenData = useChildrenData(session);
  const lessonManagement = useLessonManagement(childrenData.refreshChildSpecificData);
  const filtersAndSorting = useFiltersAndSorting(
    childrenData.lessonsBySubject, 
    childrenData.gradeWeights, 
    childrenData.childSubjects, 
    childrenData.selectedChild
  );

  // Remaining local state (significantly reduced!)
  
  // Unit management modal state
  const [isManageUnitsModalOpen, setIsManageUnitsModalOpen] = useState(false);
  const [managingUnitsForSubject, setManagingUnitsForSubject] = useState(null);
  const [currentSubjectUnitsInModal, setCurrentSubjectUnitsInModal] = useState([]);
  const [newUnitNameModalState, setNewUnitNameModalState] = useState("");
  const [editingUnit, setEditingUnit] = useState(null);

  // Child credentials modal state
  const [isChildLoginSettingsModalOpen, setIsChildLoginSettingsModalOpen] = useState(false);
  const [editingChildCredentials, setEditingChildCredentials] = useState(null);
  const [childUsernameInput, setChildUsernameInput] = useState("");
  const [childPinInput, setChildPinInput] = useState("");
  const [childPinConfirmInput, setChildPinConfirmInput] = useState("");
  const [credentialFormError, setCredentialFormError] = useState("");
  const [credentialFormSuccess, setCredentialFormSuccess] = useState("");
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);

  // Upgrade prompt state
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('free');

  // Lesson container state
  const [newLessonContainerTitle, setNewLessonContainerTitle] = useState("");

  // Get computed values from custom hooks
  const { assignedSubjectsForCurrentChild } = childrenData;
  const { totalStats } = filtersAndSorting;

  // Get lesson containers for selected unit (this one stays as it's UI-specific)
  const currentLessonContainersForUnit = useMemo(() => {
    const selectedUnitId = lessonManagement.lessonJsonForApproval?.unit_id;
    if (!selectedUnitId) return [];
    return childrenData.lessonsByUnit[selectedUnitId] || [];
  }, [lessonManagement.lessonJsonForApproval?.unit_id, childrenData.lessonsByUnit]);

  // All child data management now handled by useChildrenData hook


  // Redirect to login if no session
  useEffect(() => {
    if (session === false) {
      router.replace("/login");
    }
  }, [session, router]);

  // All subjects data now handled by useChildrenData hook

  // Reset lesson container selection when lesson approval changes
  useEffect(() => {
    lessonManagement.setSelectedLessonContainer("");
  }, [lessonManagement.lessonJsonForApproval?.unit_id, lessonManagement.setSelectedLessonContainer]);

  const handleAddLessonFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!lessonManagement.addLessonSubject || !lessonManagement.addLessonFile || lessonManagement.addLessonFile.length === 0 || !lessonManagement.addLessonUserContentType) {
      alert("Please select subject, at least one file, and an initial content type.");
      return;
    }

    // Find subject info
    const currentAssignedSubjects = childrenData.childSubjects[childrenData.selectedChild?.id] || [];
    const subjectInfo = currentAssignedSubjects.find(
      (s) => s.child_subject_id === lessonManagement.addLessonSubject
    );

    if (!subjectInfo || !subjectInfo.child_subject_id) {
      alert("Selected subject is invalid.");
      return;
    }

    // Create form data
    const formData = new FormData();
    formData.append("child_subject_id", subjectInfo.child_subject_id);
    formData.append("user_content_type", lessonManagement.addLessonUserContentType);

    if (lessonManagement.addLessonFile instanceof FileList && lessonManagement.addLessonFile.length > 0) {
      for (let i = 0; i < lessonManagement.addLessonFile.length; i++) {
        formData.append("files", lessonManagement.addLessonFile[i], lessonManagement.addLessonFile[i].name);
      }
    } else {
      alert("File selection error.");
      return;
    }

    // Use the lesson management hook's upload function
    const result = await lessonManagement.handleLessonUpload(formData);
    
    if (!result.success) {
      alert(`Upload Error: ${result.error}`);
      lessonManagement.setLessonJsonForApproval({ error: result.error, title: "Error" });
      lessonManagement.setLessonTitleForApproval("Error");
      lessonManagement.setLessonContentTypeForApproval(APP_CONTENT_TYPES[0]);
      lessonManagement.setLessonMaxPointsForApproval("");
      lessonManagement.setLessonDueDateForApproval("");
      lessonManagement.setLessonCompletedForApproval(false);
    } else {
      // Process successful upload
      const receivedLessonJson = result.data.lesson_json || {};
      lessonManagement.setLessonJsonForApproval(receivedLessonJson);
      
      const firstFileName = lessonManagement.addLessonFile[0]?.name?.split(".")[0];
      lessonManagement.setLessonTitleForApproval(
        receivedLessonJson?.title || firstFileName || "Untitled Material"
      );
      
      const llmContentType = receivedLessonJson?.content_type_suggestion;
      const finalContentType =
        llmContentType && APP_CONTENT_TYPES.includes(llmContentType)
          ? llmContentType
          : lessonManagement.addLessonUserContentType &&
            APP_CONTENT_TYPES.includes(lessonManagement.addLessonUserContentType)
          ? lessonManagement.addLessonUserContentType
          : APP_CONTENT_TYPES[0];
      lessonManagement.setLessonContentTypeForApproval(finalContentType);

      if (
        receivedLessonJson?.total_possible_points_suggestion !== null &&
        receivedLessonJson?.total_possible_points_suggestion !== undefined
      ) {
        lessonManagement.setLessonMaxPointsForApproval(
          String(receivedLessonJson.total_possible_points_suggestion)
        );
      } else {
        lessonManagement.setLessonMaxPointsForApproval("");
      }

      lessonManagement.setLessonDueDateForApproval("");
      lessonManagement.setLessonCompletedForApproval(false);
    }
  };

  const handleAddChildSubmit = async (e) => {
    e.preventDefault();
    const childData = {
      name: childrenData.newChildName,
      grade: childrenData.newChildGrade,
    };
    
    const result = await childrenData.handleAddChild(childData);
    
    if (result.success) {
      // Success is handled by the hook
      childrenData.setShowAddChild(false);
    } else {
      // Check if this is a child limit error
      if (result.code === 'CHILD_LIMIT_EXCEEDED') {
        setCurrentPlan('free'); // Default plan for limit errors
        setUpgradeFeature('children');
        setShowUpgradePrompt(true);
      } else {
        alert(result.error);
      }
    }
  };

  const handleUpgrade = async (targetPlan) => {
    setUpgrading(true);
    try {
      const priceIds = {
        klio_addon: 'price_1RVZczD8TZAZUMMAQWokffCi',
        family: 'price_1RVZT4D8TZAZUMMA3YIJeWWE',
        academy: 'price_1RVZTrD8TZAZUMMAiUuoU72d'
      };

      const response = await api.post('/stripe/create-checkout-session', {
        price_id: priceIds[targetPlan],
        success_url: `${window.location.origin}/dashboard?upgraded=true`,
        cancel_url: window.location.href
      });
      
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start upgrade process. Please try again.');
      setUpgrading(false);
    }
  };

  const handleUpdateLessonJsonForApprovalField = (fieldName, value) => {
    lessonManagement.setLessonJsonForApproval((prevJson) => {
      const baseJson =
        prevJson && typeof prevJson === "object" && !prevJson.error
          ? prevJson
          : {};
      return { ...baseJson, [fieldName]: value };
    });
  };

  const handleToggleLessonComplete = async (
    lessonId,
    currentCompletedStatus,
    grade = null
  ) => {
    let originalLesson = null;
    let subjectIdToUpdate = null;
    let lessonIndexToUpdate = -1;
    Object.keys(childrenData.lessonsBySubject).forEach((subjId) => {
      const index = childrenData.lessonsBySubject[subjId].findIndex(
        (l) => l.id === lessonId
      );
      if (index !== -1) {
        subjectIdToUpdate = subjId;
        lessonIndexToUpdate = index;
        originalLesson = { ...childrenData.lessonsBySubject[subjId][index] };
      }
    });
    if (subjectIdToUpdate && lessonIndexToUpdate !== -1) {
      // Optimistic update - we'll refresh from server after API call
      // This is handled by refreshChildSpecificData() below
    }
    try {
      const payload = grade !== null ? { grade } : {};
      const updatedLessonFromServer = await api.put(`/materials/${lessonId}/toggle-complete`, payload);

      // Refresh all child data to get updated lesson state
      await childrenData.refreshChildSpecificData();
    } catch (error) {
      console.error("Failed to toggle lesson completion:", error);
      alert(
        error.response?.data?.error || "Could not update completion status."
      );
      // Refresh data to revert optimistic update on error
      await childrenData.refreshChildSpecificData();
    }
  };


  const handleApproveNewLesson = async () => {
    // setSavingLesson will be handled by lesson management hook
    const currentAssignedSubjects = childrenData.childSubjects[childrenData.selectedChild?.id] || [];
    const subjectInfo = currentAssignedSubjects.find(
      (s) => s.child_subject_id === lessonManagement.addLessonSubject
    );
  
    if (!subjectInfo || !subjectInfo.child_subject_id) {
      alert("Selected subject invalid.");
      // setSavingLesson will be handled by lesson management hook
      return;
    }
  
    if (
      !lessonManagement.lessonJsonForApproval ||
      !lessonManagement.lessonTitleForApproval ||
      !lessonManagement.lessonContentTypeForApproval
    ) {
      alert("Missing data for approval.");
      // setSavingLesson will be handled by lesson management hook
      return;
    }

    if (!lessonManagement.selectedLessonContainer || lessonManagement.selectedLessonContainer === '__create_new__') {
      alert("Please select or create a lesson container.");
      // setSavingLesson will be handled by lesson management hook
      return;
    }
  
    const unitIdForPayload = lessonManagement.lessonJsonForApproval.unit_id || null;
    const lessonJsonToSave = { ...lessonManagement.lessonJsonForApproval };
    delete lessonJsonToSave.unit_id;
  
    const payload = {
      lesson_id: lessonManagement.selectedLessonContainer, 
      child_subject_id: subjectInfo.child_subject_id,
      title: lessonManagement.lessonTitleForApproval,
      content_type: lessonManagement.lessonContentTypeForApproval,
      lesson_json: lessonJsonToSave,
      grade_max_value:
        APP_GRADABLE_CONTENT_TYPES.includes(lessonManagement.lessonContentTypeForApproval) &&
        lessonManagement.lessonMaxPointsForApproval.trim() !== ""
          ? lessonManagement.lessonMaxPointsForApproval.trim()
          : null,
      due_date:
        lessonManagement.lessonDueDateForApproval.trim() !== ""
          ? lessonManagement.lessonDueDateForApproval
          : null,
      completed_at: lessonManagement.lessonCompletedForApproval
        ? new Date().toISOString()
        : null,
      unit_id: unitIdForPayload,
    };
  
    try {
      await api.post("/materials/save", payload);
      await childrenData.refreshChildSpecificData();
      lessonManagement.setLessonJsonForApproval(null);
      lessonManagement.setLessonTitleForApproval("");
      lessonManagement.setLessonContentTypeForApproval(APP_CONTENT_TYPES[0]);
      lessonManagement.setLessonMaxPointsForApproval("");
      lessonManagement.setLessonDueDateForApproval("");
      lessonManagement.setLessonCompletedForApproval(false);
      lessonManagement.setAddLessonFile(null);
      lessonManagement.setSelectedLessonContainer(""); 
  
      const fileInput = document.getElementById("lesson-file-input-main");
      if (fileInput) fileInput.value = "";
      lessonManagement.setAddLessonSubject("");
      lessonManagement.setAddLessonUserContentType(APP_CONTENT_TYPES[0]);
    } catch (error) {
      alert(error.response?.data?.error || "Lesson save failed.");
    }
    // setSavingLesson will be handled by lesson management hook
  };

  const handleLessonContainerChange = (e) => {
    const value = e.target.value;
    lessonManagement.setSelectedLessonContainer(value);
    
    if (value === '__create_new__') {
      setNewLessonContainerTitle('');
    }
  };

  const handleCreateNewLessonContainer = async (newTitleFromForm) => { 
    const unitId = lessonManagement.lessonJsonForApproval?.unit_id; 
  
    if (!unitId) {
      console.error('Unit ID is missing for new lesson container creation.'); 
      alert('Error: A unit must be selected before creating a new lesson group.');
      return; 
    }
    if (!newTitleFromForm || !newTitleFromForm.trim()) {
      console.error('New lesson container title is empty.'); 
      alert('Error: New lesson group title cannot be empty.');
      return; 
    }
    
    try {
      const response = await api.post('/lesson-containers', {
        unit_id: unitId,
        title: newTitleFromForm.trim()
      });
      
      const lessonsRes = await api.get(`/lesson-containers/unit/${unitId}`);
      const updatedLessonContainersForUnit = lessonsRes.data || [];
      
      childrenData.setLessonsByUnit(prev => ({
        ...prev,
        [unitId]: updatedLessonContainersForUnit
      }));
      
      lessonManagement.setSelectedLessonContainer(response.data.id); 
  
    } catch (error) {
      console.error('Failed to create lesson container:', error.response?.data || error.message); 
      alert(error.response?.data?.error || 'Failed to create lesson group. Please try again.');
    }
  };

  const handleOpenEditModal = (lesson) => {
    lessonManagement.setEditingLesson(lesson);
    lessonManagement.setEditForm({
      title: lesson.title || "",
      content_type: lesson.content_type || APP_CONTENT_TYPES[0],
      grade_value:
        lesson.grade_value === null ? "" : String(lesson.grade_value),
      grade_max_value:
        lesson.grade_max_value === null ? "" : String(lesson.grade_max_value),
      grading_notes: lesson.grading_notes || "",
      completed_at: lesson.completed_at,
      due_date: lesson.due_date || "",
      unit_id: lesson.unit_id || "",
      lesson_json_string: JSON.stringify(lesson.lesson_json || {}, null, 2),
    });
  };

  const handleEditModalFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "completed_toggle")
      lessonManagement.setEditForm((prev) => ({
        ...prev,
        completed_at: checked ? new Date().toISOString() : null,
      }));
    else lessonManagement.setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveLessonEdit = async () => {
    if (!lessonManagement.editingLesson) return;
    // setIsSavingEdit will be handled by lesson management hook
    let lesson_json_parsed;
    try {
      lesson_json_parsed = JSON.parse(lessonManagement.editForm.lesson_json_string);
    } catch (e) {
      alert("Invalid JSON in 'Extracted Data'.");
      // setIsSavingEdit will be handled by lesson management hook
      return;
    }
    const payload = {
      title: lessonManagement.editForm.title,
      content_type: lessonManagement.editForm.content_type,
      lesson_json: lesson_json_parsed,
      grade_value:
        lessonManagement.editForm.grade_value.trim() === "" ? null : lessonManagement.editForm.grade_value,
      grade_max_value:
        lessonManagement.editForm.grade_max_value.trim() === ""
          ? null
          : lessonManagement.editForm.grade_max_value,
      grading_notes:
        lessonManagement.editForm.grading_notes.trim() === "" ? null : lessonManagement.editForm.grading_notes,
      completed_at: lessonManagement.editForm.completed_at,
      due_date: lessonManagement.editForm.due_date.trim() === "" ? null : lessonManagement.editForm.due_date,
      unit_id: lessonManagement.editForm.unit_id || null,
    };
    if (payload.lesson_json && "unit_id" in payload.lesson_json)
      delete payload.lesson_json.unit_id;
    try {
      await api.put(`/materials/${lessonManagement.editingLesson.id}`, payload);
      await childrenData.refreshChildSpecificData();
      lessonManagement.setEditingLesson(null);
    } catch (error) {
      alert(error.response?.data?.error || "Failed to save changes.");
    }
    // setIsSavingEdit will be handled by lesson management hook
  };

  const openManageUnitsModal = (subject) => {
    setManagingUnitsForSubject({
      id: subject.child_subject_id,
      name: subject.name,
    });
    setCurrentSubjectUnitsInModal(
      childrenData.unitsBySubject[subject.child_subject_id] || []
    );
    setNewUnitNameModalState("");
    setEditingUnit(null);
    setIsManageUnitsModalOpen(true);
  };

  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!newUnitNameModalState.trim() || !managingUnitsForSubject) return;

    try {
      const payload = {
        child_subject_id: managingUnitsForSubject.id,
        name: newUnitNameModalState.trim(),
      };
      const res = await api.post("/units", payload);
      const newUnit = res.data;

      const updatedUnitsForSubject = [
        ...(childrenData.unitsBySubject[managingUnitsForSubject.id] || []),
        newUnit,
      ].sort(
        (a, b) =>
          (a.sequence_order || 0) - (b.sequence_order || 0) ||
          a.name.localeCompare(b.name)
      );

      childrenData.setUnitsBySubject((prev) => ({
        ...prev,
        [managingUnitsForSubject.id]: updatedUnitsForSubject,
      }));
      setCurrentSubjectUnitsInModal(updatedUnitsForSubject);
      setNewUnitNameModalState("");
    } catch (error) {
      alert(error.response?.data?.error || "Could not add unit.");
    }
  };

  const handleUpdateUnit = async (e) => {
    e.preventDefault();
    if (!editingUnit || !editingUnit.name.trim() || !managingUnitsForSubject)
      return;

    try {
      const payload = {
        name: editingUnit.name.trim(),
        description: editingUnit.description?.trim(),
      };
      const res = await api.put(`/units/${editingUnit.id}`, payload);
      const updatedUnit = res.data;

      const updatedUnitsList = (
        childrenData.unitsBySubject[managingUnitsForSubject.id] || []
      )
        .map((u) => (u.id === editingUnit.id ? updatedUnit : u))
        .sort(
          (a, b) =>
            (a.sequence_order || 0) - (b.sequence_order || 0) ||
            a.name.localeCompare(b.name)
        );

      childrenData.setUnitsBySubject((prev) => ({
        ...prev,
        [managingUnitsForSubject.id]: updatedUnitsList,
      }));
      setCurrentSubjectUnitsInModal(updatedUnitsList);
      setEditingUnit(null);
    } catch (error) {
      alert(error.response?.data?.error || "Could not update unit.");
    }
  };

  const handleDeleteUnit = async (unitId) => {
    if (
      !managingUnitsForSubject ||
      !confirm(
        `Are you sure you want to delete unit? Lessons will become uncategorized.`
      )
    )
      return;

    try {
      await api.delete(`/units/${unitId}`);
      const updatedUnitsList = (
        childrenData.unitsBySubject[managingUnitsForSubject.id] || []
      ).filter((u) => u.id !== unitId);

      childrenData.setUnitsBySubject((prev) => ({
        ...prev,
        [managingUnitsForSubject.id]: updatedUnitsList,
      }));
      setCurrentSubjectUnitsInModal(updatedUnitsList);

      if (editingUnit?.id === unitId) setEditingUnit(null);
      await childrenData.refreshChildSpecificData();
    } catch (error) {
      alert(error.response?.data?.error || "Could not delete unit.");
    }
  };

  const handleOpenChildLoginSettingsModal = (child) => {
    setEditingChildCredentials(child);
    setChildUsernameInput(child.child_username || "");
    setChildPinInput("");
    setChildPinConfirmInput("");
    setCredentialFormError("");
    setCredentialFormSuccess("");
    setIsChildLoginSettingsModalOpen(true);
  };
  const handleCloseChildLoginSettingsModal = () => {
    setIsChildLoginSettingsModalOpen(false);
    setEditingChildCredentials(null);
    setChildUsernameInput("");
    setChildPinInput("");
    setChildPinConfirmInput("");
    setCredentialFormError("");
    setCredentialFormSuccess("");
  };
  const clearCredentialMessages = () => {
    setCredentialFormError("");
    setCredentialFormSuccess("");
  };
  const handleSetChildUsername = async () => {
    if (!editingChildCredentials || !childUsernameInput.trim()) {
      setCredentialFormError("Username cannot be empty.");
      return;
    }
    if (childUsernameInput.trim().length < 3) {
      setCredentialFormError("Username must be at least 3 characters.");
      return;
    }
    setIsSavingCredentials(true);
    clearCredentialMessages();
    try {
      const res = await api.post(
        `/children/${editingChildCredentials.id}/username`,
        { username: childUsernameInput.trim() }
      );
      setCredentialFormSuccess(res.data.message || "Username updated!");
      const updatedUsername = childUsernameInput.trim();
      const updatedChildren = childrenData.children.map((c) =>
        c.id === editingChildCredentials.id
          ? { ...c, child_username: updatedUsername }
          : c
      );
      childrenData.setChildren(updatedChildren);
      if (childrenData.selectedChild?.id === editingChildCredentials.id)
        childrenData.setSelectedChild((prev) => ({
          ...prev,
          child_username: updatedUsername,
        }));
      setEditingChildCredentials((prev) => ({
        ...prev,
        child_username: updatedUsername,
      }));
    } catch (error) {
      setCredentialFormError(
        error.response?.data?.error || "Failed to update username."
      );
    } finally {
      setIsSavingCredentials(false);
    }
  };
  const handleSetChildPin = async () => {
    if (!editingChildCredentials || !childPinInput) {
      setCredentialFormError("PIN cannot be empty.");
      return;
    }
    if (!/^\d{4,6}$/.test(childPinInput)) {
      setCredentialFormError("PIN must be 4 to 6 digits.");
      return;
    }
    if (childPinInput !== childPinConfirmInput) {
      setCredentialFormError("PINs do not match.");
      return;
    }
    setIsSavingCredentials(true);
    clearCredentialMessages();
    try {
      const res = await api.post(
        `/children/${editingChildCredentials.id}/pin`,
        { pin: childPinInput }
      );
      setCredentialFormSuccess(res.data.message || "PIN updated successfully!");
      setChildPinInput("");
      setChildPinConfirmInput("");
      const updatedChildren = childrenData.children.map((c) =>
        c.id === editingChildCredentials.id
          ? { ...c, access_pin_hash: "set" }
          : c
      ); 
      childrenData.setChildren(updatedChildren);
      if (childrenData.selectedChild?.id === editingChildCredentials.id)
        childrenData.setSelectedChild((prev) => ({ ...prev, access_pin_hash: "set" }));
      setEditingChildCredentials((prev) => ({
        ...prev,
        access_pin_hash: "set",
      }));
    } catch (error) {
      setCredentialFormError(
        error.response?.data?.error || "Failed to update PIN."
      );
    } finally {
      setIsSavingCredentials(false);
    }
  };


  if (childrenData.loadingInitial && session === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-main">
        <div className="text-xl text-text-secondary">Initializing Dashboard...</div>
      </div>
    );
  }
  if (!session) return null;

  // Get current units for add form subject
  const currentUnitsForAddFormSubject = lessonManagement.addLessonSubject && childrenData.selectedChild && childrenData.childSubjects[childrenData.selectedChild.id]
    ? childrenData.unitsBySubject[lessonManagement.addLessonSubject] || [] 
    : [];

  return (
    <div className="flex h-screen bg-background-main overflow-hidden">
      <div className="w-64 flex-shrink-0 bg-background-card border-r border-border-subtle shadow-lg">
        <StudentSidebar
          childrenList={childrenData.children}
          selectedChild={childrenData.selectedChild}
          onSelectChild={childrenData.setSelectedChild}
          showAddChild={childrenData.showAddChild}
          onToggleShowAddChild={childrenData.setShowAddChild}
          newChildName={childrenData.newChildName}
          onNewChildNameChange={(e) => childrenData.setNewChildName(e.target.value)}
          newChildGrade={childrenData.newChildGrade}
          onNewChildGradeChange={(e) => childrenData.setNewChildGrade(e.target.value)}
          onAddChildSubmit={handleAddChildSubmit}
          onOpenChildLoginSettings={handleOpenChildLoginSettingsModal}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto p-6 sm:p-8 lg:p-10">
        {childrenData.loadingInitial && !childrenData.selectedChild && childrenData.children.length > 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xl text-text-secondary">Loading Student Data...</div>
          </div>
        )}
        {!childrenData.selectedChild && !childrenData.loadingInitial && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-secondary italic text-xl text-center">
              {childrenData.children.length > 0
                ? "Select a student to get started."
                : "No students found. Please add a student to begin."}
            </div>
          </div>
        )}

        {childrenData.selectedChild && (
          <>
            <StudentHeader
              selectedChild={childrenData.selectedChild}
              dashboardStats={totalStats}
            />
            <div className="my-6 card p-4"> {/* Use card class */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label
                    htmlFor="filterStatus"
                    className={formLabelStyles}
                  >
                    Filter by Status
                  </label>
                  <select
                    id="filterStatus"
                    value={filtersAndSorting.filterStatus}
                    onChange={(e) => filtersAndSorting.setFilterStatus(e.target.value)}
                    className={`${formInputStyles} mt-1`}
                  >
                    <option value="all">All Statuses</option>
                    <option value="complete">Complete</option>
                    <option value="incomplete">Incomplete</option>
                    <option value="overdue">Overdue</option>
                    <option value="dueSoon">Due Soon (7d)</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="filterContentType"
                    className={formLabelStyles}
                  >
                    Filter by Content Type
                  </label>
                  <select
                    id="filterContentType"
                    value={filtersAndSorting.filterContentType}
                    onChange={(e) => filtersAndSorting.setFilterContentType(e.target.value)}
                    className={`${formInputStyles} mt-1`}
                  >
                    <option value="all">All Types</option>
                    {APP_CONTENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() +
                          type.slice(1).replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="sortBy"
                    className={formLabelStyles}
                  >
                    Sort By
                  </label>
                  <select
                    id="sortBy"
                    value={filtersAndSorting.sortBy}
                    onChange={(e) => filtersAndSorting.setSortBy(e.target.value)}
                    className={`${formInputStyles} mt-1`}
                  >
                    <option value="createdAtDesc">Most Recent</option>
                    <option value="createdAtAsc">Oldest</option>
                    <option value="dueDateAsc">Due Date ↑</option>
                    <option value="dueDateDesc">Due Date ↓</option>
                    <option value="titleAsc">Title A-Z</option>
                    <option value="titleDesc">Title Z-A</option>
                  </select>
                </div>
              </div>
            </div>
            {childrenData.loadingChildData ? (
              <div className="text-center py-10 text-text-secondary">
                Loading {childrenData.selectedChild.name}'s curriculum...
              </div>
            ) : (
              <div className="mt-0">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-text-primary">
                    Curriculum Overview
                  </h2>
                </div>
                {assignedSubjectsForCurrentChild.length === 0 ? (
                  <div className="italic text-text-secondary p-4 bg-background-card rounded-lg shadow border border-border-subtle"> {/* Matches card but might not need full 'card' class features */}
                    No subjects assigned to {childrenData.selectedChild.name}.
                    <button
                      onClick={() => router.push("/subject-management")}
                      className="ml-2 text-accent-blue hover:text-[var(--accent-blue-hover)] underline font-medium transition-colors"
                    >
                      Assign Subjects
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {assignedSubjectsForCurrentChild.map((subject) => (
                      <SubjectCard
                        key={subject.child_subject_id || subject.id}
                        subject={subject}
                        lessons={
                          filtersAndSorting.filteredAndSortedLessonsBySubject[
                            subject.child_subject_id
                          ] || []
                        }
                        units={childrenData.unitsBySubject[subject.child_subject_id] || []}
                        lessonsByUnit={childrenData.lessonsByUnit}
                        subjectStats={
                          subject.child_subject_id &&
                          filtersAndSorting.dashboardStats[subject.child_subject_id]
                            ? filtersAndSorting.dashboardStats[subject.child_subject_id]
                            : {
                                total: 0,
                                completed: 0,
                                avgGradePercent: null,
                                gradableItemsCount: 0,
                              }
                        }
                        onOpenEditModal={handleOpenEditModal}
                        onManageUnits={() => openManageUnitsModal(subject)}
                        onToggleComplete={handleToggleLessonComplete}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div
        className={`w-full md:w-1/3 lg:w-2/5 xl:w-1/3 flex-shrink-0 border-l border-border-subtle bg-background-card shadow-lg overflow-y-auto p-6 transition-opacity duration-300 ${
          childrenData.selectedChild && !childrenData.loadingChildData
            ? "opacity-100"
            : "opacity-50 pointer-events-none"
        }`}
      >
        <div className="sticky top-0 bg-background-card z-10 pt-0 pb-4 -mx-6 px-6 border-b border-border-subtle mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Actions</h2>
        </div>
        {childrenData.selectedChild && !childrenData.loadingChildData ? (
          <AddMaterialForm
            childSubjectsForSelectedChild={assignedSubjectsForCurrentChild}
            onFormSubmit={handleAddLessonFormSubmit}
            onApprove={handleApproveNewLesson}
            uploading={lessonManagement.uploading}
            savingLesson={lessonManagement.savingLesson}
            lessonJsonForApproval={lessonManagement.lessonJsonForApproval}
            onUpdateLessonJsonField={handleUpdateLessonJsonForApprovalField}
            lessonTitleForApproval={lessonManagement.lessonTitleForApproval}
            onLessonTitleForApprovalChange={(e) =>
              lessonManagement.setLessonTitleForApproval(e.target.value)
            }
            lessonContentTypeForApproval={lessonManagement.lessonContentTypeForApproval}
            onLessonContentTypeForApprovalChange={(e) =>
              lessonManagement.setLessonContentTypeForApproval(e.target.value)
            }
            lessonMaxPointsForApproval={lessonManagement.lessonMaxPointsForApproval}
            onLessonMaxPointsForApprovalChange={(e) =>
              lessonManagement.setLessonMaxPointsForApproval(e.target.value)
            }
            lessonDueDateForApproval={lessonManagement.lessonDueDateForApproval}
            onLessonDueDateForApprovalChange={(e) =>
              lessonManagement.setLessonDueDateForApproval(e.target.value)
            }
            lessonCompletedForApproval={lessonManagement.lessonCompletedForApproval}
            onLessonCompletedForApprovalChange={(e) =>
              lessonManagement.setLessonCompletedForApproval(e.target.checked)
            }
            currentAddLessonSubject={lessonManagement.addLessonSubject}
            onAddLessonSubjectChange={(e) =>
              lessonManagement.setAddLessonSubject(e.target.value)
            }
            currentAddLessonUserContentType={lessonManagement.addLessonUserContentType}
            onAddLessonUserContentTypeChange={(e) =>
              lessonManagement.setAddLessonUserContentType(e.target.value)
            }
            onAddLessonFileChange={(e) => lessonManagement.setAddLessonFile(e.target.files)}
            currentAddLessonFile={lessonManagement.addLessonFile}
            appContentTypes={APP_CONTENT_TYPES}
            appGradableContentTypes={APP_GRADABLE_CONTENT_TYPES}
            unitsForSelectedSubject={currentUnitsForAddFormSubject}
            lessonContainersForSelectedUnit={currentLessonContainersForUnit}
            selectedLessonContainer={lessonManagement.selectedLessonContainer}
            onLessonContainerChange={handleLessonContainerChange}
            onCreateNewLessonContainer={handleCreateNewLessonContainer}
          />
        ) : (
          <p className="text-sm text-text-tertiary italic text-center">
            {childrenData.selectedChild && childrenData.loadingChildData
              ? "Loading actions..."
              : "Select student to enable actions."}
          </p>
        )}
      </div>

      {isManageUnitsModalOpen && managingUnitsForSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
          <div className="bg-background-card rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[85vh] flex flex-col border border-border-subtle">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-border-subtle">
              <h3 className="text-xl font-semibold text-text-primary">
                Manage Units for:{" "}
                <span className="text-accent-blue">
                  {managingUnitsForSubject.name}
                </span>
              </h3>
              <button
                onClick={() => setIsManageUnitsModalOpen(false)}
                className="text-text-secondary hover:text-text-primary text-2xl p-1 rounded-full hover:bg-gray-100 transition-colors" /* Using gray-100 for hover as it's neutral */
              >
                ×
              </button>
            </div>
            <div className="flex-grow overflow-y-auto mb-4 pr-2 space-y-3">
              {currentSubjectUnitsInModal.length === 0 && (
                <p className="text-sm text-text-secondary italic py-4 text-center">
                  No units created yet.
                </p>
              )}
              {currentSubjectUnitsInModal.map((unit) => (
                <div
                  key={unit.id}
                  className={`p-3 border border-border-subtle rounded-md transition-all duration-150 ${
                    editingUnit?.id === unit.id
                      ? "bg-accent-blue/10 border-accent-blue" /* Light accent bg for editing */
                      : "hover:bg-gray-50" /* Subtle hover */
                  }`}
                >
                  {editingUnit?.id === unit.id ? (
                    <form onSubmit={handleUpdateUnit} className="space-y-3">
                      <div>
                        <label
                          htmlFor={`editUnitName-${unit.id}`}
                          className={formLabelStyles}
                        >
                          Unit Name
                        </label>
                        <input
                          type="text"
                          id={`editUnitName-${unit.id}`}
                          value={editingUnit.name}
                          onChange={(e) =>
                            setEditingUnit({
                              ...editingUnit,
                              name: e.target.value,
                            })
                          }
                          className={`${formInputStyles} mt-0.5`}
                          autoFocus
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`editUnitDescription-${unit.id}`}
                          className={formLabelStyles}
                        >
                          Description (Optional)
                        </label>
                        <textarea
                          id={`editUnitDescription-${unit.id}`}
                          value={editingUnit.description || ""}
                          onChange={(e) =>
                            setEditingUnit({
                              ...editingUnit,
                              description: e.target.value,
                            })
                          }
                          rows="2"
                          className={`${formInputStyles} mt-0.5`}
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingUnit(null)}
                          className="px-3 py-1.5 text-xs text-text-primary bg-gray-100 hover:bg-gray-200 border border-border-subtle rounded-lg font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary text-xs px-3 py-1.5" /* Using btn-primary */
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {unit.name}
                        </p>
                        {unit.description && (
                          <p
                            className="text-xs text-text-secondary mt-0.5 max-w-xs truncate"
                            title={unit.description}
                          >
                            {unit.description}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 space-x-1.5">
                        <button
                          onClick={() =>
                            setEditingUnit({
                              ...unit,
                              description: unit.description || "",
                            })
                          }
                          className="p-1.5 text-accent-blue hover:text-[var(--accent-blue-hover)] rounded-md hover:bg-accent-blue/10 transition-colors"
                          title="Edit Unit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUnit(unit.id)}
                          className="p-1.5 text-[var(--messageTextDanger)] hover:opacity-75 rounded-md hover:bg-[var(--messageTextDanger)]/10 transition-opacity"
                          title="Delete Unit"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {!editingUnit && (
              <form onSubmit={handleAddUnit} className="mt-auto pt-4 border-t border-border-subtle">
                <label
                  htmlFor="newUnitNameModalState"
                  className={formLabelStyles}
                >
                  Add New Unit
                </label>
                <div className="mt-1 flex rounded-lg shadow-sm"> {/* Changed to rounded-lg for consistency */}
                  <input
                    type="text"
                    id="newUnitNameModalState"
                    value={newUnitNameModalState}
                    onChange={(e) => setNewUnitNameModalState(e.target.value)}
                    className={`${formInputStyles} flex-1 min-w-0 rounded-r-none`}
                    placeholder="E.g., Chapter 1: Introduction"
                    required
                  />
                  <button
                    type="submit"
                    className="btn-primary inline-flex items-center px-4 py-2 rounded-l-none text-sm" /* Using btn-primary, adjusted rounding */
                  >
                    <PlusCircleIcon className="h-5 w-5 mr-1.5 sm:mr-2 text-text-primary" /> {/* Icon color from btn-primary */}
                    Add
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {lessonManagement.editingLesson && (
        <EditMaterialModal
          editingLesson={lessonManagement.editingLesson}
          editForm={lessonManagement.editForm}
          onFormChange={handleEditModalFormChange}
          onSave={handleSaveLessonEdit}
          onClose={() => lessonManagement.setEditingLesson(null)}
          isSaving={lessonManagement.isSavingEdit}
          unitsForSubject={
            lessonManagement.editingLesson && childrenData.unitsBySubject[lessonManagement.editingLesson.child_subject_id]
              ? childrenData.unitsBySubject[lessonManagement.editingLesson.child_subject_id]
              : []
          }
          appContentTypes={APP_CONTENT_TYPES}
          appGradableContentTypes={APP_GRADABLE_CONTENT_TYPES}
        />
      )}

      {isChildLoginSettingsModalOpen && editingChildCredentials && (
        <ChildLoginSettingsModal
          child={editingChildCredentials}
          isOpen={isChildLoginSettingsModalOpen}
          onClose={handleCloseChildLoginSettingsModal}
          usernameInput={childUsernameInput}
          onUsernameInputChange={(e) => {
            setChildUsernameInput(e.target.value);
            clearCredentialMessages();
          }}
          onSetUsername={handleSetChildUsername}
          pinInput={childPinInput}
          onPinInputChange={(e) => {
            setChildPinInput(e.target.value);
            clearCredentialMessages();
          }}
          pinConfirmInput={childPinConfirmInput}
          onPinConfirmInputChange={(e) => {
            setChildPinConfirmInput(e.target.value);
            clearCredentialMessages();
          }}
          onSetPin={handleSetChildPin}
          isSaving={isSavingCredentials}
          errorMsg={credentialFormError}
          successMsg={credentialFormSuccess}
          clearMessages={clearCredentialMessages}
        />
      )}

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <UpgradePrompt
          feature={upgradeFeature}
          currentPlan={currentPlan}
          onUpgrade={handleUpgrade}
          onClose={() => setShowUpgradePrompt(false)}
          upgrading={upgrading}
        />
      )}
    </div>
  );
}