const supabase = require('../utils/supabaseClient');

// Helper to get parent_id from request header
function getParentId(req) {
  return req.header('x-parent-id');
}

// Helper to verify parent owns the child
async function verifyChildOwnership(parentId, childId) {
  const { data, error } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('parent_id', parentId)
    .single();

  return !error && data;
}

// Assign a subject to a child
exports.assignSubjectToChild = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_id, subject_id, custom_subject_name_override } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!child_id || !subject_id) {
    return res.status(400).json({ error: 'child_id and subject_id are required' });
  }

  try {
    // Verify parent owns the child
    const ownsChild = await verifyChildOwnership(parent_id, child_id);
    if (!ownsChild) {
      return res.status(403).json({ error: 'Access denied to this child' });
    }

    // Verify subject exists
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('id', subject_id)
      .single();

    if (subjectError || !subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Check if already assigned
    const { data: existing } = await supabase
      .from('child_subjects')
      .select('id')
      .eq('child_id', child_id)
      .eq('subject_id', subject_id)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Subject already assigned to this child' });
    }

    // Create assignment
    const { data, error } = await supabase
      .from('child_subjects')
      .insert([{
        child_id,
        subject_id,
        custom_subject_name_override: custom_subject_name_override ? custom_subject_name_override.trim() : null
      }])
      .select(`
        id,
        custom_subject_name_override,
        created_at,
        child:child_id (id, name),
        subject:subject_id (id, name)
      `)
      .single();

    if (error) return res.status(400).json({ error: error.message });

    // Auto-create "Chapter 1" unit for the new subject assignment
    try {
      const { data: unitData, error: unitError } = await supabase
        .from('units')
        .insert([{
          child_subject_id: data.id,
          name: 'Chapter 1',
          description: 'Auto-created starter chapter',
          sequence_order: 1
        }])
        .select()
        .single();

      if (unitError) {
        console.warn('Failed to auto-create Chapter 1:', unitError);
        // Don't fail the whole operation if unit creation fails
      } else {
        console.log('Auto-created Chapter 1 for subject assignment:', data.id);
        
        // Auto-create "Lesson 1" within Chapter 1
        try {
          const { data: lessonData, error: lessonError } = await supabase
            .from('lessons')
            .insert([{
              unit_id: unitData.id,
              title: 'Lesson 1',
              description: 'Auto-created starter lesson',
              sequence_order: 1
            }])
            .select()
            .single();

          if (lessonError) {
            console.warn('Failed to auto-create Lesson 1:', lessonError);
          } else {
            console.log('Auto-created Lesson 1 for Chapter 1:', unitData.id);
          }
        } catch (lessonCreationError) {
          console.warn('Error auto-creating Lesson 1:', lessonCreationError);
        }
      }
    } catch (unitCreationError) {
      console.warn('Error auto-creating Chapter 1:', unitCreationError);
      // Continue with the main operation
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error assigning subject:', error);
    res.status(500).json({ error: 'Failed to assign subject' });
  }
};

// Unassign a subject from a child
exports.unassignSubjectFromChild = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_id, subject_id } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!child_id || !subject_id) {
    return res.status(400).json({ error: 'child_id and subject_id are required' });
  }

  try {
    // Verify parent owns the child
    const ownsChild = await verifyChildOwnership(parent_id, child_id);
    if (!ownsChild) {
      return res.status(403).json({ error: 'Access denied to this child' });
    }

    // Check if assignment exists
    const { data: assignment } = await supabase
      .from('child_subjects')
      .select('id')
      .eq('child_id', child_id)
      .eq('subject_id', subject_id)
      .single();

    if (!assignment) {
      return res.status(404).json({ error: 'Subject assignment not found' });
    }

    // Check if there are any units/materials that would be orphaned
    const { count: unitsCount } = await supabase
      .from('units')
      .select('*', { count: 'exact', head: true })
      .eq('child_subject_id', assignment.id);

    if (unitsCount > 0) {
      return res.status(400).json({ 
        error: `Cannot unassign subject with ${unitsCount} existing units. Delete units first.` 
      });
    }

    // Delete assignment
    const { error } = await supabase
      .from('child_subjects')
      .delete()
      .eq('child_id', child_id)
      .eq('subject_id', subject_id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'Subject unassigned successfully' });
  } catch (error) {
    console.error('Error unassigning subject:', error);
    res.status(500).json({ error: 'Failed to unassign subject' });
  }
};

