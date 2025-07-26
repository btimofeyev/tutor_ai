// backend/src/controllers/quickUploadController.js
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

// Helper to get parent_id from request header
function getParentId(req) {
  return req.header('x-parent-id');
}

// Process file content
async function processFileContent(file) {
  let textContent = '';
  let isImage = false;

  try {
    if (file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(file.path);
      const pdfData = await pdf(dataBuffer);
      textContent = pdfData.text;
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               file.mimetype === 'application/msword') {
      const result = await mammoth.extractRawText({ path: file.path });
      textContent = result.value;
    } else if (file.mimetype.startsWith('image/')) {
      isImage = true;
      textContent = 'Image file - visual content analysis required';
    } else {
      textContent = fs.readFileSync(file.path, 'utf8');
    }
  } catch (error) {
    console.error('Error processing file:', error);
    textContent = 'Error extracting content';
  }

  return { textContent, isImage };
}

// Quick analyze content with minimal AI processing
async function quickAnalyzeContent(textContent, metadata, isImage) {
  try {
    const prompt = `
Analyze this educational material and provide a simple JSON response:

${isImage ? 'This is an image file. Based on the filename and metadata, make reasonable assumptions.' : `Content preview: ${textContent.substring(0, 1000)}...`}

Filename: ${metadata.originalName}
User-specified subject: ${metadata.subject}
User-specified type: ${metadata.materialType}

Return JSON with:
{
  "title": "Brief, clear title for the material",
  "learning_objectives": ["2-3 short objectives"],
  "estimated_time_minutes": number (5-60),
  "difficulty_level": "easy|medium|hard",
  "page_count": number (estimate based on content length)
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant that analyzes educational materials. Keep responses concise." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('AI analysis error:', error);
    // Return sensible defaults
    return {
      title: metadata.originalName.replace(/\.[^/.]+$/, ""),
      learning_objectives: ["Complete the assignment", "Practice skills"],
      estimated_time_minutes: 30,
      difficulty_level: "medium",
      page_count: 1
    };
  }
}

// Get or create default unit for a subject
async function getOrCreateDefaultUnit(childSubjectId, parentId, chapterName = 'General Materials') {
  try {
    // First check if the unit already exists
    const { data: existingUnit, error: fetchError } = await supabase
      .from('units')
      .select('id, name')
      .eq('child_subject_id', childSubjectId)
      .eq('name', chapterName)
      .single();

    if (existingUnit) {
      return existingUnit;
    }

    // Create new unit
    const { data: newUnit, error: createError } = await supabase
      .from('units')
      .insert({
        name: chapterName,
        child_subject_id: childSubjectId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) throw createError;
    return newUnit;
  } catch (error) {
    console.error('Error managing unit:', error);
    throw error;
  }
}

// Get or create lesson container
async function getOrCreateLessonContainer(unitId, title, parentId) {
  try {
    // Check if container exists
    const { data: existing, error: fetchError } = await supabase
      .from('lessons')
      .select('id')
      .eq('unit_id', unitId)
      .eq('title', title)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new container
    const { data: newContainer, error: createError } = await supabase
      .from('lessons')
      .insert({
        title,
        unit_id: unitId,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (createError) throw createError;
    return newContainer.id;
  } catch (error) {
    console.error('Error managing lesson container:', error);
    throw error;
  }
}

// Main quick upload handler
exports.quickUpload = async (req, res) => {
  const parentId = getParentId(req);
  if (!parentId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const files = req.files;
  const childId = req.body.child_id;
  const fileCount = parseInt(req.body.fileCount) || 0;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  if (!childId) {
    return res.status(400).json({ error: 'Child ID required' });
  }

  // Verify parent owns the child
  const { data: child, error: childError } = await supabase
    .from('children')
    .select('id, name')
    .eq('id', childId)
    .eq('parent_id', parentId)
    .single();

  if (childError || !child) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const results = {
    created: 0,
    scheduled: 0,
    failed: 0,
    materials: []
  };

  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const metadataKey = `metadata_${i}`;
    
    try {
      const metadata = JSON.parse(req.body[metadataKey]);
      
      // Get child subject - fixed query
      const { data: childSubjects, error: subjectError } = await supabase
        .from('child_subjects')
        .select('id, subject_id, subjects(name)')
        .eq('child_id', childId);

      if (subjectError || !childSubjects) {
        results.failed++;
        continue;
      }

      // Find matching subject
      const childSubject = childSubjects.find(cs => 
        cs.subjects && cs.subjects.name === metadata.subject
      );

      if (subjectError || !childSubject) {
        results.failed++;
        continue;
      }

      // Process file content
      const { textContent, isImage } = await processFileContent(file);
      
      // Quick AI analysis
      const analysis = await quickAnalyzeContent(textContent, metadata, isImage);
      
      // Get or create unit
      const unit = await getOrCreateDefaultUnit(
        childSubject.id, 
        parentId,
        metadata.chapter || 'General Materials'
      );
      
      // Get or create lesson container
      const lessonId = await getOrCreateLessonContainer(
        unit.id,
        metadata.chapter || 'General Materials',
        parentId
      );

      // Map material type to content type
      const contentTypeMap = {
        'Lesson': 'lesson',
        'Practice': 'worksheet', 
        'Test': 'quiz',
        'Reading': 'reading'
      };

      // Create material
      const { data: material, error: materialError } = await supabase
        .from('materials')
        .insert({
          lesson_id: lessonId,
          title: analysis.title,
          content_type: contentTypeMap[metadata.materialType] || 'lesson',
          user_content_type: metadata.materialType,
          content: textContent.substring(0, 5000), // Store preview
          json_content: {
            ...analysis,
            original_filename: metadata.originalName,
            file_type: file.mimetype
          },
          estimated_time_minutes: analysis.estimated_time_minutes,
          page_count_or_length_indicator: analysis.page_count,
          difficulty_level: analysis.difficulty_level,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (materialError) throw materialError;
      
      results.created++;
      results.materials.push(material);

      // Create schedule entry if due date provided
      if (metadata.dueDate) {
        const { data: scheduleEntry, error: scheduleError } = await supabase
          .from('schedule_entries')
          .insert({
            child_id: childId,
            lesson_id: lessonId,
            scheduled_date: metadata.dueDate,
            created_at: new Date().toISOString()
          })
          .select();

        if (!scheduleError) {
          results.scheduled++;
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(file.path);

    } catch (error) {
      console.error(`Error processing file ${file.filename}:`, error);
      results.failed++;
      
      // Clean up on error
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  }

  res.json({
    success: true,
    message: `Processed ${fileCount} files`,
    results
  });
};