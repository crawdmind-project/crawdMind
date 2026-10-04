import { Router } from "express";
import prisma from "../lib/prisma.js";

// Authentication belongs to the teammate's module. Their middleware must
// verify the request and set req.user.id before these routes execute.
export function createVotingRouter(authenticateUser) {
  const router = Router();
  router.use(authenticateUser);
  router.use((req, res, next) => {
    if (typeof req.user?.id !== "string" || !req.user.id.trim()) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    next();
  });

  async function votingSummary(db, ideaId, userId) {
    const groups = await db.vote.groupBy({ by: ["value"], where: { ideaId }, _count: { _all: true } });
    const own = await db.vote.findUnique({ where: { userId_ideaId: { userId, ideaId } } });
    const upvotes = groups.find(group => group.value === 1)?._count._all || 0;
    const downvotes = groups.find(group => group.value === -1)?._count._all || 0;
    return { ideaId, upvotes, downvotes, score: upvotes - downvotes, userVote: own?.value ?? null };
  }

  router.get("/:ideaId/votes", async (req, res) => {
    const result = await prisma.$transaction(async db => {
      if (!await db.idea.findUnique({ where: { id: req.params.ideaId } })) return null;
      return votingSummary(db, req.params.ideaId, req.user.id);
    });
    if (!result) return res.status(404).json({ success: false, message: "Idea not found" });
    res.json({ success: true, ...result });
  });

  async function writeVote(req, res, remove) {
    const value = req.body?.value;
    if (!remove && value !== 1 && value !== -1) {
      return res.status(400).json({ success: false, message: "Vote value must be 1 (upvote) or -1 (downvote)" });
    }
    const ideaId = req.params.ideaId;
    const userId = req.user.id;
    const result = await prisma.$transaction(async db => {
      if (!await db.idea.findUnique({ where: { id: ideaId } })) return null;
      if (remove) {
        await db.vote.deleteMany({ where: { userId, ideaId } });
      } else {
        await db.vote.upsert({
          where: { userId_ideaId: { userId, ideaId } },
          create: { userId, ideaId, value },
          update: { value },
        });
      }
      return votingSummary(db, ideaId, userId);
    });
    if (!result) return res.status(404).json({ success: false, message: "Idea not found" });
    res.json({ success: true, ...result });
  }
  router.put("/:ideaId/vote", (req, res) => writeVote(req, res, false));
  router.delete("/:ideaId/vote", (req, res) => writeVote(req, res, true));
  return router;
}
