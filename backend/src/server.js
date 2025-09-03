require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger')('server');
const { validateEnvironment } = require('./utils/validateEnv');

// Validate environment variables before starting
try {
  validateEnvironment();
} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
}

// Create tmp directory for file uploads if it doesn't exist
const tmpDir = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
  logger.info('Created tmp directory for file uploads');
}

const childrenRoutes = require('./routes/childrenRoutes');
const subjectsRoutes = require('./routes/subjectsRoutes');
const lessonContainersRoutes = require('./routes/lessonContainersRoutes');
const materialsRoutes = require('./routes/materialsRoutes');
const childSubjectsRoutes = require('./routes/childSubjectsRoutes');
const weightsRoutes = require('./routes/weightsRoutes');
const unitsRoutes = require('./routes/unitsRoutes');
const childAuthRoutes = require('./routes/childAuthRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const parentRoutes = require('./routes/parentRoutes');
const customCategoriesRoutes = require('./routes/customCategoriesRoutes');
const parentNotesRoutes = require('./routes/parentNotesRoutes');

// Import AI Tutor routes
const aiTutorRoutes = require('./routes/aiTutorRoutes');

// Import Stripe routes
const stripeRoutes = require('./routes/stripeRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

// Configure CORS for production
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://klioai.com',
      'https://www.klioai.com',
      'https://app.klioai.com',
      'https://tutor.klioai.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3003'
    ];

    // Allow requests with no origin (like mobile apps or postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

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
app.use('/api/parent', parentRoutes);
app.use('/api/children', parentNotesRoutes); 
app.use('/api/schedule', scheduleRoutes); // Add Schedule routes

// Add request logging middleware for tutor routes
app.use('/api/tutor', (req, res, next) => {
  console.log(`🌐 Tutor API: ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// AI Tutor routes
app.use('/api/tutor', aiTutorRoutes); // Add AI Tutor routes

app.use('/api/stripe', stripeRoutes); // Add Stripe routes

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});


// Import error handlers
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.startup(`Backend server running on port ${PORT}`);
  logger.startup(`Environment: ${process.env.NODE_ENV}`);
  logger.startup(`Health check: http://localhost:${PORT}/api/health`);
});
