const supabase = require('../utils/supabaseClient');

// Helper to get parent_id from request header
function getParentId(req) {
  return req.header('x-parent-id');
}

// Helper to verify parent owns the child_subject_id
async function verifyChildSubjectOwnership(parentId, childSubjectId) {
  try {
    const { data, error } = await supabase
      .from('child_subjects')
      .select(`
        id,
        child:child_id (
          id,
          parent_id
        )
      `)
      .eq('id', childSubjectId)
      .single();

    if (error || !data || data.child.parent_id !== parentId) {
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error verifying child subject ownership:', error);
    return false;
  }
}

// Create a new unit
exports.createUnit = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_subject_id, name, description, sequence_order } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!child_subject_id || !name) {
    return res.status(400).json({ error: 'child_subject_id and name are required' });
  }

  // Validate name
  const trimmedName = name.trim();
  if (!trimmedName) {
    return res.status(400).json({ error: 'Unit name cannot be empty' });
  }

  try {
    // Verify parent owns the child_subject
    const isOwner = await verifyChildSubjectOwnership(parent_id, child_subject_id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this child subject' });
    }

    // Check if unit name already exists for this child_subject
    const { data: existing } = await supabase
      .from('units')
      .select('id')
      .eq('child_subject_id', child_subject_id)
      .ilike('name', trimmedName)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Unit name already exists for this subject' });
    }

    // If no sequence_order provided, set it to be last
    let finalSequenceOrder = sequence_order;
    if (finalSequenceOrder === undefined || finalSequenceOrder === null) {
      const { data: lastUnit } = await supabase
        .from('units')
        .select('sequence_order')
        .eq('child_subject_id', child_subject_id)
        .order('sequence_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      finalSequenceOrder = lastUnit ? (lastUnit.sequence_order || 0) + 1 : 1;
    }

    // Create the unit
    const { data, error } = await supabase
      .from('units')
      .insert([{
        child_subject_id,
        name: trimmedName,
        description: description ? description.trim() : null,
        sequence_order: finalSequenceOrder
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating unit:', error);
    res.status(500).json({ error: error.message || 'Failed to create unit' });
  }
};

// List all units for a specific child_subject_id
exports.listUnitsForSubject = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_subject_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!child_subject_id) return res.status(400).json({ error: 'child_subject_id is required' });

  try {
    // Verify parent owns the child_subject
    const isOwner = await verifyChildSubjectOwnership(parent_id, child_subject_id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this child subject' });
    }

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('child_subject_id', child_subject_id)
      .order('sequence_order', { ascending: true })
      .order('name', { ascending: true }); // Secondary sort by name

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error listing units:', error);
    res.status(500).json({ error: error.message || 'Failed to list units' });
  }
};

// Get a specific unit by ID
exports.getUnitById = async (req, res) => {
  const parent_id = getParentId(req);
  const { unit_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!unit_id) return res.status(400).json({ error: 'unit_id is required' });

  try {
    // Get unit with child_subject info for ownership verification
    const { data, error } = await supabase
      .from('units')
      .select(`
        *,
        child_subject:child_subject_id (
          id,
          child:child_id (
            id,
            parent_id
          )
        )
      `)
      .eq('id', unit_id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Unit not found' });

    // Verify ownership
    if (data.child_subject.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this unit' });
    }

    // Remove nested ownership data from response
    const { child_subject, ...unitData } = data;
    res.json(unitData);
  } catch (error) {
    console.error('Error fetching unit:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch unit' });
  }
};

