const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendResetCode(email, code) {
    const mailOptions = {
        from: `"Winners" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Código de recuperación - Winners',
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; border-radius: 16px; overflow: hidden; border: 1px solid #222;">
                <div style="background: linear-gradient(135deg, #8b00ff, #ff00de); padding: 32px 24px; text-align: center;">
                    <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase;">WINNERS</h1>
                </div>
                <div style="padding: 32px 24px; text-align: center;">
                    <p style="color: #ccc; font-size: 14px; margin: 0 0 8px;">Recibimos una solicitud para restablecer tu contraseña.</p>
                    <p style="color: #888; font-size: 13px; margin: 0 0 24px;">Usa el siguiente código de 6 dígitos:</p>
                    <div style="background: #1a1a1a; border: 2px solid #8b00ff; border-radius: 12px; padding: 20px; margin: 0 auto; display: inline-block;">
                        <span style="font-size: 36px; font-weight: 900; letter-spacing: 12px; color: #fff; font-family: monospace;">${code}</span>
                    </div>
                    <p style="color: #ff6b6b; font-size: 12px; margin: 24px 0 0;">Este código expira en 5 minutos.</p>
                </div>
                <div style="padding: 16px 24px; border-top: 1px solid #222; text-align: center;">
                    <p style="color: #555; font-size: 11px; margin: 0;">Si no solicitaste esto, ignora este correo.</p>
                </div>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
}

module.exports = { sendResetCode };
