const express = require('express');
const router = express.Router();
const Scheduler = require('../utils/scheduler');
const prisma = require('../lib/prisma');

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

        console.log('[Vercel Cron] Iniciando ejecucion de tareas automatizadas...');

        // Warm up the Evolution API (Render) BEFORE running scheduled jobs.
        // Render free tier shuts down after 15 min of inactivity; first request takes 30-60s.
        // Warming up here prevents WhatsApp notification timeouts.
        await warmUpWhatsAppGateway();

        // Execute background monitoring jobs
        const followUpStats = await Scheduler.followUpPayments();
        await Scheduler.analyzeFinancialHealth();

        res.json({
            success: true,
            message: 'Tareas de seguimiento ejecutadas exitosamente',
            stats: followUpStats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Vercel Cron] Error ejecutando cron:', error);
        res.status(500).json({ error: 'Error ejecutando cron job', details: error.message });
    }
});

/**
 * GET /api/cron/warmup
 * Manually wake the Evolution API (Render) to prevent cold-start timeouts.
 */
router.get('/warmup', async (req, res) => {
    const result = await warmUpWhatsAppGateway();
    res.json(result);
});

/**
 * GET /api/cron/reset-test
 * Resets remindersSent counter to 0 for APARTADO tickets so reminder delivery can be re-tested.
 */
router.get('/reset-test', async (req, res) => {
    try {
        const updated = await prisma.ticket.updateMany({
            where: { status: 'APARTADO' },
            data: { remindersSent: 0 }
        });
        res.json({ success: true, message: 'Filtro de recordatorios reiniciado', resetCount: updated.count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/cron/diagnostics
 * Returns diagnostic info about WhatsApp env vars, gateway connectivity, and recent ticket statuses.
 * Use this in production to debug notification failures.
 */
router.get('/diagnostics', async (req, res) => {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instanceName = process.env.WHATSAPP_INSTANCE_NAME;

    const isConfigured = Boolean(apiUrl && apiKey && instanceName);

    const report = {
        timestamp: new Date().toISOString(),
        whatsapp: {
            isConfigured,
            apiUrl: apiUrl ? apiUrl.substring(0, 40) + '...' : 'NOT SET',
            apiKey: apiKey ? apiKey.substring(0, 6) + '...' : 'NOT SET',
            instanceName: instanceName || 'NOT SET',
        },
        env: {
            NODE_ENV: process.env.NODE_ENV || 'not set',
            hasEmailUser: Boolean(process.env.EMAIL_USER),
            hasEmailPass: Boolean(process.env.EMAIL_PASS),
            hasJwtSecret: Boolean(process.env.JWT_SECRET || process.env.JWT_SECRET_KEY),
            hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        }
    };

    // Query recent tickets and raffles for audit
    try {
        const now = new Date();
        const recentTickets = await prisma.ticket.findMany({
            select: {
                id: true,
                number: true,
                status: true,
                buyerName: true,
                buyerPhone: true,
                remindersSent: true,
                createdAt: true,
                raffle: { select: { title: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const activeRaffles = await prisma.raffle.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                title: true,
                endDate: true,
                suggestedDrawDate: true,
                creator: { select: { id: true, email: true, name: true } }
            }
        });

        report.activeRaffles = activeRaffles;

        report.tickets = recentTickets.map(t => ({
            id: t.id,
            number: t.number,
            status: t.status,
            buyerName: t.buyerName,
            buyerPhone: t.buyerPhone,
            remindersSent: t.remindersSent,
            createdAt: t.createdAt,
            hoursOld: ((now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600)).toFixed(1),
            raffleTitle: t.raffle?.title
        }));
    } catch (dbErr) {
        report.ticketsError = dbErr.message;
    }

    // Test connectivity to Evolution API
    if (isConfigured) {
        try {
            const cleanBaseUrl = apiUrl.replace(/\/$/, '');
            const pingUrl = cleanBaseUrl + '/instance/fetchInstances';
            console.log('[Diagnostics] Pinging Evolution API: ' + pingUrl);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const pingRes = await fetch(pingUrl, {
                headers: { 'apikey': apiKey },
                signal: controller.signal
            });
            clearTimeout(timeout);

            report.whatsapp.gatewayStatus = pingRes.ok ? 'ONLINE' : 'ERROR_' + pingRes.status;
            report.whatsapp.gatewayResponseCode = pingRes.status;
            const body = await pingRes.text();
            report.whatsapp.gatewayResponse = body.substring(0, 300);
        } catch (err) {
            report.whatsapp.gatewayStatus = 'UNREACHABLE: ' + err.message;
        }
    } else {
        report.whatsapp.gatewayStatus = 'SKIPPED (not configured)';
    }

    res.json(report);
});

/**
 * Sends a lightweight HTTP request to wake Evolution API from Render sleep.
 */
async function warmUpWhatsAppGateway() {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;

    if (!apiUrl || !apiKey) {
        console.log('[Warmup] Variables de WhatsApp no configuradas, omitiendo warmup.');
        return { status: 'skipped', reason: 'not configured' };
    }

    try {
        const cleanBaseUrl = apiUrl.replace(/\/$/, '');
        const warmupUrl = cleanBaseUrl + '/instance/fetchInstances';
        console.log('[Warmup] Despertando Evolution API en Render: ' + warmupUrl);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const start = Date.now();
        const res = await fetch(warmupUrl, {
            headers: { 'apikey': apiKey },
            signal: controller.signal
        });
        clearTimeout(timeout);

        const elapsed = Date.now() - start;
        console.log('[Warmup] Evolution API respondio en ' + elapsed + 'ms con status ' + res.status);
        return { status: 'ok', responseMs: elapsed, httpStatus: res.status };
    } catch (err) {
        console.warn('[Warmup] Evolution API no respondio: ' + err.message);
        return { status: 'error', error: err.message };
    }
}

module.exports = router;
