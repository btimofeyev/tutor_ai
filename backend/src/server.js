require('dotenv').config();
const express = require('express');
const cors = require('cors');

const childrenRoutes = require('./routes/childrenRoutes');
const subjectsRoutes = require('./routes/subjectsRoutes');
const lessonsRoutes = require('./routes/lessonsRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Mount the children routes
app.use('/api/children', childrenRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/lessons', lessonsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
