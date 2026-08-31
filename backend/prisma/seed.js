const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "file:./dev.db",
        },
    },
});

async function seed() {
    try {
        // Create admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        const admin = await prisma.user.upsert({
            where: { email: 'admin@winners.com' },
            update: {},
            create: {
                email: 'admin@winners.com',
                password: adminPassword,
                name: 'GEFERSON ALEXANDER LATORRE ZAMBRANO'
            }
        });

        console.log('✅ Admin user created:', admin.email);

        // Create test user
        const userPassword = await bcrypt.hash('user123', 10);
        const user = await prisma.user.upsert({
            where: { email: 'user@winners.com' },
            update: {},
            create: {
                email: 'user@winners.com',
                password: userPassword,
                name: 'Test User'
            }
        });

        console.log('✅ Test user created:', user.email);

        // Delete existing demo raffle if it exists
        await prisma.raffle.deleteMany({
            where: { id: 'aytjs0s5n1yaizguzexvwulr' }
        });

        // Create demo raffle with specific ID
        const raffle = await prisma.raffle.create({
            data: {
                id: 'aytjs0s5n1yaizguzexvwulr',
                title: 'Al la',
                description: 'Rifa de demostración',
                price: 30,
                totalTickets: 50,
                endDate: new Date('2025-12-12'),
                creatorId: admin.id,
                status: 'ACTIVE'
            }
        });

        console.log('✅ Demo raffle created:', raffle.title);

        // Create test tickets with different statuses
        const ticketData = [
            { number: 1, buyerName: 'KJKJKL', status: 'REVISANDO', quantity: 1 },
            { number: 2, buyerName: 'AL21', status: 'PAGADO', quantity: 3 },
            { number: 3, buyerName: 'Al', status: 'PAGADO', quantity: 1 },
            { number: 6, buyerName: 'Juan Pérez', status: 'PAGADO', quantity: 1 },
            { number: 7, buyerName: 'María García', status: 'PAGADO', quantity: 1 }
        ];

        for (const ticket of ticketData) {
            await prisma.ticket.create({
                data: {
                    number: ticket.number,
                    raffleId: raffle.id,
                    buyerName: ticket.buyerName,
                    status: ticket.status,
                    quantity: ticket.quantity
                }
            });
        }

        console.log('✅ Test tickets created');

        console.log('\n🎉 Database seeded successfully!');
        console.log('\n📝 Test Credentials:');
        console.log('Admin: admin@winners.com / admin123');
        console.log('User: user@winners.com / user123');
        console.log('\n🔗 Demo Raffle URL:');
        console.log('http://localhost:5173/aytjs0s5n1yaizguzexvwulr');

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seed();

