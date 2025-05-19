'use client';

import { useEffect, useState } from 'react';
import api from '../../utils/api';

export default function SubjectsPage() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [childSubjects, setChildSubjects] = useState([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    api.get('/children').then(res => setChildren(res.data));
    api.get('/subjects').then(res => setSubjects(res.data));
  }, []);

  useEffect(() => {
    if (selectedChild) {
      api.get(`/subjects/child/${selectedChild}`).then(res => setChildSubjects(res.data));
    } else {
      setChildSubjects([]);
    }
  }, [selectedChild]);

  const handleAssign = async subjectId => {
    setAssigning(true);
    await api.post('/subjects/assign', { child_id: selectedChild, subject_id: subjectId });
    const res = await api.get(`/subjects/child/${selectedChild}`);
    setChildSubjects(res.data);
    setAssigning(false);
  };

  return (
    <div style={{ padding: 32 }}>
      <h1>Subjects</h1>
      <label>Pick Child: </label>
      <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}>
        <option value="">-- Select --</option>
        {children.map(child => (
          <option key={child.id} value={child.id}>{child.name}</option>
        ))}
      </select>

      {selectedChild && (
        <>
          <h3>Assigned Subjects</h3>
          <ul>
            {childSubjects.map(subject => (
              <li key={subject.id}>{subject.name}</li>
            ))}
          </ul>
          <h3>All Subjects</h3>
          <ul>
            {subjects.map(subject => (
              <li key={subject.id}>
                {subject.name}
                {!childSubjects.find(cs => cs.id === subject.id) && (
                  <button
                    onClick={() => handleAssign(subject.id)}
                    disabled={assigning}
                    style={{ marginLeft: 8 }}
                  >
                    Assign
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <div style={{ marginTop: 16 }}>
        <a href="/">Back to Dashboard</a>
      </div>
    </div>
  );
}
