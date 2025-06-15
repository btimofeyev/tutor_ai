// backend/src/controllers/materialsController.js
const supabase = require('../utils/supabaseClient');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { GET_UNIVERSAL_SYSTEM_PROMPT } = require('../utils/llmPrompts');
const { extractImagesFromPdf } = require('../utils/pdfImageExtract');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MAX_TEXT_CHARS_FOR_PROMPT = 70000;

// Helper to get parent_id from request header
function getParentId(req) {
  return req.header('x-parent-id');
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

// --- HELPER FUNCTION TO PARSE LLM OUTPUT ---
async function parseLlmOutput(outputContent, userHintContentType, numFilesProcessed = 1, isMultiImage = false) {
  if (!outputContent) throw new Error("OpenAI returned empty content.");
  try {
    const parsedJson = JSON.parse(outputContent);
    if (numFilesProcessed > 0 && isMultiImage && 
        (!parsedJson.page_count_or_length_indicator || 
         typeof parsedJson.page_count_or_length_indicator !== 'number' || 
         parsedJson.page_count_or_length_indicator === null ||
         parsedJson.page_count_or_length_indicator === 0)
       ) {
        parsedJson.page_count_or_length_indicator = numFilesProcessed;
    }
    return parsedJson;
  } catch (err) {
    console.warn("Failed to parse JSON directly from OpenAI. Trying markdown block.", outputContent.substring(0, 200));
    const match = outputContent.match(/```json\s*([\s\S]*?)```/is);
    if (match && match[1]) {
        try { 
            const parsedJson = JSON.parse(match[1]);
             if (numFilesProcessed > 0 && isMultiImage && 
                (!parsedJson.page_count_or_length_indicator || 
                 typeof parsedJson.page_count_or_length_indicator !== 'number' || 
                 parsedJson.page_count_or_length_indicator === null ||
                 parsedJson.page_count_or_length_indicator === 0)
               ) {
                 parsedJson.page_count_or_length_indicator = numFilesProcessed;
            }
            return parsedJson;
        } 
        catch (e) { console.error("Failed to parse JSON from markdown block:", e); }
    }
    console.error("Final failure to parse JSON from LLM:", outputContent.substring(0,500), err);
    return { 
        error: 'Failed to parse structured data from LLM response.', 
        raw_response: outputContent.substring(0, 1000),
        title: "Extraction Error", 
        content_type_suggestion: userHintContentType || "other",
        page_count_or_length_indicator: numFilesProcessed > 0 && isMultiImage ? numFilesProcessed : (numFilesProcessed === 1 ? "1 document" : null)
    };
  }
}

// --- CORE ANALYSIS FUNCTION (Unified) ---
async function analyzeUploadedFiles(files, userHintContentType) {
  if (!files || files.length === 0) {
    throw new Error("No files provided for analysis.");
  }

  let messages;
  let llmInputDescription = "";
  let isMultiImageScenario = false;
  let extractedImagePathsForCleanup = [];

  const allFilesAreImages = files.every(file => file.mimetype.startsWith('image/'));
  
  const allFilesAreTextConvertible = files.every(file => 
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.mimetype === 'text/plain' ||
    file.mimetype === 'text/markdown' ||
    file.mimetype.startsWith('text/')
  );

  if (allFilesAreImages) {
    isMultiImageScenario = true;
    llmInputDescription = `a series of ${files.length} images`;
    const userMessageContent = [{ type: "text", text: `Please analyze these ${files.length} images as a single educational material. User hint for content type: '${userHintContentType || 'N/A'}'. Synthesize the information into one JSON object, treating them as sequential pages.` }];
    for (const file of files) {
      const fileData = fs.readFileSync(file.path);
      const base64Image = fileData.toString('base64');
      userMessageContent.push({ type: "image_url", image_url: { url: `data:${file.mimetype};base64,${base64Image}`, detail: "high" } });
    }
    messages = [{ role: "system", content: GET_UNIVERSAL_SYSTEM_PROMPT(userHintContentType, llmInputDescription) }, { role: "user", content: userMessageContent }];
  
  } else if (allFilesAreTextConvertible) {
    llmInputDescription = files.length > 1 ? `a collection of ${files.length} text-based documents` : `a text-based document`;
    let combinedText = "";
    let imagesFromPdfs = [];

    for (const file of files) {
      let currentFileText = "";
      if (file.mimetype === 'application/pdf') {
        try {
          const data = await pdf(file.path);
          currentFileText = data.text;
          if (!currentFileText || currentFileText.trim().length < 100) {
            console.log(`PDF ${file.originalname} seems image-based or has minimal text. Attempting image extraction.`);
            const extractedPdfImages = await extractImagesFromPdf(file.path);
            if (extractedPdfImages && extractedPdfImages.length > 0) {
              console.log(`Extracted ${extractedPdfImages.length} images from ${file.originalname}`);
              imagesFromPdfs.push(...extractedPdfImages.map(imgPath => ({
                  path: imgPath,
                  mimetype: `image/${path.extname(imgPath).slice(1) || 'png'}`
              })));
              continue;
            }
          }
        } catch (e) { throw new Error(`PDF processing failed for ${file.originalname}: ${e.message}`); }
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try { const { value } = await mammoth.extractRawText({ path: file.path }); currentFileText = value; } 
        catch (e) { throw new Error(`DOCX parsing failed for ${file.originalname}: ${e.message}`); }
      } else { 
        currentFileText = fs.readFileSync(file.path, 'utf-8');
      }
      if(currentFileText) {
        combinedText += `\n\n--- START OF DOCUMENT: ${file.originalname} ---\n${currentFileText}\n--- END OF DOCUMENT: ${file.originalname} ---\n\n`;
      }
    }

    if (imagesFromPdfs.length > 0) {
      isMultiImageScenario = true;
      llmInputDescription = `a series of ${imagesFromPdfs.length} images (extracted from PDF(s))`;
      const userMessageContent = [{ type: "text", text: `Please analyze these ${imagesFromPdfs.length} images (extracted from uploaded PDF(s)) as a single educational material. User hint for content type: '${userHintContentType || 'N/A'}'. Synthesize into one JSON.` }];
      for (const imgFile of imagesFromPdfs) {
        const fileData = fs.readFileSync(imgFile.path);
        const base64Image = fileData.toString('base64');
        userMessageContent.push({ type: "image_url", image_url: { url: `data:${imgFile.mimetype};base64,${base64Image}`, detail: "high" } });
        extractedImagePathsForCleanup.push(imgFile.path);
      }
      messages = [{ role: "system", content: GET_UNIVERSAL_SYSTEM_PROMPT(userHintContentType, llmInputDescription) }, { role: "user", content: userMessageContent }];
    } else if (combinedText.trim().length > 0) {
      if (combinedText.length > MAX_TEXT_CHARS_FOR_PROMPT) {
        combinedText = combinedText.substring(0, MAX_TEXT_CHARS_FOR_PROMPT) + "\n[...combined text truncated due to length...]";
      }
      messages = [
          { role: "system", content: GET_UNIVERSAL_SYSTEM_PROMPT(userHintContentType, llmInputDescription) },
          { role: "user", content: `Please extract and structure data from the following ${llmInputDescription}. User hint: '${userHintContentType || 'N/A'}'. Combined Document Text:\n\n${combinedText}` }
      ];
    } else {
        throw new Error("No processable content found in the uploaded text-based files.");
    }

  } else {
    if (files.length === 1) {
        throw new Error(`Unsupported file type: ${files[0].originalname} (${files[0].mimetype}).`);
    } else {
        throw new Error("Mixed file types are not currently supported for combined analysis. Please upload images separately from text documents.");
    }
  }
  
  const response = await openai.chat.completions.create({ 
    model: "gpt-4o", 
    messages, 
    max_tokens: 3500, 
    temperature: 0.1, 
    response_format: { type: "json_object" } 
  });
  
  // Cleanup extracted PDF images
  extractedImagePathsForCleanup.forEach(imgPath => {
      if (fs.existsSync(imgPath)) {
        try { fs.unlinkSync(imgPath); } 
        catch(e){ console.error("Error cleaning up extracted PDF image:", imgPath, e); }
      }
  });

  return parseLlmOutput(response.choices[0].message.content?.trim(), userHintContentType, files.length, isMultiImageScenario);
}

const normalizeStringOrNull = (val) => {
  if (val === undefined || val === null || String(val).trim() === '' || String(val).toLowerCase() === 'null') {
    return null;
  }
  return String(val).trim();
};

// --- MAIN UPLOAD CONTROLLER ---
exports.uploadMaterial = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_subject_id, user_content_type } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!child_subject_id) return res.status(400).json({ error: 'Missing child_subject_id' });
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

  try {
    // Verify parent owns the child_subject
    const { data: childSubject, error: childSubjectError } = await supabase
      .from('child_subjects')
      .select(`
        id,
        child:child_id (
          id,
          parent_id
        )
      `)
      .eq('id', child_subject_id)
      .single();

    if (childSubjectError || !childSubject || childSubject.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this child subject' });
    }

    const lesson_json_result = await analyzeUploadedFiles(req.files, user_content_type);
    res.json({ lesson_json: lesson_json_result });
  } catch (err) {
    console.error("Error in uploadMaterial controller:", err.message);
    res.status(500).json({ error: err.message || 'File processing or AI analysis error.' });
  } finally {
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file && file.path && fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } 
          catch(e) { console.error("Error unlinking temp file:", file.path, e); }
        }
      });
    }
  }
};

