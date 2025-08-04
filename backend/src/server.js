require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Create tmp directory for file uploads if it doesn't exist
const tmpDir = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
  console.log('Created tmp directory for file uploads');
}

const childrenRoutes = require('./routes/childrenRoutes');
const subjectsRoutes = require('./routes/subjectsRoutes');
const lessonContainersRoutes = require('./routes/lessonContainersRoutes');
const materialsRoutes = require('./routes/materialsRoutes');
const childSubjectsRoutes = require('./routes/childSubjectsRoutes');
const weightsRoutes = require('./routes/weightsRoutes'); 
const unitsRoutes = require('./routes/unitsRoutes');
const childAuthRoutes = require('./routes/childAuthRoutes');
const chatRoutes = require('./routes/chatRoutes');
const progressRoutes = require('./routes/progressRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const chatInsightsRoutes = require('./routes/chatInsightsRoutes');
const parentNotesRoutes = require('./routes/parentNotesRoutes');
const customCategoriesRoutes = require('./routes/customCategoriesRoutes');


// Import Stripe routes
const stripeRoutes = require('./routes/stripeRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

app.use(cors());

// IMPORTANT: Webhook routes must come BEFORE express.json() middleware
// because Stripe webhooks need the raw body
app.use('/api/webhooks', webhookRoutes);

// Now add the JSON parser
app.use(express.json());

// Mount all the routes

app.use('/api/children', childrenRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/child-subjects', childSubjectsRoutes);
app.use('/api/units', unitsRoutes); 
app.use('/api/lesson-containers', lessonContainersRoutes);


app.use('/api/materials', materialsRoutes); 
app.use('/api/weights', weightsRoutes);
app.use('/api/custom-categories', customCategoriesRoutes); // Add Custom Categories routes
app.use('/api/auth/child', childAuthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/progress', progressRoutes); // Fixed: removed 'Routes' suffix
app.use('/api/schedule', scheduleRoutes); // Add Schedule routes
app.use('/api/parent/chat-insights', chatInsightsRoutes); // Add Chat Insights routes
app.use('/api/stripe', stripeRoutes); // Add Stripe routes
app.use('/api/children', parentNotesRoutes); // Add Parent Notes routes (child-specific and global)

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});