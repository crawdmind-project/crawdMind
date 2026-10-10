import express from "express";
import prisma from "../lib/prisma.js";
import { authenticateToken as auth, authorizeRoles } from "../middleware/auth.js";
import { reportIdea, resolveReport } from "../services/communityService.js";
import { fail } from "../lib/errors.js";
export const reports = express.Router();
reports.post("/", auth, async (req, res) => res.status(201).json({ success: true, data: await reportIdea(req.user.id, req.body.ideaId, req.body.reason, req.body.description) }));
reports.get("/", auth, authorizeRoles("ADMIN", "MODERATOR"), async (req, res) => {
  const status = req.query.status || "PENDING";
  if (!["PENDING", "DISMISSED", "ACTIONED"].includes(status)) fail(400, "Invalid report status");
  res.json({ success: true, data: await prisma.report.findMany({ where: { status }, include: { user: { select: { id: true, fullName: true } }, idea: { include: { author: { select: { id: true, fullName: true } } } } }, orderBy: { createdAt: "desc" } }) });
});
reports.put("/:id/resolve", auth, authorizeRoles("ADMIN", "MODERATOR"), async (req, res) => res.json({ success: true, data: await resolveReport(req.params.id, req.body.action, req.body.resolution) }));
export const notifications = express.Router();
notifications.use(auth);
notifications.get("/", async (req, res) => {
  const [data, unread] = await prisma.$transaction([prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 100 }), prisma.notification.count({ where: { userId: req.user.id, readAt: null } })]);
  res.json({ success: true, data, unread });
});
notifications.put("/read-all", async (req, res) => { await prisma.notification.updateMany({ where: { userId: req.user.id, readAt: null }, data: { readAt: new Date() } }); res.json({ success: true }); });
notifications.put("/:id/read", async (req, res) => {
  const result = await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { readAt: new Date() } });
  if (!result.count) fail(404, "Notification not found");
  res.json({ success: true });
});
