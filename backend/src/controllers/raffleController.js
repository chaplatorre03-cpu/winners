const prisma = require('../lib/prisma');

// Get all raffles
exports.getAllRaffles = async (req, res) => {
    try {
        const raffles = await prisma.raffle.findMany({
            where: {
                creatorId: req.userId
            },
            include: {
                creator: {
                    select: { name: true, email: true, phone: true }
                },
                _count: {
                    select: {
                        tickets: true,
                    }
                },
                tickets: {
                    where: { status: 'PAGADO' },
                    select: { id: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map raffles to include paidCount
        const rafflesWithPaidCount = raffles.map(r => ({
            ...r,
            paidTicketsCount: r.tickets.length,
            // We can also override ticketsSold if we want, but let's keep it separate for now
        }));

        res.json(rafflesWithPaidCount);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las rifas' });
    }
};

const formatWinner = (win) => {
    // Determine if it's a RaffleWinner model or a raw Ticket (fallback)
    const isRaffleWinnerModel = win.ticket !== undefined;
    const ticket = isRaffleWinnerModel ? win.ticket : win;

    return {
        ticketNumber: ticket.number,
        isManualWinner: isRaffleWinnerModel ? Boolean(win.isManual) : Boolean(win.isManualWinner),
        wonAt: win.wonAt || new Date(),
        buyer: {
            name: ticket.buyerName || 'Anónimo',
            phone: ticket.buyerPhone || 'Sin tel.'
        }
    };
};

// Get single raffle
exports.getRaffle = async (req, res) => {
    try {
        const { id } = req.params;
        const raffle = await prisma.raffle.findUnique({
            where: { id: id },
            include: {
                creator: {
                    select: { name: true, email: true, phone: true }
                },
                tickets: true,
                winners: {
                    include: { ticket: true },
                    orderBy: { wonAt: 'desc' }
                }
            }
        });

        if (!raffle) {
            return res.status(404).json({ error: 'Rifa no encontrada' });
        }

        // Remap winners to the format expected by the frontend
        const formattedWinners = raffle.winners.map(formatWinner);

        res.json({
            ...raffle,
            winnerTickets: formattedWinners // Keep key name for frontend compatibility
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la rifa' });
    }
};

// Create raffle (authenticated)
exports.createRaffle = async (req, res) => {
    try {
        const { title, description, price, totalTickets, image, endDate } = req.body;

        const newRaffle = await prisma.raffle.create({
            data: {
                title,
                description,
                price: parseFloat(price),
                totalTickets: parseInt(totalTickets),
                image,
                // Append noon UTC to avoid timezone shifts when displaying
                endDate: new Date(`${endDate}T12:00:00Z`),
                creatorId: req.userId,
                status: 'ACTIVE'
            }
        });

        res.json(newRaffle);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear la rifa' });
    }
};

// Purchase tickets
exports.purchaseTickets = async (req, res) => {
    try {
        const { raffleId, ticketNumbers } = req.body;

        // Verify raffle exists and is active
        const raffle = await prisma.raffle.findUnique({
            where: { id: raffleId },
            include: { tickets: true }
        });

        if (!raffle) {
            return res.status(404).json({ error: 'Rifa no encontrada' });
        }

        if (raffle.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'La rifa no está activa' });
        }

        if (new Date() > new Date(raffle.endDate)) {
            return res.status(400).json({ error: 'La rifa ha finalizado' });
        }

        // Check if tickets are available
        const soldTickets = raffle.tickets.map(t => t.number);
        const unavailable = ticketNumbers.filter(num => soldTickets.includes(num));

        if (unavailable.length > 0) {
            return res.status(400).json({
                error: 'Algunos números ya han sido vendidos',
                unavailableTickets: unavailable
            });
        }

        const tickets = await Promise.all(
            ticketNumbers.map(number =>
                prisma.ticket.create({
                    data: {
                        number: parseInt(number),
                        buyerName: req.body.buyerName || 'Anónimo',
                        buyerPhone: req.body.buyerPhone,
                        buyerEmail: req.body.buyerEmail,
                        raffleId: raffleId,
                        status: 'APARTADO'
                    }
                })
            )
        );

        // Update raffle sold count
        await prisma.raffle.update({
            where: { id: raffleId },
            data: {
                ticketsSold: {
                    increment: ticketNumbers.length
                }
            }
        });

        res.json({
            message: 'Números reservados con éxito',
            tickets,
            totalCost: raffle.price * ticketNumbers.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al reservar los números' });
    }
};

// Draw winner (admin only)
exports.drawWinner = async (req, res) => {
    try {
        const { id } = req.params;
        const { winnersCount = 1, onlyPaid } = req.body;
        console.log('DEBUG Draw:', { winnersCount, onlyPaid });
        const shouldBePaid = onlyPaid === true || onlyPaid === 'true';

        const raffle = await prisma.raffle.findUnique({
            where: { id: id },
            include: {
                tickets: {
                    include: { wins: true }
                }
            }
        });

        if (!raffle) {
            return res.status(404).json({ error: 'Rifa no encontrada' });
        }

        // Verify ownership
        if (raffle.creatorId !== req.userId && req.userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'No tienes permiso para realizar el sorteo' });
        }

        // Filtrado manual para máxima precisión y control de estados
        const eligibleTickets = raffle.tickets.filter(t => {
            // No debe haber ganado ya en sorteo aleatorio
            const alreadyWon = t.wins.some(w => !w.isManual);
            if (alreadyWon) return false;

            // Si el modo "solo pagados" está ON, filtramos por estado
            if (shouldBePaid && t.status !== 'PAGADO') return false;

            return true;
        });

        if (eligibleTickets.length === 0) {
            const message = shouldBePaid
                ? 'No se encontraron tickets con estado PAGADO para participar en el sorteo'
                : 'No se encontraron tickets registrados que puedan participar en el sorteo';
            return res.status(400).json({ error: message });
        }

        const count = Math.min(parseInt(winnersCount), eligibleTickets.length);

        // Shuffle and pick winners
        const shuffled = [...eligibleTickets].sort(() => 0.5 - Math.random());
        const winningTickets = shuffled.slice(0, count);

        // Create winning records
        const now = new Date();
        await Promise.all(winningTickets.map(t =>
            prisma.raffleWinner.create({
                data: {
                    raffleId: id,
                    ticketId: t.id,
                    isManual: false,
                    wonAt: now
                }
            })
        ));

        res.json({
            message: 'Sorteo realizado con éxito',
            winners: winningTickets.map(t => formatWinner({
                number: t.number,
                buyerName: t.buyerName,
                buyerPhone: t.buyerPhone,
                isManualWinner: false,
                wonAt: now
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al realizar el sorteo' });
    }
};

// Manual winner (admin only) - set a specific ticket number as winner
exports.manualWinner = async (req, res) => {
    try {
        const { id } = req.params;
        const { ticketNumber, onlyPaid } = req.body;

        // Convert onlyPaid to boolean just in case
        const shouldBePaid = onlyPaid === true || onlyPaid === 'true';

        if (!ticketNumber) {
            return res.status(400).json({ error: 'Debes ingresar un número de boleta' });
        }

        const raffle = await prisma.raffle.findUnique({
            where: { id: id },
            include: { tickets: true, winners: { include: { ticket: true } } }
        });

        if (!raffle) {
            return res.status(404).json({ error: 'Rifa no encontrada' });
        }

        if (raffle.creatorId !== req.userId && req.userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'No tienes permiso para esta acción' });
        }

        const ticket = raffle.tickets.find(t => t.number === parseInt(ticketNumber));

        if (!ticket) {
            return res.status(400).json({ error: `El número ${ticketNumber} no tiene un ticket registrado en esta rifa` });
        }

        // VALIDACIÓN CRUCIAL: Solo si el check está activo
        if (shouldBePaid && ticket.status !== 'PAGADO') {
            return res.status(400).json({ error: `No se puede agregar: El número ${ticketNumber} está en estado ${ticket.status}. Para agregarlo, debes desmarcar "Solo números pagados" o marcar el boleto como pagado primero.` });
        }

        const now = new Date();
        await prisma.raffleWinner.create({
            data: {
                raffleId: id,
                ticketId: ticket.id,
                isManual: true,
                wonAt: now
            }
        });

        res.json({
            message: 'Ganador registrado manualmente',
            winners: [formatWinner({
                number: ticket.number,
                buyerName: ticket.buyerName,
                buyerPhone: ticket.buyerPhone,
                isManualWinner: true,
                wonAt: now
            })]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar el ganador manual' });
    }
};

// Obsoleto: Los usuarios ya no compran tickets vinculados a su ID
exports.getMyTickets = async (req, res) => {
    res.json([]);
};

// Update ticket status (admin or creator)
exports.updateTicketStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, buyerPhone } = req.body;

        const ticketToCheck = await prisma.ticket.findUnique({
            where: { id: parseInt(id) },
            include: { raffle: true }
        });

        if (!ticketToCheck) return res.status(404).json({ error: 'Ticket no encontrado' });

        if (ticketToCheck.raffle.creatorId !== req.userId && req.userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'No tienes permiso para actualizar este ticket' });
        }

        const updateData = {};
        if (status !== undefined) updateData.status = status;
        if (buyerPhone !== undefined) updateData.buyerPhone = buyerPhone;

        const updatedTicket = await prisma.ticket.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        res.json(updatedTicket);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el estado del ticket' });
    }
};

// Delete ticket (admin or creator)
exports.deleteTicket = async (req, res) => {
    try {
        const { id } = req.params;

        // Find ticket to get raffleId and count
        const ticket = await prisma.ticket.findUnique({
            where: { id: parseInt(id) },
            include: { raffle: true }
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }

        if (ticket.raffle.creatorId !== req.userId && req.userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'No tienes permiso para eliminar este ticket' });
        }

        // Delete existing winner records for this ticket first (Cascading delete manually to avoid FK error)
        await prisma.raffleWinner.deleteMany({
            where: { ticketId: parseInt(id) }
        });

        // Delete ticket
        await prisma.ticket.delete({
            where: { id: parseInt(id) }
        });

        // Update raffle sold count
        await prisma.raffle.update({
            where: { id: ticket.raffleId },
            data: {
                ticketsSold: {
                    decrement: 1
                }
            }
        });

        res.json({ message: 'Ticket eliminado con éxito, el número ahora está disponible' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el ticket' });
    }
};

// Update raffle details (admin or creator)
exports.updateRaffle = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, totalTickets, endDate, status, image } = req.body;

        // Verify ownership
        const existingRaffle = await prisma.raffle.findUnique({ where: { id } });
        if (!existingRaffle) return res.status(404).json({ error: 'Rifa no encontrada' });

        if (existingRaffle.creatorId !== req.userId && req.userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'No tienes permiso para editar esta rifa' });
        }

        console.log(`[BACKEND] Updating raffle ${id} with:`, req.body);

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = parseFloat(price);
        if (totalTickets !== undefined) updateData.totalTickets = parseInt(totalTickets);
        if (endDate !== undefined) updateData.endDate = new Date(endDate);
        if (status !== undefined) updateData.status = status;
        if (image !== undefined) updateData.image = image;

        const updatedRaffle = await prisma.raffle.update({
            where: { id: id },
            data: updateData
        });

        console.log(`[BACKEND] Raffle ${id} updated successfully:`, updatedRaffle);
        res.json(updatedRaffle);
    } catch (error) {
        console.error('[BACKEND] Error updating raffle:', error);
        res.status(500).json({ error: 'Error al actualizar la rifa', details: error.message });
    }
};

