const FinancialAnalysisService = require('./FinancialAnalysisService');

class RaffleHealthService {
    /**
     * Computes a deterministic health score (0-100) and risk level.
     */
    static evaluateHealth(raffle) {
        const metrics = FinancialAnalysisService.calculateMetrics(raffle);
        let score = 100;
        let reasons = [];
        let risk = "LOW";

        const { percentSold, salesVelocity, breakEvenReached, estimatedDaysToTarget, breakEvenTickets } = metrics;
        
        // Active days
        const createdAt = raffle.createdAt ? new Date(raffle.createdAt) : new Date();
        const daysActive = Math.max(1, (new Date().getTime() - createdAt.getTime()) / (1000 * 3600 * 24));

        // Penalty: Low sales velocity
        if (salesVelocity < 5) {
            score -= 20;
            reasons.push("Velocidad de venta baja (< 5 tickets/día).");
        } else if (salesVelocity < 15) {
            score -= 10;
        }

        // Penalty: Time running out vs percentage sold
        // Assuming a standard 30-day target if endDate is not strictly evaluated here
        const endDate = new Date(raffle.endDate);
        const daysRemaining = Math.max(0, (endDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        
        if (daysRemaining < 7 && !breakEvenReached) {
            score -= 40;
            reasons.push("Faltan menos de 7 días y no se ha alcanzado el punto de equilibrio.");
        } else if (daysRemaining < 15 && percentSold < 30) {
            score -= 20;
            reasons.push("Menos de 15 días restantes con un porcentaje de venta bajo (<30%).");
        }

        // Bound score
        score = Math.max(0, Math.min(100, score));

        // Assign risk category based on score
        if (score >= 90) risk = "LOW";
        else if (score >= 75) risk = "MEDIUM-LOW";
        else if (score >= 50) risk = "MEDIUM";
        else risk = "HIGH";

        return {
            score,
            risk,
            reasons,
            metrics
        };
    }
}

module.exports = RaffleHealthService;
