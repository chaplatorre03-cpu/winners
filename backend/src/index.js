const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const raffleRoutes = require('./routes/raffles');
const intelligenceRoutes = require('./routes/intelligence');
const cronRoutes = require('./routes/cron');
const Scheduler = require('./utils/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Winners API is running in Neo-Punk mode 🚀' });
});

app.use('/api/auth', authRoutes);
app.use('/api/raffles', raffleRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/cron', cronRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 API available at http://localhost:${PORT}/api`);
        
        // Start background intelligent agent tasks
        Scheduler.start();
    });
}

module.exports = app;
