const supabase = require('../utils/supabaseClient');

// List all available subjects
exports.listSubjects = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, name, description, is_predefined, created_at')
      .order('is_predefined', { ascending: false }) // Show predefined first
      .order('name', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (error) {
    console.error('Error listing subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

// Add a new subject
exports.addSubject = async (req, res) => {
  const { name, description, is_predefined } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Subject name is required' });
  }

  const trimmedName = name.trim();

  try {
    // Check if subject already exists (case-insensitive)
    const { data: existing } = await supabase
      .from('subjects')
      .select('id')
      .ilike('name', trimmedName)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Subject already exists' });
    }

    // Create new subject
    const { data, error } = await supabase
      .from('subjects')
      .insert([{
        name: trimmedName,
        description: description ? description.trim() : null,
        is_predefined: is_predefined === true // Default to false for user-created subjects
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding subject:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
};

// Update a subject (mainly for descriptions or correcting names)
exports.updateSubject = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!id) return res.status(400).json({ error: 'Subject ID is required' });

  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    // Check if updating name and it conflicts with existing
    if (updateData.name) {
      const { data: existing } = await supabase
        .from('subjects')
        .select('id')
        .ilike('name', updateData.name)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({ error: 'Subject name already exists' });
      }
    }

    const { data, error } = await supabase
      .from('subjects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Subject not found' });

    res.json(data);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
};

// Delete a subject (only if not assigned to any children)
exports.deleteSubject = async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(400).json({ error: 'Subject ID is required' });

  try {
    // Check if subject is assigned to any children
    const { count } = await supabase
      .from('child_subjects')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', id);

    if (count > 0) {
      return res.status(400).json({
        error: 'Cannot delete subject that is assigned to children'
      });
    }

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
};

// Get subject details
exports.getSubjectDetails = async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(400).json({ error: 'Subject ID is required' });

  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Subject not found' });

    res.json(data);
  } catch (error) {
    console.error('Error fetching subject details:', error);
    res.status(500).json({ error: 'Failed to fetch subject details' });
  }
};
