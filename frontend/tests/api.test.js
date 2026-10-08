import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
globalThis.window = { CROWDMIND_API_BASE_URL: "https://test.invalid" };
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
const originalFetch = globalThis.fetch;
const { apiRequest, saveSession, getSession, clearSession } = await import("../api.js");
afterEach(() => { clearSession(); globalThis.fetch = originalFetch; });

test("registration sends the documented fields without an auth header", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://test.invalid/api/auth/register");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.credentials, "omit");
    assert.deepEqual(JSON.parse(options.body), { fullName: "Test User", email: "test@example.com", password: "test-only" });
    return Response.json({ success: true, token: "test-token", data: { id: "user-1" } }, { status: 201 });
  };
  const result = await apiRequest("/api/auth/register", { method: "POST", body: { fullName: "Test User", email: "test@example.com", password: "test-only" } });
  assert.equal(result.token, "test-token");
});

test("remember me selects storage and clears the previous session", () => {
  saveSession("first", { id: "user-1" });
  assert.ok(sessionStorage.getItem("crowdmind.session"));
  assert.equal(localStorage.getItem("crowdmind.session"), null);
  saveSession("second", { id: "user-2" }, true);
  assert.equal(sessionStorage.getItem("crowdmind.session"), null);
  assert.equal(getSession().token, "second");
  clearSession();
  assert.equal(getSession(), null);
});

test("profile requests send the saved Bearer token", async () => {
  saveSession("test-token", { id: "user-1" });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://test.invalid/api/auth/me");
    assert.equal(options.headers.Authorization, "Bearer test-token");
    return Response.json({ success: true, data: { id: "user-1" } });
  };
  assert.equal((await apiRequest("/api/auth/me", { authenticated: true })).data.id, "user-1");
});

test("protected requests require a session and API errors keep their status", async () => {
  await assert.rejects(apiRequest("/api/auth/me", { authenticated: true }), { status: 401 });
  globalThis.fetch = async () => Response.json({ success: false, message: "User with this email already exists" }, { status: 409 });
  await assert.rejects(apiRequest("/api/auth/register", { method: "POST", body: {} }), { status: 409, message: "User with this email already exists" });
});

test("network failures are readable and malformed sessions are not accepted", async () => {
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(apiRequest("/api/auth/login", { method: "POST", body: {} }), /Could not connect/);
  assert.throws(() => saveSession("", { id: "user-1" }), /incomplete/);
  localStorage.setItem("crowdmind.session", "not-json");
  assert.equal(getSession(), null);
});
