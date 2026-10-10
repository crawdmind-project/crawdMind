import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { readFile, readdir } from "node:fs/promises";
export async function localDatabase(directory, port = 0) {
  const db = await PGlite.create(directory);
  await db.exec('CREATE TABLE IF NOT EXISTS "_CrowdMindLocalMigration" ("name" TEXT PRIMARY KEY)');
  for (const name of (await readdir(new URL("../prisma/migrations/", import.meta.url))).filter(n => /^\d/.test(n)).sort()) {
    const result = await db.query('SELECT "name" FROM "_CrowdMindLocalMigration" WHERE "name"=$1', [name]);
    if (!result.rows.length) {
      const sql = await readFile(new URL("../prisma/migrations/" + name + "/migration.sql", import.meta.url), "utf8");
      await db.transaction(async tx => { await tx.exec(sql); await tx.query('INSERT INTO "_CrowdMindLocalMigration" VALUES ($1)', [name]); });
    }
  }
  const socket = new PGLiteSocketServer({ db, host: "127.0.0.1", port, maxConnections: 10 });
  await socket.start();
  // Obtain assigned TCP port from the documented listening server implementation.
  const actualPort = Number(socket.getServerConn().split(":").pop());
  return { db, socket, url: "postgresql://postgres:postgres@127.0.0.1:" + actualPort + "/postgres?connection_limit=1", close: async () => { await socket.stop(); await db.close(); } };
}
