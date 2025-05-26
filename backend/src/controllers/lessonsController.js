const supabase = require('../utils/supabaseClient');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { GET_UNIVERSAL_SYSTEM_PROMPT } = require('../utils/llmPrompts'); // Import the prompt

const { extractImagesFromPdf } = require('../utils/pdfImageExtract'); // <--- Use your utility

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MAX_TEXT_CHARS_FOR_PROMPT = 70000; 


// --- HELPER FUNCTION TO PARSE LLM OUTPUT ---
async function parseLlmOutput(outputContent, userHintContentType, numFilesProcessed = 1, isMultiImage = false) {
  if (!outputContent) throw new Error("OpenAI returned empty content.");
  try {
    const parsedJson = JSON.parse(outputContent);
    if (numFilesProcessed > 0 && isMultiImage && 
        (!parsedJson.page_count_or_length_indicator || 
         typeof parsedJson.page_count_or_length_indicator !== 'number' || 
         parsedJson.page_count_or_length_indicator === null ||
         parsedJson.page_count_or_length_indicator === 0) // Also check for 0 if LLM fails
       ) {
        parsedJson.page_count_or_length_indicator = numFilesProcessed;
    } else if (numFilesProcessed === 1 && parsedJson.page_count_or_length_indicator === null && !isMultiImage) {
        // For single non-image files, if LLM can't determine pages, it's okay to be null or set a default
        // parsedJson.page_count_or_length_indicator = "1 document"; // Optional default
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
            } else if (numFilesProcessed === 1 && parsedJson.page_count_or_length_indicator === null && !isMultiImage) {
                // parsedJson.page_count_or_length_indicator = "1 document";
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
  let extractedImagePathsForCleanup = []; // Store paths of images extracted from PDFs

  const allFilesAreImages = files.every(file => file.mimetype.startsWith('image/'));
  
  // Check if all files are of types we can convert to text
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
    let imagesFromPdfs = []; // Store images extracted from any PDF

    for (const file of files) {
      let currentFileText = "";
      if (file.mimetype === 'application/pdf') {
        try {
          const data = await pdf(file.path); // Pass file path to pdf-parse
          currentFileText = data.text;
          // If PDF text is empty/minimal (image-based PDF), try extracting images
          if (!currentFileText || currentFileText.trim().length < 100) { // Heuristic for image-based PDF
            console.log(`PDF ${file.originalname} seems image-based or has minimal text. Attempting image extraction.`);
            const extractedPdfImages = await extractImagesFromPdf(file.path); // This is your util
            if (extractedPdfImages && extractedPdfImages.length > 0) {
              console.log(`Extracted ${extractedPdfImages.length} images from ${file.originalname}`);
              imagesFromPdfs.push(...extractedPdfImages.map(imgPath => ({
                  path: imgPath, // Path to the temporary extracted image
                  mimetype: `image/${path.extname(imgPath).slice(1) || 'png'}` // Assuming png or get from util
              })));
              continue; // Skip adding text for this PDF, will process its images later
            } else {
                console.log(`No images extracted from ${file.originalname}, proceeding with minimal text (if any).`);
            }
          }
        } catch (e) { throw new Error(`PDF processing failed for ${file.originalname}: ${e.message}`); }
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try { const { value } = await mammoth.extractRawText({ path: file.path }); currentFileText = value; } 
        catch (e) { throw new Error(`DOCX parsing failed for ${file.originalname}: ${e.message}`); }
      } else { 
        currentFileText = fs.readFileSync(file.path, 'utf-8');
      }
      if(currentFileText) { // Only add if text was extracted
        combinedText += `\n\n--- START OF DOCUMENT: ${file.originalname} ---\n${currentFileText}\n--- END OF DOCUMENT: ${file.originalname} ---\n\n`;
      }
    }

    if (imagesFromPdfs.length > 0) {
      // If any PDF yielded images, treat the whole batch as a multi-image scenario
      isMultiImageScenario = true;
      llmInputDescription = `a series of ${imagesFromPdfs.length} images (extracted from PDF(s))`;
      const userMessageContent = [{ type: "text", text: `Please analyze these ${imagesFromPdfs.length} images (extracted from uploaded PDF(s)) as a single educational material. User hint for content type: '${userHintContentType || 'N/A'}'. Synthesize into one JSON.` }];
      for (const imgFile of imagesFromPdfs) {
        const fileData = fs.readFileSync(imgFile.path);
        const base64Image = fileData.toString('base64');
        userMessageContent.push({ type: "image_url", image_url: { url: `data:${imgFile.mimetype};base64,${base64Image}`, detail: "high" } });
        extractedImagePathsForCleanup.push(imgFile.path); // Add to cleanup list
      }
      messages = [{ role: "system", content: GET_UNIVERSAL_SYSTEM_PROMPT(userHintContentType, llmInputDescription) }, { role: "user", content: userMessageContent }];
    } else if (combinedText.trim().length > 0) {
      // All files were text-based and yielded text
      if (combinedText.length > MAX_TEXT_CHARS_FOR_PROMPT) {
        combinedText = combinedText.substring(0, MAX_TEXT_CHARS_FOR_PROMPT) + "\n[...combined text truncated due to length...]";
      }
      messages = [
          { role: "system", content: UNIVERSAL_BASE_PROMPT(userHintContentType, llmInputDescription) },
          { role: "user", content: `Please extract and structure data from the following ${llmInputDescription}. User hint: '${userHintContentType || 'N/A'}'. Combined Document Text:\n\n${combinedText}` }
      ];
    } else {
        throw new Error("No processable content found in the uploaded text-based files.");
    }

  } else { // Mixed types or unsupported single type
    if (files.length === 1) {
        throw new Error(`Unsupported file type: ${files[0].originalname} (${files[0].mimetype}).`);
    } else {
        throw new Error("Mixed file types (e.g., images and PDFs together) are not currently supported for combined analysis in a single upload. Please upload images separately from text documents, or upload multiple files of the same primary type (all images or all text-based).");
    }
  }
  
  const response = await openai.chat.completions.create({ model: "gpt-4o", messages, max_tokens: 3500, temperature: 0.1, response_format: { type: "json_object" } });
  
  // Cleanup extracted PDF images *after* OpenAI call
  extractedImagePathsForCleanup.forEach(imgPath => {
      if (fs.existsSync(imgPath)) try { fs.unlinkSync(imgPath); } catch(e){ console.error("Error cleaning up extracted PDF image:", imgPath, e); }
  });

  return parseLlmOutput(response.choices[0].message.content?.trim(), userHintContentType, files.length, isMultiImageScenario);
}
// --- MAIN UPLOAD CONTROLLER ---
exports.uploadLesson = async (req, res) => {
  const parent_id = req.header('x-parent-id');
  const { child_subject_id, user_content_type } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!child_subject_id) return res.status(400).json({ error: 'Missing child_subject_id' });
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

  try {
    const lesson_json_result = await analyzeUploadedFiles(req.files, user_content_type);
    res.json({ lesson_json: lesson_json_result });
  } catch (err) {
    console.error("Error in uploadLesson controller:", err.message);
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

const normalizeStringOrNull = (val) => {
  if (val === undefined || val === null || String(val).trim() === '' || String(val).toLowerCase() === 'null') {
    return null;
  }
  return String(val).trim();
};

// --- Save, List, Update, Toggle Completion Controllers ---
exports.saveLesson = async (req, res) => {
  const parent_id = req.header('x-parent-id');
  const { 
    child_subject_id, title, content_type, lesson_json, 
    grade_max_value, due_date, completed_at, unit_id
  } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!child_subject_id || typeof child_subject_id !== 'string' || child_subject_id.length < 30) { // Basic UUID check
      console.error("Invalid or missing child_subject_id in saveLesson:", child_subject_id);
      return res.status(400).json({ error: 'Valid child_subject_id is required.'});
  }
  if (!lesson_json || !title || !content_type) {
    return res.status(400).json({ error: 'Missing required data for saving lesson (title, content_type, lesson_json).' });
  }
  
  let finalLessonJson = lesson_json;
  if (typeof lesson_json === 'string') {
    try { finalLessonJson = JSON.parse(lesson_json); } 
    catch (e) { return res.status(400).json({ error: "Invalid lesson_json format (string)." }); }
  }
  if (typeof finalLessonJson !== 'object' || finalLessonJson === null) {
      return res.status(400).json({ error: "lesson_json must be a valid object."});
  }

  const insertPayload = {
    child_subject_id: normalizeStringOrNull(child_subject_id), // Ensure it's a valid UUID string or null (though it's required)
    title: normalizeStringOrNull(title), 
    content_type: normalizeStringOrNull(content_type),
    lesson_json: finalLessonJson, 
    status: 'approved',
  };

  insertPayload.grade_max_value = normalizeStringOrNull(grade_max_value);
  insertPayload.due_date = normalizeStringOrNull(due_date); // Dates are stored as text YYYY-MM-DD
  
  if (completed_at !== undefined && completed_at !== null && String(completed_at).trim() !== '') {
      try { insertPayload.completed_at = new Date(completed_at).toISOString(); }
      catch (e) { 
        console.warn("Invalid completed_at date format received during save:", completed_at);
        insertPayload.completed_at = null; 
      }
  } else {
    insertPayload.completed_at = null;
  }
  
  insertPayload.unit_id = normalizeStringOrNull(unit_id); // This will convert "null" string or "" to actual null

  // Final check for required fields after normalization
  if (!insertPayload.child_subject_id || !insertPayload.title || !insertPayload.content_type) {
      return res.status(400).json({ error: 'Required fields (child_subject_id, title, content_type) are missing or invalid after normalization.' });
  }

  const { data, error } = await supabase.from('lessons').insert([insertPayload]).select().single();
  if (error) { 
      console.error("Error saving lesson to Supabase:", error);
      return res.status(400).json({ error: error.message, details: error.details, hint: error.hint, code: error.code }); 
  }
  res.json(data);
};

exports.listLessons = async (req, res) => {
  const { child_subject_id } = req.params;
  if (!child_subject_id || child_subject_id === 'undefined') {
    return res.status(400).json({ error: 'Missing or invalid child_subject_id' });
  }

  try {
    console.log('📋 Listing lessons for child_subject_id:', child_subject_id);
    
    // TEMPORARY: Query lessons table with the current schema
    // The lessons table currently doesn't have child_subject_id column
    // So we need to check what columns it actually has
    
    // Let's first check if this is the old schema where lessons directly reference child_subject_id
    // or if we need to go through units
    
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('child_subject_id', child_subject_id) // This is what's failing
      .order('created_at', { ascending: false });

    if (error) {
      // If child_subject_id doesn't exist, the lessons might be linked through units
      console.log('❌ Direct child_subject_id query failed, trying through units...');
      console.error('Error details:', error);
      
      // Alternative: Get lessons through units
      // First get units for this child_subject_id
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id')
        .eq('child_subject_id', child_subject_id);
      
      if (unitsError) {
        console.error('Units query also failed:', unitsError);
        return res.status(400).json({ error: 'Could not fetch lessons: ' + unitsError.message });
      }
      
      if (!units || units.length === 0) {
        console.log('No units found for child_subject_id:', child_subject_id);
        return res.json([]); // No units = no lessons
      }
      
      const unitIds = units.map(u => u.id);
      console.log('Found unit IDs:', unitIds);
      
      // Now get lessons for these units
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .in('unit_id', unitIds)
        .order('created_at', { ascending: false });
      
      if (lessonsError) {
        console.error('Lessons through units query failed:', lessonsError);
        return res.status(400).json({ error: 'Could not fetch lessons through units: ' + lessonsError.message });
      }
      
      console.log('✅ Found lessons through units:', lessonsData?.length || 0);
      return res.json(lessonsData || []);
    }

    console.log('✅ Direct query succeeded, found lessons:', data?.length || 0);
    res.json(data || []);
    
  } catch (error) {
    console.error('❌ Error in listLessons:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

exports.updateLessonDetails = async (req, res) => {
  const parent_id = req.header('x-parent-id');
  const { lesson_id } = req.params;
  const {
    title, content_type, lesson_json,
    grade_value, grade_max_value, grading_notes,
    completed_at, due_date, unit_id
  } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!lesson_id) return res.status(400).json({ error: 'Missing lesson_id' });

  const updateData = {};
  if (title !== undefined) updateData.title = normalizeStringOrNull(title);
  if (content_type !== undefined) updateData.content_type = normalizeStringOrNull(content_type);
  
  if (lesson_json !== undefined) {
    if (typeof lesson_json === 'string') {
      try { updateData.lesson_json = JSON.parse(lesson_json); } 
      catch (e) { return res.status(400).json({ error: "Invalid lesson_json format for update (string)."}); }
    } else if (typeof lesson_json === 'object' && lesson_json !== null) {
      updateData.lesson_json = lesson_json;
    } else { return res.status(400).json({ error: "lesson_json must be a valid object or stringified object." }); }
  }
  
  if (grade_value !== undefined) updateData.grade_value = normalizeStringOrNull(grade_value);
  if (grade_max_value !== undefined) updateData.grade_max_value = normalizeStringOrNull(grade_max_value);
  if (grading_notes !== undefined) updateData.grading_notes = normalizeStringOrNull(grading_notes);
  
  if (completed_at !== undefined) {
    updateData.completed_at = (completed_at && String(completed_at).trim() !== '') ? new Date(completed_at).toISOString() : null;
  }
  if (due_date !== undefined) {
      updateData.due_date = normalizeStringOrNull(due_date);
  }
  if (unit_id !== undefined) {
    updateData.unit_id = normalizeStringOrNull(unit_id);
  }

  // Remove fields if their normalized value is undefined (meaning they were not in req.body)
  // This prevents accidentally setting fields to null if they weren't part of the update request.
  Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined && req.body[key] === undefined) {
          delete updateData[key];
      }
  });


  if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'No valid update data provided.' });
  
  const { data, error } = await supabase.from('lessons').update(updateData).eq('id', lesson_id).select().single();
  if (error) { 
      console.error("Error updating lesson details:", error); 
      return res.status(400).json({ error: error.message, details: error.details, hint: error.hint, code: error.code }); 
  }
  if (!data) return res.status(404).json({ error: "Lesson not found or not updated." });
  res.json(data);
};

exports.toggleLessonCompletion = async (req, res) => {
  const parent_id = req.header('x-parent-id');
  const { lesson_id } = req.params;
  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!lesson_id) return res.status(400).json({ error: 'Missing lesson_id' });
  try {
      const { data: currentLesson, error: fetchError } = await supabase
          .from('lessons').select('completed_at').eq('id', lesson_id).single();
      if (fetchError) throw fetchError;
      if (!currentLesson) return res.status(404).json({ error: 'Lesson not found.' });
      const newCompletedAt = currentLesson.completed_at ? null : new Date().toISOString();
      const { data, error } = await supabase
          .from('lessons').update({ completed_at: newCompletedAt }).eq('id', lesson_id).select().single();
      if (error) throw error;
      res.json(data);
  } catch (error) {
      console.error("Error toggling completion:", error);
      res.status(500).json({ error: error.message || "Failed to toggle completion." });
  }
};