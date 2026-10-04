import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// These identities and the middleware below exist ONLY inside tests.
// They do not implement registration, login, JWT verification, or roles.
const alice = "test-alice";
const bob = "test-bob";
const identities = new Map([[alice, "alice-id"], [bob, "bob-id"]]);
let prisma, server, base, directory, ideaId, createApp;
const backend = fileURLToPath(new URL("../", import.meta.url));

async function request(method, endpoint, token, body) {
  const response = await fetch(base + endpoint, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}
const vote = (token, value, id = ideaId) => request("PUT", `/api/ideas/${id}/vote`, token, { value });
const summary = token => request("GET", `/api/ideas/${ideaId}/votes`, token);
const remove = token => request("DELETE", `/api/ideas/${ideaId}/vote`, token);

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "crowdmind-voting-"));
  await writeFile(path.join(directory, "test.db"), "");
  process.env.DATABASE_URL = "file:" + path.join(directory, "test.db").replaceAll("\\", "/");
  execFileSync(process.execPath, [path.join(backend, "node_modules/prisma/build/index.js"), "migrate", "deploy"], {
    cwd: backend, env: process.env, stdio: "pipe",
  });
  prisma = (await import("../lib/prisma.js")).default;
  ({ createApp } = await import("../app.js"));
  // Seed prerequisite records directly: creating users/ideas is not this task.
  for (const id of identities.values()) await prisma.user.create({ data: { id } });
  const idea = await prisma.idea.create({ data: { title: "Test idea", description: "Voting fixture", authorId: "alice-id" } });
  ideaId = idea.id;
  const app = createApp({
    authenticateUser: async (req, res, next) => {
      const id = identities.get(req.headers.authorization?.replace(/^Bearer /, ""));
      if (!id || !await prisma.user.findUnique({ where: { id } })) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }
      req.user = { id };
      next();
    },
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (prisma) await prisma.$disconnect();
  if (directory) await rm(directory, { recursive: true, force: true });
});

test("authentication and idea creation are absent; default app refuses voting until authentication is connected", async () => {
  assert.equal((await request("POST", "/api/auth/register", null, {})).status, 404);
  assert.equal((await request("POST", "/api/auth/login", null, {})).status, 404);
  assert.equal((await request("POST", "/api/ideas", alice, { title: "New", description: "Not this task" })).status, 404);
  const isolated = createApp().listen(0, "127.0.0.1");
  await new Promise(resolve => isolated.once("listening", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${isolated.address().port}/api/ideas/${ideaId}/vote`, {
      method: "PUT", headers: { Authorization: "Bearer " + alice, "Content-Type": "application/json" },
      body: JSON.stringify({ value: 1, userId: "alice-id" }),
    });
    assert.equal(response.status, 401);
  } finally {
    await new Promise(resolve => isolated.close(resolve));
  }
});

test("voting requires an identity supplied by authentication middleware", async () => {
  assert.equal((await vote(null, 1)).status, 401);
  assert.equal((await vote("invalid", 1)).status, 401);
  assert.equal((await request("DELETE", `/api/ideas/${ideaId}/vote`)).status, 401);
  assert.equal((await summary(null)).status, 401);
  const isolated = createApp({ authenticateUser: (req, res, next) => next() }).listen(0, "127.0.0.1");
  await new Promise(resolve => isolated.once("listening", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${isolated.address().port}/api/ideas/${ideaId}/votes`);
    assert.equal(response.status, 401);
  } finally {
    await new Promise(resolve => isolated.close(resolve));
  }
});

test("rejects invalid values and missing ideas without creating votes", async () => {
  for (const value of [0, 2, -2, "1", true, null]) assert.equal((await vote(alice, value)).status, 400);
  assert.equal((await vote(alice, 1, "missing")).status, 404);
  assert.equal((await request("DELETE", "/api/ideas/missing/vote", alice)).status, 404);
  assert.equal((await request("GET", "/api/ideas/missing/votes", alice)).status, 404);
  assert.equal(await prisma.vote.count(), 0);
});

test("upvote is idempotent, can switch direction, and totals reflect independent users and ideas", async () => {
  assert.deepEqual((await summary(alice)).body, { success: true, ideaId, upvotes: 0, downvotes: 0, score: 0, userVote: null });
  assert.equal((await vote(alice, 1)).body.score, 1);
  assert.equal((await vote(alice, 1)).body.upvotes, 1);
  assert.equal(await prisma.vote.count({ where: { ideaId } }), 1);
  const changed = await vote(alice, -1);
  assert.equal(changed.body.downvotes, 1);
  assert.equal(changed.body.upvotes, 0);
  assert.equal(changed.body.userVote, -1);
  assert.equal((await vote(bob, 1)).body.score, 0);
  assert.equal((await summary(alice)).body.userVote, -1);
  assert.equal((await summary(bob)).body.userVote, 1);
  const second = await prisma.idea.create({ data: { title: "Second", description: "Fixture", authorId: "bob-id" } });
  assert.equal((await vote(alice, 1, second.id)).body.score, 1);
  assert.equal((await summary(alice)).body.score, 0);
});

test("client cannot change another user's vote; removal is idempotent and allows voting again", async () => {
  const result = await request("PUT", `/api/ideas/${ideaId}/vote`, alice, { value: -1, userId: "bob-id" });
  assert.equal(result.status, 200);
  assert.equal((await summary(bob)).body.userVote, 1);
  assert.equal((await remove(alice)).body.userVote, null);
  assert.equal((await summary(bob)).body.score, 1);
  assert.equal((await remove(alice)).status, 200);
  assert.equal((await vote(alice, 1)).body.upvotes, 2);
  await remove(alice);
  await remove(bob);
});

test("database enforces uniqueness and concurrent requests keep exactly one vote", async () => {
  const results = await Promise.all(Array.from({ length: 8 }, (_, index) => vote(alice, index % 2 ? 1 : -1)));
  for (const result of results) assert.equal(result.status, 200);
  assert.equal(await prisma.vote.count({ where: { userId: "alice-id", ideaId } }), 1);
  await assert.rejects(prisma.vote.create({ data: { userId: "alice-id", ideaId, value: 1 } }), { code: "P2002" });
  const result = (await summary(alice)).body;
  assert.equal(result.upvotes + result.downvotes, 1);
  assert.equal(result.score, result.userVote);
});
