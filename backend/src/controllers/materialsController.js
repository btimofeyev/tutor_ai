// backend/src/controllers/materialsController.js
const supabase = require('../utils/supabaseClient');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { GET_UNIVERSAL_SYSTEM_PROMPT } = require('../utils/llmPrompts');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MAX_TEXT_CHARS_FOR_PROMPT = 500000; // Increased for GPT-4o's larger context window

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
  let fullTextContent = ""; // Store full text for later use

  const allFilesAreImages = files.every(file => file.mimetype.startsWith('image/'));
  const allFilesArePDFs = files.every(file => file.mimetype === 'application/pdf');
  
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
  
  } else if (allFilesArePDFs) {
    // Handle PDFs with OpenAI Files API - return structured analysis directly
    const pdfFile = files[0]; // For now, handle single PDF
    
    console.log(`Processing PDF ${pdfFile.originalname} with OpenAI Files API...`);
    
    // Upload PDF to OpenAI Files API
    const fileStream = fs.createReadStream(pdfFile.path);
    const uploadedFile = await openai.files.create({
      file: fileStream,
      purpose: "user_data",
    });
    
    console.log(`PDF uploaded to OpenAI with file ID: ${uploadedFile.id}`);
    
    // Create content type specific prompt
    // Use the universal prompt system for all content types
    const systemPrompt = GET_UNIVERSAL_SYSTEM_PROMPT(userHintContentType, "PDF document");
    
    // Use OpenAI Files API for comprehensive PDF analysis
    const pdfAnalysisResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "file",
              file: {
                file_id: uploadedFile.id
              }
            },
            {
              type: "text",
              text: `Please extract and structure data from this PDF document. User hint for content type: '${userHintContentType || 'educational material'}'. Analyze the entire document comprehensively.`
            }
          ]
        }
      ],
      max_tokens: 8000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    // Clean up the uploaded file
    try {
      await openai.files.del(uploadedFile.id);
      console.log(`Cleaned up OpenAI file: ${uploadedFile.id}`);
    } catch (cleanupError) {
      console.warn(`Failed to cleanup OpenAI file ${uploadedFile.id}:`, cleanupError.message);
    }

    // Parse the comprehensive analysis result
    const pdfAnalysisContent = pdfAnalysisResponse.choices[0].message.content?.trim();
    if (!pdfAnalysisContent) {
      throw new Error('OpenAI returned empty content for PDF analysis');
    }

    // Try to parse the JSON response
    let structuredAnalysis;
    try {
      structuredAnalysis = JSON.parse(pdfAnalysisContent);
    } catch (parseError) {
      console.warn('Failed to parse PDF analysis JSON, extracting from markdown block...');
      const match = pdfAnalysisContent.match(/```json\s*([\s\S]*?)```/is);
      if (match && match[1]) {
        structuredAnalysis = JSON.parse(match[1]);
      } else {
        throw new Error('Failed to parse PDF analysis response as JSON');
      }
    }

    console.log(`PDF analysis complete for ${pdfFile.originalname}. Extracted keys:`, Object.keys(structuredAnalysis));
    
    // Return the structured analysis directly for PDFs
    return {
      ...structuredAnalysis,
      full_text_content: JSON.stringify(structuredAnalysis, null, 2),
      ai_analyzed: true,
      ai_model: 'gpt-4.1-mini-files-api',
      original_filename: pdfFile.originalname
    };

  } else if (allFilesAreTextConvertible) {
    llmInputDescription = files.length > 1 ? `a collection of ${files.length} text-based documents` : `a text-based document`;
    let combinedText = "";
    let fullTextContent = ""; // Store full text without markers
    for (const file of files) {
      let currentFileText = "";
      if (file.mimetype === 'application/pdf') {
        try {
          const data = await pdf(file.path);
          currentFileText = data.text;
          if (!currentFileText || currentFileText.trim().length < 100) {
            console.log(`PDF ${file.originalname} appears to be a scanned/image-based PDF with minimal extractable text.`);
            currentFileText = `[SCANNED PDF: ${file.originalname}] This appears to be a scanned document with minimal extractable text. For best results with image-based PDFs, please convert the PDF pages to images (PNG/JPG) and upload those instead. Text extraction yielded: "${data.text?.trim() || 'No text found'}"`;
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
        fullTextContent += currentFileText + "\n\n"; // Store full text without markers
      }
    }

    if (combinedText.trim().length > 0) {
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
    max_tokens: 6000, // Increased for more detailed analysis
    temperature: 0.1, 
    response_format: { type: "json_object" } 
  });

  const rawResponse = response.choices[0].message.content?.trim();
  console.log('Raw AI Response:', rawResponse?.substring(0, 1000) + '...');
  
  const analysisResult = await parseLlmOutput(rawResponse, userHintContentType, files.length, isMultiImageScenario);
  
  console.log('Parsed Analysis Result Keys:', Object.keys(analysisResult));
  console.log('Problems extracted:', analysisResult.problems_with_context?.length || 0);
  console.log('Tasks extracted:', analysisResult.tasks_or_questions?.length || 0);
  
  // No PDF image cleanup needed - using text extraction only
  
  // Add full text content to the result
  return {
    ...analysisResult,
    full_text_content: fullTextContent.trim()
  };
}

const normalizeStringOrNull = (val) => {
  if (val === undefined || val === null || String(val).trim() === '' || String(val).toLowerCase() === 'null') {
    return null;
  }
  return String(val).trim();
};

// --- ASYNC UPLOAD CONTROLLER (NON-BLOCKING) ---
exports.uploadMaterialAsync = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_subject_id, user_content_type, lesson_id, title, content_type, due_date, custom_category_id } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!child_subject_id) return res.status(400).json({ error: 'Missing child_subject_id' });
  if (!lesson_id) return res.status(400).json({ error: 'Missing lesson_id' });
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

  try {
    console.log(`Starting async upload for ${req.files.length} files...`);
    
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

    // Verify parent owns the lesson container
    const isOwner = await verifyLessonOwnership(parent_id, lesson_id);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this lesson' });
    }

    // Create material record immediately with pending status
    const insertPayload = {
      lesson_id: normalizeStringOrNull(lesson_id),
      child_subject_id: normalizeStringOrNull(child_subject_id),
      title: normalizeStringOrNull(title) || req.files[0].originalname.split('.')[0],
      content_type: normalizeStringOrNull(content_type) || 'lesson',
      lesson_json: {
        title: title || req.files[0].originalname.split('.')[0],
        content_type_suggestion: content_type || 'lesson',
        main_content_summary_or_extract: 'AI analysis in progress...',
        learning_objectives: [],
        subject_keywords_or_subtopics: [],
        page_count_or_length_indicator: 'Processing...',
        tasks_or_questions: [],
        processing: true
      },
      status: 'approved',
      due_date: normalizeStringOrNull(due_date),
      processing_status: 'pending',
      material_relationship: content_type === 'lesson' ? null : 
        (content_type === 'worksheet' ? 'worksheet_for' :
         content_type === 'quiz' || content_type === 'test' ? 'assignment_for' : 'supplement_for'),
      is_primary_lesson: content_type === 'lesson',
      custom_category_id: normalizeStringOrNull(custom_category_id)
    };

    const { data: material, error: materialError } = await supabase
      .from('materials')
      .insert([insertPayload])
      .select()
      .single();

    if (materialError) {
      console.error("Error creating material record:", materialError);
      return res.status(400).json({ error: materialError.message });
    }

    console.log(`Material created with ID: ${material.id}, starting background AI analysis...`);

    // Copy files to a safe location for background processing
    const processedFiles = req.files.map(file => ({
      path: file.path,
      originalname: file.originalname,
      mimetype: file.mimetype
    }));

    // Start AI analysis in background (don't await)
    processAiAnalysisInBackground(material.id, processedFiles, user_content_type)
      .catch(error => {
        console.error(`Background AI analysis failed for material ${material.id}:`, error);
        // Update material status to failed
        supabase
          .from('materials')
          .update({ 
            processing_status: 'failed',
            lesson_json: {
              ...material.lesson_json,
              error: 'AI analysis failed',
              processing: false
            }
          })
          .eq('id', material.id)
          .then(() => console.log(`Material ${material.id} marked as failed`));
      });

    // Return immediately
    res.json({
      success: true,
      material_id: material.id,
      message: 'Upload successful! AI analysis is processing in the background.',
      material: {
        id: material.id,
        title: material.title,
        processing_status: 'pending'
      }
    });

  } catch (err) {
    console.error("Error in uploadMaterialAsync controller:", err.message);
    res.status(500).json({ error: err.message || 'File processing error.' });
  }
  // Note: Files are NOT cleaned up here - they're needed for background processing
};

