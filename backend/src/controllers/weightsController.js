// src/controllers/weightsController.js
const supabase = require('../utils/supabaseClient');
const contentTypesArray = ["lesson", "worksheet", "test", "quiz", "review", "notes", "reading_material", "other"]; // Keep in sync

// Get all weights for a specific child_subject_id
exports.getWeightsForChildSubject = async (req, res) => {
    const parent_id = req.header('x-parent-id');
    const { child_subject_id } = req.params;

    if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!child_subject_id) return res.status(400).json({ error: 'Missing child_subject_id' });

    try {
        // Optional: Add ownership check to ensure child_subject_id belongs to the parent

        const { data, error } = await supabase
            .from('subject_grade_weights')
            .select('content_type, weight')
            .eq('child_subject_id', child_subject_id);

        if (error) throw error;

        // Ensure all content types have a default weight if not set
        const weightsMap = new Map(data.map(item => [item.content_type, item.weight]));
        const fullWeights = contentTypesArray.map(ct => ({
            content_type: ct,
            weight: weightsMap.has(ct) ? parseFloat(weightsMap.get(ct)) : (["test", "quiz", "worksheet", "review"].includes(ct) ? 0.25 : 0.00) // Default for gradable types
        }));
        
        // Normalize if sum > 1 and any defaults were applied (or always normalize/validate on save)
        // For now, just return what's there or defaults. Validation on save is crucial.

        res.json(fullWeights);
    } catch (error) {
        console.error("Error fetching weights:", error);
        res.status(500).json({ error: error.message || "Failed to fetch weights." });
    }
};

// Save/Update weights for a child_subject_id
// Expects an array of { content_type: string, weight: number }
exports.saveWeightsForChildSubject = async (req, res) => {
    const parent_id = req.header('x-parent-id');
    const { child_subject_id } = req.params;
    const weightsPayload = req.body.weights; // Array of { content_type, weight }

    if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!child_subject_id) return res.status(400).json({ error: 'Missing child_subject_id' });
    if (!Array.isArray(weightsPayload)) return res.status(400).json({ error: 'Invalid weights payload format.' });

    // Validate weights: sum should ideally be 1.00 for gradable types, or handle as proportions
    let totalWeight = 0;
    for (const w of weightsPayload) {
        if (typeof w.content_type !== 'string' || typeof w.weight !== 'number' || w.weight < 0 || w.weight > 1) {
            return res.status(400).json({ error: `Invalid weight for ${w.content_type}: must be between 0 and 1.` });
        }
        totalWeight += w.weight;
    }
    // For now, we won't strictly enforce sum to 1, but good practice.
    // console.log("Total weight submitted:", totalWeight);


    try {
        // Optional: Add ownership check

        const upsertData = weightsPayload.map(w => ({
            child_subject_id,
            content_type: w.content_type,
            weight: w.weight.toFixed(2) // Ensure 2 decimal places
        }));

        // Upsert operation: insert if not exists, update if exists (based on unique constraint)
        const { data, error } = await supabase
            .from('subject_grade_weights')
            .upsert(upsertData, { onConflict: 'child_subject_id, content_type' })
            .select();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error("Error saving weights:", error);
        res.status(500).json({ error: error.message || "Failed to save weights." });
    }
};

// Get combined weights (standard content types + custom categories) for grade calculations
exports.getCombinedWeightsForChildSubject = async (req, res) => {
    const parent_id = req.header('x-parent-id');
    const { child_subject_id } = req.params;

    if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
    if (!child_subject_id) return res.status(400).json({ error: 'Missing child_subject_id' });

    try {
        // Fetch standard weights
        const { data: standardWeights, error: standardError } = await supabase
            .from('subject_grade_weights')
            .select('content_type, weight')
            .eq('child_subject_id', child_subject_id);

        if (standardError) throw standardError;

        // Fetch custom categories
        const { data: customCategories, error: customError } = await supabase
            .from('custom_assignment_categories')
            .select('id, category_name, weight')
            .eq('child_subject_id', child_subject_id);

        if (customError) throw customError;

        // Combine into single response format for grade calculations
        const combinedWeights = {
            standard: {},
            custom: {}
        };

        // Process standard weights
        const standardWeightsMap = new Map(standardWeights.map(item => [item.content_type, item.weight]));
        contentTypesArray.forEach(ct => {
            combinedWeights.standard[ct] = standardWeightsMap.has(ct) ? 
                parseFloat(standardWeightsMap.get(ct)) : 
                (["test", "quiz", "worksheet", "review"].includes(ct) ? 0.25 : 0.00);
        });

        // Process custom categories
        customCategories.forEach(category => {
            combinedWeights.custom[`custom_${category.id}`] = {
                id: category.id,
                name: category.category_name,
                weight: parseFloat(category.weight)
            };
        });

        res.json(combinedWeights);
    } catch (error) {
        console.error("Error fetching combined weights:", error);
        res.status(500).json({ error: error.message || "Failed to fetch combined weights." });
    }
};