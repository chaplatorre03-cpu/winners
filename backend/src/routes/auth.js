const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authMiddleware, authController.me);
router.put('/profile', authMiddleware, authController.updateProfile);

module.exports = router;
