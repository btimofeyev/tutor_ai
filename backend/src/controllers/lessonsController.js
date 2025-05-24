// src/controllers/lessonsController.js
const supabase = require('../utils/supabaseClient');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MAX_TEXT_CHARS_FOR_PROMPT = 60000; 

// --- PROMPT DEFINITIONS ---
const UNIVERSAL_BASE_PROMPT = (userHintContentType, inputDescription = "the provided content") => {
  let taskInstruction = "List ALL individual questions, problems, or specific tasks for the student to complete, verbatim if possible. Maintain their original order. If questions are numbered or lettered, preserve that. For math problems, list each problem. Do not summarize the types of questions; list each one.";
  let mainContentInstruction = "Provide a brief overview or summary of the instructional content, if any. If the material is primarily a list of tasks/questions (e.g., a worksheet or test), this summary can be very brief or focus on the overall topic of the tasks. Max 300 words.";

  // If the user indicates it's a type of assessment or practice, be even more insistent on listing all questions.
  if (['worksheet', 'assignment', 'test', 'quiz'].includes(userHintContentType?.toLowerCase())) {
    taskInstruction = "CRITICAL: Extract and list EVERY SINGLE question, math problem, or task item LITERALLY as it appears. Preserve all numbering and sub-parts (e.g., 1a, 1b). Do NOT summarize or group similar questions. Each distinct problem or question part should be a separate string in the array. This is the most important field for this type of document.";
    mainContentInstruction = "If there is any introductory text or instructions NOT part of the questions themselves, summarize it briefly here (max 150 words). Otherwise, this can be null or a very short description of the task set (e.g., 'Multiplication practice problems.').";
  }

  return `
You are an expert education AI. Your job is to meticulously extract, structure, and categorize content from ${inputDescription}.
The user might provide a hint for the content type: ${userHintContentType || 'not provided'}. Use this hint if helpful, but prioritize accurate analysis of the content.
If multiple documents or images were provided, synthesize them into a single, coherent output. The content should be treated as parts of the same overall material (e.g., sequential pages or related documents).

Return a JSON object strictly in the following format. If a field is not applicable or cannot be found, use null or an empty array as appropriate.

{
  "title": "string (concise, descriptive title for the material, generate if not obvious, max 100 chars)",
  "content_type_suggestion": "string (must be one of: 'lesson', 'worksheet', 'assignment', 'test', 'quiz', 'notes', 'reading_material', 'other')",
  "grade_level_suggestion": "string (e.g., 'Grade 3', 'Middle School', or null)",
  "subject_keywords_or_subtopics": ["string", "array (keywords/concepts from all provided content)"],
  "learning_objectives": ["string", "array (specific learning goals from all provided content, synthesized, if any)"],
  "main_content_summary_or_extract": "string (${mainContentInstruction})",
  "tasks_or_questions": ["string", "array (${taskInstruction})"],
  "estimated_completion_time_minutes": "integer (or null)",
  "page_count_or_length_indicator": "string or integer (e.g., total pages if multiple docs/images, or 'short' if unclear, or null)",
  "lesson_number_if_applicable": "string or number (or null)",
  "total_possible_points_suggestion": "integer (total points from all content, or null)"
}

Ensure the output is a single, valid JSON object. Do not include any text before or after.
For "tasks_or_questions", if the material is primarily a list of problems (like a math worksheet), ensure every single problem is listed.
`;
};

