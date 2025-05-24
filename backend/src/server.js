require('dotenv').config();
const express = require('express');
const cors = require('cors');

const childrenRoutes = require('./routes/childrenRoutes');
const subjectsRoutes = require('./routes/subjectsRoutes');
const lessonsRoutes = require('./routes/lessonsRoutes');
const weightsRoutes = require('./routes/weightsRoutes'); 
const unitsRoutes = require('./routes/unitsRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Mount the children routes
app.use('/api/children', childrenRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/weights', weightsRoutes);

app.use('/api/units', unitsRoutes); 


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
