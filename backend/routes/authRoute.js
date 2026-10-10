import express from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { updateUser, deleteUser } from "../services/userService.js";
import { authenticateToken as auth, authorizeRoles, signToken, publicUser } from "../middleware/auth.js";
import { email, password, text, fail } from "../lib/errors.js";
import { requestReset, resetPassword } from "../services/passwordService.js";
import { rateLimit } from "../middleware/rateLimit.js";
const router = express.Router();
router.post("/register", rateLimit(20), async (req, res) => {
  const data = { fullName: text(req.body.fullName, "Full name", 100), email: email(req.body.email), password: await bcrypt.hash(password(req.body.password), 12) };
  const user = await prisma.user.create({ data });
  res.status(201).json({ success: true, token: signToken(user), data: Object.fromEntries(Object.keys(publicUser).map(key => [key, user[key]])) });
});
router.post("/login", rateLimit(30), async (req, res) => {
  const address = email(req.body.email);
  if (typeof req.body.password !== "string") fail(400, "Password required");
  const user = await prisma.user.findUnique({ where: { email: address } });
  if (!user || !await bcrypt.compare(req.body.password, user.password)) fail(401, "Invalid email or password");
  res.json({ success: true, token: signToken(user), data: Object.fromEntries(Object.keys(publicUser).map(key => [key, user[key]])) });
});
router.post("/logout", async (req, res, next) => {
  if (!req.headers.authorization) return res.json({ success: true, message: "Signed out" });
  auth(req, res, async error => {
    if (error) return next(error);
    try { await prisma.user.update({ where: { id: req.user.id }, data: { tokenVersion: { increment: 1 } } }); res.json({ success: true, message: "Signed out from all sessions" }); }
    catch (err) { next(err); }
  });
});
router.post("/forgot-password", rateLimit(5), async (req, res) => {
  await requestReset(req.body.email);
  res.json({ success: true, message: "If an account exists, a reset email has been sent" });
});
router.post("/reset-password", rateLimit(10), async (req, res) => {
  await resetPassword(req.body.token, req.body.password);
  res.json({ success: true, message: "Password updated. Please sign in again" });
});
router.get("/me", auth, (req, res) => res.json({ success: true, data: req.user }));
router.put("/me", auth, async (req, res) => res.json({ success: true, data: await updateUser(req.user.id, req.body) }));
router.delete("/me", auth, async (req, res) => { await deleteUser(req.user.id); res.json({ success: true, message: "Account deleted" }); });
router.get("/admin/users", auth, authorizeRoles("ADMIN", "MODERATOR"), async (req, res) => res.json({ success: true, data: await prisma.user.findMany({ select: publicUser, orderBy: { createdAt: "desc" } }) }));
router.put("/admin/users/:id", auth, authorizeRoles("ADMIN"), async (req, res) => res.json({ success: true, data: await updateUser(req.params.id, req.body, true) }));
router.delete("/admin/users/:id", auth, authorizeRoles("ADMIN"), async (req, res) => { await deleteUser(req.params.id); res.json({ success: true, message: "User deleted" }); });
export default router;
