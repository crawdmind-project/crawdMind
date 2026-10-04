import { PrismaClient } from "@prisma/client";


const globalForPrisma = globalThis;

// Initialize Prisma client
// SQLite supports one writer. A single connection prevents competing
// interactive transactions from blocking each other inside Prisma's engine.
const databaseUrl = process.env.DATABASE_URL;
const sqliteUrl = databaseUrl?.startsWith("file:")
  ? databaseUrl.replace(/([?&])connection_limit=\d+&?/g, "$1").replace(/[?&]$/, "")
  : databaseUrl;
const prisma = globalForPrisma.prisma || new PrismaClient({
  ...(sqliteUrl ? { datasources: { db: { url: sqliteUrl + (sqliteUrl.includes("?") ? "&" : "?") + "connection_limit=1" } } } : {}),
});


if (process.env.NODE_ENV === "development") {
  globalForPrisma.prisma = prisma;
}


process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export default prisma;
