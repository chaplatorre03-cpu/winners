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

const LOGO_URL = 'https://winners-one.vercel.app/winners-logo.png';

async function sendAlert(to, subject, bodyHtml) {
    if (!to || !process.env.EMAIL_USER) return;
    try {
        const fullHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1a1a2e;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.4);">
          <!-- HEADER -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:32px 24px;">
              <img src="${LOGO_URL}" alt="WINNERS" width="160" style="display:block;margin:0 auto 12px;max-width:160px;" onerror="this.style.display='none'"/>
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:2px;text-transform:uppercase;">Agente Inteligente de Rifas</p>
            </td>
          </tr>
          <!-- BODY -->
          <tr>
            <td style="padding:32px 32px 24px;color:#e2e8f0;font-size:15px;line-height:1.7;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding:20px 32px 32px;border-top:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0;color:#64748b;font-size:12px;">
                Este mensaje fue generado automáticamente por el Agente Winners.<br/>
                Por favor no respondas este correo.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        await transporter.sendMail({
            from: `"Winners Agente" <${process.env.EMAIL_USER}>`,
            to,
            replyTo: process.env.EMAIL_USER,
            subject,
            html: fullHtml,
            headers: {
                'X-Mailer': 'Winners Notification System',
                'X-Priority': '1',
                'Importance': 'high'
            }
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

            console.log(`[analyzeFinancialHealth] Rifas ACTIVE encontradas: ${activeRaffles.length}`);

            for (const raffle of activeRaffles) {
                const health = RaffleHealthService.evaluateHealth(raffle);
                const metrics = health.metrics;

                const endDate = new Date(raffle.endDate);
                const daysRemaining = (endDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);

                console.log(`[analyzeFinancialHealth] Rifa: "${raffle.title}" | risk=${health.risk} | score=${health.score} | daysRemaining=${daysRemaining.toFixed(2)} | breakEvenReached=${metrics.breakEvenReached} | creatorEmail=${raffle.creator?.email || 'NONE'}`);

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
                const triggerReschedule = daysRemaining < 2 && !metrics.breakEvenReached && health.risk === 'HIGH';
                console.log(`[analyzeFinancialHealth] ¿Cumple criterio de reprogramación? ${triggerReschedule} (daysRemaining<2: ${daysRemaining < 2}, !breakEven: ${!metrics.breakEvenReached}, risk HIGH: ${health.risk === 'HIGH'})`);

                if (triggerReschedule) {
                    // Sugerir reprogramación a 15 días adicionales
                    const newSuggestedDate = new Date(endDate.getTime() + (15 * 24 * 60 * 60 * 1000));
                    await prisma.raffle.update({
                        where: { id: raffle.id },
                        data: { suggestedDrawDate: newSuggestedDate }
                    });
                    console.log(`[Agente Creador] Se sugiere reprogramar la rifa ${raffle.id} al ${newSuggestedDate.toISOString()}`);

                    if (raffle.creator?.email) {
                        console.log(`[analyzeFinancialHealth] Enviando email de alerta a: ${raffle.creator.email}`);
                        await sendAlert(
                            raffle.creator.email,
                            `⚠️ Atención requerida: Rifa ${raffle.title}`,
                            `<h2 style="margin:0 0 16px;color:#f472b6;font-size:20px;">⚠️ Tu rifa necesita atención</h2>
                             <p style="margin:0 0 12px;">Hola <strong>${raffle.creator.name || 'Creador'}</strong>,</p>
                             <p style="margin:0 0 16px;">La rifa <strong style="color:#a78bfa;">"${raffle.title}"</strong> está próxima a finalizar sin alcanzar la rentabilidad esperada.</p>
                             <table width="100%" cellpadding="12" style="background:rgba(255,255,255,0.05);border-radius:10px;margin:0 0 20px;">
                               <tr><td style="color:#94a3b8;font-size:13px;">📅 Fecha de cierre actual</td><td style="color:#e2e8f0;font-weight:bold;">${new Date(raffle.endDate).toLocaleDateString('es-CO', {day:'2-digit',month:'long',year:'numeric'})}</td></tr>
                               <tr><td style="color:#94a3b8;font-size:13px;">📆 Fecha sugerida</td><td style="color:#34d399;font-weight:bold;">${newSuggestedDate.toLocaleDateString('es-CO', {day:'2-digit',month:'long',year:'numeric'})}</td></tr>
                               <tr><td style="color:#94a3b8;font-size:13px;">⚡ Riesgo detectado</td><td style="color:#f87171;font-weight:bold;">ALTO</td></tr>
                             </table>
                             <p style="margin:0 0 20px;color:#94a3b8;font-size:14px;">El Agente Winners sugiere aplazar el sorteo <strong>15 días adicionales</strong> para darte más tiempo de alcanzar tu punto de equilibrio.</p>
                             <a href="https://winners-one.vercel.app/panel" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;font-size:14px;">Ver mi Panel de Control →</a>`
                        );
                        console.log(`[analyzeFinancialHealth] Email de alerta enviado exitosamente a ${raffle.creator.email}`);
                    } else {
                        console.warn(`[analyzeFinancialHealth] Rifa "${raffle.title}" cumple criterios pero el creador NO tiene email registrado.`);
                    }
                }
            }

            console.log('[analyzeFinancialHealth] Job completado.');
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

            // Helper to send WhatsApp with timeout in Vercel serverless environment
            const sendWhatsAppWithTimeout = async (phone, message) => {
                if (!phone) return;
                try {
                    const waTimeout = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('WhatsApp timeout (12s)')), 12000)
                    );
                    await Promise.race([
                        WhatsAppService.sendMessage(phone, message),
                        waTimeout
                    ]);
                } catch (err) {
                    console.warn(`[Scheduler] WhatsApp warning para ${phone}: ${err.message}`);
                }
            };

            // --- STAGE 3: Cancel ALL tickets older than 72h (3 days) ---
            const toCancel = await prisma.ticket.findMany({
                where: {
                    status: 'APARTADO',
                    createdAt: { lte: h72 }
                },
                include: { raffle: true }
            });

            console.log(`[Scheduler] STAGE 3 (Cancelación >72h): ${toCancel.length} ticket(s) encontrados.`);

            for (const ticket of toCancel) {
                try {
                    // Delete winner records first to avoid FK constraint errors
                    await prisma.raffleWinner.deleteMany({ where: { ticketId: ticket.id } });

                    // Delete the ticket to free the number
                    await prisma.ticket.delete({ where: { id: ticket.id } });

                    // Decrement sold count on the raffle (ensure ticketsSold does not go below 0)
                    const updatedRaffle = await prisma.raffle.findUnique({ where: { id: ticket.raffleId } });
                    if (updatedRaffle && updatedRaffle.ticketsSold > 0) {
                        await prisma.raffle.update({
                            where: { id: ticket.raffleId },
                            data: { ticketsSold: { decrement: 1 } }
                        });
                    }

                    console.log(`[Agente de Seguimiento] Reserva CANCELADA y LIBERADA: ticket #${ticket.number} en rifa "${ticket.raffle.title}"`);

                    // Notify buyer via WhatsApp (AWAITED)
                    if (ticket.buyerPhone) {
                        const msg =
                            `🚫 *WINNERS - Reserva Cancelada*\n\n` +
                            `Hola ${ticket.buyerName || 'participante'}, debido a que no recibimos la confirmación de pago en 72 horas, ` +
                            `tu reserva del número *${String(ticket.number).padStart(3, '0')}* para el sorteo *"${ticket.raffle.title}"* ha expirado y el número ha sido liberado.\n\n` +
                            `Si aún deseas participar, puedes reservar un nuevo número en el talonario web. ¡Éxitos! 🎟️`;
                        await sendWhatsAppWithTimeout(ticket.buyerPhone, msg);
                    }
                } catch (err) {
                    console.error(`[Agente de Seguimiento] Error cancelando ticket ${ticket.id}:`, err.message);
                }
            }

            // --- STAGE 2: Second warning for tickets 48h-72h old (remindersSent < 2) ---
            const toRemind2 = await prisma.ticket.findMany({
                where: {
                    status: 'APARTADO',
                    createdAt: { lte: h48, gt: h72 },
                    remindersSent: { lt: 2 }
                },
                include: { raffle: true }
            });

            console.log(`[Scheduler] STAGE 2 (Recordatorio 48h): ${toRemind2.length} ticket(s) encontrados.`);

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
                        await sendWhatsAppWithTimeout(ticket.buyerPhone, msg);
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

            console.log(`[Scheduler] STAGE 1 (Recordatorio 24h): ${toRemind1.length} ticket(s) encontrados.`);

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
                        await sendWhatsAppWithTimeout(ticket.buyerPhone, msg);
                    }
                } catch (err) {
                    console.error(`[Agente de Seguimiento] Error enviando 1er recordatorio ticket ${ticket.id}:`, err.message);
                }
            }

            return {
                cancelledCount: toCancel.length,
                remind2Count: toRemind2.length,
                remind1Count: toRemind1.length
            };

        } catch (error) {
            console.error('[Scheduler] Error en followUpPayments:', error);
            throw error;
        }
    }
}

module.exports = Scheduler;
