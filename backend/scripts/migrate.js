import "dotenv/config";
import { mkdirSync, closeSync, openSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const backend = fileURLToPath(new URL("../", import.meta.url));
const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:")) throw new Error("Set DATABASE_URL to a SQLite file URL in backend/.env");
const filename = url.slice(5).split("?")[0];
const database = path.isAbsolute(filename) ? filename : path.resolve(backend, "prisma", filename);
mkdirSync(path.dirname(database), { recursive: true });
// Prisma 5 on Windows may fail to create a missing SQLite file. Opening in
// append mode creates it when missing and preserves every existing database.
closeSync(openSync(database, "a"));
const result = spawnSync(process.execPath, [path.join(backend, "node_modules/prisma/build/index.js"), "migrate", "deploy"], {
  cwd: backend, env: process.env, stdio: "inherit",
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
