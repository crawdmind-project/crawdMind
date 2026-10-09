import { test } from "node:test";
import assert from "node:assert/strict";
const values = new Map();
globalThis.window = { CROWDMIND_API_BASE_URL: "https://test.invalid" };
globalThis.localStorage = { getItem: key => values.get(key) ?? null };
globalThis.sessionStorage = { getItem: () => null };
const link = { hidden: true };
globalThis.document = { querySelector: () => link };
let run = 0;
async function check(savedRole, serverRole) {
  values.set("crowdmind.session", JSON.stringify({ token: "test-token", user: { id: "user", role: savedRole } }));
  link.hidden = true;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://test.invalid/api/auth/me");
    assert.equal(options.headers.Authorization, "Bearer test-token");
    return Response.json({ success: true, data: { role: serverRole } });
  };
  await import("../staff-nav.js?test=" + ++run);
}
test("a saved Admin role cannot reveal moderation when the backend says Member", async () => {
  await check("ADMIN", "MEMBER");
  assert.equal(link.hidden, true);
});
test("verified staff roles reveal moderation even when the saved role is outdated", async () => {
  for (const role of ["ADMIN", "MODERATOR"]) {
    await check("MEMBER", role);
    assert.equal(link.hidden, false);
  }
});
test("signed-out users and failed verification keep moderation hidden", async () => {
  values.clear();
  link.hidden = true;
  globalThis.fetch = () => { throw new Error("Signed-out navigation must not call the API"); };
  await import("../staff-nav.js?test=" + ++run);
  assert.equal(link.hidden, true);
  values.set("crowdmind.session", JSON.stringify({ token: "test-token", user: { id: "user", role: "ADMIN" } }));
  globalThis.fetch = async () => Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  await import("../staff-nav.js?test=" + ++run);
  assert.equal(link.hidden, true);
});
