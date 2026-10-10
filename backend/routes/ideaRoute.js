import express from "express";
import prisma from "../lib/prisma.js";
import { createIdea, getAllIdeas, getLeaderboardIdeas, getIdeaById, updateIdeaStatus, updateIdeaDetails, deleteIdea } from "../services/ideaService.js";
import { duplicates, mergeIdeas } from "../services/communityService.js";
import { authenticateToken as auth, authorizeRoles } from "../middleware/auth.js";
import { fail } from "../lib/errors.js";
const router = express.Router();
router.post("/", auth, async (req, res) => res.status(201).json({ success: true, data: await createIdea(req.body.title, req.body.description, req.user.id, req.body.tags) }));
router.get("/leaderboard", async (req, res) => res.json({ success: true, data: await getLeaderboardIdeas() }));
router.get("/duplicates", async (req, res) => res.json({ success: true, data: await duplicates(req.query.title, req.query.description || "", req.query.excludeId) }));
router.get("/", async (req, res) => res.json({ success: true, data: await getAllIdeas() }));
router.get("/:id", async (req, res) => {
  let idea = await prisma.idea.findUnique({ where: { id: req.params.id }, include: { author: { select: { id: true, fullName: true } } } });
  if (!idea || idea.hidden) fail(404, "Idea not found");
  const originalId = idea.id;
  if (idea.mergedIntoId) { idea = await getIdeaById(idea.mergedIntoId); if (!idea) fail(404, "Idea not found"); }
  res.json({ success: true, data: idea, ...(originalId !== idea.id ? { mergedFrom: originalId } : {}) });
});
router.post("/:id/merge", auth, authorizeRoles("ADMIN", "MODERATOR"), async (req, res) => {
  if (typeof req.body.targetId !== "string") fail(400, "Target idea required");
  res.json({ success: true, data: await mergeIdeas(req.params.id, req.body.targetId) });
});
router.put("/:id", auth, async (req, res) => {
  const idea = await getIdeaById(req.params.id);
  if (idea.userId !== req.user.id) fail(403, "You can only edit your own idea");
  res.json({ success: true, data: await updateIdeaDetails(idea.id, req.body.title, req.body.description, req.body.tags) });
});
router.put("/:id/status", auth, authorizeRoles("ADMIN", "MODERATOR"), async (req, res) => res.json({ success: true, data: await updateIdeaStatus(req.params.id, req.body.status) }));
router.delete("/:id", auth, async (req, res) => {
  const idea = await getIdeaById(req.params.id);
  if (idea.userId !== req.user.id && !["ADMIN", "MODERATOR"].includes(req.user.role)) fail(403, "You cannot delete this idea");
  await deleteIdea(idea.id); res.json({ success: true, message: "Idea deleted" });
});
export default router;