// --- Save Material ---
exports.saveMaterial = async (req, res) => {
  const parent_id = getParentId(req);
  const { 
    lesson_id, // NEW: Required lesson container ID
    child_subject_id, // Keep for denormalization
    title, 
    content_type, 
    lesson_json, 
    grade_max_value, 
    due_date, 
    completed_at 
  } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!lesson_id) return res.status(400).json({ error: 'lesson_id is required' });
  if (!child_subject_id) return res.status(400).json({ error: 'child_subject_id is required' });
  if (!title || !content_type || !lesson_json) {
    return res.status(400).json({ error: 'Missing required data: title, content_type, lesson_json' });
  }

  try {
    // Verify parent owns the lesson container
    const isOwner = await verifyLessonOwnership(parent_id, lesson_id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this lesson' });
    }

    let finalLessonJson = lesson_json;
    if (typeof lesson_json === 'string') {
      try { finalLessonJson = JSON.parse(lesson_json); } 
      catch (e) { return res.status(400).json({ error: "Invalid lesson_json format." }); }
    }

    const insertPayload = {
      lesson_id: normalizeStringOrNull(lesson_id),
      child_subject_id: normalizeStringOrNull(child_subject_id), // Denormalized for easier querying
      title: normalizeStringOrNull(title), 
      content_type: normalizeStringOrNull(content_type),
      lesson_json: finalLessonJson, 
      status: 'approved',
      grade_max_value: normalizeStringOrNull(grade_max_value),
      due_date: normalizeStringOrNull(due_date),
      completed_at: completed_at ? new Date(completed_at).toISOString() : null
    };

    const { data, error } = await supabase
      .from('materials')
      .insert([insertPayload])
      .select()
      .single();

    if (error) { 
      console.error("Error saving material to Supabase:", error);
      return res.status(400).json({ error: error.message }); 
    }
    res.json(data);
  } catch (error) {
    console.error('Error saving material:', error);
    res.status(500).json({ error: 'Failed to save material' });
  }
};

