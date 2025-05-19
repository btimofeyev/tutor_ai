const supabase = require('../utils/supabaseClient');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// Init OpenAI (make sure OPENAI_API_KEY is in your .env)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Vision Analysis Utility
async function analyzeLessonFile(filePath, fileType) {
  const fileData = fs.readFileSync(filePath);

  const prompt = `
You are an education AI. Your job is to extract, structure, and categorize lesson or worksheet content from user-uploaded files.
Return a JSON object in this format:
{
  "lesson_number": (if found, else null),
  "title": (string),
  "objectives": (array of strings, if found),
  "main_content": (string, main teaching text),
  "assignments": (array of questions/tasks if present),
  "pages": (if multipage, number or null)
}
If a section is missing, set its value to null. Do NOT summarize, just extract.
`;

  // For MVP, images only. (PDFs: you'd need to convert to images for vision)
  // Pass as base64-encoded string for OpenAI Vision models (gpt-4o supports this as of May 2024)
  const base64Image = fileData.toString('base64');
  const imageUrl = `data:${fileType};base64,${base64Image}`;

  const messages = [
    { role: "system", content: prompt },
    { role: "user", content: [
      { type: "text", text: "Please extract and structure the lesson data from this image." },
      { type: "image_url", image_url: { url: imageUrl } }
    ]}
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: messages,
    max_tokens: 1200,
    temperature: 0.2
  });

  const output = response.choices[0].message.content.trim();
  let json = null;
  try {
    // If output is in a code block, extract JSON
    const match = output.match(/```json\s*([\s\S]*?)```/i);
    json = match ? JSON.parse(match[1]) : JSON.parse(output);
  } catch (err) {
    json = { error: 'Failed to parse JSON', raw: output };
  }
  return json;
}

// Controller: Handle file upload and AI parsing
exports.uploadLesson = async (req, res) => {
  const parent_id = req.header('x-parent-id');
  const { child_subject_id } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!child_subject_id) return res.status(400).json({ error: 'Missing child_subject_id' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    // Vision parse (MVP: images only, see note above)
    const lesson_json = await analyzeLessonFile(req.file.path, req.file.mimetype);

    // Remove temp file
    fs.unlinkSync(req.file.path);

    // Return parsed JSON for review/approval
    res.json({ lesson_json });
  } catch (err) {
    // Remove file if something went wrong
    try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ error: err.message || 'OpenAI or file processing error' });
  }
};

// Controller: Save the reviewed lesson
exports.saveLesson = async (req, res) => {
  const parent_id = req.header('x-parent-id');
  const { child_subject_id, title, lesson_json } = req.body;

  if (!parent_id) return res.status(401).json({ error: 'Missing parent_id' });
  if (!child_subject_id || !lesson_json) return res.status(400).json({ error: 'Missing data' });

  const { data, error } = await supabase
    .from('lessons')
    .insert([{
      child_subject_id,
      title: title || lesson_json.title || 'Untitled',
      lesson_json,
      status: 'approved'
    }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
};

// Controller: List all lessons for a child_subject_id
exports.listLessons = async (req, res) => {
  const { child_subject_id } = req.params;
  if (!child_subject_id || child_subject_id === 'undefined') {
    return res.status(400).json({ error: 'Missing or invalid child_subject_id' });
  }
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('child_subject_id', child_subject_id)
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
};
