/**
 * WhatsAppService.js
 * Handles sending WhatsApp notifications to raffle participants.
 * In development (no config), messages are logged to the console.
 * In production, messages are sent via the Evolution API WhatsApp gateway.
 */

let logoBase64 = null;
try {
    logoBase64 = require('../assets/logoBase64');
} catch (e) {
    // If not found, will proceed without logo base64
    console.warn('[WhatsAppService] Logo base64 no encontrado en assets');
}

class WhatsAppService {
    /**
     * Sends a WhatsApp message (with image logo if available) to a phone number.
     * @param {string} phone - Recipient phone number (e.g. "3222020818")
     * @param {string} message - Text message or caption to send
     * @param {string|null|boolean} media - Optional base64 or URL image. Defaults to WINNERS logo. Pass false to send text-only.
     */
    static async sendMessage(phone, message, media = undefined) {
        if (!phone) return;

        const apiUrl = process.env.WHATSAPP_API_URL;
        const apiKey = process.env.WHATSAPP_API_KEY;
        const instanceName = process.env.WHATSAPP_INSTANCE_NAME;

        const isConfigured = Boolean(apiUrl && apiKey && instanceName);

        // Normalize phone number to E.164 format (+57XXXXXXXXXX)
        const normalized = WhatsAppService.normalizePhone(phone);
        if (!normalized) {
            console.warn(`[WhatsAppService] Número inválido, se omitirá: ${phone}`);
            return;
        }

        // For Evolution API we strip the leading '+' sign
        const phoneWithoutPlus = normalized.replace('+', '');

        // Determine image to attach: explicit media, default logo, or none
        const imageToSend = media !== undefined ? media : (logoBase64 || 'https://winners-one.vercel.app/winners-logo.png');

        if (isConfigured) {
            const cleanBaseUrl = apiUrl.replace(/\/$/, '');

            // Try sending as media message with WINNERS logo if image is available
            if (imageToSend) {
                try {
                    let cleanMedia = imageToSend;
                    if (typeof cleanMedia === 'string' && cleanMedia.startsWith('data:image')) {
                        cleanMedia = cleanMedia.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
                    }

                    const mediaUrl = `${cleanBaseUrl}/message/sendMedia/${instanceName}`;
                    console.log(`[WhatsAppService] Enviando mensaje con imagen a ${phoneWithoutPlus}...`);

                    const mediaRes = await fetch(mediaUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': apiKey
                        },
                        body: JSON.stringify({
                            number: phoneWithoutPlus,
                            mediatype: 'image',
                            media: cleanMedia,
                            caption: message,
                            fileName: 'winners-logo.png'
                        })
                    });

                    if (mediaRes.ok) {
                        const resText = await mediaRes.text();
                        console.log(`[WhatsAppService] Mensaje con imagen enviado exitosamente a ${phoneWithoutPlus}:`, resText);
                        return;
                    } else {
                        const errText = await mediaRes.text();
                        console.warn(`[WhatsAppService] Error en sendMedia (${mediaRes.status}): ${errText}. Reintentando con sendText...`);
                    }
                } catch (mediaErr) {
                    console.warn(`[WhatsAppService] Fallo de red en sendMedia: ${mediaErr.message}. Reintentando con sendText...`);
                }
            }

