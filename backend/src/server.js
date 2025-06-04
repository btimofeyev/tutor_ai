require('dotenv').config();
const express = require('express');
const cors = require('cors');

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
app.use('/api/auth/child', childAuthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/progress', progressRoutes); // Fixed: removed 'Routes' suffix
app.use('/api/stripe', stripeRoutes); // Add Stripe routes

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});