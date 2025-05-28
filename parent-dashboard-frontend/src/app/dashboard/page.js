// app/dashboard/page.js
"use client";
import { useSession } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import api from "../../utils/api";

import StudentSidebar from "./components/StudentSidebar";
import StudentHeader from "./components/StudentHeader";
import SubjectCard from "./components/SubjectCard";
import AddMaterialForm from "./components/AddMaterialForm";
import EditMaterialModal from "./components/EditMaterialModal";
import ChildLoginSettingsModal from "./components/ChildLoginSettingsModal";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

import {
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

export const APP_CONTENT_TYPES = [
  "lesson",
  "worksheet",
  "assignment",
  "test",
  "quiz",
  "notes",
  "reading_material",
  "other",
];
export const APP_GRADABLE_CONTENT_TYPES = [
  "worksheet",
  "assignment",
  "test",
  "quiz",
];

const defaultWeightsForNewSubject = APP_CONTENT_TYPES.map((ct) => ({
  content_type: ct,
  weight: APP_GRADABLE_CONTENT_TYPES.includes(ct) ? 0.1 : 0.0,
}));

const isDateOverdue = (dateString) => {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateString + "T00:00:00Z"); // Assuming UTC date from DB
  return dueDate < today;
};
const isDateDueSoon = (dateString, days = 7) => {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateString + "T00:00:00Z"); // Assuming UTC date from DB
  const soonCutoff = new Date(today);
  soonCutoff.setDate(today.getDate() + days);
  return dueDate >= today && dueDate <= soonCutoff;
};

// Helper for input styling
const inputBaseClass = "block w-full border-border-input focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue rounded-lg bg-background-card text-text-primary placeholder-text-tertiary shadow-sm";
const inputPaddingClass = "py-2 px-3";
const inputSizeClass = "text-sm";
const formInputStyles = `${inputBaseClass} ${inputPaddingClass} ${inputSizeClass}`;
const formLabelStyles = "block text-xs font-medium text-text-secondary mb-1";