// --- List Materials for a Lesson Container ---
exports.listMaterialsForLesson = async (req, res) => {
  const parent_id = getParentId(req);
  const { lesson_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!lesson_id) return res.status(400).json({ error: 'lesson_id is required' });

  try {
    // Verify parent owns the lesson container
    const isOwner = await verifyLessonOwnership(parent_id, lesson_id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this lesson' });
    }

    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('lesson_id', lesson_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error listing materials:', error);
    res.status(500).json({ error: 'Failed to list materials' });
  }
};

// --- List Materials for a Child Subject (for backward compatibility) ---
exports.listMaterialsForChildSubject = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_subject_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!child_subject_id) return res.status(400).json({ error: 'child_subject_id is required' });

  try {
    // Verify parent owns the child_subject
    const { data: childSubject, error: childSubjectError } = await supabase
      .from('child_subjects')
      .select(`
        id,
        child:child_id (
          id,
          parent_id
        )
      `)
      .eq('id', child_subject_id)
      .single();

    if (childSubjectError || !childSubject || childSubject.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this child subject' });
    }

    const { data, error } = await supabase
      .from('materials')
      .select(`
        *,
        child_subject:child_subject_id (
          id,
          custom_subject_name_override,
          subject:subject_id (
            id,
            name
          )
        )
      `)
      .eq('child_subject_id', child_subject_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Process materials to include subject name
    const processedMaterials = (data || []).map(material => ({
      ...material,
      subject_name: material.child_subject?.custom_subject_name_override || 
                   material.child_subject?.subject?.name || 
                   'General Studies'
    }));
    
    res.json(processedMaterials);
  } catch (error) {
    console.error('Error listing materials for child subject:', error);
    res.status(500).json({ error: 'Failed to list materials' });
  }
};

