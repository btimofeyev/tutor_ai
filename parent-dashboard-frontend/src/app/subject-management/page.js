// app/subjects/page.js
'use client';

import { useEffect, useState } from 'react';
import api from '../../utils/api'; // Adjust path if necessary
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, MinusCircleIcon, DocumentPlusIcon } from '@heroicons/react/24/outline'; // Added DocumentPlusIcon

export default function SubjectsPage() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedChildName, setSelectedChildName] = useState('');
  const [allSubjects, setAllSubjects] = useState([]);
  const [assignedChildSubjects, setAssignedChildSubjects] = useState([]);
  
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingAllSubjects, setLoadingAllSubjects] = useState(true); // Renamed for clarity
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // State for adding a new subject
  const [showAddSubjectForm, setShowAddSubjectForm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [creatingSubject, setCreatingSubject] = useState(false);

  const fetchAllSubjects = () => {
    setLoadingAllSubjects(true);
    api.get('/subjects')
      .then(res => setAllSubjects(res.data || []))
      .catch(err => console.error("Failed to fetch all subjects", err))
      .finally(() => setLoadingAllSubjects(false));
  };

  useEffect(() => {
    setLoadingChildren(true);
    api.get('/children')
      .then(res => setChildren(res.data || []))
      .catch(err => console.error("Failed to fetch children", err))
      .finally(() => setLoadingChildren(false));
    
    fetchAllSubjects(); // Initial fetch
  }, []);

  useEffect(() => {
    if (selectedChild) {
      setLoadingAssigned(true);
      const child = children.find(c => c.id === selectedChild);
      setSelectedChildName(child ? child.name : '');
      api.get(`/subjects/child/${selectedChild}`)
        .then(res => setAssignedChildSubjects(res.data || []))
        .catch(err => {
            console.error("Failed to fetch assigned subjects", err);
            setAssignedChildSubjects([]);
        })
        .finally(() => setLoadingAssigned(false));
    } else {
      setAssignedChildSubjects([]);
      setSelectedChildName('');
    }
  }, [selectedChild, children]);

  const handleAssign = async (subjectId) => { /* ... (Unchanged) ... */ 
    if (!selectedChild) return;
    setProcessingAction(true);
    try {
      await api.post('/subjects/assign', { child_id: selectedChild, subject_id: subjectId });
      const res = await api.get(`/subjects/child/${selectedChild}`);
      setAssignedChildSubjects(res.data || []);
    } catch (error) {
      console.error("Failed to assign subject:", error);
      alert(error.response?.data?.error || "Could not assign subject.");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleUnassign = async (subjectId) => { /* ... (Unchanged, ensure API endpoint is correct) ... */ 
    if (!selectedChild) return;
    if (!confirm("Are you sure you want to unassign this subject?")) return;
    setProcessingAction(true);
    try {
      // IMPORTANT: Ensure this matches your backend route for unassigning
      await api.delete('/subjects/unassign', { data: { child_id: selectedChild, subject_id: subjectId } }); 
      const res = await api.get(`/subjects/child/${selectedChild}`);
      setAssignedChildSubjects(res.data || []);
    } catch (error) {
      console.error("Failed to unassign subject:", error);
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
      console.error("Failed to create subject:", error);
      alert(error.response?.data?.error || "Could not create subject.");
    } finally {
      setCreatingSubject(false);
    }
  };
  
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
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Manage Subjects</h1>
          <Link href="/dashboard" legacyBehavior>
            <a className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium">
              <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
              Back to Dashboard
            </a>
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
                <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2"> {/* Added max-h and overflow */}
                  {sortedAssignedSubjects.map(subject => (
                    <li key={subject.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
                      <span className="text-sm font-medium text-blue-800">{subject.name}</span>
                      <button onClick={() => handleUnassign(subject.id)} disabled={processingAction}
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
                    className="w-full flex justify-center items-center text-sm px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md font-medium disabled:opacity-70 transition-colors">
                    {creatingSubject ? 'Creating...' : 'Create Subject'}
                  </button>
                </form>
              )}

              {loadingAllSubjects ? ( <p className="text-gray-500">Loading...</p> ) : 
               availableSubjects.length > 0 ? (
                <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2"> {/* Added max-h and overflow */}
                  {availableSubjects.map(subject => (
                    <li key={subject.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                      <span className="text-sm font-medium text-gray-800">{subject.name}</span>
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
    </div>
  );
}