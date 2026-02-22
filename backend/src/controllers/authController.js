const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const dns = require('dns').promises;
const prisma = require('../lib/prisma');
const { sendResetCode } = require('../utils/mailer');

const whitelistedDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'live.com', 'msn.com'];

async function validateEmailDomain(email) {
    const domain = email.split('@')[1].toLowerCase();

    // Skip DNS check for common trusted domains to avoid local network issues
    if (whitelistedDomains.includes(domain)) {
        return true;
    }

    try {
        const addresses = await dns.resolveMx(domain);
        return addresses && addresses.length > 0;
    } catch (error) {
        console.error(`DNS Validation Error for ${domain}:`, error);
        return false;
    }
}

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register
exports.register = async (req, res) => {
    try {
        const { password, name, phone } = req.body;
        const email = req.body.email?.toLowerCase();

        // Check if user exists and is verified
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser && existingUser.isVerified) {
            return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
        }

        // Validate email domain explicitly
        const domain = email.split('@')[1];
        const isDomainValid = await validateEmailDomain(email);
        if (!isDomainValid) {
            return res.status(400).json({
                error: `El dominio "@${domain}" no es válido o no tiene servidores de correo activos registrados.`
            });
        }

        const otp = generateOTP();
        const expires = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        let user;
        if (existingUser && !existingUser.isVerified) {
            // Update existing unverified user
            user = await prisma.user.update({
                where: { email },
                data: {
                    password: hashedPassword,
                    name,
                    phone,
                    verificationCode: otp,
                    verificationExpires: expires
                }
            });
        } else {
            // Create user as unverified
            user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    phone,
                    role: 'USER',
                    isVerified: false,
                    verificationCode: otp,
                    verificationExpires: expires
                }
            });
        }

        res.json({
            message: 'Código de verificación generado',
            email: user.email,
            code: otp // Lo enviamos al frontend para el enlace de WhatsApp (Modo Gratis)
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: error.message || 'Error en el registro' });
    }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
    try {
        const { code } = req.body;
        const email = req.body.email?.toLowerCase();

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (user.verificationCode !== code) {
            return res.status(400).json({ error: 'Código de verificación incorrecto' });
        }

        if (Date.now() > new Date(user.verificationExpires).getTime()) {
            return res.status(400).json({ error: 'El código ha expirado' });
        }

        // Mark as verified
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationCode: null,
                verificationExpires: null
            }
        });

        // Generate token after verification
        const token = jwt.sign(
            { userId: updatedUser.id, role: updatedUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                role: updatedUser.role
            }
        });
    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).json({ error: 'Error al verificar el código' });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { password } = req.body;
        const email = req.body.email?.toLowerCase();

        // Find user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ error: 'Cuenta no verificada. Por favor, regístrate de nuevo para recibir un código.' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
};

// Get current user
exports.me = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                isVerified: true,
                createdAt: true
            }
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el usuario' });
    }
};
// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const userId = req.userId;

        const updateData = {
            name,
            email,
            phone
        };

        if (password && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        res.json({
            message: 'Perfil actualizado con éxito',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: 'Error al actualizar el perfil' });
    }
};

// Forgot Password - send reset code via email
exports.forgotPassword = async (req, res) => {
    try {
        const email = req.body.email?.toLowerCase();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isVerified) {
            return res.status(404).json({ error: 'No se encontró una cuenta verificada con ese correo' });
        }

        const code = generateOTP();
        const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await prisma.user.update({
            where: { email },
            data: {
                verificationCode: code,
                verificationExpires: expires
            }
        });

        await sendResetCode(email, code);

        res.json({ message: 'Código de recuperación enviado al correo' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ error: 'Error al enviar el código de recuperación' });
    }
};

// Verify Reset Code
exports.verifyResetCode = async (req, res) => {
    try {
        const { code } = req.body;
        const email = req.body.email?.toLowerCase();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (user.verificationCode !== code) {
            return res.status(400).json({ error: 'Código de verificación incorrecto' });
        }

        if (Date.now() > new Date(user.verificationExpires).getTime()) {
            return res.status(400).json({ error: 'El código ha expirado' });
        }

        res.json({ success: true, message: 'Código verificado correctamente' });
    } catch (error) {
        console.error('Verify Reset Code Error:', error);
        res.status(500).json({ error: 'Error al verificar el código' });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { code, newPassword } = req.body;
        const email = req.body.email?.toLowerCase();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (user.verificationCode !== code) {
            return res.status(400).json({ error: 'Código inválido' });
        }

        if (Date.now() > new Date(user.verificationExpires).getTime()) {
            return res.status(400).json({ error: 'El código ha expirado. Solicita uno nuevo.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                verificationCode: null,
                verificationExpires: null
            }
        });

        res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Error al restablecer la contraseña' });
    }
};
