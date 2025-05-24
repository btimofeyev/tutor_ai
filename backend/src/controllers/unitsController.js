// src/controllers/unitsController.js
const supabase = require('../utils/supabaseClient');

// Helper to check if the parent owns the child_subject_id (important for security)
async function verifyOwnership(parentId, childSubjectId) {
    // This function needs to join child_subjects -> children to check parent_id
    // This is a simplified placeholder. Implement actual ownership check.
    const { data, error } = await supabase
        .from('child_subjects')
        .select('id, child:children(parent_id)')
        .eq('id', childSubjectId)
        .single();

    if (error || !data || data.child.parent_id !== parentId) {
        return false;
    }
    return true;
}


// Create a new unit
exports.createUnit = async (req, res) => {
    const parent_id = req.header('x-parent-id');
    const { child_subject_id, name, description, sequence_order } = req.body;

    if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!child_subject_id || !name) return res.status(400).json({ error: 'child_subject_id and name are required.' });

    // const isOwner = await verifyOwnership(parent_id, child_subject_id);
    // if (!isOwner) return res.status(403).json({ error: "Forbidden: You do not own this subject." });


    try {
        const { data, error } = await supabase
            .from('units')
            .insert([{ child_subject_id, name, description, sequence_order: sequence_order || 0 }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error("Error creating unit:", error);
        res.status(500).json({ error: error.message || "Failed to create unit." });
    }
};

// List all units for a specific child_subject_id
exports.listUnitsForSubject = async (req, res) => {
    const parent_id = req.header('x-parent-id');
    const { child_subject_id } = req.params;

    if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!child_subject_id) return res.status(400).json({ error: 'Missing child_subject_id.' });
    
    // const isOwner = await verifyOwnership(parent_id, child_subject_id);
    // if (!isOwner) return res.status(403).json({ error: "Forbidden." });

    try {
        const { data, error } = await supabase
            .from('units')
            .select('*')
            .eq('child_subject_id', child_subject_id)
            .order('sequence_order', { ascending: true })
            .order('name', { ascending: true }); // Secondary sort by name

        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        console.error("Error listing units:", error);
        res.status(500).json({ error: error.message || "Failed to list units." });
    }
};

// Update a unit
exports.updateUnit = async (req, res) => {
    const parent_id = req.header('x-parent-id');
    const { unit_id } = req.params;
    const { name, description, sequence_order, child_subject_id } = req.body; // child_subject_id for ownership check

    if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!unit_id) return res.status(400).json({ error: 'Missing unit_id.' });
    // if (!child_subject_id) return res.status(400).json({ error: 'child_subject_id required for ownership check.'});

    // const isOwner = await verifyOwnership(parent_id, child_subject_id);
    // if (!isOwner) return res.status(403).json({ error: "Forbidden." });


    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (sequence_order !== undefined) updateData.sequence_order = sequence_order;
    // updated_at is handled by trigger

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No update data provided." });
    }
    if (updateData.name === '') return res.status(400).json({error: "Unit name cannot be empty."});


    try {
        const { data, error } = await supabase
            .from('units')
            .update(updateData)
            .eq('id', unit_id)
            // .eq('child_subject_id', child_subject_id) // Extra check: ensure unit belongs to the child_subject_id
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: "Unit not found or not updated." });
        res.json(data);
    } catch (error) {
        console.error("Error updating unit:", error);
        res.status(500).json({ error: error.message || "Failed to update unit." });
    }
};

// Delete a unit
exports.deleteUnit = async (req, res) => {
    const parent_id = req.header('x-parent-id');
    const { unit_id } = req.params;
    // For robust ownership check, you might need child_subject_id from request body or fetch it based on unit_id
    // const { child_subject_id } = req.body; 

    if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!unit_id) return res.status(400).json({ error: 'Missing unit_id.' });

    // Fetch unit to get its child_subject_id for ownership check
    // const { data: unitData, error: fetchError } = await supabase.from('units').select('child_subject_id').eq('id', unit_id).single();
    // if (fetchError || !unitData) return res.status(404).json({ error: "Unit not found." });
    // const isOwner = await verifyOwnership(parent_id, unitData.child_subject_id);
    // if (!isOwner) return res.status(403).json({ error: "Forbidden." });

    try {
        // Note: Lessons with this unit_id will have unit_id set to NULL due to ON DELETE SET NULL
        const { error } = await supabase
            .from('units')
            .delete()
            .eq('id', unit_id);

        if (error) throw error;
        res.status(200).json({ message: "Unit deleted successfully." });
    } catch (error) {
        console.error("Error deleting unit:", error);
        res.status(500).json({ error: error.message || "Failed to delete unit." });
    }
};