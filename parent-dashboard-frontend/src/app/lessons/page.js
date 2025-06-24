'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../utils/api';

export default function LessonsPage() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [childSubjectId, setChildSubjectId] = useState('');
  const [file, setFile] = useState(null);
  const [lessonJson, setLessonJson] = useState(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [lessons, setLessons] = useState([]);

  // Fetch children on mount
  useEffect(() => {
    api.get('/children').then(res => setChildren(res.data));
  }, []);

  // Fetch subjects for selected child
  useEffect(() => {
    if (selectedChild) {
      api.get(`/subjects/child/${selectedChild}`).then(res => setSubjects(res.data));
    } else {
      setSubjects([]); setSelectedSubject('');
    }
  }, [selectedChild]);

  // Find child_subject_id from selected child and subject
  useEffect(() => {
    if (selectedChild && selectedSubject) {
      // Need to fetch child_subjects from backend
      api.get(`/subjects/child/${selectedChild}`).then(res => {
        const subj = res.data.find(s => s.id === selectedSubject);
        if (subj) setChildSubjectId(subj.child_subject_id || subj.id); // adapt as needed
      });
    } else {
      setChildSubjectId('');
    }
  }, [selectedChild, selectedSubject]);

  // Fetch lessons for this child_subject_id
  useEffect(() => {
    if (childSubjectId) {
      api.get(`/lessons/${childSubjectId}`).then(res => setLessons(res.data));
    } else {
      setLessons([]);
    }
  }, [childSubjectId]);

  // Handle lesson file upload
  const handleUpload = async e => {
    e.preventDefault();
    if (!childSubjectId || !file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('child_subject_id', childSubjectId);
    const res = await api.post('/lessons/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setLessonJson(res.data.lesson_json);
    setTitle(res.data.lesson_json?.title || '');
  };

  // Save lesson after review/edit
  const handleSave = async () => {
    setSaving(true);
    await api.post('/lessons/save', {
      child_subject_id: childSubjectId,
      title,
      lesson_json: lessonJson,
    });
    setSaving(false);
    setLessonJson(null); setTitle('');
    // Refresh lessons
    const res = await api.get(`/lessons/${childSubjectId}`);
    setLessons(res.data);
  };

  return (
    <div style={{ padding: 32 }}>
      <h1>Lessons</h1>
      <label>Pick Child: </label>
      <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}>
        <option value="">-- Select --</option>
        {children.map(child => (
          <option key={child.id} value={child.id}>{child.name}</option>
        ))}
      </select>
      {selectedChild && (
        <>
          <label style={{ marginLeft: 16 }}>Pick Subject: </label>
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
            <option value="">-- Select --</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </>
      )}

      {childSubjectId && (
        <>
          <h3>Upload Lesson File</h3>
          <form onSubmit={handleUpload}>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={e => setFile(e.target.files[0])}
              required
            />
            <button type="submit">Upload & Analyze</button>
          </form>
        </>
      )}

      {lessonJson && (
        <div style={{ marginTop: 24 }}>
          <h3>Edit & Approve Lesson</h3>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
          />
          <textarea
            value={JSON.stringify(lessonJson, null, 2)}
            onChange={e => setLessonJson(JSON.parse(e.target.value))}
            rows={10}
            cols={50}
          />
          <button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Approve & Save'}
          </button>
        </div>
      )}

      {lessons.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3>Saved Lessons</h3>
          <ul>
            {lessons.map(lesson => (
              <li key={lesson.id}>
                <strong>{lesson.title}</strong> ({new Date(lesson.created_at).toLocaleString()})
              </li>
            ))}
          </ul>
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <Link href="/">Back to Dashboard</Link>
      </div>
    </div>
  );
}