// Background AI processing function
async function processAiAnalysisInBackground(materialId, files, userContentType) {
  console.log(`Starting background AI analysis for material ${materialId}...`);
  
  try {
    // Update status to processing
    await supabase
      .from('materials')
      .update({ processing_status: 'processing' })
      .eq('id', materialId);

    // Reconstruct file objects for analysis
    const fileObjects = files.map(fileData => ({
      path: fileData.path,
      originalname: fileData.originalname,
      mimetype: fileData.mimetype
    }));

    // Run AI analysis
    const lesson_json_result = await analyzeUploadedFiles(fileObjects, userContentType);
    
    // Extract title from AI results
    let extractedTitle = null;
    try {
      // Try different title extraction methods based on AI format
      if (lesson_json_result.title && lesson_json_result.title.trim()) {
        extractedTitle = lesson_json_result.title.trim();
      } else if (lesson_json_result.Objective && Array.isArray(lesson_json_result.Objective) && lesson_json_result.Objective[0]) {
        extractedTitle = lesson_json_result.Objective[0].trim();
      } else if (lesson_json_result.learning_objectives && Array.isArray(lesson_json_result.learning_objectives) && lesson_json_result.learning_objectives[0]) {
        extractedTitle = lesson_json_result.learning_objectives[0].trim();
      }
    } catch (e) {
      console.log('Error extracting title from AI results:', e);
    }

    // Update material with AI results and extracted title
    const updateData = {
      lesson_json: lesson_json_result,
      processing_status: 'completed',
      processing_completed_at: new Date().toISOString()
    };
    
    // Only update title if we successfully extracted one
    if (extractedTitle && extractedTitle.length > 0) {
      updateData.title = extractedTitle;
      console.log(`Updating material ${materialId} title to: "${extractedTitle}"`);
    }

    await supabase
      .from('materials')
      .update(updateData)
      .eq('id', materialId);

    console.log(`Background AI analysis completed successfully for material ${materialId}`);

    // TODO: Send notification to frontend (WebSocket/polling)
    // For now, just log success

  } catch (error) {
    console.error(`Background AI analysis failed for material ${materialId}:`, error);
    
    // Mark as failed
    await supabase
      .from('materials')
      .update({
        processing_status: 'failed',
        lesson_json: {
          title: 'Analysis Failed',
          error: error.message,
          processing: false
        }
      })
      .eq('id', materialId);

  } finally {
    // Clean up temporary files
    files.forEach(file => {
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
          console.log(`Cleaned up temp file: ${file.path}`);
        } catch (e) {
          console.error("Error unlinking temp file:", file.path, e);
        }
      }
    });
  }
}

