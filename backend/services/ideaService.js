import prisma from "../lib/prisma.js";
import { text, fail, transaction } from "../lib/errors.js";
import { activeIdea, notify } from "./communityService.js";
const author = { select: { id: true, fullName: true } };
export function ideaData(title, description, tags = []) {
  if (!Array.isArray(tags) || tags.length > 15 || tags.some(tag => typeof tag !== "string" || !tag.trim() || tag.length > 50)) fail(400, "Provide at most 15 nonempty tags of 50 characters");
  return { title: text(title, "Title", 200), description: text(description, "Description"), tags: [...new Set(tags.map(tag => tag.trim()))] };
}
export const createIdea = (title, description, userId, tags) => prisma.idea.create({ data: { ...ideaData(title, description, tags), userId }, include: { author } });
export const getLeaderboardIdeas = () => prisma.idea.findMany({ where: { hidden: false, mergedIntoId: null }, include: { author, _count: { select: { votes: true, comments: true } } }, orderBy: [{ votes: { _count: "desc" } }, { createdAt: "desc" }], take: 10 });
export const getAllIdeas = () => prisma.idea.findMany({ where: { hidden: false, mergedIntoId: null }, include: { author, _count: { select: { comments: true } } }, orderBy: { createdAt: "desc" } });
export const getIdeaById = id => activeIdea(prisma, id);
export async function updateIdeaStatus(id, status) {
  const order = ["UNDER_REVIEW", "PLANNED", "DONE"];
  if (!order.includes(status)) fail(400, "Invalid idea status");
  return transaction(prisma, async tx => {
    const idea = await activeIdea(tx, id);
    if (status !== idea.status && order.indexOf(status) !== order.indexOf(idea.status) + 1) fail(409, "Move an idea from Under Review to Planned, then Done");
    const result = await tx.idea.update({ where: { id }, data: { status } });
    if (status !== idea.status) await notify(tx, idea.userId, '“' + idea.title + '” is now ' + status.replaceAll("_", " ").toLowerCase() + ".", id);
    return result;
  });
}
export const updateIdeaDetails = (id, title, description, tags) => prisma.idea.update({ where: { id }, data: ideaData(title, description, tags) });
export const deleteIdea = id => prisma.idea.delete({ where: { id } });
