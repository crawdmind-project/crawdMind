import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { email, password, fail, transaction } from "../lib/errors.js";
const hash = token => crypto.createHash("sha256").update(token).digest("hex");
export async function requestReset(input) {
  const address = email(input);
  const local = process.env.NODE_ENV !== "production" && process.env.MAIL_MODE === "file";
  if (!local && (!process.env.SMTP_HOST || !process.env.MAIL_FROM || !process.env.FRONTEND_URL)) fail(503, "Password recovery email is not configured");
  const user = await prisma.user.findUnique({ where: { email: address } });
  if (!user) return;
  const token = crypto.randomBytes(32).toString("hex");
  const record = await prisma.passwordReset.create({ data: { userId: user.id, tokenHash: hash(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
  const url = new URL("/reset-password.html", process.env.FRONTEND_URL || "http://localhost:5173");
  url.searchParams.set("token", token);
  const mail = { from: process.env.MAIL_FROM, to: address, subject: "Reset your CrowdMind password", text: "Reset your password: " + url.href + "\nThis link expires in 30 minutes. If you did not request it, ignore this email." };
  try {
    if (local) {
      const dir = process.env.MAIL_DIR || path.resolve(".local-mail");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, record.id + ".json"), JSON.stringify(mail, null, 2), { mode: 0o600 });
    } else {
      const port = Number(process.env.SMTP_PORT || 587);
      const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {}), connectionTimeout: 10000, socketTimeout: 15000 });
      await transport.sendMail(mail);
    }
  } catch {
    await prisma.passwordReset.delete({ where: { id: record.id } });
    console.error("Password reset email delivery failed");
  }
}
export async function resetPassword(token, value) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) fail(400, "Invalid or expired reset link");
  const encrypted = await bcrypt.hash(password(value), 12);
  await transaction(prisma, async tx => {
    const record = await tx.passwordReset.findUnique({ where: { tokenHash: hash(token) } });
    if (!record || record.usedAt || record.expiresAt <= new Date()) fail(400, "Invalid or expired reset link");
    const claimed = await tx.passwordReset.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) fail(400, "Invalid or expired reset link");
    await tx.user.update({ where: { id: record.userId }, data: { password: encrypted, tokenVersion: { increment: 1 } } });
    await tx.passwordReset.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } });
  });
}
