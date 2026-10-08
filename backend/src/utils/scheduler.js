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
        console.log(`[Scheduler] Email NO enviado (fuera de ventana horaria 10AM-3PM Colombia). Hora actual: ${nowColombia.getHours()}:${String(nowColombia.getMinutes()).padStart(2, '0')}`);
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


// In-memory set to prevent concurrent execution of the same notification key
const activeProcessingKeys = new Set();

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

                // Evaluar Auto-Extensión si el día del sorteo ha llegado o pasado
                if (daysRemaining <= 0 && !metrics.breakEvenReached) {
                    const newEndDate = new Date(endDate.getTime() + (15 * 24 * 60 * 60 * 1000));

                    console.log(`[Agente Financiero] La rifa ${raffle.id} finalizó sin llegar a la meta. Auto-extendiendo 15 días (hasta ${newEndDate.toISOString()}).`);

                    await prisma.raffle.update({
                        where: { id: raffle.id },
                        data: { endDate: newEndDate, suggestedDrawDate: null }
                    });

                    // Notificar por WhatsApp a los participantes PAGADOS
                    try {
                        const paidTickets = await prisma.ticket.findMany({
                            where: { raffleId: raffle.id, status: 'PAGADO' }
                        });

                        // Agrupar tickets por teléfono para personalizar el mensaje y listar sus números
                        const ticketsByPhone = {};
                        for (const ticket of paidTickets) {
                            if (!ticket.buyerPhone) continue;
                            if (!ticketsByPhone[ticket.buyerPhone]) {
                                ticketsByPhone[ticket.buyerPhone] = {
                                    name: ticket.buyerName || 'Participante',
                                    numbers: []
                                };
                            }
                            ticketsByPhone[ticket.buyerPhone].numbers.push(String(ticket.ticketNumber).padStart(3, '0'));
                        }

                        const dateFormatted = newEndDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
                        const oldDateFormatted = endDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

                        let notifiedCount = 0;
                        for (const phone in ticketsByPhone) {
                            const userData = ticketsByPhone[phone];
                            // Extraer solo el primer nombre
                            const shortName = userData.name.split(' ')[0].toUpperCase();
                            const numsList = userData.numbers.map(n => `#${n}`).join(', ');

                            const waMsg = `✨ *WINNERS PLATFORM* ✨\n\n` +
                                `👋 Hola *${shortName}*,\n\n` +
                                `⚠️ *Aviso Importante sobre el Sorteo*\n\n` +
                                `Te informamos que la fecha del sorteo *"${raffle.title}"* ha sido reprogramada automáticamente.\n\n` +
                                `📆 *Detalles de la nueva programación:*\n` +
                                ` • Fecha anterior: ~${oldDateFormatted}~\n` +
                                ` • Nueva fecha oficial: 🎯 *${dateFormatted}*\n\n` +
                                `El organizador no alcanzó la meta de ventas mínima (rentabilidad). Para garantizar la transparencia y entrega del premio, el sistema extendió la fecha de forma automática.\n\n` +
                                `🎫 *Tus números participantes:*\n` +
                                `👉 ${numsList}\n\n` +
                                `ℹ️ Tus números participantes siguen 100% activos y garantizados para el sorteo. ¡Mucha suerte! 🍀✨\n\n` +
                                `💎 *Equipo WINNERS*\n` +
                                `🌐 https://winners-one.vercel.app/${raffle.id}`;

                            const waTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('WA timeout')), 25000));
                            await Promise.race([WhatsAppService.sendMessage(phone, waMsg), waTimeout]).catch(() => { });
                            notifiedCount++;
                        }
                        console.log(`[Agente Financiero] Notificados ${notifiedCount} participantes sobre el cambio de fecha.`);
                    } catch (err) {
                        console.error('[Agente Financiero] Error notificando a participantes:', err.message);
                    }

                    // Enviar correo al creador
                    if (raffle.creator?.email) {
                        await sendAlert(
                            raffle.creator.email,
                            `🔄 Fecha extendida automáticamente: ${raffle.title}`,
                            `<p style="color:#ccc;font-size:14px;margin:0 0 8px;">Hola <strong style="color:#fff;">${raffle.creator.name || 'Creador'}</strong>,</p>
                             <p style="color:#888;font-size:13px;margin:0 0 24px;">Tu rifa alcanzó su fecha de cierre original sin llegar a la rentabilidad esperada.</p>
                             <div style="background:#1a1a1a;border:2px solid #8b00ff;border-radius:12px;padding:20px;margin:0 auto 20px;display:inline-block;text-align:left;width:100%;box-sizing:border-box;">
                               <p style="color:#888;font-size:12px;margin:0 0 6px;">📌 Rifa</p>
                               <p style="color:#fff;font-size:15px;font-weight:bold;margin:0 0 14px;">${raffle.title}</p>
                               <p style="color:#888;font-size:12px;margin:0 0 4px;">📅 Nueva fecha de cierre</p>
                               <p style="color:#a855f7;font-size:16px;font-weight:900;margin:0 0 14px;">${newEndDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                             </div>
                             <p style="color:#888;font-size:12px;margin:0 0 20px;">El Agente Winners ha <strong style="color:#fff;">extendido el sorteo 15 días adicionales</strong> automáticamente para proteger la viabilidad del sorteo y a los participantes.</p>
                             <p style="color:#888;font-size:12px;margin:0 0 20px;">Todos los participantes con tickets <b>PAGADOS</b> han sido notificados de este cambio por WhatsApp.</p>
                             <a href="https://winners-one.vercel.app/panel" style="display:inline-block;background:linear-gradient(135deg,#8b00ff,#ff00de);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;font-size:14px;letter-spacing:1px;">VER MI PANEL →</a>`
                        );
                    }
                    continue; // Skip reschedule checks
                }

                // Evaluar Reprogramación (Advertencia antes del cierre)
                const triggerReschedule = daysRemaining > 0 && daysRemaining < 3 && !metrics.breakEvenReached && health.risk === 'HIGH';

                // Solo enviar alerta si aún no hemos sugerido la reprogramación (evita correos repetidos cada hora/día)
                if (triggerReschedule && !raffle.suggestedDrawDate) {
                    // Verificar que estamos en la ventana de envío (10 AM - 3 PM)
                    // Si es de madrugada, posponemos el aviso para que el correo sí llegue al usuario
                    if (!isWithinAlertWindow()) {
                        console.log(`[analyzeFinancialHealth] Rifa ${raffle.id} requiere aviso de 72h, pero está fuera de horario (10AM-3PM). Se pospone.`);
                        continue;
                    }

                    console.log(`[analyzeFinancialHealth] ¿Cumple criterio de reprogramación? ${triggerReschedule} (daysRemaining<3: ${daysRemaining < 3}, !breakEven: ${!metrics.breakEvenReached}, risk HIGH: ${health.risk === 'HIGH'})`);

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
                               <p style="color:#ccc;font-size:14px;margin:0 0 14px;">${new Date(raffle.endDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                               <p style="color:#888;font-size:12px;margin:0 0 4px;">📆 Fecha sugerida por el Agente</p>
                               <p style="color:#a855f7;font-size:16px;font-weight:900;margin:0 0 14px;">${newSuggestedDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                               <p style="color:#888;font-size:12px;margin:0 0 4px;">⚡ Nivel de riesgo</p>
                               <p style="color:#ff6b6b;font-weight:bold;font-size:14px;margin:0;">ALTO</p>
                             </div>
                             <p style="color:#888;font-size:12px;margin:0 0 20px;">El Agente Winners sugiere aplazar el sorteo <strong style="color:#fff;">15 días adicionales</strong> para alcanzar el punto de equilibrio.</p>
                             <p style="color:#888;font-size:12px;margin:0 0 20px;">Si la fecha actual llega sin alcanzar la rentabilidad, <b>el sistema la extenderá automáticamente por 15 días</b> y notificará a los participantes con ticket pagado.</p>
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
            // STAGE 0: Confirmación pendiente — tickets < 24h, sin confirmar
            //          El cron /api/cron/confirmations lo llama cada 5-15 min.
            //          Aquí también se ejecuta para cubrir el cron horario.
            // =========================================================
            const stage0Count = await Scheduler.sendPendingConfirmations(sendWhatsAppWithTimeout);
            console.log(`[Scheduler] STAGE 0 completado: ${stage0Count} confirmaciones enviadas.`);

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
                        const raffleId = first.raffleId || first.raffle?.id || '';
                        const msg =
                            `🚫 *WINNERS - Reserva Cancelada*\n\n` +
                            `Hola ${first.buyerName || 'participante'}, debido a que no recibimos la confirmación de pago en 72 horas, ` +
                            `tu reserva de ${numLabel} para el sorteo *"${first.raffle.title}"* ha expirado y los números han sido liberados.\n\n` +
                            `Si aún deseas participar, puedes reservar un nuevo número en el talonario web.\n\n` +
                            `💎 *Equipo WINNERS*\n` +
                            `🌐 https://winners-one.vercel.app${raffleId ? `/${raffleId}` : ''}`;
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
            //          Only if remindersSent === 2 (1st reminder was sent)
            // =========================================================
            const toRemind2 = await prisma.ticket.findMany({
                where: {
                    status: 'APARTADO',
                    createdAt: { lte: h48, gt: h72 },
                    remindersSent: 2
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
                    const ids = groupTickets.map(t => t.id);

                    // Optimistic DB lock
                    await prisma.ticket.updateMany({
                        where: { id: { in: ids } },
                        data: { remindersSent: 3 }
                    });

                    let sentOk = true;
                    if (first.buyerPhone) {
                        const raffleId = first.raffleId || first.raffle?.id || '';
                        const msg =
                            `⚠️ *WINNERS - Último Recordatorio*\n\n` +
                            `Hola ${first.buyerName || 'participante'}, tu reserva de ${numLabel} ` +
                            `para el sorteo *"${first.raffle.title}"* vence en las próximas horas.\n\n` +
                            `Si no confirmas tu pago, los números serán liberados. ¡No pierdas tu oportunidad! 🍀\n\n` +
                            `💎 *Equipo WINNERS*\n` +
                            `🌐 https://winners-one.vercel.app${raffleId ? `/${raffleId}` : ''}`;
                        sentOk = await sendWhatsAppWithTimeout(first.buyerPhone, msg);
                    }

                    if (sentOk) {
                        console.log(`[Agente de Seguimiento] 2do recordatorio enviado y guardado en BD para ${groupTickets.length} ticket(s) de ${first.buyerName || first.buyerPhone}`);
                    } else {
                        console.warn(`[Agente de Seguimiento] 2do recordatorio WhatsApp falló para ${first.buyerPhone}. Revirtiendo BD a remindersSent=2 para reintentar.`);
                        await prisma.ticket.updateMany({
                            where: { id: { in: ids } },
                            data: { remindersSent: 2 }
                        });
                    }
                }
            }

            // =========================================================
            // STAGE 1: First reminder — tickets 24h–48h old
            //          Only if remindersSent === 1 (initial confirmation sent)
            // =========================================================
            const toRemind1 = await prisma.ticket.findMany({
                where: {
                    status: 'APARTADO',
                    createdAt: { lte: h24, gt: h48 },
                    remindersSent: 1
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
                    const ids = groupTickets.map(t => t.id);

                    // Optimistic DB lock
                    await prisma.ticket.updateMany({
                        where: { id: { in: ids } },
                        data: { remindersSent: 2 }
                    });

                    let sentOk = true;
                    if (first.buyerPhone) {
                        const raffleId = first.raffleId || first.raffle?.id || '';
                        const msg =
                            `🎟️ *WINNERS - Recordatorio de Pago*\n\n` +
                            `Hola ${first.buyerName || 'participante'}, te recordamos que tienes reservado ${numLabel} ` +
                            `para el sorteo *"${first.raffle.title}"*.\n\n` +
                            `Realiza tu pago para asegurar tu participación. Si en 24 horas no confirmamos el pago, el número será liberado.\n\n` +
                            `¡Mucha suerte! 🍀\n\n` +
                            `💎 *Equipo WINNERS*\n` +
                            `🌐 https://winners-one.vercel.app${raffleId ? `/${raffleId}` : ''}`;
                        sentOk = await sendWhatsAppWithTimeout(first.buyerPhone, msg);
                    }

                    if (sentOk) {
                        console.log(`[Agente de Seguimiento] 1er recordatorio enviado y guardado en BD para ${groupTickets.length} ticket(s) de ${first.buyerName || first.buyerPhone}`);
                    } else {
                        console.warn(`[Agente de Seguimiento] 1er recordatorio WhatsApp falló para ${first.buyerPhone}. Revirtiendo BD a remindersSent=1 para reintentar.`);
                        await prisma.ticket.updateMany({
                            where: { id: { in: ids } },
                            data: { remindersSent: 1 }
                        });
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

    /**
     * STAGE 0: Envía confirmaciones de reserva a tickets recién creados (< 24h)
     * que aún no recibieron su mensaje de WhatsApp (remindersSent === 0).
     * Retorna la cantidad de confirmaciones enviadas.
     * @param {Function} sendFn - Función helper para enviar WA con timeout
     */
    static async sendPendingConfirmations(sendFn) {
        let sentCount = 0;
        try {
            const now = new Date();
            const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // Tickets creados en las últimas 24h sin confirmación enviada
            const pending = await prisma.ticket.findMany({
                where: {
                    status: 'APARTADO',
                    createdAt: { gt: h24 },   // menos de 24h de antigüedad
                    remindersSent: 0           // nunca confirmado
                },
                include: { raffle: true }
            });

            console.log(`[STAGE 0] Tickets pendientes de confirmación (< 24h, remindersSent=0): ${pending.length}`);
            if (pending.length === 0) return 0;

            // Agrupar por teléfono + rifa para enviar UN mensaje por persona
            const groups = new Map();
            for (const ticket of pending) {
                const key = `${ticket.buyerPhone || 'NO_PHONE'}_${ticket.raffleId}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(ticket);
            }

            for (const [, groupTickets] of groups) {
                const first = groupTickets[0];
                const groupKey = `stage0_${first.buyerPhone}_${first.raffleId}`;

                // In-memory process lock
                if (activeProcessingKeys.has(groupKey)) {
                    console.log(`[STAGE 0] Omitiendo ${groupKey}: ya en envío simultáneo en otro hilo.`);
                    continue;
                }
                activeProcessingKeys.add(groupKey);

                try {
                    const ids = groupTickets.map(t => t.id);

                    // OPTIMISTIC DB LOCK: Mark remindersSent = 1 BEFORE sending WA
                    // This prevents concurrent crons from fetching and re-sending to the same buyer.
                    await prisma.ticket.updateMany({
                        where: { id: { in: ids } },
                        data: { remindersSent: 1 }
                    });

                    if (!first.buyerPhone) {
                        continue;
                    }

                    const numList = groupTickets.map(t => `#${String(t.number).padStart(3, '0')}`).join(', ');
                    const totalCost = groupTickets.reduce((sum, t) => sum + (t.raffle?.price || 0), 0);
                    const totalFormatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalCost);

                    let paymentInfo = '';
                    if (first.raffle?.nequiPhone) paymentInfo += `\n• *Nequi:* ${first.raffle.nequiPhone}`;
                    if (first.raffle?.daviplataPhone) paymentInfo += `\n• *Daviplata:* ${first.raffle.daviplataPhone}`;
                    if (first.raffle?.brebPhone) paymentInfo += `\n• *Bre-b:* ${first.raffle.brebPhone}`;
                    if (first.raffle?.payLink) paymentInfo += `\n• *Link de Pago:* ${first.raffle.payLink}`;

                    const raffleId = first.raffleId || first.raffle?.id || '';
                    const confirmMsg =
                        `✨ *WINNERS PLATFORM* ✨\n\n` +
                        `👋 Hola *${first.buyerName || 'participante'}*,\n\n` +
                        `¡Tus números han sido reservados con éxito!\n\n` +
                        `📱 *Sorteo:* "${first.raffle?.title || 'Sorteo'}"\n` +
                        `👉 *Números reservados:* ${numList}\n` +
                        `💰 *Total a pagar:* ${totalFormatted}\n` +
                        (paymentInfo ? `\n🏦 *Métodos de pago:*${paymentInfo}\n` : '') +
                        `\n⏳ Cuentas con *72 horas* para realizar tu pago y asegurar tu participación. ¡Mucha suerte! 🍀\n\n` +
                        `💎 *Equipo WINNERS*\n` +
                        `🌐 https://winners-one.vercel.app${raffleId ? `/${raffleId}` : ''}`;

                    const sent = await sendFn(first.buyerPhone, confirmMsg);
                    if (sent) {
                        console.log(`[STAGE 0] ✅ Confirmación enviada a ${first.buyerName || first.buyerPhone} — ${numList}`);
                        sentCount++;
                    } else {
                        console.warn(`[STAGE 0] ⚠️ Fallo para ${first.buyerPhone}. Revirtiendo DB a remindersSent=0 para reintentar.`);
                        await prisma.ticket.updateMany({
                            where: { id: { in: ids } },
                            data: { remindersSent: 0 }
                        });
                    }
                } finally {
                    activeProcessingKeys.delete(groupKey);
                }
            }
        } catch (err) {
            console.error('[STAGE 0] Error en sendPendingConfirmations:', err.message);
        }
        return sentCount;
    }
}

module.exports = Scheduler;
