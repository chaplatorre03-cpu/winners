const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '../../.env' });

const prisma = new PrismaClient();

async function main() {
    console.log('--- LISTA DE USUARIOS REGISTRADOS ---');
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                password: true,
                isVerified: true
            }
        });

        if (users.length === 0) {
            console.log('No hay usuarios registrados.');
        } else {
            console.table(users.map(u => ({
                id: u.id,
                email: u.email,
                nombre: u.name,
                password_hash: u.password,
                verificado: u.isVerified
            })));
        }
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
