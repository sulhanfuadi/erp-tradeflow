import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({where: {email: 'invmgr@demo.com'}}).then(console.log).finally(() => prisma.$disconnect());
