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

// Verifica si la hora actual en Colombia (UTC-5) está entre 10:00 AM y 3:00 PM (inclusive)
function isWithinAlertWindow() {
    const nowColombia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const hour = nowColombia.getHours(); // 0-23
    return hour >= 10 && hour <= 15; // 10:00 AM hasta 3:59 PM (incluye la hora de las 3:00 PM)
}

async function sendAlert(to, subject, bodyHtml) {
    if (!to || !process.env.EMAIL_USER) return;

    // Solo enviar entre 10:00 AM y 3:00 PM hora Colombia
    if (!isWithinAlertWindow()) {
        const nowColombia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
        console.log(`[Scheduler] Email NO enviado (fuera de ventana horaria 10AM-3PM Colombia). Hora actual: ${nowColombia.getHours()}:${String(nowColombia.getMinutes()).padStart(2,'0')}`);
        return;
    }

    try {
        const fullHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; border-radius: 16px; overflow: hidden; border: 1px solid #222;">
                <div style="background: linear-gradient(135deg, #8b00ff, #ff00de); padding: 32px 24px; text-align: center;">
                    <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase;">WINNERS</h1>
                </div>
                <div style="padding: 32px 24px; text-align: center;">
                    ${bodyHtml}
                </div>
                <div style="padding: 16px 24px; border-top: 1px solid #222; text-align: center;">
                    <p style="color: #555; font-size: 11px; margin: 0;">Este mensaje fue generado automáticamente por el Agente Winners.<br/>Si no esperabas este correo, ignóralo.</p>
                </div>
            </div>`;

        await transporter.sendMail({
            from: `"Winners" <${process.env.EMAIL_USER}>`,
            to,
            replyTo: process.env.EMAIL_USER,
            subject,
            html: fullHtml
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
                            `<p style="color:#ccc;font-size:14px;margin:0 0 8px;">Hola <strong style="color:#fff;">${raffle.creator.name || 'Creador'}</strong>,</p>
                             <p style="color:#888;font-size:13px;margin:0 0 24px;">Tu rifa está próxima a finalizar sin alcanzar la rentabilidad esperada.</p>
                             <div style="background:#1a1a1a;border:2px solid #8b00ff;border-radius:12px;padding:20px;margin:0 auto 20px;display:inline-block;text-align:left;width:100%;box-sizing:border-box;">
                               <p style="color:#888;font-size:12px;margin:0 0 6px;">📌 Rifa</p>
                               <p style="color:#fff;font-size:15px;font-weight:bold;margin:0 0 14px;">${raffle.title}</p>
                               <p style="color:#888;font-size:12px;margin:0 0 4px;">📅 Cierre actual</p>
                               <p style="color:#ccc;font-size:14px;margin:0 0 14px;">${new Date(raffle.endDate).toLocaleDateString('es-CO', {day:'2-digit',month:'long',year:'numeric'})}</p>
                               <p style="color:#888;font-size:12px;margin:0 0 4px;">📆 Fecha sugerida por el Agente</p>
                               <p style="color:#a855f7;font-size:16px;font-weight:900;margin:0 0 14px;">${newSuggestedDate.toLocaleDateString('es-CO', {day:'2-digit',month:'long',year:'numeric'})}</p>
                               <p style="color:#888;font-size:12px;margin:0 0 4px;">⚡ Nivel de riesgo</p>
                               <p style="color:#ff6b6b;font-weight:bold;font-size:14px;margin:0;">ALTO</p>
                             </div>
                             <p style="color:#888;font-size:12px;margin:0 0 20px;">El Agente Winners sugiere aplazar el sorteo <strong style="color:#fff;">15 días adicionales</strong> para alcanzar el punto de equilibrio.</p>
                             <a href="https://winners-one.vercel.app/panel" style="display:inline-block;background:linear-gradient(135deg,#8b00ff,#ff00de);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;font-size:14px;letter-spacing:1px;">VER MI PANEL →</a>`
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

            /**
             * Helper: sends a WhatsApp message with a hard timeout.
             * Returns true if delivered/skipped, false on network error/timeout.
             */
            const sendWhatsAppWithTimeout = async (phone, message) => {
                if (!phone) return true;
                try {
                    const waTimeout = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('WhatsApp timeout (25s)')), 25000)
                    );
                    await Promise.race([
                        WhatsAppService.sendMessage(phone, message),
                        waTimeout
                    ]);
                    return true;
                } catch (err) {
                    console.warn(`[Scheduler] WhatsApp warning para ${phone}: ${err.message}`);
                    return false;
                }
            };

            // Wake Evolution API (Render free tier) BEFORE sending any reminders
            const _apiUrl = process.env.WHATSAPP_API_URL;
            const _apiKey = process.env.WHATSAPP_API_KEY;
            const warmupRender = async () => {
                if (_apiUrl && _apiKey) {
                    try {
                        const wuCtrl = new AbortController();
                        const wuTimer = setTimeout(() => wuCtrl.abort(), 30000);
                        await fetch(`${_apiUrl.replace(/\/$/, '')}/instance/fetchInstances`, {
                            headers: { 'apikey': _apiKey },
                            signal: wuCtrl.signal
                        });
                        clearTimeout(wuTimer);
                        console.log('[Scheduler] Evolution API despertada OK.');
                    } catch (wuErr) {
                        console.warn('[Scheduler] Warmup Render warning:', wuErr.message);
                    }
                }
            };

            let isWarmedUp = false;

            // =========================================================
            // STAGE 0: Confirmación pendiente — tickets < 2h, sin confirmar
            //          Actúa como red de seguridad cuando el WA de la compra
            //          no pudo entregarse (Render en cold-start > 50s).
            // =========================================================
            const h2 = new Date(now.getTime() - 2 * 60 * 60 * 1000);

            const pendingConfirm = await prisma.ticket.findMany({
                where: {
                    status: 'APARTADO',
                    createdAt: { gt: h2 }, // menos de 2 horas
                    remindersSent: 0
                },
                include: { raffle: true }
            });

            console.log(`[Scheduler] STAGE 0 (Confirmación pendiente <2h): ${pendingConfirm.length} ticket(s) encontrados.`);

            if (pendingConfirm.length > 0) {
                if (!isWarmedUp) { await warmupRender(); isWarmedUp = true; }

                // Agrupar por teléfono + rifa
                const stage0Groups = new Map();
                for (const ticket of pendingConfirm) {
                    const key = `${ticket.buyerPhone || 'NO_PHONE'}_${ticket.raffleId}`;
                    if (!stage0Groups.has(key)) stage0Groups.set(key, []);
                    stage0Groups.get(key).push(ticket);
                }

                for (const [, groupTickets] of stage0Groups) {
                    const first = groupTickets[0];
                    const numList = groupTickets.map(t => `#${String(t.number).padStart(3, '0')}`).join(', ');
                    const totalCost = groupTickets.reduce((sum, t) => sum + (t.raffle.price || 0), 0);
                    const totalFormatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalCost);

                    let paymentInfo = '';
                    if (first.raffle.nequiPhone) paymentInfo += `\n• *Nequi:* ${first.raffle.nequiPhone}`;
                    if (first.raffle.daviplataPhone) paymentInfo += `\n• *Daviplata:* ${first.raffle.daviplataPhone}`;
                    if (first.raffle.brebPhone) paymentInfo += `\n• *Breb:* ${first.raffle.brebPhone}`;
                    if (first.raffle.payLink) paymentInfo += `\n• *Link de Pago:* ${first.raffle.payLink}`;

                    const confirmMsg =
                        `✨ *WINNERS PLATFORM* ✨\n\n` +
                        `👋 Hola *${first.buyerName || 'participante'}*,\n\n` +
                        `¡Tus números han sido reservados con éxito!\n\n` +
                        `📱 *Sorteo:* "${first.raffle.title}"\n` +
                        `👉 *Números reservados:* ${numList}\n` +
                        `💰 *Total a pagar:* ${totalFormatted}\n` +
                        (paymentInfo ? `\n🏦 *Métodos de pago:*${paymentInfo}\n` : '') +
                        `\n⏳ Cuentas con *72 horas* para realizar tu pago y asegurar tu participación. ¡Mucha suerte! 🍀\n\n` +
                        `💎 *Equipo WINNERS*\n` +
                        `🌐 https://winners-one.vercel.app`;

                    let sentOk = true;
                    if (first.buyerPhone) {
                        sentOk = await sendWhatsAppWithTimeout(first.buyerPhone, confirmMsg);
                    }

                    if (sentOk) {
                        const ids = groupTickets.map(t => t.id);
                        await prisma.ticket.updateMany({
                            where: { id: { in: ids } },
                            data: { remindersSent: 1 }
                        });
                        console.log(`[Agente de Seguimiento] STAGE 0: Confirmación enviada para ${groupTickets.length} ticket(s) de ${first.buyerName || first.buyerPhone}`);
                    } else {
                        console.warn(`[Agente de Seguimiento] STAGE 0: Confirmación fallida para ${first.buyerPhone}. Se reintentará en el próximo cron.`);
                    }
                }
            }

            // =========================================================
            // STAGE 3: Cancel tickets older than 72h and free the number
            // =========================================================
            const toCancel = await prisma.ticket.findMany({
                where: {
                    status: 'APARTADO',
                    createdAt: { lte: h72 }
                },
                include: { raffle: true }
            });

            console.log(`[Scheduler] STAGE 3 (Cancelación >72h): ${toCancel.length} ticket(s) encontrados.`);

            if (toCancel.length > 0) {
                if (!isWarmedUp) { await warmupRender(); isWarmedUp = true; }

                // Group by buyerPhone + raffleId
                const cancelGroups = new Map();
                for (const ticket of toCancel) {
                    const key = `${ticket.buyerPhone || 'NO_PHONE'}_${ticket.raffleId}`;
                    if (!cancelGroups.has(key)) cancelGroups.set(key, []);
                    cancelGroups.get(key).push(ticket);
                }

                for (const [, groupTickets] of cancelGroups) {
                    const first = groupTickets[0];
                    const numList = groupTickets.map(t => `#${String(t.number).padStart(3, '0')}`).join(', ');
                    const numLabel = groupTickets.length > 1 ? `los números *${numList}*` : `el número *${numList}*`;

                    if (first.buyerPhone) {
                        const msg =
                            `🚫 *WINNERS - Reserva Cancelada*\n\n` +
                            `Hola ${first.buyerName || 'participante'}, debido a que no recibimos la confirmación de pago en 72 horas, ` +
                            `tu reserva de ${numLabel} para el sorteo *"${first.raffle.title}"* ha expirado y los números han sido liberados.\n\n` +
                            `Si aún deseas participar, puedes reservar un nuevo número en el talonario web. ¡Éxitos! 🎟️`;
                        await sendWhatsAppWithTimeout(first.buyerPhone, msg);
                    }

                    for (const ticket of groupTickets) {
                        try {
                            await prisma.raffleWinner.deleteMany({ where: { ticketId: ticket.id } });
                            await prisma.ticket.delete({ where: { id: ticket.id } });

                            const updatedRaffle = await prisma.raffle.findUnique({ where: { id: ticket.raffleId } });
                            if (updatedRaffle && updatedRaffle.ticketsSold > 0) {
                                await prisma.raffle.update({
                                    where: { id: ticket.raffleId },
                                    data: { ticketsSold: { decrement: 1 } }
                                });
                            }
                            console.log(`[Agente de Seguimiento] Reserva CANCELADA y LIBERADA: ticket #${ticket.number} en rifa "${ticket.raffle.title}"`);
                        } catch (err) {
                            console.error(`[Agente de Seguimiento] Error cancelando ticket ${ticket.id}:`, err.message);
                        }
                    }
                }
            }

            // =========================================================
            // STAGE 2: Second (last) warning — tickets 48h–72h old
            //          Only if remindersSent < 2 (not yet sent)
            // =========================================================
            const toRemind2 = await prisma.ticket.findMany({
                where: {
                    status: 'APARTADO',
                    createdAt: { lte: h48, gt: h72 },
                    remindersSent: { lt: 2 }
                },
                include: { raffle: true }
            });

            console.log(`[Scheduler] STAGE 2 (Recordatorio 48h): ${toRemind2.length} ticket(s) encontrados.`);

            if (toRemind2.length > 0) {
                if (!isWarmedUp) { await warmupRender(); isWarmedUp = true; }

                // Group by buyerPhone + raffleId
                const remind2Groups = new Map();
                for (const ticket of toRemind2) {
                    const key = `${ticket.buyerPhone || 'NO_PHONE'}_${ticket.raffleId}`;
                    if (!remind2Groups.has(key)) remind2Groups.set(key, []);
                    remind2Groups.get(key).push(ticket);
                }

                for (const [, groupTickets] of remind2Groups) {
                    const first = groupTickets[0];
                    const numList = groupTickets.map(t => `#${String(t.number).padStart(3, '0')}`).join(', ');
                    const numLabel = groupTickets.length > 1 ? `los números *${numList}*` : `el número *${numList}*`;

                    let sentOk = true;
                    if (first.buyerPhone) {
                        const msg =
                            `⚠️ *WINNERS - Último Recordatorio*\n\n` +
                            `Hola ${first.buyerName || 'participante'}, tu reserva de ${numLabel} ` +
                            `para el sorteo *"${first.raffle.title}"* vence en las próximas horas.\n\n` +
                            `Si no confirmas tu pago, los números serán liberados. ¡No pierdas tu oportunidad! 🍀`;
                        sentOk = await sendWhatsAppWithTimeout(first.buyerPhone, msg);
                    }

                    // CRITICAL FIX: Only update DB if WhatsApp delivery succeeded or no phone
                    if (sentOk) {
                        const ids = groupTickets.map(t => t.id);
                        await prisma.ticket.updateMany({
                            where: { id: { in: ids } },
                            data: { remindersSent: 2 }
                        });
                        console.log(`[Agente de Seguimiento] 2do recordatorio enviado y guardado en BD para ${groupTickets.length} ticket(s) de ${first.buyerName || first.buyerPhone}`);
                    } else {
                        console.warn(`[Agente de Seguimiento] 2do recordatorio WhatsApp falló para ${first.buyerPhone}. NO se actualiza DB para reintentar en el próximo cron.`);
                    }
                }
            }

            // =========================================================
            // STAGE 1: First reminder — tickets 24h–48h old
            //          Only if remindersSent === 0 (never sent before)
            // =========================================================
            const toRemind1 = await prisma.ticket.findMany({
                where: {
                    status: 'APARTADO',
                    createdAt: { lte: h24, gt: h48 },
                    remindersSent: 0
                },
                include: { raffle: true }
            });

            console.log(`[Scheduler] STAGE 1 (Recordatorio 24h): ${toRemind1.length} ticket(s) encontrados.`);

            if (toRemind1.length > 0) {
                if (!isWarmedUp) { await warmupRender(); isWarmedUp = true; }

                // Group by buyerPhone + raffleId
                const remind1Groups = new Map();
                for (const ticket of toRemind1) {
                    const key = `${ticket.buyerPhone || 'NO_PHONE'}_${ticket.raffleId}`;
                    if (!remind1Groups.has(key)) remind1Groups.set(key, []);
                    remind1Groups.get(key).push(ticket);
                }

                for (const [, groupTickets] of remind1Groups) {
                    const first = groupTickets[0];
                    const numList = groupTickets.map(t => `#${String(t.number).padStart(3, '0')}`).join(', ');
                    const numLabel = groupTickets.length > 1 ? `los números *${numList}*` : `el número *${numList}*`;

                    let sentOk = true;
                    if (first.buyerPhone) {
                        const msg =
                            `🎟️ *WINNERS - Recordatorio de Pago*\n\n` +
                            `Hola ${first.buyerName || 'participante'}, te recordamos que tienes reservado ${numLabel} ` +
                            `para el sorteo *"${first.raffle.title}"*.\n\n` +
                            `Realiza tu pago para asegurar tu participación. Si en 24 horas no confirmamos el pago, el número será liberado.\n\n` +
                            `¡Mucha suerte! 🍀`;
                        sentOk = await sendWhatsAppWithTimeout(first.buyerPhone, msg);
                    }

                    // CRITICAL FIX: Only update DB if WhatsApp delivery succeeded or no phone
                    if (sentOk) {
                        const ids = groupTickets.map(t => t.id);
                        await prisma.ticket.updateMany({
                            where: { id: { in: ids } },
                            data: { remindersSent: 1 }
                        });
                        console.log(`[Agente de Seguimiento] 1er recordatorio enviado y guardado en BD para ${groupTickets.length} ticket(s) de ${first.buyerName || first.buyerPhone}`);
                    } else {
                        console.warn(`[Agente de Seguimiento] 1er recordatorio WhatsApp falló para ${first.buyerPhone}. NO se actualiza DB para reintentar en el próximo cron.`);
                    }
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
