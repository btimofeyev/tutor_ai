// src/controllers/customCategoriesController.js
const supabase = require('../utils/supabaseClient');

// Get all custom categories for a specific child_subject_id
exports.getCustomCategoriesForChildSubject = async (req, res) => {
    const parent_id = req.header('x-parent-id');
    const { child_subject_id } = req.params;

    if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!child_subject_id) return res.status(400).json({ error: 'Missing child_subject_id' });

    try {
        // TODO: Add ownership check to ensure child_subject_id belongs to the parent

        const { data, error } = await supabase
            .from('custom_assignment_categories')
            .select('id, category_name, weight, created_at, updated_at')
            .eq('child_subject_id', child_subject_id)
            .order('category_name', { ascending: true });

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error("Error fetching custom categories:", error);
        res.status(500).json({ error: error.message || "Failed to fetch custom categories." });
    }
};

// Create a new custom category
exports.createCustomCategory = async (req, res) => {
    const parent_id = req.header('x-parent-id');
    const { child_subject_id } = req.params;
    const { category_name, weight } = req.body;

    if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!child_subject_id) return res.status(400).json({ error: 'Missing child_subject_id' });
    if (!category_name || category_name.trim().length === 0) {
        return res.status(400).json({ error: 'Category name is required' });
    }
    if (category_name.trim().length > 100) {
        return res.status(400).json({ error: 'Category name must be 100 characters or less' });
    }
    if (typeof weight !== 'number' || weight < 0 || weight > 1) {
        return res.status(400).json({ error: 'Weight must be a number between 0 and 1' });
    }

    try {
        // TODO: Add ownership check to ensure child_subject_id belongs to the parent

        // Check for duplicate category name within the same child_subject
        const { data: existingCategory, error: checkError } = await supabase
            .from('custom_assignment_categories')
            .select('id')
            .eq('child_subject_id', child_subject_id)
            .eq('category_name', category_name.trim())
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw checkError;
        }

        if (existingCategory) {
            return res.status(400).json({ error: 'A category with this name already exists for this subject' });
        }

        const { data, error } = await supabase
            .from('custom_assignment_categories')
            .insert({
                child_subject_id,
                category_name: category_name.trim(),
                weight: weight.toFixed(4) // Ensure 4 decimal places
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (error) {
        console.error("Error creating custom category:", error);
        res.status(500).json({ error: error.message || "Failed to create custom category." });
    }
};

// Update an existing custom category
exports.updateCustomCategory = async (req, res) => {
    const parent_id = req.header('x-parent-id');
    const { id } = req.params;
    const { category_name, weight } = req.body;

    if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!id) return res.status(400).json({ error: 'Missing category id' });

    // Build update object with only provided fields
    const updateData = {};
    if (category_name !== undefined) {
        if (category_name.trim().length === 0) {
            return res.status(400).json({ error: 'Category name cannot be empty' });
        }
        if (category_name.trim().length > 100) {
            return res.status(400).json({ error: 'Category name must be 100 characters or less' });
        }
        updateData.category_name = category_name.trim();
    }
    if (weight !== undefined) {
        if (typeof weight !== 'number' || weight < 0 || weight > 1) {
            return res.status(400).json({ error: 'Weight must be a number between 0 and 1' });
        }
        updateData.weight = weight.toFixed(4);
    }

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    try {
        // TODO: Add ownership check to ensure this category belongs to the parent

        // If updating name, check for duplicates
        if (updateData.category_name) {
            const { data: category, error: fetchError } = await supabase
                .from('custom_assignment_categories')
                .select('child_subject_id')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            const { data: existingCategory, error: checkError } = await supabase
                .from('custom_assignment_categories')
                .select('id')
                .eq('child_subject_id', category.child_subject_id)
                .eq('category_name', updateData.category_name)
                .neq('id', id) // Exclude current category
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }

            if (existingCategory) {
                return res.status(400).json({ error: 'A category with this name already exists for this subject' });
            }
        }

        const { data, error } = await supabase
            .from('custom_assignment_categories')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error("Error updating custom category:", error);
        res.status(500).json({ error: error.message || "Failed to update custom category." });
    }
};

// Delete a custom category
exports.deleteCustomCategory = async (req, res) => {
    const parent_id = req.header('x-parent-id');
    const { id } = req.params;

    if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!id) return res.status(400).json({ error: 'Missing category id' });

    try {
        // TODO: Add ownership check to ensure this category belongs to the parent

        // Check if any materials are using this custom category
        const { data: materialsUsing, error: checkError } = await supabase
            .from('materials')
            .select('id')
            .eq('custom_category_id', id)
            .limit(1);

        if (checkError) throw checkError;

        if (materialsUsing && materialsUsing.length > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete category that is being used by materials. Please reassign or delete those materials first.' 
            });
        }

        const { error } = await supabase
            .from('custom_assignment_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'Custom category deleted successfully' });
    } catch (error) {
        console.error("Error deleting custom category:", error);
        res.status(500).json({ error: error.message || "Failed to delete custom category." });
    }
};