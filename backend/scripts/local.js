import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { localDatabase } from "./database.js";
// This runner always uses its own local database, never DATABASE_URL from .env.
const root = path.resolve(".local-db");
await mkdir(root, { recursive: true });
let secret;
try { secret = await readFile(path.join(root, "jwt-secret"), "utf8"); }
catch { secret = crypto.randomBytes(48).toString("hex"); await writeFile(path.join(root, "jwt-secret"), secret, { mode: 0o600 }); }
process.env.NODE_ENV = "development";
process.env.JWT_SECRET = secret;
process.env.MAIL_MODE = "file";
process.env.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5174";
const database = await localDatabase(path.join(root, "postgres"), Number(process.env.LOCAL_DB_PORT || 55433));
process.env.DATABASE_URL = database.url;
const { default: app } = await import("../app.js");
const { default: prisma } = await import("../lib/prisma.js");
const bcrypt = (await import("bcryptjs")).default;
for (const [email, fullName, role] of [["admin@crowdmind.local", "Demo Admin", "ADMIN"], ["member@crowdmind.local", "Demo Member", "MEMBER"]]) {
  await prisma.user.upsert({ where: { email }, create: { email, fullName, role, password: await bcrypt.hash("CrowdMindLocal2026!", 12) }, update: {} });
}
const port = Number(process.env.PORT || 5001);
const server = app.listen(port, "127.0.0.1", () => console.log("Local CrowdMind API: http://localhost:" + port + "\nLocal reset emails: backend/.local-mail (no real emails sent)\nLocal demo: admin@crowdmind.local / member@crowdmind.local — CrowdMindLocal2026!"));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, async () => { server.close(); await prisma.$disconnect(); await database.close(); process.exit(0); });
