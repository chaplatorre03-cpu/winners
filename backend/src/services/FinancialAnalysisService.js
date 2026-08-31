class FinancialAnalysisService {
    /**
     * Calculates the deterministic financial metrics for a raffle.
     */
    static calculateMetrics(raffle) {
        // Safe extraction of values
        const totalTickets = raffle.totalTickets || 0;
        const price = raffle.price || 0;
        const prizeCost = raffle.prizeCost || 0;
        const operationalCosts = raffle.operationalCosts || 0;
        const marginExpected = raffle.marginExpected || 0;
        const createdAt = raffle.createdAt ? new Date(raffle.createdAt) : new Date();

        // Calculate sold/paid tickets
        const tickets = raffle.tickets || [];
        const paidTickets = tickets.filter(t => t.status === 'PAGADO').length;
        const reservedTickets = tickets.filter(t => t.status === 'APARTADO').length;
        const reviewingTickets = tickets.filter(t => t.status === 'REVISANDO').length;

        // Revenues
        const revenue = paidTickets * price;
        const potentialRevenue = totalTickets * price;

        // Costs
        const totalCosts = prizeCost + operationalCosts;

        // Profit
        const estimatedProfit = revenue - totalCosts;

        // Break even (Punto de equilibrio)
        const breakEvenTickets = price > 0 ? Math.ceil(totalCosts / price) : 0;
        const breakEvenReached = totalCosts > 0 ? (paidTickets >= breakEvenTickets) : (paidTickets > 0);

        // Margins
        const currentMargin = revenue > 0 ? (estimatedProfit / revenue) * 100 : 0;

        // Velocity (Tickets/day)
        const daysActive = Math.max(1, (new Date().getTime() - createdAt.getTime()) / (1000 * 3600 * 24));
        const salesVelocity = paidTickets / daysActive;

        // Projections
        const ticketsNeeded = totalTickets - paidTickets;
        const estimatedDaysToTarget = salesVelocity > 0 ? ticketsNeeded / salesVelocity : null;

        // Percentages
        const percentSold = totalTickets > 0 ? (paidTickets / totalTickets) * 100 : 0;

        return {
            revenue,
            potentialRevenue,
            totalCosts,
            estimatedProfit,
            breakEvenTickets,
            breakEvenReached,
            currentMargin,
            salesVelocity,
            estimatedDaysToTarget,
            percentSold,
            ticketStats: {
                paid: paidTickets,
                reserved: reservedTickets,
                reviewing: reviewingTickets,
                available: totalTickets - tickets.length
            }
        };
    }
}

module.exports = FinancialAnalysisService;
