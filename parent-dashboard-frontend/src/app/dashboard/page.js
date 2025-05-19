'use client';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '../../utils/api';

export default function DashboardPage() {
  const session = useSession();
  const router = useRouter();

  // --- State ---
  const [children, setChildren] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [childSubjects, setChildSubjects] = useState({});
  const [selectedChild, setSelectedChild] = useState(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [lessonsBySubject, setLessonsBySubject] = useState({});
  const [addLessonSubject, setAddLessonSubject] = useState('');
  const [addLessonFile, setAddLessonFile] = useState(null);
  const [lessonJson, setLessonJson] = useState(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [loading, setLoading] = useState(true);
  // New: Lesson details modal
  const [openLesson, setOpenLesson] = useState(null);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) router.replace('/login');
  }, [session, router]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    Promise.all([
      api.get('/children'),
      api.get('/subjects')
    ])
      .then(([childrenRes, subjectsRes]) => {
        setChildren(childrenRes.data || []);
        setSubjects(subjectsRes.data || []);
        if ((childrenRes.data || []).length && !selectedChild) {
          setSelectedChild(childrenRes.data[0]);
        }
      })
      .catch(error => {
        alert(error.response?.data?.error || "Failed to load children or subjects.");
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!session || !selectedChild) return;
    const loadSubjectsAndLessons = async () => {
      try {
        const res = await api.get(`/subjects/child/${selectedChild.id}`);
        setChildSubjects(cs => ({ ...cs, [selectedChild.id]: res.data || [] }));

        let lessonsObj = {};
        for (const subject of res.data || []) {
          if (!subject.child_subject_id) {
            console.warn(`Subject "${subject.name}" for child "${selectedChild.name}" is missing child_subject_id. Skipping lesson load for this subject.`);
            continue;
          }
          const res2 = await api.get(`/lessons/${subject.child_subject_id}`);
          lessonsObj[subject.child_subject_id] = res2.data || [];
        }
        setLessonsBySubject(lessonsObj);
      } catch (error) {
        alert(error.response?.data?.error || "Failed to load subjects or lessons.");
      }
    };
    loadSubjectsAndLessons();
  }, [selectedChild, session]);

  const handleAddChild = async e => {
    e.preventDefault();
    try {
      await api.post('/children', { name, grade });
      setName('');
      setGrade('');
      setShowAddChild(false);
      const res = await api.get('/children');
      setChildren(res.data || []);
      setSelectedChild(res.data[res.data.length - 1]);
    } catch (error) {
      alert(error.response?.data?.error || "Failed to add child.");
    }
  };

  const handleAddLesson = async e => {
    e.preventDefault();
    setUploading(true);
    setLessonJson(null);

    const subject = (childSubjects[selectedChild.id] || []).find(
      s => String(s.id) === addLessonSubject
    );

    if (!subject || !subject.child_subject_id) {
      setUploading(false);
      alert("Pick a subject (with valid assignment) first!");
      return;
    }
    const formData = new FormData();
    formData.append('file', addLessonFile);
    formData.append('child_subject_id', subject.child_subject_id);
    try {
      const res = await api.post('/lessons/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setLessonJson(res.data.lesson_json);
      setLessonTitle(res.data.lesson_json?.title || '');
    } catch (error) {
      alert(error.response?.data?.error || "Upload failed.");
    }
    setUploading(false);
  };

  const handleApproveLesson = async () => {
    setSavingLesson(true);
    const subject = (childSubjects[selectedChild.id] || []).find(
      s => String(s.id) === addLessonSubject
    );
    if (!subject || !subject.child_subject_id) {
      setSavingLesson(false);
      alert("Pick a subject (with valid assignment) first!");
      return;
    }
    try {
      await api.post('/lessons/save', {
        child_subject_id: subject.child_subject_id,
        title: lessonTitle,
        lesson_json: lessonJson
      });
      const res2 = await api.get(`/lessons/${subject.child_subject_id}`);
      setLessonsBySubject(lb => ({
        ...lb,
        [subject.child_subject_id]: res2.data || []
      }));
      setLessonJson(null);
      setLessonTitle('');
      setAddLessonFile(null);
    } catch (error) {
      alert(error.response?.data?.error || "Lesson save failed.");
    }
    setSavingLesson(false);
  };

  if (loading || session === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#e9ecf0]">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-100 shadow-lg flex flex-col">
        <h2 className="text-xl font-bold px-8 pt-10 pb-4">Students</h2>
        <div className="flex-1 overflow-y-auto px-4">
          {children.map(child => (
            <button
              key={child.id}
              className={`w-full text-left px-4 py-3 mb-2 rounded-2xl transition
                ${selectedChild?.id === child.id
                  ? 'bg-black text-white shadow-lg'
                  : 'bg-gray-50 text-gray-900 hover:bg-gray-100'}`}
              onClick={() => setSelectedChild(child)}
            >
              <div className="font-medium">{child.name}</div>
              <div className="text-xs text-gray-500">Grade {child.grade || <span className="italic text-gray-300">N/A</span>}</div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-100">
          {!showAddChild ? (
            <button
              onClick={() => setShowAddChild(true)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700"
            >+ Add Student</button>
          ) : (
            <form onSubmit={handleAddChild} className="flex flex-col gap-2">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="border rounded px-3 py-1" required />
              <input value={grade} onChange={e => setGrade(e.target.value)} placeholder="Grade" className="border rounded px-3 py-1" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-black text-white rounded-xl py-1">Save</button>
                <button type="button" className="flex-1 bg-gray-100 rounded-xl py-1" onClick={() => setShowAddChild(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </aside>

      {/* MAIN PANEL */}
      <main className="flex-1 p-12 flex flex-col items-center">
        {!selectedChild ? (
          <div className="text-gray-400 italic text-xl mt-20">Select a student to get started.</div>
        ) : (
          <div className="w-full max-w-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-1">{selectedChild.name}</h1>
                <div className="text-gray-500 mb-2">Grade {selectedChild.grade || <span className="italic text-gray-300">N/A</span>}</div>
              </div>
              <div className="flex gap-6">
                <div className="bg-white/80 rounded-xl px-4 py-3 shadow text-center">
                  <div className="text-xs uppercase tracking-wide text-gray-400">Subjects</div>
                  <div className="font-bold text-xl">{(childSubjects[selectedChild.id] || []).length}</div>
                </div>
              </div>
            </div>
            {/* SUBJECTS */}
            <div className="mb-10">
              <h2 className="text-lg font-semibold mb-2">Subjects & Recent Lessons</h2>
              {(childSubjects[selectedChild.id] || []).length === 0 ? (
                <div className="italic text-gray-400 p-4">No subjects assigned yet.</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {(childSubjects[selectedChild.id] || []).map(subject => (
                    !subject.child_subject_id ? (
                      <div key={subject.id} className="bg-yellow-100 rounded-xl p-4 shadow">
                        <div className="font-semibold mb-2">{subject.name}</div>
                        <div className="text-sm text-yellow-800">
                          <b>Warning:</b> This subject assignment is missing an internal mapping.
                        </div>
                      </div>
                    ) : (
                      <div key={subject.child_subject_id} className="bg-white rounded-xl p-4 shadow">
                        <div className="font-semibold mb-2">{subject.name}</div>
                        <div className="text-sm text-gray-500 mb-2">
                          {lessonsBySubject[subject.child_subject_id]?.length
                            ? `${lessonsBySubject[subject.child_subject_id].length} lesson(s)`
                            : "No lessons yet"}
                        </div>
                        <ul className="text-xs text-gray-700 space-y-1 mb-2">
                          {(lessonsBySubject[subject.child_subject_id] || []).slice(0, 2).map(lesson => (
                            <li
                              key={lesson.id}
                              className="hover:bg-gray-100 rounded px-2 py-1 cursor-pointer"
                              onClick={() => setOpenLesson(lesson)}
                              title="View lesson details"
                            >
                              <b>{lesson.title}</b> <span className="text-gray-400">{new Date(lesson.created_at).toLocaleDateString()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* ADD LESSON FORM */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 mb-6">
              <h2 className="text-lg font-bold mb-4">Add Lesson</h2>
              <form onSubmit={handleAddLesson} className="flex flex-col gap-3 sm:flex-row items-center">
                <select
                  value={addLessonSubject}
                  onChange={e => setAddLessonSubject(e.target.value)}
                  className="border rounded px-3 py-2"
                  required
                >
                  <option value="">Pick a subject…</option>
                  {(childSubjects[selectedChild.id] || []).map(subject => (
                    <option key={subject.id} value={String(subject.id)}>{subject.name}</option>
                  ))}
                </select>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={e => setAddLessonFile(e.target.files[0])}
                  required
                  className="block"
                />
                <button
                  type="submit"
                  disabled={uploading || !addLessonSubject || !addLessonFile}
                  className="px-5 py-2 rounded-xl bg-black text-white font-medium hover:bg-gray-900 transition"
                >
                  {uploading ? 'Analyzing...' : 'Upload & Analyze'}
                </button>
              </form>
              {/* AI EXTRACTED LESSON REVIEW/APPROVAL */}
              {lessonJson && (
                <div className="mt-6 border-t pt-6">
                  <label className="block mb-1 font-semibold">Lesson Title</label>
                  <input
                    value={lessonTitle}
                    onChange={e => setLessonTitle(e.target.value)}
                    className="border rounded w-full px-3 py-2 mb-2"
                  />
                  <label className="block mb-1 font-semibold">Lesson Data (edit as needed)</label>
                  <textarea
                    value={JSON.stringify(lessonJson, null, 2)}
                    onChange={e => setLessonJson(JSON.parse(e.target.value))}
                    rows={10}
                    className="border rounded w-full px-3 py-2 font-mono"
                  />
                  <button
                    onClick={handleApproveLesson}
                    className="mt-3 px-5 py-2 rounded-xl bg-black text-white font-medium hover:bg-gray-900 transition"
                    disabled={savingLesson}
                  >
                    {savingLesson ? 'Saving...' : 'Approve & Save'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <a href="/logout" className="block text-center text-sm mt-10 text-red-500 hover:text-red-600">Log Out</a>
      </main>

      {/* LESSON DETAILS MODAL */}
      {openLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl border p-8 w-full max-w-lg relative animate-fade-in">
            <button
              className="absolute top-3 right-4 text-gray-400 hover:text-black text-2xl"
              onClick={() => setOpenLesson(null)}
              aria-label="Close"
            >&times;</button>
            <h2 className="text-2xl font-bold mb-3">{openLesson.title || 'Untitled Lesson'}</h2>
            <div className="mb-2 text-sm text-gray-500">Saved: {new Date(openLesson.created_at).toLocaleString()}</div>
            {openLesson.lesson_json && (
              <>
                {openLesson.lesson_json.objectives && (
                  <div className="mb-4">
                    <div className="font-semibold text-gray-700 mb-1">Objectives:</div>
                    <ul className="list-disc pl-5 text-sm">
                      {openLesson.lesson_json.objectives.map((obj, i) =>
                        <li key={i}>{obj}</li>
                      )}
                    </ul>
                  </div>
                )}
                {openLesson.lesson_json.main_content && (
                  <div className="mb-4">
                    <div className="font-semibold text-gray-700 mb-1">Main Content:</div>
                    <div className="bg-gray-50 rounded p-3 text-sm whitespace-pre-wrap">{openLesson.lesson_json.main_content}</div>
                  </div>
                )}
                {openLesson.lesson_json.assignments && openLesson.lesson_json.assignments.length > 0 && (
                  <div className="mb-4">
                    <div className="font-semibold text-gray-700 mb-1">Assignments:</div>
                    <ul className="list-decimal pl-5 text-sm">
                      {openLesson.lesson_json.assignments.map((a, i) =>
                        <li key={i}>{a}</li>
                      )}
                    </ul>
                  </div>
                )}
              </>
            )}
            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                className="bg-gray-100 hover:bg-gray-200 rounded px-4 py-2 text-gray-700"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(openLesson, null, 2));
                  alert('Lesson JSON copied to clipboard!');
                }}
              >Copy JSON</button>
              <button
                className="bg-gray-100 hover:bg-gray-200 rounded px-4 py-2 text-gray-700"
                onClick={() => window.print()}
              >Print</button>
              <button
                className="ml-auto text-red-500 hover:text-red-700 font-medium"
                onClick={() => setOpenLesson(null)}
              >Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
