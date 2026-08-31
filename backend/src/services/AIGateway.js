const FinancialAnalysisService = require('./FinancialAnalysisService');
const RaffleHealthService = require('./RaffleHealthService');
const prisma = require('../lib/prisma');

class AIGateway {
    /**
     * Initializes a chat session with Google Gemini (Free Tier)
     * To use this in development and production:
     * 1. Get a free API key at https://aistudio.google.com
     * 2. Add GEMINI_API_KEY to your .env file
     */
    static async generateResponse(prompt, systemInstruction = "") {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('[AIGateway] GEMINI_API_KEY no configurada. Retornando respuesta de prueba.');
            return "No he podido procesar tu solicitud porque falta la GEMINI_API_KEY en el entorno.";
        }

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{ parts: [{ text: prompt }] }],
                systemInstruction: { parts: [{ text: systemInstruction }] },
                generationConfig: {
                    temperature: 0.2, // Low temp for analytical responses
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('[AIGateway] Error en la API de Gemini:', err);
                throw new Error("Error comunicándose con el servicio de Inteligencia Artificial.");
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('[AIGateway] Falló la generación:', error);
            return "Ocurrió un error interno procesando la inteligencia de este mensaje.";
        }
    }

    /**
     * AI Tools - Controlled tools that feed data to the LLM
     */
    static async getActiveRafflesMetrics() {
        const raffles = await prisma.raffle.findMany({
            where: { status: 'ACTIVE' },
            include: { tickets: true }
        });

        return raffles.map(r => {
            const health = RaffleHealthService.evaluateHealth(r);
            return {
                id: r.id,
                title: r.title,
                score: health.score,
                risk: health.risk,
                profit: health.metrics.estimatedProfit,
                breakEvenReached: health.metrics.breakEvenReached
            };
        });
    }

    static async prepareRaffleDraft(title, proposedPrice, totalTickets, prizeCost) {
        // La IA solicita crear un borrador
        const draft = await prisma.raffleDraft.create({
            data: {
                title,
                proposedPrice,
                totalTickets,
                prizeCost,
                status: 'PENDING'
            }
        });
        return draft;
    }
}

module.exports = AIGateway;
