import prisma from "../lib/prisma.js";
import { text, transaction } from "../lib/errors.js";
import { activeIdea, notify } from "./communityService.js";
export async function createComment(content, ideaId, userId) {
  content = text(content, "Comment", 2000);
  return transaction(prisma, async tx => {
    const idea = await activeIdea(tx, ideaId);
    const comment = await tx.comment.create({ data: { content, ideaId, userId }, include: { user: { select: { id: true, fullName: true } } } });
    if (idea.userId !== userId) await notify(tx, idea.userId, comment.user.fullName + ' commented on “' + idea.title + '”.', ideaId);
    return comment;
  });
}
export async function getCommentsByIdea(ideaId) {
  await activeIdea(prisma, ideaId);
  return prisma.comment.findMany({ where: { ideaId }, include: { user: { select: { id: true, fullName: true } } }, orderBy: { createdAt: "desc" } });
}
export const getCommentById = id => prisma.comment.findUnique({ where: { id } });
export const deleteComment = id => prisma.comment.delete({ where: { id } });
