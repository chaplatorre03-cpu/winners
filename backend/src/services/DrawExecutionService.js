const prisma = require('../lib/prisma');
const AuditService = require('./AuditService');
const FinancialAnalysisService = require('./FinancialAnalysisService');

class DrawExecutionService {
    /**
     * Executes the draw securely, idempotently, and audits the action.
     */
    static async executeDraw(raffleId, actorId, actorType = 'SYSTEM', winnersCount = 1, onlyPaid = true) {
        console.log(`[DrawExecutionService] Preparando sorteo para rifa: ${raffleId} por ${actorType}`);

        // Start a transaction to ensure atomic execution
        return await prisma.$transaction(async (tx) => {
            const raffle = await tx.raffle.findUnique({
                where: { id: raffleId },
                include: { tickets: { include: { wins: true } } }
            });

            if (!raffle) throw new Error("La rifa no existe.");
            if (raffle.status === 'COMPLETED') throw new Error("La rifa ya fue sorteada (COMPLETED).");

            // Evaluate Financial constraints if called by AI/SYSTEM
            if (actorType === 'AI' || actorType === 'SYSTEM') {
                const metrics = FinancialAnalysisService.calculateMetrics(raffle);
                if (!metrics.breakEvenReached || metrics.estimatedProfit < (raffle.marginExpected || 0)) {
                    throw new Error("No se cumple la rentabilidad mínima para ejecutar el sorteo automáticamente.");
                }
            }

            // Eligible tickets
            const eligibleTickets = raffle.tickets.filter(t => {
                const alreadyWon = t.wins.some(w => !w.isManual);
                if (alreadyWon) return false;
                if (onlyPaid && t.status !== 'PAGADO') return false;
                return true;
            });

            if (eligibleTickets.length === 0) {
                throw new Error("No hay tickets elegibles para el sorteo.");
            }

            const count = Math.min(parseInt(winnersCount), eligibleTickets.length);
            const shuffled = [...eligibleTickets].sort(() => 0.5 - Math.random());
            const winningTickets = shuffled.slice(0, count);
            const now = new Date();

            // Create winning records
            const winnersData = winningTickets.map(t => ({
                raffleId: raffle.id,
                ticketId: t.id,
                isManual: false,
                wonAt: now
            }));

            await tx.raffleWinner.createMany({ data: winnersData });

            // Update Raffle Status
            await tx.raffle.update({
                where: { id: raffle.id },
                data: { status: 'COMPLETED' }
            });

            // Audit
            await tx.auditLog.create({
                data: {
                    actorType,
                    actorId,
                    action: 'EXECUTE_DRAW',
                    entity: 'Raffle',
                    entityId: raffle.id,
                    metadata: { winners: winningTickets.map(t => t.number) }
                }
            });

            return winningTickets;
        });
    }
}

module.exports = DrawExecutionService;
