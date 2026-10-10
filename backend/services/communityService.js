import prisma from "../lib/prisma.js";
import { fail, text, transaction } from "../lib/errors.js";
export async function notify(tx, userId, message, ideaId = null) {
  return tx.notification.create({ data: { userId, message, ideaId } });
}
export function words(value) { return new Set(value.toLowerCase().normalize("NFKC").match(/[\p{L}\p{N}]+/gu) || []); }
function overlap(a, b) { const union = new Set([...a, ...b]); return union.size ? [...a].filter(x => b.has(x)).length / union.size : 0; }
export function similarity(a, b) {
  const title = overlap(words(a.title), words(b.title));
  return Math.max(title, .7 * title + .3 * overlap(words(a.description || ""), words(b.description || "")));
}
export async function duplicates(title, description = "", excludeId) {
  title = text(title, "Title", 200);
  if (typeof description !== "string" || description.length > 5000) fail(400, "Description too long");
  const ideas = await prisma.idea.findMany({ where: { mergedIntoId: null, hidden: false, ...(excludeId ? { id: { not: excludeId } } : {}) }, include: { author: { select: { id: true, fullName: true } } } });
  return ideas.map(idea => ({ ...idea, similarity: similarity({ title, description }, idea) })).filter(idea => idea.similarity >= .5).sort((a, b) => b.similarity - a.similarity).slice(0, 5);
}
export async function activeIdea(tx, id) {
  if (typeof id !== "string" || !id) fail(400, "Idea ID required");
  const idea = await tx.idea.findUnique({ where: { id } });
  if (!idea || idea.hidden) fail(404, "Idea not found");
  if (idea.mergedIntoId) fail(409, "Idea has been merged. Open the surviving idea");
  return idea;
}
export async function mergeIdeas(sourceId, targetId) {
  if (sourceId === targetId) fail(400, "Choose a different target idea");
  return transaction(prisma, async tx => {
    const source = await activeIdea(tx, sourceId), target = await activeIdea(tx, targetId);
    const votes = await tx.vote.findMany({ where: { ideaId: sourceId } });
    for (const vote of votes) {
      const existing = await tx.vote.findUnique({ where: { userId_ideaId: { userId: vote.userId, ideaId: targetId } } });
      if (!existing) await tx.vote.update({ where: { id: vote.id }, data: { ideaId: targetId } });
      else await tx.vote.delete({ where: { id: vote.id } });
    }
    await tx.comment.updateMany({ where: { ideaId: sourceId }, data: { ideaId: targetId } });
    for (const report of await tx.report.findMany({ where: { ideaId: sourceId } })) {
      const existing = await tx.report.findUnique({ where: { userId_ideaId: { userId: report.userId, ideaId: targetId } } });
      if (existing) await tx.report.delete({ where: { id: report.id } });
      else await tx.report.update({ where: { id: report.id }, data: { ideaId: targetId } });
    }
    await tx.notification.updateMany({ where: { ideaId: sourceId }, data: { ideaId: targetId } });
    // Flatten old aliases to prevent broken links if a merged target is merged again.
    await tx.idea.updateMany({ where: { mergedIntoId: sourceId }, data: { mergedIntoId: targetId } });
    await tx.idea.update({ where: { id: sourceId }, data: { mergedIntoId: targetId } });
    const result = await tx.idea.update({ where: { id: targetId }, data: { tags: [...new Set([...target.tags, ...source.tags])] } });
    for (const id of new Set([source.userId, target.userId])) await notify(tx, id, '“' + source.title + '” was merged into “' + target.title + '”.', targetId);
    return result;
  });
}
export async function reportIdea(userId, ideaId, reason, description) {
  if (!["Spam", "Abuse", "Duplicate", "Other"].includes(reason)) fail(400, "Choose Spam, Abuse, Duplicate or Other");
  description = text(description, "Report description", 2000);
  return transaction(prisma, async tx => {
    await activeIdea(tx, ideaId);
    if (await tx.report.findUnique({ where: { userId_ideaId: { userId, ideaId } } })) fail(409, "You have already reported this idea");
    const report = await tx.report.create({ data: { userId, ideaId, reason, description } });
    for (const staff of await tx.user.findMany({ where: { role: { in: ["ADMIN", "MODERATOR"] } }, select: { id: true } })) await notify(tx, staff.id, "A community idea was reported for " + reason + ".", ideaId);
    return report;
  });
}
export async function resolveReport(id, action, resolution) {
  if (!["DISMISS", "HIDE"].includes(action)) fail(400, "Action must be DISMISS or HIDE");
  resolution = text(resolution, "Resolution", 1000);
  return transaction(prisma, async tx => {
    const report = await tx.report.findUnique({ where: { id }, include: { idea: true } });
    if (!report) fail(404, "Report not found");
    if (report.status !== "PENDING") fail(409, "This report is already resolved");
    if (action === "HIDE") {
      await tx.idea.update({ where: { id: report.ideaId }, data: { hidden: true } });
      await tx.report.updateMany({ where: { ideaId: report.ideaId, status: "PENDING" }, data: { status: "ACTIONED", resolution, resolvedAt: new Date() } });
      await notify(tx, report.idea.userId, 'Your idea “' + report.idea.title + '” was hidden after moderation. ' + resolution);
    } else await tx.report.update({ where: { id }, data: { status: "DISMISSED", resolution, resolvedAt: new Date() } });
    await notify(tx, report.userId, "Your report was " + (action === "HIDE" ? "actioned. " : "dismissed. ") + resolution);
    return tx.report.findUnique({ where: { id } });
  });
}
