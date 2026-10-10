import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { localDatabase } from "../scripts/database.js";
let database, server, prisma, base, temp, member, second, staff;
const pass = "SchoolTest2026!";
async function request(route, token, body, method = body === undefined ? "GET" : "POST") {
  const response = await fetch(base + route, { method, headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, ...(await response.json()) };
}
async function register(name) { const r = await request("/api/auth/register", null, { fullName: name, email: crypto.randomUUID() + "@example.com", password: pass }); assert.equal(r.status, 201); return r; }
async function idea(owner, title = "Community learning space", tags = ["Learning"]) { const r = await request("/api/ideas", owner.token, { title, description: "Build a shared community space for student learning.", tags }); assert.equal(r.status, 201); return r.data; }
before(async () => {
  temp = await mkdtemp(path.join(os.tmpdir(), "crowdmind-test-")); process.env.NODE_ENV = "test"; process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex"); process.env.MAIL_MODE = "file"; process.env.MAIL_DIR = path.join(temp, "mail"); process.env.FRONTEND_URL = "http://localhost:5174";
  database = await localDatabase(); process.env.DATABASE_URL = database.url;
  const app = (await import("../app.js")).default; prisma = (await import("../lib/prisma.js")).default;
  server = app.listen(0, "127.0.0.1"); await new Promise(resolve => server.once("listening", resolve)); base = "http://127.0.0.1:" + server.address().port;
  member = await register("First Member"); second = await register("Second Member"); staff = await register("Test Admin");
  await prisma.user.update({ where: { id: staff.data.id }, data: { role: "ADMIN" } });
}, { timeout: 60000 });
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); if (prisma) await prisma.$disconnect(); if (database) await database.close(); if (temp) await rm(temp, { recursive: true, force: true }); });
test("profile rejects role escalation and leaked sensitive fields; Admin can manage users", async () => {
  assert.equal((await request("/api/auth/me", member.token, { role: "ADMIN" }, "PUT")).status, 400);
  assert.equal((await request("/api/auth/me", member.token, { tokenVersion: 123 }, "PUT")).status, 400);
  const profile = await request("/api/auth/me", member.token, { fullName: "Updated Member" }, "PUT"); assert.equal(profile.data.fullName, "Updated Member"); assert.equal(profile.data.password, undefined); assert.equal(profile.data.tokenVersion, undefined);
  assert.equal((await request("/api/auth/admin/users", member.token)).status, 403);
  const changed = await request("/api/auth/admin/users/" + second.data.id, staff.token, { role: "MODERATOR" }, "PUT"); assert.equal(changed.data.role, "MODERATOR");
  assert.equal((await request("/api/auth/admin/users", second.token)).status, 200);
  assert.equal((await request("/api/auth/admin/users/" + member.data.id, second.token, { role: "ADMIN" }, "PUT")).status, 403);
  await request("/api/auth/admin/users/" + second.data.id, staff.token, { role: "MEMBER" }, "PUT");
});
test("last Admin cannot be demoted or deleted", async () => {
  assert.equal((await request("/api/auth/admin/users/" + staff.data.id, staff.token, { role: "MEMBER" }, "PUT")).status, 409);
  assert.equal((await request("/api/auth/me", staff.token, undefined, "DELETE")).status, 409);
});
test("idea creation validates input and workflow moves Under Review to Planned to Done", async () => {
  assert.equal((await request("/api/ideas", member.token, { title: " ", description: "test" })).status, 400);
  const item = await idea(member, "Workflow test"); assert.equal(item.status, "UNDER_REVIEW");
  assert.equal((await request("/api/ideas/" + item.id + "/status", member.token, { status: "PLANNED" }, "PUT")).status, 403);
  assert.equal((await request("/api/ideas/" + item.id + "/status", staff.token, { status: "DONE" }, "PUT")).status, 409);
  for (const status of ["PLANNED", "DONE"]) assert.equal((await request("/api/ideas/" + item.id + "/status", staff.token, { status }, "PUT")).data.status, status);
  assert.equal((await request("/api/ideas/" + item.id + "/status", staff.token, { status: "UNDER_REVIEW" }, "PUT")).status, 409);
});
test("vote toggles, changes, persists selection and remains unique with concurrent HTTP requests", async () => {
  const item = await idea(member, "Voting test"), route = "/api/votes/" + item.id;
  assert.equal((await request(route, null, { voteType: "UPVOTE" })).status, 401);
  assert.equal((await request(route, member.token, { voteType: "INVALID" })).status, 400);
  await request(route, member.token, { voteType: "UPVOTE" }); assert.equal((await request(route + "/me", member.token)).data, "UPVOTE");
  await request(route, member.token, { voteType: "DOWNVOTE" }); assert.equal((await request(route)).data.totalScore, -1);
  await request(route, member.token, { voteType: "DOWNVOTE" }); assert.equal((await request(route + "/me", member.token)).data, null);
  const responses = await Promise.all([request(route, member.token, { voteType: "UPVOTE" }), request(route, member.token, { voteType: "DOWNVOTE" })]); assert.ok(responses.every(r => r.status === 200));
  assert.equal(await prisma.vote.count({ where: { ideaId: item.id, userId: member.data.id } }), 1);
});
test("duplicate suggestions use real similarity and exclude the edited idea", async () => {
  const item = await idea(member, "Unique robotics learning laboratory");
  const r = await request("/api/ideas/duplicates?title=" + encodeURIComponent(item.title)); assert.ok(r.data.some(x => x.id === item.id && x.similarity === 1));
  const excluded = await request("/api/ideas/duplicates?title=" + encodeURIComponent(item.title) + "&excludeId=" + item.id); assert.ok(!excluded.data.some(x => x.id === item.id));
});
test("merge preserves comments, unions tags, retains target votes and prevents repeat or member merge", async () => {
  const source = await idea(member, "Merge source", ["Source"]), target = await idea(second, "Merge target", ["Target"]);
  await request("/api/votes/" + source.id, member.token, { voteType: "DOWNVOTE" }); await request("/api/votes/" + target.id, member.token, { voteType: "UPVOTE" }); await request("/api/votes/" + source.id, second.token, { voteType: "UPVOTE" });
  await request("/api/comments", member.token, { ideaId: source.id, content: "Keep this comment" });
  assert.equal((await request("/api/ideas/" + source.id + "/merge", member.token, { targetId: target.id })).status, 403);
  const result = await request("/api/ideas/" + source.id + "/merge", staff.token, { targetId: target.id }); assert.equal(result.status, 200); assert.deepEqual(new Set(result.data.tags), new Set(["Source", "Target"]));
  assert.equal((await request("/api/votes/" + target.id)).data.totalScore, 2);
  assert.equal((await request("/api/comments/idea/" + target.id)).data[0].content, "Keep this comment");
  assert.equal((await request("/api/ideas/" + source.id + "/merge", staff.token, { targetId: target.id })).status, 409);
  assert.equal((await request("/api/votes/" + source.id, member.token, { voteType: "UPVOTE" })).status, 409);
  assert.ok(!(await request("/api/ideas")).data.some(x => x.id === source.id));
});
test("reports enforce one per user/idea and staff can dismiss or hide content", async () => {
  const item = await idea(member, "Reported test");
  const body = { ideaId: item.id, reason: "Spam", description: "Promotional content" };
  const report = await request("/api/reports", second.token, body); assert.equal(report.status, 201);
  assert.equal((await request("/api/reports", second.token, body)).status, 409);
  assert.equal((await request("/api/reports", member.token)).status, 403);
  assert.equal((await request("/api/reports/" + report.data.id + "/resolve", member.token, { action: "HIDE", resolution: "Spam confirmed" }, "PUT")).status, 403);
  assert.equal((await request("/api/reports/" + report.data.id + "/resolve", staff.token, { action: "HIDE", resolution: "Spam confirmed" }, "PUT")).data.status, "ACTIONED");
  assert.ok(!(await request("/api/ideas")).data.some(x => x.id === item.id));
  assert.equal((await request("/api/votes/" + item.id, second.token, { voteType: "UPVOTE" })).status, 404);
  const other = await idea(member, "Dismissed report test"); const rep = await request("/api/reports", second.token, { ...body, ideaId: other.id });
  assert.equal((await request("/api/reports/" + rep.data.id + "/resolve", staff.token, { action: "DISMISS", resolution: "No violation" }, "PUT")).data.status, "DISMISSED");
  assert.equal((await request("/api/reports/" + rep.data.id + "/resolve", staff.token, { action: "DISMISS", resolution: "Again" }, "PUT")).status, 409);
});
test("comment notifications are private and only recipients can mark them read", async () => {
  const item = await idea(member, "Notification test");
  const comment = await request("/api/comments", second.token, { content: "An interesting proposal", ideaId: item.id }); assert.equal(comment.status, 201);
  const notifications = await request("/api/notifications", member.token); const own = notifications.data.find(n => n.ideaId === item.id); assert.ok(own);
  assert.equal((await request("/api/notifications/" + own.id + "/read", second.token, {}, "PUT")).status, 404);
  assert.equal((await request("/api/notifications/" + own.id + "/read", member.token, {}, "PUT")).status, 200);
  assert.equal((await request("/api/notifications/read-all", member.token, {}, "PUT")).status, 200);
  assert.equal((await request("/api/notifications", member.token)).unread, 0);
  assert.equal((await request("/api/comments/" + comment.data.id, member.token, undefined, "DELETE")).status, 403);
});
test("password reset has generic response, single-use hashed token and revokes old sessions", async () => {
  const user = await register("Reset Member");
  const response = await request("/api/auth/forgot-password", null, { email: user.data.email }); assert.equal(response.status, 200);
  const unknown = await request("/api/auth/forgot-password", null, { email: "absent@example.com" }); assert.equal(response.message, unknown.message); assert.equal(response.token, undefined);
  const mail = JSON.parse(await readFile(path.join(process.env.MAIL_DIR, (await readdir(process.env.MAIL_DIR))[0]), "utf8")); const link = /http[^\s]+/.exec(mail.text)[0]; const token = new URL(link).searchParams.get("token");
  assert.notEqual((await prisma.passwordReset.findFirst({ where: { userId: user.data.id } })).tokenHash, token);
  assert.equal((await request("/api/auth/reset-password", null, { token, password: "NewSchoolTest2026!" })).status, 200);
  assert.equal((await request("/api/auth/reset-password", null, { token, password: "NewSchoolTest2026!" })).status, 400);
  assert.equal((await request("/api/auth/me", user.token)).status, 401);
  assert.equal((await request("/api/auth/login", null, { email: user.data.email, password: pass })).status, 401);
  assert.equal((await request("/api/auth/login", null, { email: user.data.email, password: "NewSchoolTest2026!" })).status, 200);
});
test("expired reset links are rejected", async () => {
  const user = await register("Expired Reset");
  await request("/api/auth/forgot-password", null, { email: user.data.email });
  const files = await readdir(process.env.MAIL_DIR); let token;
  for (const file of files) { const mail = JSON.parse(await readFile(path.join(process.env.MAIL_DIR, file), "utf8")); if (mail.to === user.data.email) token = new URL(/http[^\s]+/.exec(mail.text)[0]).searchParams.get("token"); }
  await prisma.passwordReset.updateMany({ where: { userId: user.data.id }, data: { expiresAt: new Date(0) } });
  assert.equal((await request("/api/auth/reset-password", null, { token, password: pass })).status, 400);
});
test("logout and profile password changes invalidate existing tokens", async () => {
  const user = await register("Session test");
  assert.equal((await request("/api/auth/me", user.token, { password: "ChangedSchool2026!" }, "PUT")).status, 200);
  assert.equal((await request("/api/auth/me", user.token)).status, 401);
  const login = await request("/api/auth/login", null, { email: user.data.email, password: "ChangedSchool2026!" });
  assert.equal((await request("/api/auth/logout", login.token, {})).status, 200);
  assert.equal((await request("/api/auth/me", login.token)).status, 401);
});
test("recovery requests are rate limited", async () => {
  for (let i = 0; i < 3; i++) await request("/api/auth/forgot-password", null, { email: "absent@example.com" });
  assert.equal((await request("/api/auth/forgot-password", null, { email: "absent@example.com" })).status, 429);
});
