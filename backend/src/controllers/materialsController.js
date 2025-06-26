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

// Helper function to extract lesson number from title
function extractLessonNumber(title) {
  if (!title || typeof title !== 'string') return null;
  
  // Match various lesson number patterns
  const patterns = [
    /lesson\s*(\d+)/i,           // "Lesson 1", "Lesson 12", "lesson 5"
    /chapter\s*(\d+)/i,          // "Chapter 1", "chapter 3"
    /unit\s*(\d+)/i,             // "Unit 1", "unit 4"
    /\b(\d+)\b/,                 // Any standalone number
    /(\d+)(?:st|nd|rd|th)/i      // "1st", "2nd", "3rd", "4th"
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }
  
  return null;
}

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
    model: "gpt-4.1-mini", 
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
    completed_at,
    parent_material_id, // NEW: Links to parent lesson material
    material_relationship, // NEW: 'primary_lesson', 'worksheet_for', 'assignment_for', 'supplement_for'
    is_primary_lesson // NEW: Boolean flag for primary lesson content
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
      completed_at: completed_at ? new Date(completed_at).toISOString() : null,
      parent_material_id: normalizeStringOrNull(parent_material_id), // Links to parent lesson
      material_relationship: normalizeStringOrNull(material_relationship), // Type of relationship
      is_primary_lesson: is_primary_lesson === true // Ensure boolean
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
      .eq('lesson_id', lesson_id);

    if (error) throw error;
    
    // Sort materials by lesson number extracted from title
    const sortedMaterials = (data || []).sort((a, b) => {
      const lessonNumA = extractLessonNumber(a.title);
      const lessonNumB = extractLessonNumber(b.title);
      
      // Primary sort: by lesson number (if both have numbers)
      if (lessonNumA !== null && lessonNumB !== null) {
        return lessonNumA - lessonNumB;
      }
      
      // Secondary sort: materials with lesson numbers come before those without
      if (lessonNumA !== null && lessonNumB === null) return -1;
      if (lessonNumA === null && lessonNumB !== null) return 1;
      
      // Tertiary sort: alphabetical by title for materials without lesson numbers
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      if (titleA < titleB) return -1;
      if (titleA > titleB) return 1;
      
      // Final fallback: by creation date (newer first)
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    res.json(sortedMaterials);
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
      .eq('child_subject_id', child_subject_id);

    if (error) throw error;
    
    // Process materials to include subject name and sort by lesson number
    const processedMaterials = (data || []).map(material => ({
      ...material,
      subject_name: material.child_subject?.custom_subject_name_override || 
                   material.child_subject?.subject?.name || 
                   'General Studies'
    })).sort((a, b) => {
      const lessonNumA = extractLessonNumber(a.title);
      const lessonNumB = extractLessonNumber(b.title);
      
      // Primary sort: by lesson number (if both have numbers)
      if (lessonNumA !== null && lessonNumB !== null) {
        return lessonNumA - lessonNumB;
      }
      
      // Secondary sort: materials with lesson numbers come before those without
      if (lessonNumA !== null && lessonNumB === null) return -1;
      if (lessonNumA === null && lessonNumB !== null) return 1;
      
      // Tertiary sort: alphabetical by title for materials without lesson numbers
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      if (titleA < titleB) return -1;
      if (titleA > titleB) return 1;
      
      // Final fallback: by creation date (newer first)
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    res.json(processedMaterials);
  } catch (error) {
    console.error('Error listing materials for child subject:', error);
    res.status(500).json({ error: 'Failed to list materials' });
  }
};

// --- Get Materials Grouped by Lesson ---
exports.getMaterialsByLessonGrouped = async (req, res) => {
  const parent_id = getParentId(req);
  const { lesson_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!lesson_id) return res.status(400).json({ error: 'lesson_id is required' });

  try {
    // Verify parent owns the lesson
    const isOwner = await verifyLessonOwnership(parent_id, lesson_id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this lesson' });
    }

    // Get all materials for this lesson, ordered by primary lesson first, then by relationship
    const { data: materials, error } = await supabase
      .from('materials')
      .select('*')
      .eq('lesson_id', lesson_id)
      .order('is_primary_lesson', { ascending: false })
      .order('material_relationship')
      .order('created_at');

    if (error) {
      console.error('Error fetching materials:', error);
      return res.status(500).json({ error: 'Failed to fetch materials' });
    }

    // Group materials by their relationship to the primary lesson
    const grouped = {
      primary_lesson: null,
      worksheets: [],
      assignments: [],
      supplements: [],
      other: []
    };

    materials.forEach(material => {
      if (material.is_primary_lesson) {
        grouped.primary_lesson = material;
      } else if (material.material_relationship === 'worksheet_for') {
        grouped.worksheets.push(material);
      } else if (material.material_relationship === 'assignment_for') {
        grouped.assignments.push(material);
      } else if (material.material_relationship === 'supplement_for') {
        grouped.supplements.push(material);
      } else {
        grouped.other.push(material);
      }
    });

    res.json({ 
      lesson_id,
      materials: grouped,
      total_materials: materials.length 
    });
  } catch (error) {
    console.error('Error in getMaterialsByLessonGrouped:', error);
    res.status(500).json({ error: 'Failed to fetch grouped materials' });
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
    due_date,
    parent_material_id, // NEW: Update parent material link
    material_relationship, // NEW: Update relationship type
    is_primary_lesson // NEW: Update primary lesson flag
  } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!material_id) return res.status(400).json({ error: 'material_id is required' });

  try {
    // First get the material with basic info
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, lesson_id, child_subject_id')
      .eq('id', material_id)
      .single();

    console.log('Material ownership check:', { 
      materialError, 
      material, 
      parent_id
    });

    if (materialError) {
      console.error('Supabase error fetching material:', materialError);
      return res.status(500).json({ error: 'Database error fetching material' });
    }

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    // Verify ownership based on whether the material has a lesson_id or not
    let ownershipVerified = false;

    if (material.lesson_id) {
      // Material belongs to a lesson - verify through lesson ownership
      const isOwner = await verifyLessonOwnership(parent_id, material.lesson_id);
      if (!isOwner) {
        return res.status(403).json({ error: 'Access denied to this material via lesson' });
      }
      ownershipVerified = true;
    } else if (material.child_subject_id) {
      // Material belongs directly to a child subject - verify through child subject
      const { data: childSubject, error: csError } = await supabase
        .from('child_subjects')
        .select(`
          id,
          child:child_id (
            id,
            parent_id
          )
        `)
        .eq('id', material.child_subject_id)
        .single();

      if (csError || !childSubject || childSubject.child.parent_id !== parent_id) {
        console.log('Child subject ownership check failed:', { csError, childSubject });
        return res.status(403).json({ error: 'Access denied to this material via child subject' });
      }
      ownershipVerified = true;
    }

    if (!ownershipVerified) {
      return res.status(403).json({ error: 'Could not verify ownership of this material' });
    }

    // If changing lesson_id, verify ownership of the new lesson
    if (lesson_id && lesson_id !== material.lesson_id) {
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
    
    // Handle new relationship fields
    if (parent_material_id !== undefined) updateData.parent_material_id = normalizeStringOrNull(parent_material_id);
    if (material_relationship !== undefined) updateData.material_relationship = normalizeStringOrNull(material_relationship);
    if (is_primary_lesson !== undefined) updateData.is_primary_lesson = is_primary_lesson === true;

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
    // First get the material
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', material_id)
      .single();

    if (materialError) {
      console.error('Error fetching material:', materialError);
      return res.status(500).json({ error: 'Database error fetching material' });
    }

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    // Verify ownership based on whether the material has a lesson_id or not
    let ownershipVerified = false;
    let childId = null;

    if (material.lesson_id) {
      // Material belongs to a lesson - verify through lesson ownership
      const isOwner = await verifyLessonOwnership(parent_id, material.lesson_id);
      if (!isOwner) {
        return res.status(403).json({ error: 'Access denied to this material' });
      }
      ownershipVerified = true;
      
      // Get child ID from lesson
      const { data: lessonData } = await supabase
        .from('lessons')
        .select(`
          units (
            child_subjects (
              child_id
            )
          )
        `)
        .eq('id', material.lesson_id)
        .single();
        
      if (lessonData?.units?.child_subjects?.child_id) {
        childId = lessonData.units.child_subjects.child_id;
      }
    } else if (material.child_subject_id) {
      // Material belongs directly to a child subject - verify through child subject
      const { data: childSubject, error: csError } = await supabase
        .from('child_subjects')
        .select(`
          id,
          child_id,
          children (
            id,
            parent_id
          )
        `)
        .eq('id', material.child_subject_id)
        .single();

      if (csError || !childSubject || childSubject.children?.parent_id !== parent_id) {
        return res.status(403).json({ error: 'Access denied to this material' });
      }
      ownershipVerified = true;
      childId = childSubject.child_id;
    }

    if (!ownershipVerified) {
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
        ...(grade && !isCurrentlyCompleted && { grade_value: grade })
      })
      .eq('id', material_id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    // Sync with schedule entries that reference this material's lesson container
    const newScheduleStatus = newCompletedAt ? 'completed' : 'scheduled';
    let syncedScheduleEntries = 0;

    // Only sync if material belongs to a lesson container
    if (material.lesson_id && childId) {
      const lessonContainerId = material.lesson_id;
      
      try {
        // Find related schedule entries (schedule entries reference lesson containers, not individual materials)
        const { data: relatedScheduleEntries, error: scheduleError } = await supabase
          .from('schedule_entries')
          .select('id, material_id, subject_name, scheduled_date, start_time')
          .eq('child_id', childId)
          .eq('material_id', lessonContainerId);

        if (!scheduleError && relatedScheduleEntries?.length > 0) {
          // Update all related schedule entries status
          const { error: syncError } = await supabase
            .from('schedule_entries')
            .update({ status: newScheduleStatus })
            .eq('child_id', childId)
            .eq('material_id', lessonContainerId);

          if (!syncError) {
            syncedScheduleEntries = relatedScheduleEntries.length;
          } else {
            console.warn('Failed to sync schedule entries:', syncError);
          }
        }
      } catch (syncErr) {
        console.warn('Error during schedule sync:', syncErr);
      }
    }

    res.json({
      success: true,
      material: updatedMaterial,
      synced_schedule_entries: syncedScheduleEntries,
      message: `Material ${newCompletedAt ? 'completed' : 'marked as incomplete'}${syncedScheduleEntries > 0 ? ` and synced with ${syncedScheduleEntries} schedule entries` : ''}`
    });

  } catch (error) {
    console.error('Error toggling material completion:', error);
    res.status(500).json({ error: 'Failed to toggle completion status' });
  }
};