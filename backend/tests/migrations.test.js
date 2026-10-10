import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
test("migration preserves existing users/ideas and new rows start Under Review", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(await readFile(new URL("../prisma/migrations/0001_baseline/migration.sql", import.meta.url), "utf8"));
    await db.exec('INSERT INTO "User" ("id","fullName","email","password","updatedAt") VALUES (\'legacy-user\',\'Existing Member\',\'legacy@example.com\',\'hash\',NOW()); INSERT INTO "Idea" ("id","title","description","tags","updatedAt","userId") VALUES (\'legacy-idea\',\'Existing idea\',\'Keep content\',ARRAY[\'Education\'],NOW(),\'legacy-user\')');
    await db.exec(await readFile(new URL("../prisma/migrations/0002_community/migration.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../prisma/migrations/0003_merge_alias_cleanup/migration.sql", import.meta.url), "utf8"));
    const legacy = (await db.query('SELECT * FROM "Idea" WHERE "id"=\'legacy-idea\'')).rows[0]; assert.equal(legacy.status, "PLANNED"); assert.equal(legacy.description, "Keep content");
    assert.equal((await db.query('SELECT "tokenVersion" FROM "User"')).rows[0].tokenVersion, 0);
    await db.exec('INSERT INTO "Idea" ("id","title","description","tags","updatedAt","userId") VALUES (\'new-idea\',\'New idea\',\'New content\',ARRAY[]::TEXT[],NOW(),\'legacy-user\')');
    assert.equal((await db.query('SELECT "status" FROM "Idea" WHERE "id"=\'new-idea\'')).rows[0].status, "UNDER_REVIEW");
    await db.exec('UPDATE "Idea" SET "mergedIntoId"=\'new-idea\' WHERE "id"=\'legacy-idea\'; DELETE FROM "Idea" WHERE "id"=\'new-idea\'');
    assert.equal((await db.query('SELECT COUNT(*)::INT AS count FROM "Idea"')).rows[0].count, 0);
  } finally { await db.close(); }
});
