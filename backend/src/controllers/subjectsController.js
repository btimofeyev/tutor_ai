const supabase = require('../utils/supabaseClient');


// List all available subjects
exports.listSubjects = async (req, res) => {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name');

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};

// Add a new subject (optional, for admins only)
exports.addSubject = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const { data, error } = await supabase
    .from('subjects')
    .insert([{ name }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
};

// Assign a subject to a child (child_subjects join table)
exports.assignSubjectToChild = async (req, res) => {
  const { child_id, subject_id } = req.body;
  if (!child_id || !subject_id) return res.status(400).json({ error: 'child_id and subject_id required' });

  // Prevent duplicate assignment (enforced in schema, but let's be clear)
  const { data, error } = await supabase
    .from('child_subjects')
    .insert([{ child_id, subject_id }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
};

// List a child's subjects
exports.listSubjectsForChild = async (req, res) => {
    const { child_id } = req.params;
    if (!child_id) return res.status(400).json({ error: 'child_id required' });
  
    const { data, error } = await supabase
      .from('child_subjects')
      .select(`
        id,
        subject:subjects (
          id, name
        )
      `)
      .eq('child_id', child_id);
  
    if (error) return res.status(400).json({ error: error.message });
  
    // Flatten: return mapping id as child_subject_id, plus subject's id/name
    const subjects = (data || []).map(row => ({
      child_subject_id: row.id,
      id: row.subject.id,
      name: row.subject.name
    }));
  
    res.json(subjects);
  };
// Remove a subject from a child
exports.removeSubjectFromChild = async (req, res) => {
  const { child_id, subject_id } = req.body;
  if (!child_id || !subject_id) return res.status(400).json({ error: 'child_id and subject_id required' });

  const { error } = await supabase
    .from('child_subjects')
    .delete()
    .eq('child_id', child_id)
    .eq('subject_id', subject_id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Subject removed from child.' });
};
exports.getChildSubjectDetails = async (req, res) => {
  const { child_subject_id } = req.params;

   const parent_id = req.header('x-parent-id');
   if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });

  if (!child_subject_id) return res.status(400).json({ error: 'child_subject_id required' });

  const { data, error } = await supabase
      .from('child_subjects')
      .select(`
          subject:subjects (name),
          child:children (name)
      `)
      .eq('id', child_subject_id)
      .single(); // Expecting one row

  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Child subject assignment not found.' });

  res.json({
      subject_name: data.subject.name,
      child_name: data.child.name
  });
};