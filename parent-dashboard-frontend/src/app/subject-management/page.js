// app/subject-management/page.js
'use client';

import { useEffect, useState } from 'react';
import api from '../../utils/api'; // Adjust path if necessary
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, MinusCircleIcon, DocumentPlusIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import { signalDashboardRefresh } from '../../utils/dashboardRefresh';

export default function SubjectsPage() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedChildName, setSelectedChildName] = useState('');
  const [allSubjects, setAllSubjects] = useState([]);
  const [assignedChildSubjects, setAssignedChildSubjects] = useState([]);

  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingAllSubjects, setLoadingAllSubjects] = useState(true);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // State for adding a new subject
  const [showAddSubjectForm, setShowAddSubjectForm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [creatingSubject, setCreatingSubject] = useState(false);

  // State for deletion modal
  const [deletingSubject, setDeletingSubject] = useState(null);
  const [subjectStats, setSubjectStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [deleteMode, setDeleteMode] = useState('check'); // 'check' or 'confirm'

  const fetchAllSubjects = () => {
    setLoadingAllSubjects(true);
    api.get('/subjects')
      .then(res => setAllSubjects(res.data || []))
      .catch(err => {})
      .finally(() => setLoadingAllSubjects(false));
  };

  useEffect(() => {
    setLoadingChildren(true);
    api.get('/children')
      .then(res => setChildren(res.data || []))
      .catch(err => {})
      .finally(() => setLoadingChildren(false));

    fetchAllSubjects(); // Initial fetch
  }, []);

  useEffect(() => {
    if (selectedChild) {
      setLoadingAssigned(true);
      const child = children.find(c => c.id === selectedChild);
      setSelectedChildName(child ? child.name : '');

      // FIXED: Use new child-subjects endpoint
      api.get(`/child-subjects/child/${selectedChild}`)
        .then(res => setAssignedChildSubjects(res.data || []))
        .catch(err => {
            setAssignedChildSubjects([]);
        })
        .finally(() => setLoadingAssigned(false));
    } else {
      setAssignedChildSubjects([]);
      setSelectedChildName('');
    }
  }, [selectedChild, children]);

  // FIXED: Use new child-subjects assign endpoint
  const handleAssign = async (subjectId) => {
    if (!selectedChild) return;
    setProcessingAction(true);
    try {
      await api.post('/child-subjects/assign', {
        child_id: selectedChild,
        subject_id: subjectId
      });

      // Refresh assigned subjects list
      const res = await api.get(`/child-subjects/child/${selectedChild}`);
      setAssignedChildSubjects(res.data || []);

      // Signal dashboard to refresh when user returns
      signalDashboardRefresh();
    } catch (error) {
      alert(error.response?.data?.error || "Could not assign subject.");
    } finally {
      setProcessingAction(false);
    }
  };

  const checkSubjectStats = async (childSubjectId) => {
    setLoadingStats(true);
    try {
      const [unitsRes, allMaterialsRes] = await Promise.all([
        api.get(`/units/subject/${childSubjectId}`),
        api.get(`/materials/subject/${childSubjectId}`)
      ]);

      // Count lesson containers and materials more accurately
      let lessonContainerCount = 0;
      let materialsByLessonCount = 0;
      const units = unitsRes.data || [];

      for (const unit of units) {
        try {
          const lessonsRes = await api.get(`/lesson-containers/unit/${unit.id}`);
          const lessonContainers = lessonsRes.data || [];
          lessonContainerCount += lessonContainers.length;

          // Count materials in each lesson container
          for (const lessonContainer of lessonContainers) {
            try {
              const materialsRes = await api.get(`/materials/lesson/${lessonContainer.id}`);
              materialsByLessonCount += (materialsRes.data || []).length;
            } catch (error) {
              console.error('Error fetching materials for lesson:', lessonContainer.id, error);
            }
          }
        } catch (error) {
          console.error('Error fetching lesson containers for unit:', unit.id, error);
        }
      }

      // Use the total from the direct subject query as it includes all materials
      const totalMaterialCount = (allMaterialsRes.data || []).length;

      return {
        units: units,
        materials: allMaterialsRes.data || [],
        unitCount: units.length,
        materialCount: totalMaterialCount,
        lessonContainerCount: lessonContainerCount
      };
    } catch (error) {
      console.error('Error fetching subject stats:', error);
      return { units: [], materials: [], unitCount: 0, materialCount: 0, lessonContainerCount: 0 };
    } finally {
      setLoadingStats(false);
    }
  };

  const handleUnassign = async (subject) => {
    if (!selectedChild) return;

    // First check if subject has units/materials
    const stats = await checkSubjectStats(subject.child_subject_id);
    setSubjectStats(stats);
    setDeletingSubject(subject);
    setDeleteMode('check');
  };

  const handleConfirmDelete = async () => {
    if (!deletingSubject || !selectedChild) return;

    setProcessingAction(true);
    try {
      // Only allow unassigning if the subject is empty
      await api.delete('/child-subjects/unassign', {
        data: {
          child_id: selectedChild,
          subject_id: deletingSubject.id
        }
      });

      // Refresh assigned subjects list
      const res = await api.get(`/child-subjects/child/${selectedChild}`);
      setAssignedChildSubjects(res.data || []);

      // Signal dashboard to refresh when user returns
      signalDashboardRefresh();

      // Close modal
      setDeletingSubject(null);
      setSubjectStats(null);
    } catch (error) {
      alert(error.response?.data?.error || "Could not unassign subject.");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      alert("Please enter a subject name.");
      return;
    }
    // Check if subject already exists (case-insensitive)
    if (allSubjects.some(s => s.name.toLowerCase() === newSubjectName.trim().toLowerCase())) {
        alert(`Subject "${newSubjectName.trim()}" already exists.`);
        setNewSubjectName(''); // Clear input
        return;
    }

    setCreatingSubject(true);
    try {
      await api.post('/subjects', { name: newSubjectName.trim() }); // Calls addSubject controller
      setNewSubjectName('');
      setShowAddSubjectForm(false);
      fetchAllSubjects(); // Re-fetch all subjects to include the new one
      alert(`Subject "${newSubjectName.trim()}" created successfully!`);
    } catch (error) {
      alert(error.response?.data?.error || "Could not create subject.");
    } finally {
      setCreatingSubject(false);
    }
  };

  // FIXED: Compare using the original subject id, not the child_subject assignment id
  const availableSubjects = allSubjects.filter(
    subject => !assignedChildSubjects.some(assigned => assigned.id === subject.id)
  ).sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

  const sortedAssignedSubjects = [...assignedChildSubjects].sort((a,b) => a.name.localeCompare(b.name));

  if (loadingChildren) { // Only initial full page load for children
    return <div className="flex items-center justify-center min-h-screen bg-gray-100"><p className="text-lg text-gray-500">Loading page data...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Subject Management" }
          ]}
          className="mb-6"
        />

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Manage Subjects</h1>
          <Link href="/dashboard" className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium">
            <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white shadow-xl rounded-lg p-6 mb-8">
          <label htmlFor="child-select" className="block text-sm font-medium text-gray-700 mb-1">Select Student:</label>
          <select id="child-select" value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
            <option value="">-- Select a Student --</option>
            {children.map(child => ( <option key={child.id} value={child.id}>{child.name} (Grade: {child.grade || 'N/A'})</option> ))}
          </select>
        </div>

        {selectedChild && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white shadow-xl rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">
                Assigned Subjects for <span className="text-blue-600">{selectedChildName}</span>
              </h2>
              {loadingAssigned ? ( <p className="text-gray-500">Loading...</p> ) :
               sortedAssignedSubjects.length > 0 ? (
                <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {sortedAssignedSubjects.map(subject => (
                    <li key={subject.child_subject_id} className="flex items-center justify-between p-3 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-blue-800">{subject.name}</span>
                        {subject.custom_name && subject.custom_name !== subject.original_name && (
                          <span className="text-xs text-blue-600 italic">Custom name for: {subject.original_name}</span>
                        )}
                      </div>
                      <button onClick={() => handleUnassign(subject)} disabled={processingAction}
                        className="flex items-center text-xs text-red-600 hover:text-red-800 font-medium p-1.5 rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors" title="Unassign subject">
                        <MinusCircleIcon className="h-4 w-4 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Unassign</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : ( <p className="text-sm text-gray-500 italic">No subjects assigned yet.</p> )}
            </div>

            <div className="bg-white shadow-xl rounded-lg p-6">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-xl font-semibold text-gray-700">Available Subjects</h2>
                <button
                    onClick={() => setShowAddSubjectForm(!showAddSubjectForm)}
                    className="flex items-center text-xs text-green-600 hover:text-green-800 font-medium p-1.5 rounded-md hover:bg-green-50 disabled:opacity-50 transition-colors"
                    title="Add a new subject to the system"
                >
                    <DocumentPlusIcon className="h-4 w-4 mr-1 sm:mr-1.5"/>
                    <span className="hidden sm:inline">{showAddSubjectForm ? 'Cancel' : 'New Subject'}</span>
                </button>
              </div>

              {showAddSubjectForm && (
                <form onSubmit={handleCreateSubject} className="mb-6 p-4 bg-green-50 rounded-md space-y-3">
                  <div>
                    <label htmlFor="new-subject-name" className="block text-sm font-medium text-green-800">New Subject Name:</label>
                    <input
                      type="text"
                      id="new-subject-name"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="mt-1 block w-full px-3 py-1.5 text-sm border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., Spanish, Literature"
                      required
                    />
                  </div>
                  <button type="submit" disabled={creatingSubject}
                    className="w-full flex justify-center items-center text-sm px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md font-medium disabled:opacity-70 transition-colors border border-blue-600 shadow-sm"
                    style={{ backgroundColor: '#2563eb', color: 'white', borderColor: '#2563eb' }}>
                    {creatingSubject ? 'Creating...' : 'Create Subject'}
                  </button>
                </form>
              )}

              {loadingAllSubjects ? ( <p className="text-gray-500">Loading...</p> ) :
               availableSubjects.length > 0 ? (
                <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {availableSubjects.map(subject => (
                    <li key={subject.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-800">{subject.name}</span>
                        {subject.is_predefined && (
                          <span className="text-xs text-gray-500">Pre-defined subject</span>
                        )}
                      </div>
                      <button onClick={() => handleAssign(subject.id)} disabled={processingAction}
                        className="flex items-center text-xs text-green-600 hover:text-green-800 font-medium p-1.5 rounded-md hover:bg-green-100 disabled:opacity-50 transition-colors" title="Assign subject">
                        <PlusIcon className="h-4 w-4 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Assign</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : ( <p className="text-sm text-gray-500 italic">All subjects are assigned or no custom subjects added yet.</p> )}
            </div>
          </div>
        )}
        {!selectedChild && !loadingChildren && (
            <div className="text-center py-10 bg-white shadow-xl rounded-lg mt-8">
                <p className="text-gray-500">Please select a student above to manage their subjects.</p>
            </div>
        )}
      </div>

      {/* Delete Subject Modal */}
      {deletingSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl">
            {loadingStats ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Checking subject data...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center mb-4">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Unassign {deletingSubject.name}?
                  </h3>
                </div>

                {subjectStats && (subjectStats.unitCount > 0 || subjectStats.materialCount > 0) ? (
                  <>
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 mb-2">
                        This subject contains:
                      </p>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {subjectStats.unitCount > 0 && (
                          <li>• {subjectStats.unitCount} unit{subjectStats.unitCount !== 1 ? 's' : ''}</li>
                        )}
                        {subjectStats.lessonContainerCount > 0 && (
                          <li>• {subjectStats.lessonContainerCount} lesson group{subjectStats.lessonContainerCount !== 1 ? 's' : ''}</li>
                        )}
                        {subjectStats.materialCount > 0 && (
                          <li>• {subjectStats.materialCount} material{subjectStats.materialCount !== 1 ? 's' : ''}</li>
                        )}
                      </ul>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">
                      To unassign this subject, you need to first delete all its content from the dashboard.
                    </p>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800 font-semibold mb-2">
                        How to delete content:
                      </p>
                      <div className="text-sm text-blue-700 space-y-2">
                        <div>
                          <p className="font-medium">To delete units:</p>
                          <p className="ml-2">• Go to Dashboard → Find this subject → Click &quot;Units&quot; button → Use trash icon to delete units</p>
                        </div>
                        <div>
                          <p className="font-medium">To delete materials:</p>
                          <p className="ml-2">• Go to Dashboard → Find this subject → Click trash icon next to each material</p>
                        </div>
                        <div>
                          <p className="font-medium">Then:</p>
                          <p className="ml-2">• Return here to unassign the empty subject</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <Link
                        href="/dashboard"
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm text-center"
                      >
                        Go to Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          setDeletingSubject(null);
                          setSubjectStats(null);
                        }}
                        className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      This subject has no units or materials. You can safely unassign it.
                    </p>

                    <div className="flex space-x-3">
                      <button
                        onClick={handleConfirmDelete}
                        disabled={processingAction}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm disabled:opacity-50"
                      >
                        {processingAction ? 'Unassigning...' : 'Unassign Subject'}
                      </button>
                      <button
                        onClick={() => {
                          setDeletingSubject(null);
                          setSubjectStats(null);
                        }}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
