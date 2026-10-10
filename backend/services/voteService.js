import prisma from "../lib/prisma.js";
import { fail, transaction } from "../lib/errors.js";
import { activeIdea } from "./communityService.js";
export async function voteOnIdea(req, res) {
  const { ideaId } = req.params, { voteType } = req.body, userId = req.user.id;
  if (!["UPVOTE", "DOWNVOTE"].includes(voteType)) fail(400, "Vote must be UPVOTE or DOWNVOTE");
  const vote = await transaction(prisma, async tx => {
    await activeIdea(tx, ideaId);
    const where = { userId_ideaId: { userId, ideaId } };
    const existing = await tx.vote.findUnique({ where });
    if (existing?.voteType === voteType) { await tx.vote.delete({ where }); return null; }
    return tx.vote.upsert({ where, create: { userId, ideaId, voteType }, update: { voteType } });
  });
  res.json({ success: true, message: vote ? "Vote saved" : "Vote removed", vote });
}
export async function getIdeaVotes(req, res) {
  await activeIdea(prisma, req.params.ideaId);
  const groups = await prisma.vote.groupBy({ by: ["voteType"], where: { ideaId: req.params.ideaId }, _count: true });
  const upvotes = groups.find(g => g.voteType === "UPVOTE")?._count || 0, downvotes = groups.find(g => g.voteType === "DOWNVOTE")?._count || 0;
  res.json({ success: true, data: { ideaId: req.params.ideaId, upvotes, downvotes, totalScore: upvotes - downvotes } });
}
export async function getMyVote(req, res) {
  await activeIdea(prisma, req.params.ideaId);
  const vote = await prisma.vote.findUnique({ where: { userId_ideaId: { userId: req.user.id, ideaId: req.params.ideaId } } });
  res.json({ success: true, data: vote?.voteType || null });
}
