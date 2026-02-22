const express = require('express');
const router = express.Router();
const raffleController = require('../controllers/raffleController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Public routes
router.get('/', authMiddleware, raffleController.getAllRaffles);
router.get('/:id', raffleController.getRaffle);
router.post('/purchase', raffleController.purchaseTickets);

// Protected routes (require authentication)
router.post('/', authMiddleware, raffleController.createRaffle);
router.get('/my/tickets', authMiddleware, raffleController.getMyTickets);

// Admin routes
// Admin/Creator routes
router.post('/:id/draw', authMiddleware, raffleController.drawWinner);
router.post('/:id/manual-winner', authMiddleware, raffleController.manualWinner);
router.patch('/:id', authMiddleware, raffleController.updateRaffle);
router.patch('/tickets/:id', authMiddleware, raffleController.updateTicketStatus);
router.delete('/tickets/:id', authMiddleware, raffleController.deleteTicket);

module.exports = router;