// --- HELPER FUNCTION TO PARSE LLM OUTPUT ---
async function parseLlmOutput(outputContent, userHintContentType, numFilesProcessed = 1, isMultiImage = false) {
  if (!outputContent) throw new Error("OpenAI returned empty content.");
  try {
    const parsedJson = JSON.parse(outputContent);
    if (numFilesProcessed > 1 && isMultiImage && (!parsedJson.page_count_or_length_indicator || typeof parsedJson.page_count_or_length_indicator !== 'number' || parsedJson.page_count_or_length_indicator === null)) {
        parsedJson.page_count_or_length_indicator = numFilesProcessed;
    } else if (numFilesProcessed === 1 && parsedJson.page_count_or_length_indicator === null) {
        // parsedJson.page_count_or_length_indicator = "1 document"; // Optional default for single files
    }
    return parsedJson;
  } catch (err) {
    console.warn("Failed to parse JSON directly from OpenAI. Trying markdown block.", outputContent.substring(0, 200));
    const match = outputContent.match(/```json\s*([\s\S]*?)```/is);
    if (match && match[1]) {
        try { 
            const parsedJson = JSON.parse(match[1]);
            if (numFilesProcessed > 1 && isMultiImage && (!parsedJson.page_count_or_length_indicator || typeof parsedJson.page_count_or_length_indicator !== 'number' || parsedJson.page_count_or_length_indicator === null)) {
                 parsedJson.page_count_or_length_indicator = numFilesProcessed;
            } else if (numFilesProcessed === 1 && parsedJson.page_count_or_length_indicator === null) {
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
        page_count_or_length_indicator: numFilesProcessed > 1 && isMultiImage ? numFilesProcessed : (numFilesProcessed === 1 ? "1 document" : null)
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

  const allFilesAreImages = files.every(file => file.mimetype.startsWith('image/'));
  const allFilesAreTextBased = files.every(file => 
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.mimetype === 'text/plain' ||
    file.mimetype === 'text/markdown' ||
    file.mimetype.startsWith('text/')
  );

  if (allFilesAreImages) {
    isMultiImageScenario = true;
    llmInputDescription = `a series of ${files.length} images`;
    const userMessageContent = [{ type: "text", text: `Please analyze these ${files.length} images as a single educational material. User hint for content type: ${userHintContentType || 'N/A'}. Synthesize the information into one JSON object, treating them as sequential pages.` }];
    for (const file of files) {
      const fileData = fs.readFileSync(file.path);
      const base64Image = fileData.toString('base64');
      userMessageContent.push({ type: "image_url", image_url: { url: `data:${file.mimetype};base64,${base64Image}`, detail: "high" } });
    }
    messages = [{ role: "system", content: UNIVERSAL_BASE_PROMPT(userHintContentType, llmInputDescription) }, { role: "user", content: userMessageContent }];
  } else if (allFilesAreTextBased) {
    llmInputDescription = files.length > 1 ? `a collection of ${files.length} text-based documents` : `a text-based document`;
    let combinedText = "";
    for (const file of files) {
      const fileData = fs.readFileSync(file.path);
      let currentFileText = "";
      if (file.mimetype === 'application/pdf') {
        try { const data = await pdf(fileData); currentFileText = data.text; } 
        catch (e) { throw new Error(`PDF parsing failed for ${file.originalname}: ${e.message}`); }
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try { const { value } = await mammoth.extractRawText({ buffer: fileData }); currentFileText = value; } 
        catch (e) { throw new Error(`DOCX parsing failed for ${file.originalname}: ${e.message}`); }
      } else { 
        currentFileText = fileData.toString('utf-8');
      }
      combinedText += `\n\n--- START OF DOCUMENT: ${file.originalname} ---\n${currentFileText}\n--- END OF DOCUMENT: ${file.originalname} ---\n\n`;
    }

    if (combinedText.length > MAX_TEXT_CHARS_FOR_PROMPT) {
      combinedText = combinedText.substring(0, MAX_TEXT_CHARS_FOR_PROMPT) + "\n[...combined text truncated due to length...]";
    }
    messages = [
        { role: "system", content: UNIVERSAL_BASE_PROMPT(userHintContentType, llmInputDescription) },
        { role: "user", content: `Please extract and structure the data from the following ${llmInputDescription}. User hint for content type: ${userHintContentType || 'N/A'}. Combined Document Text:\n\n${combinedText}` }
    ];
  } else {
    if (files.length === 1) {
        throw new Error(`Unsupported file type: ${files[0].originalname} (${files[0].mimetype}). Supported: Images, PDF, DOCX, TXT, MD.`);
    } else {
        throw new Error("Mixed file types (e.g., images and PDFs together) in a single upload are not supported for combined analysis. Please upload images separately from text documents, or upload multiple files of the same type (all images or all text-based).");
    }
  }
  
  const response = await openai.chat.completions.create({ model: "gpt-4o", messages, max_tokens: 3500, temperature: 0.1, response_format: { type: "json_object" } });
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

// Helper to normalize string inputs that can be null
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
  const { data, error } = await supabase
    .from('lessons').select('*').eq('child_subject_id', child_subject_id).order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
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