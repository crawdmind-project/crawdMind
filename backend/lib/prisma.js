import { PrismaClient } from "@prisma/client";


const globalForPrisma = globalThis;

// Initialize Prisma client
const prisma = globalForPrisma.prisma || new PrismaClient();


if (process.env.NODE_ENV === "development") {
  globalForPrisma.prisma = prisma;
}


process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export default prisma;