export default function DashboardPage() {
  const session = useSession();
  const router = useRouter();

  const [children, setChildren] = useState([]);
  const [subjectsData, setSubjectsData] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childSubjects, setChildSubjects] = useState({});
  const [lessonsByUnit, setLessonsByUnit] = useState({});
  const [lessonsBySubject, setLessonsBySubject] = useState({});
  const [gradeWeights, setGradeWeights] = useState({});
  const [unitsBySubject, setUnitsBySubject] = useState({});

  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildNameState, setNewChildNameState] = useState("");
  const [newChildGradeState, setNewChildGradeState] = useState("");

  const [addLessonSubject, setAddLessonSubject] = useState("");
  const [addLessonFile, setAddLessonFile] = useState(null);
  const [addLessonUserContentType, setAddLessonUserContentType] = useState(
    APP_CONTENT_TYPES[0]
  );
  const [lessonJsonForApproval, setLessonJsonForApproval] = useState(null);
  const [lessonTitleForApproval, setLessonTitleForApproval] = useState("");
  const [lessonContentTypeForApproval, setLessonContentTypeForApproval] =
    useState(APP_CONTENT_TYPES[0]);
  const [lessonMaxPointsForApproval, setLessonMaxPointsForApproval] =
    useState("");
  const [lessonDueDateForApproval, setLessonDueDateForApproval] = useState("");
  const [lessonCompletedForApproval, setLessonCompletedForApproval] =
    useState(false);

  const [editingLesson, setEditingLesson] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [isManageUnitsModalOpen, setIsManageUnitsModalOpen] = useState(false);
  const [managingUnitsForSubject, setManagingUnitsForSubject] = useState(null);
  const [currentSubjectUnitsInModal, setCurrentSubjectUnitsInModal] = useState(
    []
  );
  const [newUnitNameModalState, setNewUnitNameModalState] = useState("");
  const [editingUnit, setEditingUnit] = useState(null);

  const [isChildLoginSettingsModalOpen, setIsChildLoginSettingsModalOpen] =
    useState(false);
  const [editingChildCredentials, setEditingChildCredentials] = useState(null);
  const [childUsernameInput, setChildUsernameInput] = useState("");
  const [childPinInput, setChildPinInput] = useState("");
  const [childPinConfirmInput, setChildPinConfirmInput] = useState("");
  const [credentialFormError, setCredentialFormError] = useState("");
  const [credentialFormSuccess, setCredentialFormSuccess] = useState("");
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingChildData, setLoadingChildData] = useState(false);

  // Lesson Container Selection State
  const [selectedLessonContainer, setSelectedLessonContainer] = useState("");
  const [newLessonContainerTitle, setNewLessonContainerTitle] = useState("");

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterContentType, setFilterContentType] = useState("all");
  const [sortBy, setSortBy] = useState("createdAtDesc");

  const dashboardStats = useMemo(() => {
    if (
      !selectedChild ||
      !selectedChild.id ||
      Object.keys(lessonsBySubject).length === 0
    ) {
      return {
        dueSoon: 0,
        overdue: 0,
        overallCompletionPercent: 0,
        totalItems: 0,
        completedItems: 0,
      };
    }
    let dueSoon = 0,
      overdue = 0,
      completedItems = 0,
      totalItems = 0;
    Object.values(lessonsBySubject)
      .flat()
      .forEach((item) => {
        totalItems++;
        if (item.completed_at) completedItems++;
        else if (item.due_date) {
          if (isDateOverdue(item.due_date)) overdue++;
          else if (isDateDueSoon(item.due_date, 7)) dueSoon++;
        }
      });
    const overallCompletionPercent =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    return {
      dueSoon,
      overdue,
      overallCompletionPercent,
      totalItems,
      completedItems,
    };
  }, [selectedChild, lessonsBySubject]);

  const subjectStats = useMemo(() => {
    const stats = {};
    if (!selectedChild || !selectedChild.id) return stats;
    const currentChildAssignedSubjects = childSubjects[selectedChild.id] || [];
    currentChildAssignedSubjects.forEach((subj) => {
      if (subj.child_subject_id) {
        const items = lessonsBySubject[subj.child_subject_id] || [];
        const currentSubjectWeightsArray =
          gradeWeights[subj.child_subject_id] || defaultWeightsForNewSubject;
        const weightsMap = new Map(
          currentSubjectWeightsArray.map((w) => [
            w.content_type,
            parseFloat(w.weight),
          ])
        );
        let completed = 0,
          gradableItemsCount = 0,
          weightedScoreSum = 0,
          totalWeightOfGradedItems = 0;
        items.forEach((item) => {
          if (item.completed_at) completed++;
          const itemWeight = weightsMap.get(item.content_type);
          const effectiveWeight =
            itemWeight === undefined || isNaN(itemWeight) ? 0.0 : itemWeight;
          if (
            APP_GRADABLE_CONTENT_TYPES.includes(item.content_type) &&
            item.grade_value !== null &&
            String(item.grade_value).trim() !== "" &&
            item.grade_max_value !== null &&
            String(item.grade_max_value).trim() !== "" &&
            effectiveWeight > 0
          ) {
            const gradeVal = parseFloat(item.grade_value),
              maxGradeVal = parseFloat(item.grade_max_value);
            if (!isNaN(gradeVal) && !isNaN(maxGradeVal) && maxGradeVal > 0) {
              weightedScoreSum += (gradeVal / maxGradeVal) * effectiveWeight;
              totalWeightOfGradedItems += effectiveWeight;
              gradableItemsCount++;
            }
          }
        });
        const avgWeightedGradePercent =
          totalWeightOfGradedItems > 0
            ? Math.round((weightedScoreSum / totalWeightOfGradedItems) * 100)
            : null;
        stats[subj.child_subject_id] = {
          total: items.length,
          completed,
          avgGradePercent: avgWeightedGradePercent,
          gradableItemsCount,
        };
      }
    });
    return stats;
  }, [selectedChild, lessonsBySubject, gradeWeights, childSubjects]);

  const filteredAndSortedLessonsBySubject = useMemo(() => {
    if (Object.keys(lessonsBySubject).length === 0) return {};
    const result = {};
    for (const childSubjectId in lessonsBySubject) {
      let subjectLessons = [...(lessonsBySubject[childSubjectId] || [])];
      if (filterStatus !== "all") {
        subjectLessons = subjectLessons.filter((lesson) => {
          if (filterStatus === "complete") return !!lesson.completed_at;
          if (filterStatus === "incomplete") return !lesson.completed_at;
          if (filterStatus === "overdue")
            return !lesson.completed_at && isDateOverdue(lesson.due_date);
          if (filterStatus === "dueSoon")
            return (
              !lesson.completed_at &&
              isDateDueSoon(lesson.due_date, 7) &&
              !isDateOverdue(lesson.due_date)
            );
          return true;
        });
      }
      if (filterContentType !== "all") {
        subjectLessons = subjectLessons.filter(
          (lesson) => lesson.content_type === filterContentType
        );
      }
      switch (sortBy) {
        case "dueDateAsc":
          subjectLessons.sort((a, b) =>
            a.due_date && b.due_date
              ? new Date(a.due_date + "T00:00:00Z") -
                new Date(b.due_date + "T00:00:00Z")
              : a.due_date
              ? -1
              : b.due_date
              ? 1
              : 0
          );
          break;
        case "dueDateDesc":
          subjectLessons.sort((a, b) =>
            a.due_date && b.due_date
              ? new Date(b.due_date + "T00:00:00Z") -
                new Date(a.due_date + "T00:00:00Z")
              : b.due_date
              ? -1
              : a.due_date
              ? 1
              : 0
          );
          break;
        case "createdAtAsc":
          subjectLessons.sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );
          break;
        case "titleAsc":
          subjectLessons.sort((a, b) =>
            (a.title || "").localeCompare(b.title || "")
          );
          break;
        case "titleDesc":
          subjectLessons.sort((a, b) =>
            (b.title || "").localeCompare(a.title || "")
          );
          break;
        case "createdAtDesc":
        default:
          subjectLessons.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
      }
      result[childSubjectId] = subjectLessons;
    }
    return result;
  }, [lessonsBySubject, filterStatus, filterContentType, sortBy]);

  const refreshChildSpecificData = useCallback(async () => { 
    if (!selectedChild || !selectedChild.id || !session) return;
    setLoadingChildData(true);
    
    try {
      const childSubjectsRes = await api.get(`/child-subjects/child/${selectedChild.id}`);
      const currentChildAssignedSubjects = childSubjectsRes.data || [];
      setChildSubjects(cs => ({ ...cs, [selectedChild.id]: currentChildAssignedSubjects }));
  
      let newMaterialsBySubject = {}, newGradeWeights = {}, newUnitsBySubject = {}, newLessonsByUnit = {};
      
      for (const subject of currentChildAssignedSubjects) {
        if (subject.child_subject_id) {
          try {
            const unitsRes = await api.get(`/units/subject/${subject.child_subject_id}`);
            const subjectUnits = unitsRes.data || [];
            newUnitsBySubject[subject.child_subject_id] = subjectUnits;
            
            for (const unit of subjectUnits) {
              try {
                const lessonsRes = await api.get(`/lesson-containers/unit/${unit.id}`);
                const unitLessons = lessonsRes.data || [];
                newLessonsByUnit[unit.id] = unitLessons;
                
                for (const lesson of unitLessons) {
                  try {
                    const materialsRes = await api.get(`/materials/lesson/${lesson.id}`);
                    const lessonMaterials = materialsRes.data || [];
                    
                    if (!newMaterialsBySubject[subject.child_subject_id]) {
                      newMaterialsBySubject[subject.child_subject_id] = [];
                    }
                    newMaterialsBySubject[subject.child_subject_id].push(...lessonMaterials);
                  } catch (materialsError) {
                    console.error(`Materials fetch failed for lesson ${lesson.title}:`, materialsError);
                  }
                }
              } catch (lessonsError) {
                console.error(`Lesson containers fetch failed for unit ${unit.name}:`, lessonsError);
                newLessonsByUnit[unit.id] = [];
              }
            }
            
            try {
              const weightsRes = await api.get(`/weights/${subject.child_subject_id}`);
              const fetchedWeightsMap = new Map((weightsRes.data || []).map(w => [w.content_type, parseFloat(w.weight)]));
              newGradeWeights[subject.child_subject_id] = APP_CONTENT_TYPES.map(ct => ({
                  content_type: ct,
                  weight: fetchedWeightsMap.get(ct) ?? (APP_GRADABLE_CONTENT_TYPES.includes(ct) ? 0.10 : 0.00)
              }));
            } catch (weightsError) {
              console.error(`Weights fetch failed for ${subject.name}:`, weightsError);
              newGradeWeights[subject.child_subject_id] = [...defaultWeightsForNewSubject];
            }
            
          } catch (err) {
            console.error(`Error fetching hierarchy for subject ${subject.name}:`, err);
            newMaterialsBySubject[subject.child_subject_id] = [];
            newGradeWeights[subject.child_subject_id] = [...defaultWeightsForNewSubject];
            newUnitsBySubject[subject.child_subject_id] = [];
          }
        } else {
          console.warn(`Subject missing child_subject_id:`, subject);
        }
      }
      
      setUnitsBySubject(newUnitsBySubject);
      setLessonsByUnit(newLessonsByUnit); 
      setLessonsBySubject(newMaterialsBySubject); 
      setGradeWeights(newGradeWeights);
      
    } catch (error) { 
      console.error("Error in refreshChildSpecificData:", error);
    } finally { 
      setLoadingChildData(false); 
    }
  }, [selectedChild, session]);


  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    setLoadingInitial(true);
    Promise.all([api.get("/children"), api.get("/subjects")])
      .then(([childrenRes, allSubjectsRes]) => {
        const currentChildren = childrenRes.data || [];
        setChildren(currentChildren);
        setSubjectsData(allSubjectsRes.data || []);
        if (currentChildren.length > 0) {
          if (
            !selectedChild ||
            !currentChildren.find((c) => c.id === selectedChild.id)
          ) {
            setSelectedChild(currentChildren[0]);
          }
        } else {
          setSelectedChild(null);
          setChildSubjects({});
          setLessonsBySubject({});
          setGradeWeights({});
          setUnitsBySubject({});
        }
      })
      .catch((error) =>
        console.error("Error loading initial page data:", error)
      )
      .finally(() => setLoadingInitial(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, router]);

  useEffect(() => {
    if (!session || !selectedChild || !selectedChild.id) {
      if (selectedChild === null) {
        setChildSubjects({});
        setLessonsBySubject({});
        setGradeWeights({});
        setUnitsBySubject({});
      }
      setLoadingChildData(false);
      return;
    }
    refreshChildSpecificData();
  }, [selectedChild, session, refreshChildSpecificData]);

  useEffect(() => {
    setSelectedLessonContainer("");
  }, [lessonJsonForApproval?.unit_id]);

  const handleAddChildSubmit = async (e) => {
    e.preventDefault();
    setLoadingInitial(true);
    try {
      const newChildData = {
        name: newChildNameState,
        grade: newChildGradeState,
      };
      const createdChildRes = await api.post("/children", newChildData);
      const createdChild = createdChildRes.data;
      setNewChildNameState("");
      setNewChildGradeState("");
      setShowAddChild(false);
      const childrenRes = await api.get("/children");
      const updatedChildren = childrenRes.data || [];
      setChildren(updatedChildren);
      setSelectedChild(
        createdChild || updatedChildren[updatedChildren.length - 1] || null
      );
    } catch (error) {
      alert(error.response?.data?.error || "Failed to add child.");
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleUpdateLessonJsonForApprovalField = (fieldName, value) => {
    setLessonJsonForApproval((prevJson) => {
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
    Object.keys(lessonsBySubject).forEach((subjId) => {
      const index = lessonsBySubject[subjId].findIndex(
        (l) => l.id === lessonId
      );
      if (index !== -1) {
        subjectIdToUpdate = subjId;
        lessonIndexToUpdate = index;
        originalLesson = { ...lessonsBySubject[subjId][index] };
      }
    });
    if (subjectIdToUpdate && lessonIndexToUpdate !== -1) {
      setLessonsBySubject((prevLBS) => {
        const newLBS = { ...prevLBS };
        newLBS[subjectIdToUpdate] = [...newLBS[subjectIdToUpdate]];
        newLBS[subjectIdToUpdate][lessonIndexToUpdate] = {
          ...originalLesson,
          completed_at: !currentCompletedStatus
            ? new Date().toISOString()
            : null,
        };
        return newLBS;
      });
    }
    try {
      const payload = grade !== null ? { grade } : {};
      const updatedLessonFromServer = await api.put(`/materials/${lessonId}/toggle-complete`, payload);

      setLessonsBySubject((prevLBS) => {
        const newLBS = { ...prevLBS };
        if (subjectIdToUpdate && newLBS[subjectIdToUpdate]) {
          const lessonIdx = newLBS[subjectIdToUpdate].findIndex(
            (l) => l.id === lessonId
          );
          if (lessonIdx !== -1) {
            newLBS[subjectIdToUpdate][lessonIdx] = updatedLessonFromServer.data;
          } else {
            refreshChildSpecificData();
          }
        } else {
          refreshChildSpecificData();
        }
        return newLBS;
      });
    } catch (error) {
      console.error("Failed to toggle lesson completion:", error);
      alert(
        error.response?.data?.error || "Could not update completion status."
      );
      if (subjectIdToUpdate && lessonIndexToUpdate !== -1 && originalLesson) {
        setLessonsBySubject((prevLBS) => {
          const newLBS = { ...prevLBS };
          newLBS[subjectIdToUpdate] = [...newLBS[subjectIdToUpdate]];
          newLBS[subjectIdToUpdate][lessonIndexToUpdate] = originalLesson;
          return newLBS;
        });
      }
    }
  };

  const handleAddLessonFormSubmit = async (e) => {
    e.preventDefault();
    if (
      !addLessonSubject ||
      !addLessonFile ||
      addLessonFile.length === 0 ||
      !addLessonUserContentType
    ) {
      alert(
        "Please select subject, at least one file, and an initial content type."
      );
      return;
    }
    setUploading(true);
    setLessonJsonForApproval(null);
    setLessonTitleForApproval("");
    setLessonContentTypeForApproval(APP_CONTENT_TYPES[0]);
    setLessonMaxPointsForApproval("");
    setLessonDueDateForApproval("");
    setLessonCompletedForApproval(false);
  
    const currentAssignedSubjects = childSubjects[selectedChild?.id] || [];
    const subjectInfo = currentAssignedSubjects.find(
      (s) => s.child_subject_id === addLessonSubject
    );
  
    if (!subjectInfo || !subjectInfo.child_subject_id) {
      alert("Selected subject is invalid.");
      setUploading(false);
      return;
    }
  
    const formData = new FormData();
    formData.append("child_subject_id", subjectInfo.child_subject_id);
    formData.append("user_content_type", addLessonUserContentType);
  
    if (addLessonFile instanceof FileList && addLessonFile.length > 0) {
      for (let i = 0; i < addLessonFile.length; i++) {
        formData.append("files", addLessonFile[i], addLessonFile[i].name);
      }
    } else {
      alert("File selection error.");
      setUploading(false);
      return;
    }
  
    try {
      const res = await api.post("/materials/upload", formData);
      const receivedLessonJson = res.data.lesson_json || {};
      setLessonJsonForApproval(receivedLessonJson);
      const firstFileName = addLessonFile[0]?.name?.split(".")[0];
      setLessonTitleForApproval(
        receivedLessonJson?.title || firstFileName || "Untitled Material"
      );
      const llmContentType = receivedLessonJson?.content_type_suggestion;
      const finalContentType =
        llmContentType && APP_CONTENT_TYPES.includes(llmContentType)
          ? llmContentType
          : addLessonUserContentType &&
            APP_CONTENT_TYPES.includes(addLessonUserContentType)
          ? addLessonUserContentType
          : APP_CONTENT_TYPES[0];
      setLessonContentTypeForApproval(finalContentType);
  
      if (
        receivedLessonJson?.total_possible_points_suggestion !== null &&
        receivedLessonJson?.total_possible_points_suggestion !== undefined
      ) {
        setLessonMaxPointsForApproval(
          String(receivedLessonJson.total_possible_points_suggestion)
        );
      } else {
        setLessonMaxPointsForApproval("");
      }
  
      setLessonDueDateForApproval("");
      setLessonCompletedForApproval(false);
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || error.message || "Upload failed.";
      alert(`Upload Error: ${errorMsg}`);
      console.error("Upload error:", error.response || error);
      setLessonJsonForApproval({ error: errorMsg, title: "Error" });
      setLessonTitleForApproval("Error");
      setLessonContentTypeForApproval(APP_CONTENT_TYPES[0]);
      setLessonMaxPointsForApproval("");
      setLessonDueDateForApproval("");
      setLessonCompletedForApproval(false);
    }
    setUploading(false);
  };

  const handleApproveNewLesson = async () => {
    setSavingLesson(true);
    const currentAssignedSubjects = childSubjects[selectedChild?.id] || [];
    const subjectInfo = currentAssignedSubjects.find(
      (s) => s.child_subject_id === addLessonSubject
    );
  
    if (!subjectInfo || !subjectInfo.child_subject_id) {
      alert("Selected subject invalid.");
      setSavingLesson(false);
      return;
    }
  
    if (
      !lessonJsonForApproval ||
      !lessonTitleForApproval ||
      !lessonContentTypeForApproval
    ) {
      alert("Missing data for approval.");
      setSavingLesson(false);
      return;
    }

    if (!selectedLessonContainer || selectedLessonContainer === '__create_new__') {
      alert("Please select or create a lesson container.");
      setSavingLesson(false);
      return;
    }
  
    const unitIdForPayload = lessonJsonForApproval.unit_id || null;
    const lessonJsonToSave = { ...lessonJsonForApproval };
    delete lessonJsonToSave.unit_id;
  
    const payload = {
      lesson_id: selectedLessonContainer, 
      child_subject_id: subjectInfo.child_subject_id,
      title: lessonTitleForApproval,
      content_type: lessonContentTypeForApproval,
      lesson_json: lessonJsonToSave,
      grade_max_value:
        APP_GRADABLE_CONTENT_TYPES.includes(lessonContentTypeForApproval) &&
        lessonMaxPointsForApproval.trim() !== ""
          ? lessonMaxPointsForApproval.trim()
          : null,
      due_date:
        lessonDueDateForApproval.trim() !== ""
          ? lessonDueDateForApproval
          : null,
      completed_at: lessonCompletedForApproval
        ? new Date().toISOString()
        : null,
      unit_id: unitIdForPayload,
    };
  
    try {
      await api.post("/materials/save", payload);
      await refreshChildSpecificData();
      setLessonJsonForApproval(null);
      setLessonTitleForApproval("");
      setLessonContentTypeForApproval(APP_CONTENT_TYPES[0]);
      setLessonMaxPointsForApproval("");
      setLessonDueDateForApproval("");
      setLessonCompletedForApproval(false);
      setAddLessonFile(null);
      setSelectedLessonContainer(""); 
  
      const fileInput = document.getElementById("lesson-file-input-main");
      if (fileInput) fileInput.value = "";
      setAddLessonSubject("");
      setAddLessonUserContentType(APP_CONTENT_TYPES[0]);
    } catch (error) {
      alert(error.response?.data?.error || "Lesson save failed.");
    }
    setSavingLesson(false);
  };

  const handleLessonContainerChange = (e) => {
    const value = e.target.value;
    setSelectedLessonContainer(value);
    
    if (value === '__create_new__') {
      setNewLessonContainerTitle('');
    }
  };

  const handleCreateNewLessonContainer = async (newTitleFromForm) => { 
    const unitId = lessonJsonForApproval?.unit_id; 
  
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
      
      setLessonsByUnit(prev => ({
        ...prev,
        [unitId]: updatedLessonContainersForUnit
      }));
      
      setSelectedLessonContainer(response.data.id); 
  
    } catch (error) {
      console.error('Failed to create lesson container:', error.response?.data || error.message); 
      alert(error.response?.data?.error || 'Failed to create lesson group. Please try again.');
    }
  };

  const handleOpenEditModal = (lesson) => {
    setEditingLesson(lesson);
    setEditForm({
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
      setEditForm((prev) => ({
        ...prev,
        completed_at: checked ? new Date().toISOString() : null,
      }));
    else setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveLessonEdit = async () => {
    if (!editingLesson) return;
    setIsSavingEdit(true);
    let lesson_json_parsed;
    try {
      lesson_json_parsed = JSON.parse(editForm.lesson_json_string);
    } catch (e) {
      alert("Invalid JSON in 'Extracted Data'.");
      setIsSavingEdit(false);
      return;
    }
    const payload = {
      title: editForm.title,
      content_type: editForm.content_type,
      lesson_json: lesson_json_parsed,
      grade_value:
        editForm.grade_value.trim() === "" ? null : editForm.grade_value,
      grade_max_value:
        editForm.grade_max_value.trim() === ""
          ? null
          : editForm.grade_max_value,
      grading_notes:
        editForm.grading_notes.trim() === "" ? null : editForm.grading_notes,
      completed_at: editForm.completed_at,
      due_date: editForm.due_date.trim() === "" ? null : editForm.due_date,
      unit_id: editForm.unit_id || null,
    };
    if (payload.lesson_json && "unit_id" in payload.lesson_json)
      delete payload.lesson_json.unit_id;
    try {
      await api.put(`/materials/${editingLesson.id}`, payload);
      await refreshChildSpecificData();
      setEditingLesson(null);
    } catch (error) {
      alert(error.response?.data?.error || "Failed to save changes.");
    }
    setIsSavingEdit(false);
  };

  const openManageUnitsModal = (subject) => {
    setManagingUnitsForSubject({
      id: subject.child_subject_id,
      name: subject.name,
    });
    setCurrentSubjectUnitsInModal(
      unitsBySubject[subject.child_subject_id] || []
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
        ...(unitsBySubject[managingUnitsForSubject.id] || []),
        newUnit,
      ].sort(
        (a, b) =>
          (a.sequence_order || 0) - (b.sequence_order || 0) ||
          a.name.localeCompare(b.name)
      );

      setUnitsBySubject((prev) => ({
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
        unitsBySubject[managingUnitsForSubject.id] || []
      )
        .map((u) => (u.id === editingUnit.id ? updatedUnit : u))
        .sort(
          (a, b) =>
            (a.sequence_order || 0) - (b.sequence_order || 0) ||
            a.name.localeCompare(b.name)
        );

      setUnitsBySubject((prev) => ({
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
        unitsBySubject[managingUnitsForSubject.id] || []
      ).filter((u) => u.id !== unitId);

      setUnitsBySubject((prev) => ({
        ...prev,
        [managingUnitsForSubject.id]: updatedUnitsList,
      }));
      setCurrentSubjectUnitsInModal(updatedUnitsList);

      if (editingUnit?.id === unitId) setEditingUnit(null);
      await refreshChildSpecificData();
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
      const updatedChildren = children.map((c) =>
        c.id === editingChildCredentials.id
          ? { ...c, child_username: updatedUsername }
          : c
      );
      setChildren(updatedChildren);
      if (selectedChild?.id === editingChildCredentials.id)
        setSelectedChild((prev) => ({
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
      const updatedChildren = children.map((c) =>
        c.id === editingChildCredentials.id
          ? { ...c, access_pin_hash: "set" }
          : c
      ); 
      setChildren(updatedChildren);
      if (selectedChild?.id === editingChildCredentials.id)
        setSelectedChild((prev) => ({ ...prev, access_pin_hash: "set" }));
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


  if (loadingInitial && session === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-main">
        <div className="text-xl text-text-secondary">Initializing Dashboard...</div>
      </div>
    );
  }
  if (!session) return null;

  const assignedSubjectsForCurrentChild =
    childSubjects[selectedChild?.id] || [];
    const currentUnitsForAddFormSubject = addLessonSubject && selectedChild && childSubjects[selectedChild.id]
    ? unitsBySubject[addLessonSubject] || [] 
    : [];

  const currentLessonContainersForUnit = useMemo(() => {
    const selectedUnitId = lessonJsonForApproval?.unit_id;
    if (!selectedUnitId) return [];
    return lessonsByUnit[selectedUnitId] || [];
  }, [lessonJsonForApproval?.unit_id, lessonsByUnit]);

  return (
    <div className="flex h-screen bg-background-main overflow-hidden">
      <div className="w-64 flex-shrink-0 bg-background-card border-r border-border-subtle shadow-lg">
        <StudentSidebar
          childrenList={children}
          selectedChild={selectedChild}
          onSelectChild={setSelectedChild}
          showAddChild={showAddChild}
          onToggleShowAddChild={setShowAddChild}
          newChildName={newChildNameState}
          onNewChildNameChange={(e) => setNewChildNameState(e.target.value)}
          newChildGrade={newChildGradeState}
          onNewChildGradeChange={(e) => setNewChildGradeState(e.target.value)}
          onAddChildSubmit={handleAddChildSubmit}
          onOpenChildLoginSettings={handleOpenChildLoginSettingsModal}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto p-6 sm:p-8 lg:p-10">
        {loadingInitial && !selectedChild && children.length > 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xl text-text-secondary">Loading Student Data...</div>
          </div>
        )}
        {!selectedChild && !loadingInitial && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-secondary italic text-xl text-center">
              {children.length > 0
                ? "Select a student to get started."
                : "No students found. Please add a student to begin."}
            </div>
          </div>
        )}

        {selectedChild && (
          <>
            <StudentHeader
              selectedChild={selectedChild}
              dashboardStats={dashboardStats}
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
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
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
                    value={filterContentType}
                    onChange={(e) => setFilterContentType(e.target.value)}
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
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
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
            {loadingChildData ? (
              <div className="text-center py-10 text-text-secondary">
                Loading {selectedChild.name}'s curriculum...
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
                    No subjects assigned to {selectedChild.name}.
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
                          filteredAndSortedLessonsBySubject[
                            subject.child_subject_id
                          ] || []
                        }
                        units={unitsBySubject[subject.child_subject_id] || []}
                        lessonsByUnit={lessonsByUnit}
                        subjectStats={
                          subject.child_subject_id &&
                          subjectStats[subject.child_subject_id]
                            ? subjectStats[subject.child_subject_id]
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
          selectedChild && !loadingChildData
            ? "opacity-100"
            : "opacity-50 pointer-events-none"
        }`}
      >
        <div className="sticky top-0 bg-background-card z-10 pt-0 pb-4 -mx-6 px-6 border-b border-border-subtle mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Actions</h2>
        </div>
        {selectedChild && !loadingChildData ? (
          <AddMaterialForm
            childSubjectsForSelectedChild={assignedSubjectsForCurrentChild}
            onFormSubmit={handleAddLessonFormSubmit}
            onApprove={handleApproveNewLesson}
            uploading={uploading}
            savingLesson={savingLesson}
            lessonJsonForApproval={lessonJsonForApproval}
            onUpdateLessonJsonField={handleUpdateLessonJsonForApprovalField}
            lessonTitleForApproval={lessonTitleForApproval}
            onLessonTitleForApprovalChange={(e) =>
              setLessonTitleForApproval(e.target.value)
            }
            lessonContentTypeForApproval={lessonContentTypeForApproval}
            onLessonContentTypeForApprovalChange={(e) =>
              setLessonContentTypeForApproval(e.target.value)
            }
            lessonMaxPointsForApproval={lessonMaxPointsForApproval}
            onLessonMaxPointsForApprovalChange={(e) =>
              setLessonMaxPointsForApproval(e.target.value)
            }
            lessonDueDateForApproval={lessonDueDateForApproval}
            onLessonDueDateForApprovalChange={(e) =>
              setLessonDueDateForApproval(e.target.value)
            }
            lessonCompletedForApproval={lessonCompletedForApproval}
            onLessonCompletedForApprovalChange={(e) =>
              setLessonCompletedForApproval(e.target.checked)
            }
            currentAddLessonSubject={addLessonSubject}
            onAddLessonSubjectChange={(e) =>
              setAddLessonSubject(e.target.value)
            }
            currentAddLessonUserContentType={addLessonUserContentType}
            onAddLessonUserContentTypeChange={(e) =>
              setAddLessonUserContentType(e.target.value)
            }
            onAddLessonFileChange={(e) => setAddLessonFile(e.target.files)}
            currentAddLessonFile={addLessonFile}
            appContentTypes={APP_CONTENT_TYPES}
            appGradableContentTypes={APP_GRADABLE_CONTENT_TYPES}
            unitsForSelectedSubject={currentUnitsForAddFormSubject}
            lessonContainersForSelectedUnit={currentLessonContainersForUnit}
            selectedLessonContainer={selectedLessonContainer}
            onLessonContainerChange={handleLessonContainerChange}
            onCreateNewLessonContainer={handleCreateNewLessonContainer}
          />
        ) : (
          <p className="text-sm text-text-tertiary italic text-center">
            {selectedChild && loadingChildData
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

      {editingLesson && (
        <EditMaterialModal
          editingLesson={editingLesson}
          editForm={editForm}
          onFormChange={handleEditModalFormChange}
          onSave={handleSaveLessonEdit}
          onClose={() => setEditingLesson(null)}
          isSaving={isSavingEdit}
          unitsForSubject={
            editingLesson && unitsBySubject[editingLesson.child_subject_id]
              ? unitsBySubject[editingLesson.child_subject_id]
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
    </div>
  );
}