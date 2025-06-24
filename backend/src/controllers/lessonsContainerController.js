// backend/src/controllers/lessonsContainerController.js
const supabase = require('../utils/supabaseClient');

// Helper to get parent_id from request header
function getParentId(req) {
  return req.header('x-parent-id');
}

// Helper to verify parent owns the unit
async function verifyUnitOwnership(parentId, unitId) {
  try {
    const { data, error } = await supabase
      .from('units')
      .select(`
        id,
        child_subject:child_subject_id (
          id,
          child:child_id (
            id,
            parent_id
          )
        )
      `)
      .eq('id', unitId)
      .single();

    if (error || !data || data.child_subject.child.parent_id !== parentId) {
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error verifying unit ownership:', error);
    return false;
  }
}

// Helper to verify parent owns the lesson container
async function verifyLessonOwnership(parentId, lessonId) {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .select(`
        id,
        unit:unit_id (
          id,
          child_subject:child_subject_id (
            id,
            child:child_id (
              id,
              parent_id
            )
          )
        )
      `)
      .eq('id', lessonId)
      .single();

    if (error || !data || data.unit.child_subject.child.parent_id !== parentId) {
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error verifying lesson ownership:', error);
    return false;
  }
}

// Create a new lesson container
exports.createLessonContainer = async (req, res) => {
  const parent_id = getParentId(req);
  const { unit_id, title, lesson_number, description, sequence_order } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!unit_id || !title) {
    return res.status(400).json({ error: 'unit_id and title are required' });
  }

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return res.status(400).json({ error: 'Lesson title cannot be empty' });
  }

  try {
    // Verify parent owns the unit
    const isOwner = await verifyUnitOwnership(parent_id, unit_id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this unit' });
    }

    // Check if lesson title already exists in this unit (exact match, case-insensitive)
    const { data: existing } = await supabase
      .from('lessons')
      .select('id')
      .eq('unit_id', unit_id)
      .ilike('title', trimmedTitle)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Lesson title already exists in this unit' });
    }

    // If no sequence_order provided, set it to be last
    let finalSequenceOrder = sequence_order;
    if (finalSequenceOrder === undefined || finalSequenceOrder === null) {
      const { data: lastLesson } = await supabase
        .from('lessons')
        .select('sequence_order')
        .eq('unit_id', unit_id)
        .order('sequence_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Add timestamp component to avoid race conditions during bulk creation
      const baseOrder = lastLesson ? (lastLesson.sequence_order || 0) + 1 : 1;
      const timestampComponent = Date.now() % 1000; // Last 3 digits of timestamp
      finalSequenceOrder = baseOrder * 1000 + timestampComponent;
    }

    // Create the lesson container
    const { data, error } = await supabase
      .from('lessons')
      .insert([{
        unit_id,
        title: trimmedTitle,
        lesson_number: lesson_number ? lesson_number.trim() : null,
        description: description ? description.trim() : null,
        sequence_order: finalSequenceOrder
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating lesson container:', error);
    res.status(500).json({ error: error.message || 'Failed to create lesson container' });
  }
};

// List all lesson containers for a specific unit
exports.listLessonsForUnit = async (req, res) => {
  const parent_id = getParentId(req);
  const { unit_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!unit_id) return res.status(400).json({ error: 'unit_id is required' });

  try {
    // Verify parent owns the unit
    const isOwner = await verifyUnitOwnership(parent_id, unit_id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this unit' });
    }

    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('unit_id', unit_id)
      .order('sequence_order', { ascending: true })
      .order('title', { ascending: true }); // Secondary sort by title

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error listing lesson containers:', error);
    res.status(500).json({ error: error.message || 'Failed to list lesson containers' });
  }
};

// Get a specific lesson container by ID
exports.getLessonContainerById = async (req, res) => {
  const parent_id = getParentId(req);
  const { lesson_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!lesson_id) return res.status(400).json({ error: 'lesson_id is required' });

  try {
    // Get lesson with unit info for ownership verification
    const { data, error } = await supabase
      .from('lessons')
      .select(`
        *,
        unit:unit_id (
          id,
          name,
          child_subject:child_subject_id (
            id,
            child:child_id (
              id,
              parent_id
            )
          )
        )
      `)
      .eq('id', lesson_id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Lesson container not found' });

    // Verify ownership
    if (data.unit.child_subject.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this lesson container' });
    }

    // Remove nested ownership data from response
    const { unit, ...lessonData } = data;
    res.json({
      ...lessonData,
      unit_name: unit.name
    });
  } catch (error) {
    console.error('Error fetching lesson container:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch lesson container' });
  }
};

// Update a lesson container
exports.updateLessonContainer = async (req, res) => {
  const parent_id = getParentId(req);
  const { lesson_id } = req.params;
  const { title, lesson_number, description, sequence_order } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!lesson_id) return res.status(400).json({ error: 'lesson_id is required' });

  try {
    // First, get the lesson container to verify ownership and get unit_id
    const { data: existingLesson, error: fetchError } = await supabase
      .from('lessons')
      .select(`
        *,
        unit:unit_id (
          id,
          child_subject:child_subject_id (
            id,
            child:child_id (
              id,
              parent_id
            )
          )
        )
      `)
      .eq('id', lesson_id)
      .single();

    if (fetchError) throw fetchError;
    if (!existingLesson) return res.status(404).json({ error: 'Lesson container not found' });

    // Verify ownership
    if (existingLesson.unit.child_subject.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this lesson container' });
    }

    // Prepare update data
    const updateData = {};
    if (title !== undefined) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return res.status(400).json({ error: 'Lesson title cannot be empty' });
      }
      
      // Check for title conflicts (only if title is actually changing)
      if (trimmedTitle.toLowerCase() !== existingLesson.title.toLowerCase()) {
        const { data: existing } = await supabase
          .from('lessons')
          .select('id')
          .eq('unit_id', existingLesson.unit_id)
          .ilike('title', trimmedTitle)
          .neq('id', lesson_id)
          .maybeSingle();

        if (existing) {
          return res.status(409).json({ error: 'Lesson title already exists in this unit' });
        }
      }
      
      updateData.title = trimmedTitle;
    }
    
    if (lesson_number !== undefined) {
      updateData.lesson_number = lesson_number ? lesson_number.trim() : null;
    }
    
    if (description !== undefined) {
      updateData.description = description ? description.trim() : null;
    }
    
    if (sequence_order !== undefined) {
      updateData.sequence_order = sequence_order;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    // Perform update
    const { data, error } = await supabase
      .from('lessons')
      .update(updateData)
      .eq('id', lesson_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Lesson container not found or not updated' });
    
    res.json(data);
  } catch (error) {
    console.error('Error updating lesson container:', error);
    res.status(500).json({ error: error.message || 'Failed to update lesson container' });
  }
};

// Delete a lesson container
exports.deleteLessonContainer = async (req, res) => {
  const parent_id = getParentId(req);
  const { lesson_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!lesson_id) return res.status(400).json({ error: 'lesson_id is required' });

  try {
    // Get lesson info to verify ownership and check for dependent data
    const { data: lessonData, error: fetchError } = await supabase
      .from('lessons')
      .select(`
        *,
        unit:unit_id (
          id,
          child_subject:child_subject_id (
            id,
            child:child_id (
              id,
              parent_id
            )
          )
        )
      `)
      .eq('id', lesson_id)
      .single();

    if (fetchError) throw fetchError;
    if (!lessonData) return res.status(404).json({ error: 'Lesson container not found' });

    // Verify ownership
    if (lessonData.unit.child_subject.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this lesson container' });
    }

    // Check if lesson has materials
    const { count: materialsCount } = await supabase
      .from('materials')
      .select('*', { count: 'exact', head: true })
      .eq('lesson_id', lesson_id);

    if (materialsCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete lesson container with ${materialsCount} existing materials. Delete materials first or move them to another lesson.`
      });
    }

    // Delete the lesson container
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lesson_id);

    if (error) throw error;
    res.json({ 
      message: 'Lesson container deleted successfully',
      deleted_lesson: {
        id: lessonData.id,
        title: lessonData.title
      }
    });
  } catch (error) {
    console.error('Error deleting lesson container:', error);
    res.status(500).json({ error: error.message || 'Failed to delete lesson container' });
  }
};

// Reorder lesson containers (bulk update sequence_order)
exports.reorderLessonContainers = async (req, res) => {
  const parent_id = getParentId(req);
  const { unit_id, lesson_orders } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!unit_id || !Array.isArray(lesson_orders)) {
    return res.status(400).json({ error: 'unit_id and lesson_orders array are required' });
  }

  try {
    // Verify parent owns the unit
    const isOwner = await verifyUnitOwnership(parent_id, unit_id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this unit' });
    }

    // Validate all lesson IDs belong to this unit
    const lessonIds = lesson_orders.map(order => order.lesson_id);
    const { data: existingLessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('unit_id', unit_id)
      .in('id', lessonIds);

    if (!existingLessons || existingLessons.length !== lessonIds.length) {
      return res.status(400).json({ error: 'Some lesson IDs do not belong to this unit' });
    }

    // Update sequence orders
    const updates = [];
    for (const order of lesson_orders) {
      const updatePromise = supabase
        .from('lessons')
        .update({ sequence_order: order.sequence_order })
        .eq('id', order.lesson_id)
        .eq('unit_id', unit_id);
      updates.push(updatePromise);
    }

    await Promise.all(updates);

    // Fetch updated lessons list
    const { data: updatedLessons, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('unit_id', unit_id)
      .order('sequence_order', { ascending: true });

    if (error) throw error;
    res.json({
      message: 'Lesson containers reordered successfully',
      lessons: updatedLessons
    });
  } catch (error) {
    console.error('Error reordering lesson containers:', error);
    res.status(500).json({ error: error.message || 'Failed to reorder lesson containers' });
  }
};