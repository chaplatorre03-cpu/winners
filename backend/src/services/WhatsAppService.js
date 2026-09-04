/**
 * WhatsAppService.js
 * Handles sending WhatsApp notifications to raffle participants.
 * In development (no config), messages are logged to the console.
 * In production, messages are sent via the Evolution API WhatsApp gateway.
 */

class WhatsAppService {
    /**
     * Sends a WhatsApp message to a phone number.
     * @param {string} phone - Recipient phone number (e.g. "3222020818")
     * @param {string} message - Plain text message to send
     */
    static async sendMessage(phone, message) {
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

        if (isConfigured) {
            try {
                const cleanBaseUrl = apiUrl.replace(/\/$/, '');
                const url = `${cleanBaseUrl}/message/sendText/${instanceName}`;

                console.log(`[WhatsAppService] Enviando mensaje a ${phoneWithoutPlus} vía ${url}...`);

                const response = await fetch(url, {
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
                    console.error(`[WhatsAppService] Error en pasarela (${response.status}):`, resText);
                } else {
                    console.log(`[WhatsAppService] Mensaje enviado exitosamente a ${phoneWithoutPlus}:`, resText);
                }
            } catch (err) {
                console.error(`[WhatsAppService] Error de red enviando a ${phoneWithoutPlus}:`, err.message);
            }
        } else {
            // Simulation mode - log message to console
            console.log(`\n====== [WhatsAppService - SIMULACIÓN (Faltan variables en .env)] ======`);
            console.log(`📲 Para: ${normalized}`);
            console.log(`💬 Mensaje:\n${message}`);
            console.log(`======================================================================\n`);
        }
    }

    /**
     * Notifies all unique participants of a raffle about a date change.
     * @param {Object} raffle - The full raffle object including tickets
     * @param {string} oldDate - The previous end date (formatted string)
     * @param {string} newDate - The new end date (formatted string)
     */
    static async notifyDateChange(raffle, oldDate, newDate) {
        const tickets = raffle.tickets || [];

        // Get unique buyer phones
        const uniquePhones = [...new Set(
            tickets
                .filter(t => t.buyerPhone && t.buyerPhone.trim() !== '')
                .map(t => t.buyerPhone.trim())
        )];

        if (uniquePhones.length === 0) {
            console.log(`[WhatsAppService] No hay participantes con teléfono para notificar en rifa ${raffle.id}`);
            return;
        }

        console.log(`[WhatsAppService] Notificando cambio de fecha a ${uniquePhones.length} participante(s) de "${raffle.title}":`, uniquePhones);

        const message =
            `🎟️ *WINNERS - Aviso Importante*\n\n` +
            `Hola, te informamos que el sorteo *"${raffle.title}"* ha sido reprogramado.\n\n` +
            `📅 Fecha anterior: *${oldDate}*\n` +
            `📅 Nueva fecha: *${newDate}*\n\n` +
            `Tu número participante sigue siendo válido. ¡Gracias por tu apoyo y mucha suerte! 🍀\n\n` +
            `- El equipo de Winners`;

        // Send to all unique phones sequentially with small pause to avoid rate limits
        for (const phone of uniquePhones) {
            await WhatsAppService.sendMessage(phone, message);
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
