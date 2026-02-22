const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const raffles = await prisma.raffle.findMany();
    console.log(JSON.stringify(raffles, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