// --- Update Material Details ---
exports.updateMaterialDetails = async (req, res) => {
  const parent_id = getParentId(req);
  const { material_id } = req.params;
  const {
    title, 
    content_type, 
    lesson_json,
    lesson_id, // Allow changing which lesson container this belongs to
    grade_value, 
    grade_max_value, 
    grading_notes,
    completed_at, 
    due_date
  } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!material_id) return res.status(400).json({ error: 'material_id is required' });

  try {
    // First get the material to verify ownership
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select(`
        id,
        lesson:lesson_id (
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
        )
      `)
      .eq('id', material_id)
      .single();

    if (materialError || !material || material.lesson.unit.child_subject.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this material' });
    }

    // If changing lesson_id, verify ownership of the new lesson
    if (lesson_id && lesson_id !== material.lesson.id) {
      const isNewLessonOwner = await verifyLessonOwnership(parent_id, lesson_id);
      if (!isNewLessonOwner) {
        return res.status(403).json({ error: 'Access denied to the target lesson' });
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = normalizeStringOrNull(title);
    if (content_type !== undefined) updateData.content_type = normalizeStringOrNull(content_type);
    if (lesson_id !== undefined) updateData.lesson_id = normalizeStringOrNull(lesson_id);
    
    if (lesson_json !== undefined) {
      if (typeof lesson_json === 'string') {
        try { updateData.lesson_json = JSON.parse(lesson_json); } 
        catch (e) { return res.status(400).json({ error: "Invalid lesson_json format." }); }
      } else if (typeof lesson_json === 'object' && lesson_json !== null) {
        updateData.lesson_json = lesson_json;
      }
    }
    
    if (grade_value !== undefined) updateData.grade_value = normalizeStringOrNull(grade_value);
    if (grade_max_value !== undefined) updateData.grade_max_value = normalizeStringOrNull(grade_max_value);
    if (grading_notes !== undefined) updateData.grading_notes = normalizeStringOrNull(grading_notes);
    if (completed_at !== undefined) {
      updateData.completed_at = completed_at ? new Date(completed_at).toISOString() : null;
    }
    if (due_date !== undefined) updateData.due_date = normalizeStringOrNull(due_date);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid update data provided' });
    }
    
    const { data, error } = await supabase
      .from('materials')
      .update(updateData)
      .eq('id', material_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Material not found or not updated" });
    res.json(data);
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
};

// --- Toggle Material Completion ---
exports.toggleMaterialCompletion = async (req, res) => {
  const parent_id = getParentId(req);
  const { material_id } = req.params;
  const { grade } = req.body; // Optional grade parameter

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!material_id) return res.status(400).json({ error: 'material_id is required' });

  try {
    // Get current material and verify ownership
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select(`
        id,
        completed_at,
        lesson:lesson_id (
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
        )
      `)
      .eq('id', material_id)
      .single();

    if (materialError || !material || material.lesson.unit.child_subject.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this material' });
    }

    const newCompletedAt = material.completed_at ? null : new Date().toISOString();
    
    // Prepare update object
    const updateData = { completed_at: newCompletedAt };
    
    // If marking as complete and grade is provided, update the grade
    if (newCompletedAt && grade !== undefined && grade !== null) {
      updateData.grade_value = grade.toString().trim();
    }
    
    const { data, error } = await supabase
      .from('materials')
      .update(updateData)
      .eq('id', material_id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error toggling material completion:', error);
    res.status(500).json({ error: 'Failed to toggle completion' });
  }
};

// --- Delete Material ---
exports.deleteMaterial = async (req, res) => {
  const parent_id = getParentId(req);
  const { material_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!material_id) return res.status(400).json({ error: 'material_id is required' });

  try {
    // Get material and verify ownership
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select(`
        id,
        title,
        lesson:lesson_id (
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
        )
      `)
      .eq('id', material_id)
      .single();

    if (materialError || !material || material.lesson.unit.child_subject.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this material' });
    }

    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', material_id);

    if (error) throw error;
    
    res.json({ 
      message: 'Material deleted successfully',
      deleted_material: {
        id: material.id,
        title: material.title
      }
    });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
};

exports.createMaterialManually = async (req, res) => {
  const parent_id = getParentId(req);
  const { 
    lesson_id, 
    child_subject_id, 
    title, 
    content_type, 
    lesson_json, 
    grade_max_value, 
    due_date, 
    completed_at 
  } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!lesson_id) return res.status(400).json({ error: 'lesson_id is required' });
  if (!child_subject_id) return res.status(400).json({ error: 'child_subject_id is required' });
  if (!title || !content_type) {
    return res.status(400).json({ error: 'Missing required data: title, content_type' });
  }

  try {
    // Verify parent owns the lesson container
    const isOwner = await verifyLessonOwnership(parent_id, lesson_id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this lesson' });
    }

    let finalLessonJson = lesson_json;
    if (typeof lesson_json === 'string') {
      try { 
        finalLessonJson = JSON.parse(lesson_json); 
      } catch (e) { 
        return res.status(400).json({ error: "Invalid lesson_json format." }); 
      }
    }

    // Ensure the lesson_json has required fields for manual entry
    if (!finalLessonJson || typeof finalLessonJson !== 'object') {
      finalLessonJson = {};
    }

    // Set defaults for manual entries
    finalLessonJson = {
      title: title,
      content_type_suggestion: content_type,
      main_content_summary_or_extract: 'Manually created material',
      learning_objectives: [],
      subject_keywords_or_subtopics: [],
      page_count_or_length_indicator: 'Manual entry',
      tasks_or_questions: [],
      created_manually: true,
      ...finalLessonJson // Override with provided data
    };

    const insertPayload = {
      lesson_id: normalizeStringOrNull(lesson_id),
      child_subject_id: normalizeStringOrNull(child_subject_id),
      title: normalizeStringOrNull(title), 
      content_type: normalizeStringOrNull(content_type),
      lesson_json: finalLessonJson, 
      status: 'approved',
      grade_max_value: normalizeStringOrNull(grade_max_value),
      due_date: normalizeStringOrNull(due_date),
      completed_at: completed_at ? new Date(completed_at).toISOString() : null
    };

    const { data, error } = await supabase
      .from('materials')
      .insert([insertPayload])
      .select()
      .single();

    if (error) { 
      console.error("Error saving manual material to Supabase:", error);
      return res.status(400).json({ error: error.message }); 
    }

    res.status(201).json({
      success: true,
      material: data,
      message: 'Material created successfully'
    });

  } catch (error) {
    console.error('Error creating manual material:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
};

// Toggle material completion status with bidirectional sync
exports.toggleMaterialCompletion = async (req, res) => {
  const parent_id = getParentId(req);
  const { material_id } = req.params;
  const { grade } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!material_id) return res.status(400).json({ error: 'material_id is required' });

  try {
    // First get the material to verify ownership
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select(`
        id,
        title,
        completed_at,
        lesson:lesson_id (
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
        )
      `)
      .eq('id', material_id)
      .single();

    if (materialError || !material || material.lesson.unit.child_subject.child.parent_id !== parent_id) {
      return res.status(403).json({ error: 'Access denied to this material' });
    }

    // Toggle completion status
    const isCurrentlyCompleted = !!material.completed_at;
    const newCompletedAt = isCurrentlyCompleted ? null : new Date().toISOString();

    // Update material completion
    const { data: updatedMaterial, error: updateError } = await supabase
      .from('materials')
      .update({ 
        completed_at: newCompletedAt,
        ...(grade && { grade_value: grade })
      })
      .eq('id', material_id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    // Sync with schedule entries that reference this material
    const childId = material.lesson.unit.child_subject.child.id;
    const newScheduleStatus = newCompletedAt ? 'completed' : 'scheduled';

    // Find related schedule entries
    const { data: relatedScheduleEntries, error: scheduleError } = await supabase
      .from('schedule_entries')
      .select('id, material_id, subject_name, notes')
      .eq('child_id', childId)
      .eq('material_id', material.lesson.id);

    if (!scheduleError && relatedScheduleEntries?.length > 0) {
      // Update all related schedule entries
      const { error: syncError } = await supabase
        .from('schedule_entries')
        .update({ status: newScheduleStatus })
        .eq('child_id', childId)
        .eq('material_id', material.lesson.id);

      if (syncError) {
        console.warn('Failed to sync schedule entries:', syncError);
      }
    }

    res.json({
      success: true,
      material: updatedMaterial,
      synced_schedule_entries: relatedScheduleEntries?.length || 0,
      message: `Material ${newCompletedAt ? 'completed' : 'marked as incomplete'} and synced with schedule`
    });

  } catch (error) {
    console.error('Error toggling material completion:', error);
    res.status(500).json({ error: 'Failed to toggle completion status' });
  }
};