import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import { fail, text, email, password, transaction } from "../lib/errors.js";
import { publicUser } from "../middleware/auth.js";
export async function updateUser(id, input, admin = false) {
  const allowed = admin ? ["fullName", "email", "password", "role"] : ["fullName", "email", "password"];
  if (Object.keys(input).some(key => !allowed.includes(key))) fail(400, "Unsupported profile field");
  const data = {};
  if (input.fullName !== undefined) data.fullName = text(input.fullName, "Full name", 100);
  if (input.email !== undefined) data.email = email(input.email);
  if (input.password !== undefined) { data.password = await bcrypt.hash(password(input.password), 12); data.tokenVersion = { increment: 1 }; }
  if (input.role !== undefined) {
    if (!["MEMBER", "MODERATOR", "ADMIN"].includes(input.role)) fail(400, "Invalid role");
    data.role = input.role;
  }
  if (!Object.keys(data).length) fail(400, "No profile changes provided");
  return transaction(prisma, async tx => {
    const user = await tx.user.findUnique({ where: { id } });
    if (!user) fail(404, "User not found");
    if (user.role === "ADMIN" && data.role && data.role !== "ADMIN" && await tx.user.count({ where: { role: "ADMIN" } }) <= 1) fail(409, "The last Admin cannot be demoted");
    return tx.user.update({ where: { id }, data, select: publicUser });
  });
}
export async function deleteUser(id) {
  return transaction(prisma, async tx => {
    const user = await tx.user.findUnique({ where: { id } });
    if (!user) fail(404, "User not found");
    if (user.role === "ADMIN" && await tx.user.count({ where: { role: "ADMIN" } }) <= 1) fail(409, "The last Admin cannot be deleted");
    await tx.user.delete({ where: { id } });
  });
}
