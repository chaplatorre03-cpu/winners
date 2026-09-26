const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'winners_jwt_secret_key_default_2026';

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        // Implicitly make all registered users ADMIN to remove role-based blocks
        req.userRole = 'ADMIN';
        next();
    } catch (error) {
        console.error('[authMiddleware] Token verification error:', error.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const adminMiddleware = (req, res, next) => {
    // Allow all authenticated users through
    next();
};

module.exports = { authMiddleware, adminMiddleware };
