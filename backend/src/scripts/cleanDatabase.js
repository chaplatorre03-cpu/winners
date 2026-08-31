const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDatabase() {
    console.log('🧹 Iniciando limpieza de base de datos...');

    const auditLogs = await prisma.auditLog.deleteMany();
    console.log(`✅ AuditLogs eliminados: ${auditLogs.count}`);

    const drafts = await prisma.raffleDraft.deleteMany();
    console.log(`✅ RaffleDrafts eliminados: ${drafts.count}`);

    const winners = await prisma.raffleWinner.deleteMany();
    console.log(`✅ Ganadores eliminados: ${winners.count}`);

    const tickets = await prisma.ticket.deleteMany();
    console.log(`✅ Tickets eliminados: ${tickets.count}`);

    const raffles = await prisma.raffle.deleteMany();
    console.log(`✅ Sorteos eliminados: ${raffles.count}`);

    const users = await prisma.user.deleteMany();
    console.log(`✅ Usuarios eliminados: ${users.count}`);

    console.log('\n🎯 Base de datos limpia y lista para pruebas.');
    await prisma.$disconnect();
}

cleanDatabase().catch(e => {
    console.error('❌ Error durante la limpieza:', e);
    prisma.$disconnect();
    process.exit(1);
});
