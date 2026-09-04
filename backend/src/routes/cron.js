const express = require('express');
const router = express.Router();
const Scheduler = require('../utils/scheduler');

/**
 * GET /api/cron/follow-up
 * Cron job endpoint for Vercel (runs every hour)
 * Can also be triggered manually with authorization
 */
router.get('/follow-up', async (req, res) => {
    try {
        // Optional security check: if CRON_SECRET is set, verify authorization header or query token
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret) {
            const authHeader = req.headers.authorization;
            const querySecret = req.query.secret;
            if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
                return res.status(401).json({ error: 'No autorizado para ejecutar cron' });
            }
        }

        console.log('[Vercel Cron] Iniciando ejecución de tareas automatizadas...');

        // Execute background monitoring jobs
        await Scheduler.followUpPayments();
        await Scheduler.analyzeFinancialHealth();

        res.json({
            success: true,
            message: 'Tareas de seguimiento ejecutadas exitosamente',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Vercel Cron] Error ejecutando cron:', error);
        res.status(500).json({ error: 'Error ejecutando cron job', details: error.message });
    }
});

module.exports = router;