// Update a unit
exports.updateUnit = async (req, res) => {
  const parent_id = getParentId(req);
  const { unit_id } = req.params;
  const { name, description, sequence_order } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!unit_id) return res.status(400).json({ error: 'unit_id is required' });

  try {
    // First, get the unit to verify ownership and get child_subject_id
    const { data: existingUnit, error: fetchError } = await supabase
      .from('units')
      .select(`
        *,
        child_subject:child_subject_id (
          id,
          child:child_id (
            id,
            parent_id
          )
        )
      `)
      .eq('id', unit_id)
      .single();

    if (fetchError) throw fetchError;
    if (!existingUnit) return res.status(404).json({ error: 'Unit not found' });

    // Verify ownership
    if (existingUnit.child_subject.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this unit' });
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'Unit name cannot be empty' });
      }

      // Check for name conflicts (only if name is actually changing)
      if (trimmedName.toLowerCase() !== existingUnit.name.toLowerCase()) {
        const { data: existing } = await supabase
          .from('units')
          .select('id')
          .eq('child_subject_id', existingUnit.child_subject_id)
          .ilike('name', trimmedName)
          .neq('id', unit_id)
          .maybeSingle();

        if (existing) {
          return res.status(409).json({ error: 'Unit name already exists for this subject' });
        }
      }

      updateData.name = trimmedName;
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
      .from('units')
      .update(updateData)
      .eq('id', unit_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Unit not found or not updated' });

    res.json(data);
  } catch (error) {
    console.error('Error updating unit:', error);
    res.status(500).json({ error: error.message || 'Failed to update unit' });
  }
};

// Archive or unarchive a unit
exports.setUnitArchiveStatus = async (req, res) => {
  const parent_id = getParentId(req);
  const { unit_id } = req.params;
  const { archived } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!unit_id) return res.status(400).json({ error: 'unit_id is required' });

  const archiveValue = !!archived;

  try {
    const { data: existingUnit, error: fetchError } = await supabase
      .from('units')
      .select(`
        *,
        child_subject:child_subject_id (
          id,
          child:child_id (
            id,
            parent_id
          )
        )
      `)
      .eq('id', unit_id)
      .single();

    if (fetchError) throw fetchError;
    if (!existingUnit) return res.status(404).json({ error: 'Unit not found' });

    if (existingUnit.child_subject.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this unit' });
    }

    const archived_at = archiveValue ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from('units')
      .update({ archived_at })
      .eq('id', unit_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Unit not found or not updated' });

    res.json({
      message: archiveValue ? 'Unit archived successfully' : 'Unit unarchived successfully',
      unit: data
    });
  } catch (error) {
    console.error('Error updating unit archive status:', error);
    res.status(500).json({ error: error.message || 'Failed to update unit archive status' });
  }
};

// Delete a unit
exports.deleteUnit = async (req, res) => {
  const parent_id = getParentId(req);
  const { unit_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!unit_id) return res.status(400).json({ error: 'unit_id is required' });

  try {
    // Get unit info to verify ownership and check for dependent data
    const { data: unitData, error: fetchError } = await supabase
      .from('units')
      .select(`
        *,
        child_subject:child_subject_id (
          id,
          child:child_id (
            id,
            parent_id
          )
        )
      `)
      .eq('id', unit_id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!unitData) return res.status(404).json({ error: 'Unit not found' });

    // Verify ownership
    if (unitData.child_subject.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this unit' });
    }

    // Check if unit has lessons (which would have materials)
    const { count: lessonsCount, error: countError } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('unit_id', unit_id);

    if (countError) {
      console.error('Error checking lessons count:', countError);
      // Continue with deletion if count check fails
    }

    if (lessonsCount > 0) {
      return res.status(400).json({
        error: `Cannot delete unit with ${lessonsCount} existing lessons. Delete lesson groups first or move them to another unit.`
      });
    }

    // Delete the unit
    const { error: deleteError } = await supabase
      .from('units')
      .delete()
      .eq('id', unit_id);

    if (deleteError) throw deleteError;
    res.json({
      message: 'Unit deleted successfully',
      deleted_unit: {
        id: unitData.id,
        name: unitData.name
      }
    });
  } catch (error) {
    console.error('Error deleting unit:', error);
    res.status(500).json({ error: error.message || 'Failed to delete unit' });
  }
};

