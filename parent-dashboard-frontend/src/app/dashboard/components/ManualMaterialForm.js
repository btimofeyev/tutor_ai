// app/dashboard/components/ManualMaterialForm.js
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  DocumentPlusIcon, 
  ArrowPathIcon,
  BookOpenIcon,
  ClockIcon,
  AcademicCapIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import Button from '../../../components/ui/Button';

const QUICK_CONTENT_TYPES = [
  "lesson", "worksheet", "assignment", "test", "quiz", "notes", "reading_material", "other"
];
const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced", "review"];
const TIME_ESTIMATES = [
  { value: 15, label: "15 minutes" }, { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" }, { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" }, { value: 120, label: "2 hours" },
  { value: 180, label: "3+ hours" }
];

function formatContentTypeName(contentType) {
  if (!contentType) return '';
  return contentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default function ManualMaterialForm({
  childSubjectsForSelectedChild,
  onSubmit,
  savingMaterial,
  
  currentSubject,         
  onSubjectChange,        

  unitsForSelectedSubject,  
  onCreateNewUnit,

  selectedUnitInManualForm, 
  onManualFormUnitChange, 

  lessonContainersForSelectedUnit, 
  
  selectedLessonContainer, 
  onLessonContainerChange, 

  onCreateNewLessonContainer, 
  
  appContentTypes = QUICK_CONTENT_TYPES,
  appGradableContentTypes = [],
}) {
  const [formData, setFormData] = useState({
    title: '', content_type: 'lesson', description: '', difficulty_level: 'intermediate',
    estimated_time_minutes: 30, learning_objectives: '', topics: '', due_date: '',
    max_score: '', completed: false, notes: ''
  });

  const [isCreatingLessonGroup, setIsCreatingLessonGroup] = useState(false);
  const [newLessonGroupTitle, setNewLessonGroupTitle] = useState('');
  const [isCreatingUnit, setIsCreatingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  // Ref to store the previous subject to compare against currentSubject
  const prevSubjectRef = useRef(currentSubject);

  // Effect to reset unit selection when the global subject changes
  useEffect(() => {
    // console.log('ManualForm: currentSubject changed or onManualFormUnitChange changed.', currentSubject, prevSubjectRef.current);
    if (currentSubject !== prevSubjectRef.current) {
      // console.log('ManualForm: Subject actually changed. Resetting unit.');
      if (onManualFormUnitChange) { // Ensure prop exists
        onManualFormUnitChange(''); 
      }
      prevSubjectRef.current = currentSubject; // Update the ref to the new current subject
    }
  }, [currentSubject, onManualFormUnitChange]); // Removed prevSubjectRef from deps as ref changes don't trigger effects

  // Store previous unit to only reset when unit actually changes
  const prevUnitRefForForm = useRef(selectedUnitInManualForm);
  
  // Effect to reset lesson container when this form's unit selection changes
  useEffect(() => {
    if (selectedUnitInManualForm !== prevUnitRefForForm.current) {
      console.log('ManualForm: Unit changed from', prevUnitRefForForm.current, 'to', selectedUnitInManualForm, '- resetting lesson container');
      if (onLessonContainerChange) { 
          onLessonContainerChange({ target: { value: '' } }); 
      }
      setIsCreatingLessonGroup(false); 
      setNewLessonGroupTitle('');
      prevUnitRefForForm.current = selectedUnitInManualForm;
    }
  }, [selectedUnitInManualForm, onLessonContainerChange]);

  // Sync isCreatingLessonGroup with the global selectedLessonContainer state
  useEffect(() => {
    setIsCreatingLessonGroup(selectedLessonContainer === '__create_new__');
    if (selectedLessonContainer !== '__create_new__') {
      setNewLessonGroupTitle('');
    }
  }, [selectedLessonContainer]);

  // Sync isCreatingUnit with the manual form's unit selection
  useEffect(() => {
    setIsCreatingUnit(selectedUnitInManualForm === '__create_new__');
    if (selectedUnitInManualForm !== '__create_new__') {
      setNewUnitName('');
    }
  }, [selectedUnitInManualForm]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleUnitChangeInThisForm = (e) => {
    const newUnitId = e.target.value;
    console.log('ManualForm: Unit Dropdown Changed. New Unit ID:', newUnitId);
    if (onManualFormUnitChange) { // Ensure prop exists
        onManualFormUnitChange(newUnitId); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { alert('Please enter a title for the material.'); return; }
    if (!currentSubject) { alert('Please select a subject.'); return; }
    if (!selectedUnitInManualForm) { alert('Please select a unit.'); return; }
    if (selectedUnitInManualForm === '__create_new__') { 
        alert('Please click "Create" for the new unit first, then save the material.'); return;
    }
    if (!selectedLessonContainer) { alert('Please select a lesson group.'); return; }
    if (selectedLessonContainer === '__create_new__' && !newLessonGroupTitle.trim()) {
        alert('Please enter a title for the new lesson group or select an existing one.'); return;
    }
    if (selectedLessonContainer === '__create_new__' && newLessonGroupTitle.trim()) {
        alert('Please click "Create" for the new lesson group first, then save the material.'); return;
    }

    const materialData = {
      lesson_id: selectedLessonContainer, 
      child_subject_id: currentSubject,
      title: formData.title.trim(), 
      content_type: formData.content_type,
      lesson_json: { 
        title: formData.title.trim(), created_manually: true,
        content_type_suggestion: formData.content_type,
        main_content_summary_or_extract: formData.description.trim() || 'Manually created material',
        learning_objectives: formData.learning_objectives ? formData.learning_objectives.split('\n').map(obj => obj.trim()).filter(obj => obj) : [],
        subject_keywords_or_subtopics: formData.topics ? formData.topics.split(',').map(topic => topic.trim()).filter(topic => topic) : [],
        estimated_completion_time_minutes: formData.estimated_time_minutes ? parseInt(formData.estimated_time_minutes) : null,
        difficulty_level_suggestion: formData.difficulty_level,
        page_count_or_length_indicator: "Manual entry",
        tasks_or_questions: [], 
        total_possible_points_suggestion: formData.max_score ? parseInt(formData.max_score) : null,
        additional_notes: formData.notes.trim() || null,
      },
      grade_max_value: formData.max_score ? parseInt(formData.max_score) : null,
      due_date: formData.due_date || null,
      completed_at: formData.completed ? new Date().toISOString() : null,
      unit_id: selectedUnitInManualForm 
    };

    const result = await onSubmit(materialData);
    if (result?.success) {
      setFormData({
        title: '', content_type: 'lesson', description: '', difficulty_level: 'intermediate',
        estimated_time_minutes: 30, learning_objectives: '', topics: '', due_date: '',
        max_score: '', completed: false, notes: ''
      });
      if (onManualFormUnitChange) onManualFormUnitChange(''); 
      if (onLessonContainerChange) onLessonContainerChange({ target: { value: '' } }); 
      setNewLessonGroupTitle('');
      setIsCreatingLessonGroup(false);
    }
  };

  const handleCreateNewUnit = async () => {
    if (!newUnitName.trim()) { alert("Please enter a name for the new unit."); return; }
    if (!currentSubject) { alert("A subject must be selected before creating a new unit."); return; }
    
    const result = await onCreateNewUnit(newUnitName.trim(), currentSubject);
    console.log('ManualForm: Unit creation result:', result);
    if (result && result.success) {
        setNewUnitName('');
        // Select the newly created unit
        if (onManualFormUnitChange && result.data) {
          console.log('ManualForm: Auto-selecting new unit:', result.data.id);
          onManualFormUnitChange(result.data.id);
        }
    } else {
        alert(result?.error || 'Failed to create unit. Please try again.');
    }
  };

  const handleCreateNewLessonGroup = async () => {
    if (!newLessonGroupTitle.trim()) { alert("Please enter a title for the new lesson group."); return; }
    if (!selectedUnitInManualForm) { alert("A unit must be selected before creating a lesson group."); return; }
    
    console.log('ManualForm: Creating lesson group for unit:', selectedUnitInManualForm);
    const result = await onCreateNewLessonContainer(newLessonGroupTitle.trim()); 
    console.log('ManualForm: Lesson group creation result:', result);
    if (result && result.success) {
        setNewLessonGroupTitle(''); 
    } else {
        alert(result?.error || 'Failed to create lesson group. Please try again.');
    }
  };

  const commonInputStyles = "w-full border-border-input rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-accent-blue focus:border-accent-blue placeholder-text-tertiary shadow-sm";
  const commonLabelStyles = "block text-xs font-medium text-text-secondary mb-1";
  const commonSelectStyles = `${commonInputStyles} h-10`;
  const isGradableType = appGradableContentTypes.includes(formData.content_type);

  // For debugging:
  // console.log("ManualMaterialForm rendering. currentSubject:", currentSubject);
  // console.log("ManualMaterialForm unitsForSelectedSubject:", unitsForSelectedSubject);
  // console.log("ManualMaterialForm selectedUnitInManualForm:", selectedUnitInManualForm);
  // console.log("ManualMaterialForm lessonContainersForSelectedUnit:", lessonContainersForSelectedUnit);
  // console.log("ManualMaterialForm selectedLessonContainer:", selectedLessonContainer);


  return (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <BookOpenIcon className="h-5 w-5 text-accent-blue mr-2" />
        <h3 className="text-lg font-semibold text-text-primary">Quick Material Entry</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="manual-subject" className={commonLabelStyles}>Subject *</label>
          <select id="manual-subject" value={currentSubject || ''} onChange={onSubjectChange} className={commonSelectStyles} required>
            <option value="">Select subject…</option>
            {(childSubjectsForSelectedChild || []).filter(s => s.child_subject_id).map(subject => (
              <option key={subject.child_subject_id} value={subject.child_subject_id}>{subject.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="manual-title" className={commonLabelStyles}>Title *</label>
            <input type="text" id="manual-title" name="title" value={formData.title} onChange={handleInputChange} className={commonInputStyles} placeholder="e.g., Chapter 3 Review" required />
          </div>
          <div>
            <label htmlFor="manual-content-type" className={commonLabelStyles}>Content Type *</label>
            <select id="manual-content-type" name="content_type" value={formData.content_type} onChange={handleInputChange} className={commonSelectStyles} required>
              {appContentTypes.map(type => (<option key={type} value={type}>{formatContentTypeName(type)}</option>))}
            </select>
          </div>
        </div>

        <div className="space-y-3 p-3 border border-blue-100 rounded-lg bg-blue-50/30">
          <div>
            <label htmlFor="manual-form-unit" className={commonLabelStyles}>Assign to Unit *</label>
            <select 
              id="manual-form-unit" 
              name="unit_id_manual_form_select" // Changed name to be unique for select
              value={selectedUnitInManualForm || ''} // Ensure value is not undefined
              onChange={handleUnitChangeInThisForm} 
              className={commonSelectStyles} 
              disabled={!currentSubject} 
              required
            > 
              <option value="">-- Select a Unit --</option>
              <option value="__create_new__" className="font-medium text-accent-blue">+ Create New Unit</option>
              {(unitsForSelectedSubject || []).map(unit => (<option key={unit.id} value={unit.id}>{unit.name}</option>))}
            </select>
             {!currentSubject && (
                <p className="text-xs text-text-tertiary italic mt-0.5">Select a subject first.</p>
            )}
          </div>

          {isCreatingUnit && currentSubject && (
            <div className="p-3 border border-dashed border-blue-300 rounded-md bg-blue-50/50 animate-fade-in">
              <label htmlFor="new-unit-manual" className={`${commonLabelStyles} text-accent-blue`}>New Unit Name *</label>
              <div className="flex gap-2 mt-1 items-center">
                <input type="text" id="new-unit-manual" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className={`${commonInputStyles} flex-1`} placeholder="e.g., Unit 4: Geometry" required={isCreatingUnit} />
                <Button type="button" variant="primary" size="sm" onClick={handleCreateNewUnit} className="h-10 whitespace-nowrap" disabled={!newUnitName.trim() || savingMaterial}>
                  <PlusIcon className="h-4 w-4 mr-1" /> Create
                </Button>
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="manual-lesson-container" className={commonLabelStyles}>Lesson Group *</label>
            <select 
              id="manual-lesson-container" 
              value={selectedLessonContainer || ''} 
              onChange={onLessonContainerChange} 
              className={commonSelectStyles} 
              required
              disabled={!selectedUnitInManualForm || selectedUnitInManualForm === '__create_new__'} 
            >
              <option value="">-- Choose or Create Lesson Group --</option>
              <option value="__create_new__" className="font-medium text-accent-blue">+ Create New Lesson Group</option>
              {(lessonContainersForSelectedUnit || []).map(lesson => (<option key={lesson.id} value={lesson.id}>{lesson.title}</option>))}
            </select>
            {!selectedUnitInManualForm && (<p className="text-xs text-text-tertiary italic mt-0.5">Select a unit first to manage lesson groups.</p>)}
          </div>

          {isCreatingLessonGroup && selectedUnitInManualForm && (
            <div className="p-3 border border-dashed border-blue-300 rounded-md bg-blue-50/50">
              <label htmlFor="new-manual-lesson-group" className={`${commonLabelStyles} text-accent-blue`}>New Lesson Group Title *</label>
              <div className="flex gap-2 mt-1 items-center">
                <input type="text" id="new-manual-lesson-group" value={newLessonGroupTitle} onChange={(e) => setNewLessonGroupTitle(e.target.value)} className={`${commonInputStyles} flex-1`} placeholder="e.g., Week 3 Activities" required={isCreatingLessonGroup} />
                <Button type="button" variant="primary" size="sm" onClick={handleCreateNewLessonGroup} className="h-10 whitespace-nowrap" disabled={!newLessonGroupTitle.trim() || savingMaterial}>
                  <PlusIcon className="h-4 w-4 mr-1" /> Create
                </Button>
              </div>
            </div>
          )}
        </div>

        <div><label htmlFor="manual-description" className={commonLabelStyles}>Description</label><textarea id="manual-description" name="description" value={formData.description} onChange={handleInputChange} rows="3" className={commonInputStyles} placeholder="Brief description of what this material covers..."/></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label htmlFor="manual-difficulty" className={commonLabelStyles}><AcademicCapIcon className="h-4 w-4 inline mr-1" />Difficulty Level</label><select id="manual-difficulty" name="difficulty_level" value={formData.difficulty_level} onChange={handleInputChange} className={commonSelectStyles}>{DIFFICULTY_LEVELS.map(level => (<option key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</option>))}</select></div><div><label htmlFor="manual-time" className={commonLabelStyles}><ClockIcon className="h-4 w-4 inline mr-1" />Estimated Time</label><select id="manual-time" name="estimated_time_minutes" value={formData.estimated_time_minutes} onChange={handleInputChange} className={commonSelectStyles}>{TIME_ESTIMATES.map(time => (<option key={time.value} value={time.value}>{time.label}</option>))}</select></div></div>
        <div><label htmlFor="manual-objectives" className={commonLabelStyles}>Learning Objectives</label><textarea id="manual-objectives" name="learning_objectives" value={formData.learning_objectives} onChange={handleInputChange} rows="2" className={commonInputStyles} placeholder="One objective per line, e.g.
Understand basic multiplication
Solve word problems"/><p className="text-xs text-text-tertiary mt-1">Enter one objective per line</p></div>
        <div><label htmlFor="manual-topics" className={commonLabelStyles}>Topics & Keywords</label><input type="text" id="manual-topics" name="topics" value={formData.topics} onChange={handleInputChange} className={commonInputStyles} placeholder="multiplication, word problems (comma-separated)"/></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label htmlFor="manual-due-date" className={commonLabelStyles}>Due Date</label><input type="date" id="manual-due-date" name="due_date" value={formData.due_date} onChange={handleInputChange} className={commonInputStyles} /></div>{isGradableType && (<div><label htmlFor="manual-max-score" className={commonLabelStyles}>Max Score/Points</label><input type="number" id="manual-max-score" name="max_score" value={formData.max_score} onChange={handleInputChange} className={commonInputStyles} placeholder="e.g., 100" min="1" /></div>)}</div>
        <div><label htmlFor="manual-notes" className={commonLabelStyles}>Additional Notes</label><textarea id="manual-notes" name="notes" value={formData.notes} onChange={handleInputChange} rows="2" className={commonInputStyles} placeholder="Any additional notes or instructions..."/></div>
        <div className="flex items-center"><input type="checkbox" id="manual-completed" name="completed" checked={formData.completed} onChange={handleInputChange} className="h-4 w-4 text-accent-blue border-border-input rounded focus:ring-accent-blue" /><label htmlFor="manual-completed" className="ml-2 block text-sm font-medium text-text-primary">Mark as completed</label></div>

        <Button 
          type="submit" 
          variant="primary" 
          size="md" 
          className="w-full" 
          disabled={savingMaterial || !currentSubject || !selectedUnitInManualForm || (selectedUnitInManualForm === '__create_new__') || !selectedLessonContainer || (selectedLessonContainer === '__create_new__')}
        >
          {savingMaterial ? (<><ArrowPathIcon className="h-5 w-5 mr-2 animate-spin"/>Saving Material...</>) : (<><DocumentPlusIcon className="h-5 w-5 mr-2"/>Add Material</>)}
        </Button>
      </form>
    </div>
  );
}