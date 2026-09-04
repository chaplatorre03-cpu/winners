/**
 * Formats a timestamp or date string to DD/MM/AAAA (Día/Mes/Año).
 * Example: '2026-09-02T14:30:00Z' -> '02/09/2026'
 */
export const formatTicketDate = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Formats a raffle end date (UTC or local) to DD/MM/AAAA.
 * Example: '2026-09-09T12:00:00Z' -> '09/09/2026'
 */
export const formatRaffleDate = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    // If it has a timezone / UTC string, read UTC parts to avoid timezone shifting
    if (typeof dateInput === 'string' && (dateInput.includes('T') || dateInput.includes('Z'))) {
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}/${month}/${year}`;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};