// --- GET PROCESSING STATUS ---
exports.getProcessingStatus = async (req, res) => {
  const parent_id = getParentId(req);
  const { material_id } = req.params;

  if (!parent_id) return res.status(401).json({ error: 'Unauthorized' });
  if (!material_id) return res.status(400).json({ error: 'material_id is required' });

  try {
    // Get material with processing status
    const { data: material, error } = await supabase
      .from('materials')
      .select('id, title, processing_status, processing_completed_at, lesson_json')
      .eq('id', material_id)
      .single();

    if (error) {
      console.error('Error fetching processing status:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    // Verify ownership through lesson or child_subject
    // (We'll use a simpler approach for now - just check if material exists under this parent)
    
    res.json({
      material_id: material.id,
      title: material.title,
      processing_status: material.processing_status,
      processing_completed_at: material.processing_completed_at,
      has_analysis: material.processing_status === 'completed'
    });

  } catch (error) {
    console.error('Error getting processing status:', error);
    res.status(500).json({ error: 'Failed to get processing status' });
  }
};

// --- MAIN UPLOAD CONTROLLER (ORIGINAL BLOCKING VERSION) ---
exports.uploadMaterial = async (req, res) => {
  const parent_id = getParentId(req);
  const { child_subject_id, user_content_type } = req.body;


  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!child_subject_id) return res.status(400).json({ error: 'Missing child_subject_id' });
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

  try {
    console.log(`Starting AI analysis for ${req.files.length} files using GPT-4o...`);
    
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

    console.log('Starting GPT-4o analysis...');
    const lesson_json_result = await analyzeUploadedFiles(req.files, user_content_type);
    console.log('GPT-4o analysis completed successfully');
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
    is_primary_lesson, // NEW: Boolean flag for primary lesson content
    custom_category_id // NEW: Links to custom assignment category if applicable
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
      is_primary_lesson: is_primary_lesson === true, // Ensure boolean
      custom_category_id: normalizeStringOrNull(custom_category_id) // Links to custom category if applicable
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
    console.log('Fetching materials for lesson_id:', lesson_id);
    const { data: materials, error } = await supabase
      .from('materials')
      .select('*')
      .eq('lesson_id', lesson_id)
      .order('is_primary_lesson', { ascending: false })
      .order('material_relationship')
      .order('created_at');
    
    console.log('Found materials:', materials?.length || 0, 'for lesson:', lesson_id);

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
      console.log('Processing material:', {
        id: material.id,
        title: material.title,
        is_primary_lesson: material.is_primary_lesson,
        material_relationship: material.material_relationship
      });
      
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
    
    console.log('Grouped results:', {
      lesson_id,
      primary_lesson: !!grouped.primary_lesson,
      worksheets: grouped.worksheets.length,
      assignments: grouped.assignments.length,
      supplements: grouped.supplements.length,
      other: grouped.other.length,
      total: materials.length
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
    is_primary_lesson, // NEW: Update primary lesson flag
    custom_category_id // NEW: Update custom category assignment
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
    if (custom_category_id !== undefined) updateData.custom_category_id = normalizeStringOrNull(custom_category_id);

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
    // Get material with basic info first
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('id, title, lesson_id, child_subject_id')
      .eq('id', material_id)
      .single();

    if (materialError) {
      console.error('Error fetching material for deletion:', materialError);
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
        console.log('Child subject ownership check failed for deletion:', { csError, childSubject });
        return res.status(403).json({ error: 'Access denied to this material via child subject' });
      }
      ownershipVerified = true;
    }

    if (!ownershipVerified) {
      return res.status(403).json({ error: 'Could not verify ownership of this material' });
    }

    // Proceed with deletion
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
    completed_at,
    custom_category_id
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
      completed_at: completed_at ? new Date(completed_at).toISOString() : null,
      custom_category_id: normalizeStringOrNull(custom_category_id)
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