// Unassign by child_subject_id (alternative endpoint)
exports.unassignByChildSubjectId = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_subject_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!child_subject_id) return res.status(400).json({ error: 'child_subject_id is required' });

  try {
    // Verify parent owns this child_subject through child ownership
    const { data: assignment } = await supabase
      .from('child_subjects')
      .select(`
        id,
        child:child_id (id, parent_id)
      `)
      .eq('id', child_subject_id)
      .single();

    if (!assignment || assignment.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this subject assignment' });
    }

    // Check for existing units
    const { count: unitsCount } = await supabase
      .from('units')
      .select('*', { count: 'exact', head: true })
      .eq('child_subject_id', child_subject_id);

    if (unitsCount > 0) {
      return res.status(400).json({ 
        error: `Cannot unassign subject with ${unitsCount} existing units. Delete units first.` 
      });
    }

    // Delete assignment
    const { error } = await supabase
      .from('child_subjects')
      .delete()
      .eq('id', child_subject_id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'Subject unassigned successfully' });
  } catch (error) {
    console.error('Error unassigning subject by ID:', error);
    res.status(500).json({ error: 'Failed to unassign subject' });
  }
};

// List all assigned subjects for a child
exports.listSubjectsForChild = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!child_id) return res.status(400).json({ error: 'child_id is required' });

  try {
    // Verify parent owns the child
    const ownsChild = await verifyChildOwnership(parent_id, child_id);
    if (!ownsChild) {
      return res.status(403).json({ error: 'Access denied to this child' });
    }

    const { data, error } = await supabase
      .from('child_subjects')
      .select(`
        id,
        custom_subject_name_override,
        created_at,
        subject:subject_id (
          id,
          name,
          description,
          is_predefined
        )
      `)
      .eq('child_id', child_id)
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    // Format response to match expected frontend format
    const formattedData = (data || []).map(assignment => ({
      child_subject_id: assignment.id, // This is the key ID the frontend needs
      id: assignment.subject.id, // Keep for backward compatibility
      name: assignment.custom_subject_name_override || assignment.subject.name,
      original_name: assignment.subject.name,
      description: assignment.subject.description,
      is_predefined: assignment.subject.is_predefined,
      custom_name: assignment.custom_subject_name_override,
      created_at: assignment.created_at
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error listing child subjects:', error);
    res.status(500).json({ error: 'Failed to fetch assigned subjects' });
  }
};

// Update custom subject name override
exports.updateCustomSubjectName = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_subject_id } = req.params;
  const { custom_subject_name_override } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!child_subject_id) return res.status(400).json({ error: 'child_subject_id is required' });

  try {
    // Verify parent owns this child_subject through child ownership
    const { data: assignment } = await supabase
      .from('child_subjects')
      .select(`
        id,
        child:child_id (id, parent_id)
      `)
      .eq('id', child_subject_id)
      .single();

    if (!assignment || assignment.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this subject assignment' });
    }

    // Update custom name
    const { data, error } = await supabase
      .from('child_subjects')
      .update({
        custom_subject_name_override: custom_subject_name_override ? custom_subject_name_override.trim() : null
      })
      .eq('id', child_subject_id)
      .select(`
        id,
        custom_subject_name_override,
        subject:subject_id (
          id,
          name,
          description
        )
      `)
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (error) {
    console.error('Error updating custom subject name:', error);
    res.status(500).json({ error: 'Failed to update custom subject name' });
  }
};

// Get child subject details (used by subject settings page)
exports.getChildSubjectDetails = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_subject_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!child_subject_id) return res.status(400).json({ error: 'child_subject_id is required' });

  try {
    const { data, error } = await supabase
      .from('child_subjects')
      .select(`
        id,
        custom_subject_name_override,
        subject:subject_id (name),
        child:child_id (name, parent_id)
      `)
      .eq('id', child_subject_id)
      .single();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Child subject assignment not found' });

    // Verify ownership
    if (data.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this subject assignment' });
    }

    res.json({
      subject_name: data.custom_subject_name_override || data.subject.name,
      original_subject_name: data.subject.name,
      child_name: data.child.name,
      custom_name: data.custom_subject_name_override
    });
  } catch (error) {
    console.error('Error fetching child subject details:', error);
    res.status(500).json({ error: 'Failed to fetch child subject details' });
  }
};