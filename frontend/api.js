const SESSION_KEY = "crowdmind.session";
export const API_BASE_URL = (window.CROWDMIND_API_BASE_URL || "https://crawdmind.onrender.com").replace(/\/$/, "");

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}
export function saveSession(token, user, remember = false) {
  if (typeof token !== "string" || !token || !user?.id) throw new Error("The server returned an incomplete login response.");
  clearSession();
  (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify({ token, user }));
}
export function getSession() {
  try {
    const value = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    const session = value ? JSON.parse(value) : null;
    return typeof session?.token === "string" && session.token && session.user?.id ? session : null;
  } catch {
    return null;
  }
}
export async function apiRequest(path, { method = "GET", body, authenticated = false } = {}) {
  const token = authenticated ? getSession()?.token : null;
  if (authenticated && !token) {
    const error = new Error("Please sign in to continue.");
    error.status = 401;
    throw error;
  }
  let response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method,
      headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(65000),
      credentials: "omit",
    });
  } catch (cause) {
    throw new Error(cause.name === "TimeoutError"
      ? "The server took too long to respond. Please try again."
      : "Could not connect to the server. Check your connection and try again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success === false) {
    const error = new Error(data?.message || "Something went wrong. Please try again.");
    error.status = response.status;
    throw error;
  }
  if (!data) throw new Error("The server returned an unexpected response. Please try again.");
  return data;
}
