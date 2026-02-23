const app = require('../backend/src/index.js');

// Add a simple error handler for the gateway
app.use((err, req, res, next) => {
    console.error('Gateway Error:', err);
    res.status(500).json({
        error: 'Error interno del servidor (Gateway)',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = app;