// Reorder units (bulk update sequence_order)
exports.reorderUnits = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_subject_id, unit_orders } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!child_subject_id || !Array.isArray(unit_orders)) {
    return res.status(400).json({ error: 'child_subject_id and unit_orders array are required' });
  }

  try {
    // Verify parent owns the child_subject
    const isOwner = await verifyChildSubjectOwnership(parent_id, child_subject_id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this child subject' });
    }

    // Validate all unit IDs belong to this child_subject
    const unitIds = unit_orders.map(order => order.unit_id);
    const { data: existingUnits } = await supabase
      .from('units')
      .select('id')
      .eq('child_subject_id', child_subject_id)
      .in('id', unitIds);

    if (!existingUnits || existingUnits.length !== unitIds.length) {
      return res.status(400).json({ error: 'Some unit IDs do not belong to this subject' });
    }

    // Update sequence orders
    const updates = [];
    for (const order of unit_orders) {
      const updatePromise = supabase
        .from('units')
        .update({ sequence_order: order.sequence_order })
        .eq('id', order.unit_id)
        .eq('child_subject_id', child_subject_id);
      updates.push(updatePromise);
    }

    await Promise.all(updates);

    // Fetch updated units list
    const { data: updatedUnits, error } = await supabase
      .from('units')
      .select('*')
      .eq('child_subject_id', child_subject_id)
      .order('sequence_order', { ascending: true });

    if (error) throw error;
    res.json({
      message: 'Units reordered successfully',
      units: updatedUnits
    });
  } catch (error) {
    console.error('Error reordering units:', error);
    res.status(500).json({ error: error.message || 'Failed to reorder units' });
  }
};

// Cascade delete a unit (deletes all lesson containers and materials first)
exports.cascadeDeleteUnit = async (req, res) => {
  const parent_id = getParentId(req);
  const { unit_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!unit_id) return res.status(400).json({ error: 'unit_id is required' });

  try {
    // Get unit info to verify ownership
    const { data: unitData, error: fetchError } = await supabase
      .from('units')
      .select(`
        *,
        child_subject:child_subject_id (
          id,
          child:child_id (
            id,
            parent_id
          )
        )
      `)
      .eq('id', unit_id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!unitData) return res.status(404).json({ error: 'Unit not found' });

    // Verify ownership
    if (unitData.child_subject.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this unit' });
    }

    // Step 1: Get all lesson containers in this unit
    const { data: lessonContainers, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .eq('unit_id', unit_id);

    if (lessonsError) {
      console.error('Error fetching lesson containers:', lessonsError);
      throw lessonsError;
    }

    // Step 2: For each lesson container, delete all its materials first
    for (const lessonContainer of lessonContainers || []) {
      try {
        // Delete all materials in this lesson container
        const { error: materialsDeleteError } = await supabase
          .from('materials')
          .delete()
          .eq('lesson_id', lessonContainer.id);

        if (materialsDeleteError) {
          console.error(`Error deleting materials for lesson ${lessonContainer.id}:`, materialsDeleteError);
          // Continue with other lesson containers
        } else {
          }
      } catch (error) {
        console.error(`Error processing materials for lesson container ${lessonContainer.id}:`, error);
        // Continue with other lesson containers
      }
    }

    // Step 3: Delete all lesson containers
    if (lessonContainers && lessonContainers.length > 0) {
      const { error: lessonsDeleteError } = await supabase
        .from('lessons')
        .delete()
        .eq('unit_id', unit_id);

      if (lessonsDeleteError) {
        console.error('Error deleting lesson containers:', lessonsDeleteError);
        throw lessonsDeleteError;
      } else {
        }
    }

    // Step 4: Finally delete the unit itself
    const { error: deleteError } = await supabase
      .from('units')
      .delete()
      .eq('id', unit_id);

    if (deleteError) {
      console.error('Error deleting unit:', deleteError);
      throw deleteError;
    }

    res.json({
      message: 'Unit and all its contents deleted successfully',
      deletedItems: {
        unit: 1,
        lessonContainers: lessonContainers?.length || 0,
        materialsDeleted: true
      }
    });
  } catch (error) {
    console.error('Error in cascade delete unit:', error);
    res.status(500).json({ error: error.message || 'Failed to delete unit and its contents' });
  }
};
