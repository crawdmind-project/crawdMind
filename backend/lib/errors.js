export function fail(statusCode, message) { throw Object.assign(new Error(message), { statusCode }); }
export function text(value, name, max = 5000) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) fail(400, name + " must contain 1–" + max + " characters");
  return value.trim();
}
export function email(value) {
  const result = text(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail(400, "Enter a valid email address");
  return result;
}
export function password(value) {
  if (typeof value !== "string" || value.length < 8 || Buffer.byteLength(value) > 72) fail(400, "Password must have at least 8 characters and at most 72 bytes");
  return value;
}
export async function transaction(db, work) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try { return await db.$transaction(work, { isolationLevel: "Serializable", timeout: 15000 }); }
    catch (error) { if (!["P2034", "P2002"].includes(error.code) || attempt === 3) throw error; }
  }
}