            // Fallback: send text message
            try {
                const textUrl = `${cleanBaseUrl}/message/sendText/${instanceName}`;
                console.log(`[WhatsAppService] Enviando mensaje de texto a ${phoneWithoutPlus}...`);

                const response = await fetch(textUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': apiKey
                    },
                    body: JSON.stringify({
                        number: phoneWithoutPlus,
                        options: {
                            delay: 1200,
                            presence: 'composing',
                            linkPreview: false
                        },
                        textMessage: {
                            text: message
                        },
                        text: message
                    })
                });

                const resText = await response.text();

                if (!response.ok) {
                    console.error(`[WhatsAppService] Error en pasarela sendText (${response.status}):`, resText);
                } else {
                    console.log(`[WhatsAppService] Mensaje de texto enviado exitosamente a ${phoneWithoutPlus}:`, resText);
                }
            } catch (err) {
                console.error(`[WhatsAppService] Error de red enviando a ${phoneWithoutPlus}:`, err.message);
            }
        } else {
            // Simulation mode - log message to console
            console.log(`\n====== [WhatsAppService - SIMULACIÓN (Faltan variables en .env)] ======`);
            console.log(`📲 Para: ${normalized}`);
            console.log(`🖼️ Logo adjunto: ${Boolean(imageToSend)}`);
            console.log(`💬 Mensaje:\n${message}`);
            console.log(`======================================================================\n`);
        }
    }

    /**
     * Notifies all unique participants of a raffle about a date change in a personal and professional way.
     * @param {Object} raffle - The full raffle object including tickets
     * @param {string} oldDate - The previous end date (formatted string)
     * @param {string} newDate - The new end date (formatted string)
     */
    static async notifyDateChange(raffle, oldDate, newDate) {
        const tickets = raffle.tickets || [];

        // Group tickets by buyer phone
        const buyerMap = new Map();

        for (const t of tickets) {
            if (!t.buyerPhone || t.buyerPhone.trim() === '') continue;
            const phone = t.buyerPhone.trim();

            if (!buyerMap.has(phone)) {
                buyerMap.set(phone, {
                    name: (t.buyerName && t.buyerName.trim() !== '' && t.buyerName.toLowerCase() !== 'anónimo') ? t.buyerName.trim() : null,
                    numbers: []
                });
            }

            const buyerData = buyerMap.get(phone);
            if (!buyerData.name && t.buyerName && t.buyerName.trim() !== '' && t.buyerName.toLowerCase() !== 'anónimo') {
                buyerData.name = t.buyerName.trim();
            }

            if (t.number !== undefined && t.number !== null) {
                buyerData.numbers.push(t.number);
            }
        }

        if (buyerMap.size === 0) {
            console.log(`[WhatsAppService] No hay participantes con teléfono para notificar en rifa ${raffle.id}`);
            return;
        }

        console.log(`[WhatsAppService] Notificando cambio de fecha a ${buyerMap.size} participante(s) de "${raffle.title}"`);

        // Format padding based on total tickets (e.g., 3 digits for 100-999, 4 digits for 1000+)
        const padLength = raffle.totalTickets ? Math.max(2, String(raffle.totalTickets - 1).length) : 3;

        // Send to each buyer with personalized name and specific ticket numbers
        for (const [phone, data] of buyerMap.entries()) {
            const sortedNumbers = [...data.numbers].sort((a, b) => a - b);
            const formattedNumbers = sortedNumbers.length > 0
                ? sortedNumbers.map(n => `#${String(n).padStart(padLength, '0')}`).join(', ')
                : 'Registrado';

            const nameGreeting = data.name ? `Hola *${data.name}*` : 'Hola';
            const ticketLabel = sortedNumbers.length > 1 ? 'Tus números participantes' : 'Tu número participante';

            const message =
                `✨ *WINNERS PLATFORM* ✨\n` +
                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                `👋 ${nameGreeting},\n\n` +
                `Te informamos que la fecha del sorteo *"${raffle.title}"* ha sido reprogramada.\n\n` +
                `📅 *Detalles de la nueva programación:*\n` +
                `• *Fecha anterior:* ~${oldDate}~\n` +
                `• *Nueva fecha oficial:* 🎯 *${newDate}*\n\n` +
                `🎟️ *${ticketLabel}:*\n` +
                `👉 *${formattedNumbers}*\n\n` +
                `ℹ️ *Tu número participante sigue 100% activo y garantizado para el sorteo.* ¡Mucha suerte! 🍀✨\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `💎 *Equipo WINNERS*\n` +
                `🌐 https://winners-one.vercel.app`;

            await WhatsAppService.sendMessage(phone, message);

            // Small pause between multiple buyers to prevent rate limits
            if (buyerMap.size > 1) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }
    }

    /**
     * Normalizes a Colombian phone number to E.164 format.
     * @param {string} phone
     * @returns {string|null}
     */
    static normalizePhone(phone) {
        if (!phone) return null;

        // Remove spaces, dashes, parentheses
        let cleaned = phone.replace(/[\s\-().+]/g, '');

        // If it already has country code 57
        if (cleaned.startsWith('57') && cleaned.length === 12) {
            return `+${cleaned}`;
        }

        // If it's a 10-digit Colombian mobile number
        if (cleaned.length === 10 && cleaned.startsWith('3')) {
            return `+57${cleaned}`;
        }

        // If it starts with + already
        if (phone.startsWith('+')) {
            return `+${cleaned}`;
        }

        // Handle standard 10 digit without country code
        if (cleaned.length === 10) {
            return `+57${cleaned}`;
        }

        // If it's at least 7 digits, assume Colombia
        if (cleaned.length >= 7 && cleaned.length <= 11) {
            return `+57${cleaned}`;
        }

        return null;
    }
}

module.exports = WhatsAppService;
