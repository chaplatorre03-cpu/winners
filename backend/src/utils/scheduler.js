const prisma = require('../lib/prisma');
const FinancialAnalysisService = require('../services/FinancialAnalysisService');
const RaffleHealthService = require('../services/RaffleHealthService');
const DrawExecutionService = require('../services/DrawExecutionService');
const WhatsAppService = require('../services/WhatsAppService');
const nodemailer = require('nodemailer');

// Internal transporter (same config as mailer.js)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendAlert(to, subject, html) {
    if (!to || !process.env.EMAIL_USER) return;
    try {
        await transporter.sendMail({
            from: `"Winners Agente" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log(`[Scheduler] Email enviado a ${to}: ${subject}`);
    } catch (e) {
        console.error('[Scheduler] Error enviando email:', e.message);
    }
}

class Scheduler {
    static start() {
        console.log('[Scheduler] Iniciando monitoreo en segundo plano...');
        
        // Job 1: Monitoreo Financiero y de Salud (Se ejecuta cada 6 horas)
        setInterval(async () => {
            await this.analyzeFinancialHealth();
        }, 6 * 60 * 60 * 1000);

        // Job 2: Seguimiento de Pagos (Se ejecuta cada hora)
        setInterval(async () => {
            await this.followUpPayments();
        }, 60 * 60 * 1000);

        // Ejecutar inmediatamente al arrancar
        setTimeout(() => {
            this.analyzeFinancialHealth();
            this.followUpPayments();
        }, 5000);
    }

    static async analyzeFinancialHealth() {
        console.log('[Scheduler] Ejecutando Job: analyzeFinancialHealth');
        try {
            const activeRaffles = await prisma.raffle.findMany({
                where: { status: 'ACTIVE' },
                include: { tickets: true, creator: true }
            });

            for (const raffle of activeRaffles) {
                const health = RaffleHealthService.evaluateHealth(raffle);
                const metrics = health.metrics;

                // Si alcanzó el punto de equilibrio y tiene ganancias -> GATILLO DE SORTEO AUTOMÁTICO (Agente Financiero)
                if (metrics.breakEvenReached && metrics.estimatedProfit >= (raffle.marginExpected || 0)) {
                    console.log(`[Agente Financiero] La rifa ${raffle.id} alcanzó la meta de rentabilidad. Programando sorteo...`);
                    try {
                        await DrawExecutionService.executeDraw(raffle.id, null, 'SYSTEM', 1, true);
                        console.log(`[Agente Financiero] Sorteo ejecutado automáticamente para rifa ${raffle.id}`);
                        
                        // Notificar al creador
                        if (raffle.creator?.email) {
                            await sendAlert(
                                raffle.creator.email,
                                `🎉 Sorteo Ejecutado Automáticamente: ${raffle.title}`,
                                `<p>Hola ${raffle.creator.name}, el Agente Inteligente ejecutó el sorteo de <b>${raffle.title}</b> al superar la rentabilidad esperada.</p><p>Revisa el dashboard para contactar al ganador.</p>`
                            );
                        }
                    } catch (err) {
                        console.error(`[Agente Financiero] Fallo al ejecutar sorteo para ${raffle.id}:`, err.message);
                    }
                    continue; // Skip reschedule checks if completed
                }

                // Evaluar Reprogramación (Sugerida por la IA / Reglas)
                const endDate = new Date(raffle.endDate);
                const daysRemaining = (endDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);

                if (daysRemaining < 2 && !metrics.breakEvenReached && health.risk === 'HIGH') {
                    // Sugerir reprogramación a 15 días adicionales
                    const newSuggestedDate = new Date(endDate.getTime() + (15 * 24 * 60 * 60 * 1000));
                    await prisma.raffle.update({
                        where: { id: raffle.id },
                        data: { suggestedDrawDate: newSuggestedDate }
                    });
                    console.log(`[Agente Creador] Se sugiere reprogramar la rifa ${raffle.id} al ${newSuggestedDate.toISOString()}`);
                    // Notificar al creador
                    if (raffle.creator?.email) {
                        await sendAlert(
                            raffle.creator.email,
                            `⚠️ Atención requerida: Rifa ${raffle.title}`,
                            `<p>Hola ${raffle.creator.name || ''}, la rifa <b>${raffle.title}</b> está próxima a finalizar sin alcanzar la rentabilidad esperada.</p>
                             <p>El Agente sugiere reprogramar el sorteo para el <b>${newSuggestedDate.toLocaleDateString('es-CO')}</b>.</p>
                             <p>Revisa el Asistente Winners en tu panel de control.</p>`
                        );
                    }
                }
            }
        } catch (error) {
            console.error('[Scheduler] Error en analyzeFinancialHealth:', error);
        }
    }

    static async followUpPayments() {
        console.log('[Scheduler] Ejecutando Job: followUpPayments (Agente de Seguimiento)');
        try {
            const now = new Date();

            const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const h48 = new Date(now.getTime() - 48 * 60 * 60 * 1000);
            const h72 = new Date(now.getTime() - 72 * 60 * 60 * 1000);

            // --- STAGE 3: Cancel tickets older than 72h (remindersSent >= 2) ---
            const toCancel = await prisma.ticket.findMany({
                where: {
                    status: 'APARTADO',
                    createdAt: { lte: h72 },
                    remindersSent: { gte: 2 }
                },
                include: { raffle: true }
            });

            for (const ticket of toCancel) {
                try {
                    // Delete winner records first to avoid FK constraint errors
                    await prisma.raffleWinner.deleteMany({ where: { ticketId: ticket.id } });

                    // Delete the ticket to free the number
                    await prisma.ticket.delete({ where: { id: ticket.id } });

                    // Decrement sold count on the raffle
                    await prisma.raffle.update({
                        where: { id: ticket.raffleId },
                        data: { ticketsSold: { decrement: 1 } }
                    });

                    console.log(`[Agente de Seguimiento] Reserva CANCELADA: ticket #${ticket.number} en rifa "${ticket.raffle.title}"`);

                    // Notify buyer via WhatsApp
                    if (ticket.buyerPhone) {
                        const msg =
                            `🚫 *WINNERS - Reserva Cancelada*\n\n` +
                            `Hola ${ticket.buyerName || 'participante'}, debido a que no recibimos la confirmación de pago, ` +
                            `tu reserva del número *${String(ticket.number).padStart(3, '0')}* para el sorteo *"${ticket.raffle.title}"* ha expirado y el número ha sido liberado.\n\n` +
                            `Si aún deseas participar, puedes reservar un nuevo número en el talonario web. ¡Éxitos! 🎟️`;
                        await WhatsAppService.sendMessage(ticket.buyerPhone, msg);
                    }
                } catch (err) {
                    console.error(`[Agente de Seguimiento] Error cancelando ticket ${ticket.id}:`, err.message);
                }
            }

            // --- STAGE 2: Second warning for tickets 48h-72h old (remindersSent === 1) ---
            const toRemind2 = await prisma.ticket.findMany({
                where: {
                    status: 'APARTADO',
                    createdAt: { lte: h48, gt: h72 },
                    remindersSent: 1
                },
                include: { raffle: true }
            });

            for (const ticket of toRemind2) {
                try {
                    await prisma.ticket.update({
                        where: { id: ticket.id },
                        data: { remindersSent: 2 }
                    });

                    console.log(`[Agente de Seguimiento] 2do recordatorio enviado: ticket #${ticket.number} en rifa "${ticket.raffle.title}"`);

                    if (ticket.buyerPhone) {
                        const msg =
                            `⚠️ *WINNERS - Último Recordatorio*\n\n` +
                            `Hola ${ticket.buyerName || 'participante'}, tu reserva del número *${String(ticket.number).padStart(3, '0')}* ` +
                            `para el sorteo *"${ticket.raffle.title}"* vence en las próximas horas.\n\n` +
                            `Si no confirmas tu pago, el número será liberado. ¡No pierdas tu oportunidad! 🍀`;
                        await WhatsAppService.sendMessage(ticket.buyerPhone, msg);
                    }
                } catch (err) {
                    console.error(`[Agente de Seguimiento] Error enviando 2do recordatorio ticket ${ticket.id}:`, err.message);
                }
            }

            // --- STAGE 1: First reminder for tickets 24h-48h old (remindersSent === 0) ---
            const toRemind1 = await prisma.ticket.findMany({
                where: {
                    status: 'APARTADO',
                    createdAt: { lte: h24, gt: h48 },
                    remindersSent: 0
                },
                include: { raffle: true }
            });

            for (const ticket of toRemind1) {
                try {
                    await prisma.ticket.update({
                        where: { id: ticket.id },
                        data: { remindersSent: 1 }
                    });

                    console.log(`[Agente de Seguimiento] 1er recordatorio enviado: ticket #${ticket.number} en rifa "${ticket.raffle.title}"`);

                    if (ticket.buyerPhone) {
                        const msg =
                            `🎟️ *WINNERS - Recordatorio de Pago*\n\n` +
                            `Hola ${ticket.buyerName || 'participante'}, te recordamos que tienes reservado el número ` +
                            `*${String(ticket.number).padStart(3, '0')}* para el sorteo *"${ticket.raffle.title}"*.\n\n` +
                            `Realiza tu pago para asegurar tu participación. Si en 24 horas no confirmamos el pago, el número será liberado.\n\n` +
                            `¡Mucha suerte! 🍀`;
                        await WhatsAppService.sendMessage(ticket.buyerPhone, msg);
                    }
                } catch (err) {
                    console.error(`[Agente de Seguimiento] Error enviando 1er recordatorio ticket ${ticket.id}:`, err.message);
                }
            }

        } catch (error) {
            console.error('[Scheduler] Error en followUpPayments:', error);
        }
    }
}

module.exports = Scheduler;
