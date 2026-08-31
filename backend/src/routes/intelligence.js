const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const AIGateway = require('../services/AIGateway');
const prisma = require('../lib/prisma');

// All intelligence endpoints require authentication
router.use(authMiddleware);

// 1. Get Dashboard Summary (Deterministic)
router.get('/dashboard', async (req, res) => {
    try {
        const metrics = await AIGateway.getActiveRafflesMetrics();

        let totalRevenue = 0;
        let totalEstimatedProfit = 0;
        let rafflesNeedingAttention = 0;

        metrics.forEach(m => {
            totalRevenue += m.profit;
            totalEstimatedProfit += m.profit;
            if (m.risk === 'HIGH' || m.risk === 'MEDIUM') {
                rafflesNeedingAttention++;
            }
        });

        res.json({
            metrics,
            summary: {
                totalRevenue,
                totalEstimatedProfit,
                activeRaffles: metrics.length,
                rafflesNeedingAttention
            }
        });
    } catch (error) {
        console.error('[Intelligence API] Error getting dashboard:', error);
        res.status(500).json({ error: 'Error al obtener métricas de inteligencia.' });
    }
});

// 2. Chat with AI Agent
router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
        }

        // Feed current system context to the AI
        const metrics = await AIGateway.getActiveRafflesMetrics();
        const systemContext = `Eres el "Asistente de Inteligencia Winners", un analista financiero y operativo para el creador de sorteos.
REGLAS ESTRICTAS:
- No inventes datos. Solo analiza lo que te proporcionan.
- Diferencia claramente entre datos reales y estimaciones.
- Sé conciso, profesional y estratégico.
- Responde siempre en español.

CONTEXTO ACTUAL DEL SISTEMA (rifas activas):
${JSON.stringify(metrics, null, 2)}

Responde a la pregunta del administrador.`;

        const response = await AIGateway.generateResponse(message, systemContext);

        res.json({ response });
    } catch (error) {
        console.error('[Intelligence API] Error en chat:', error);
        res.status(500).json({ error: 'Error procesando la solicitud de IA.' });
    }
});

// 3. Evaluate Prize Viability (Agente Creador)
router.post('/evaluate-prize', async (req, res) => {
    try {
        const { prizeName, prizeCost, proposedTicketPrice, proposedTickets } = req.body;

        if (!prizeName || !prizeCost || !proposedTicketPrice || !proposedTickets) {
            return res.status(400).json({ error: 'Todos los campos son requeridos.' });
        }

        const breakEven = Math.ceil(Number(prizeCost) / Number(proposedTicketPrice));
        const maxRevenue = Number(proposedTicketPrice) * Number(proposedTickets);
        const maxProfit = maxRevenue - Number(prizeCost);

        const prompt = `Analiza la viabilidad de la siguiente rifa:
Premio: ${prizeName}
Costo del premio: $${Number(prizeCost).toLocaleString('es-CO')}
Precio por ticket: $${Number(proposedTicketPrice).toLocaleString('es-CO')}
Total de tickets: ${proposedTickets}
Punto de equilibrio (calculado): ${breakEven} tickets
Ingreso máximo potencial: $${maxRevenue.toLocaleString('es-CO')}
Ganancia máxima potencial: $${maxProfit.toLocaleString('es-CO')}

Dame: 1) Clasificación de viabilidad (ALTA/MEDIA/BAJA), 2) Recomendaciones para mejorarla, 3) Una fecha estimada de sorteo sugerida si se venden a una velocidad normal de 10-20 tickets/día.`;

        const systemInstruction = `Eres el Agente Creador de Winners. Eres un experto analista de rentabilidad de sorteos. Usa los datos numéricos dados, no los recalcules. Responde en español, de forma estructurada con emojis para facilitar la lectura.`;

        const response = await AIGateway.generateResponse(prompt, systemInstruction);

        res.json({
            analysis: response,
            rawMetrics: { breakEven, maxRevenue, maxProfit }
        });
    } catch (error) {
        console.error('[Intelligence API] Error en evaluate-prize:', error);
        res.status(500).json({ error: 'Error al evaluar el premio.' });
    }
});

module.exports = router;
