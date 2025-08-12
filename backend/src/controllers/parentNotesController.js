const supabase = require('../utils/supabaseClient');

// Helper to get parent_id from authenticated user or request header (for backward compatibility)
function getParentId(req) {
  // First try to get from authenticated user (preferred method)
  if (req.user && req.user.id) {
    return req.user.id;
  }
  // Fallback to header for backward compatibility
  return req.header('x-parent-id');
}

// Get all notes for a specific child (or global notes if child_id is "global")
exports.getNotes = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!child_id) return res.status(400).json({ error: 'Missing child_id' });

  try {
    // Handle global notes (special case)
    if (child_id === 'global') {
      const { data: notes, error } = await supabase
        .from('parent_notes')
        .select('*')
        .eq('parent_id', parent_id)
        .is('child_id', null)
        .order('created_at', { ascending: true });

      if (error) return res.status(400).json({ error: error.message });

      return res.json(notes || []);
    }

    // Verify parent owns the child
    const { data: childData, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('id', child_id)
      .eq('parent_id', parent_id)
      .single();

    if (childError || !childData) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    // Get notes for this child
    const { data: notes, error } = await supabase
      .from('parent_notes')
      .select('*')
      .eq('parent_id', parent_id)
      .eq('child_id', child_id)
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    res.json(notes || []);
  } catch (error) {
    console.error('Error fetching parent notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

// Create a new note (global if child_id is "global")
exports.createNote = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_id } = req.params;
  const { note_text, color, position_x, position_y } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!child_id) return res.status(400).json({ error: 'Missing child_id' });
  if (!note_text || !note_text.trim()) return res.status(400).json({ error: 'Note text is required' });

  try {
    // Handle global notes (special case)
    if (child_id === 'global') {
      const { data: note, error } = await supabase
        .from('parent_notes')
        .insert([{
          parent_id,
          child_id: null, // Global note
          note_text: note_text.trim(),
          color: color || 'yellow',
          position_x: position_x || 0,
          position_y: position_y || 0
        }])
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });

      return res.status(201).json(note);
    }

    // Verify parent owns the child
    const { data: childData, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('id', child_id)
      .eq('parent_id', parent_id)
      .single();

    if (childError || !childData) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    // Create the note
    const { data: note, error } = await supabase
      .from('parent_notes')
      .insert([{
        parent_id,
        child_id,
        note_text: note_text.trim(),
        color: color || 'yellow',
        position_x: position_x || 0,
        position_y: position_y || 0
      }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating parent note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
};

// Update an existing note (handle global notes)
exports.updateNote = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_id, note_id } = req.params;
  const { note_text, color, position_x, position_y } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!child_id) return res.status(400).json({ error: 'Missing child_id' });
  if (!note_id) return res.status(400).json({ error: 'Missing note_id' });

  try {
    // Handle global notes (special case)
    if (child_id === 'global') {
      // Verify note exists and belongs to parent (and is global)
      const { data: existingNote, error: noteError } = await supabase
        .from('parent_notes')
        .select('id')
        .eq('id', note_id)
        .eq('parent_id', parent_id)
        .is('child_id', null)
        .single();

      if (noteError || !existingNote) {
        return res.status(404).json({ error: 'Note not found or access denied' });
      }

      // Prepare update data
      const updateData = {};
      if (note_text !== undefined) updateData.note_text = note_text.trim();
      if (color !== undefined) updateData.color = color;
      if (position_x !== undefined) updateData.position_x = position_x;
      if (position_y !== undefined) updateData.position_y = position_y;
      updateData.updated_at = new Date().toISOString();

      // Update the note
      const { data: updatedNote, error } = await supabase
        .from('parent_notes')
        .update(updateData)
        .eq('id', note_id)
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });

      return res.json(updatedNote);
    }

    // Verify note exists and belongs to parent/child
    const { data: existingNote, error: noteError } = await supabase
      .from('parent_notes')
      .select('id')
      .eq('id', note_id)
      .eq('parent_id', parent_id)
      .eq('child_id', child_id)
      .single();

    if (noteError || !existingNote) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }

    // Prepare update data
    const updateData = {};
    if (note_text !== undefined) updateData.note_text = note_text.trim();
    if (color !== undefined) updateData.color = color;
    if (position_x !== undefined) updateData.position_x = position_x;
    if (position_y !== undefined) updateData.position_y = position_y;
    updateData.updated_at = new Date().toISOString();

    // Update the note
    const { data: updatedNote, error } = await supabase
      .from('parent_notes')
      .update(updateData)
      .eq('id', note_id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json(updatedNote);
  } catch (error) {
    console.error('Error updating parent note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
};

// Delete a note (handle global notes)
exports.deleteNote = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_id, note_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!child_id) return res.status(400).json({ error: 'Missing child_id' });
  if (!note_id) return res.status(400).json({ error: 'Missing note_id' });

  try {
    // Handle global notes (special case)
    if (child_id === 'global') {
      // Verify note exists and belongs to parent (and is global)
      const { data: existingNote, error: noteError } = await supabase
        .from('parent_notes')
        .select('id, note_text')
        .eq('id', note_id)
        .eq('parent_id', parent_id)
        .is('child_id', null)
        .single();

      if (noteError || !existingNote) {
        return res.status(404).json({ error: 'Note not found or access denied' });
      }

      // Delete the note
      const { error } = await supabase
        .from('parent_notes')
        .delete()
        .eq('id', note_id);

      if (error) return res.status(400).json({ error: error.message });

      return res.json({
        message: 'Note deleted successfully',
        deleted_note: existingNote
      });
    }

    // Verify note exists and belongs to parent/child
    const { data: existingNote, error: noteError } = await supabase
      .from('parent_notes')
      .select('id, note_text')
      .eq('id', note_id)
      .eq('parent_id', parent_id)
      .eq('child_id', child_id)
      .single();

    if (noteError || !existingNote) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }

    // Delete the note
    const { error } = await supabase
      .from('parent_notes')
      .delete()
      .eq('id', note_id);

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      message: 'Note deleted successfully',
      deleted_note: existingNote
    });
  } catch (error) {
    console.error('Error deleting parent note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
};

