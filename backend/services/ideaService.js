import prisma from "../lib/prisma.js";
import { text, fail, transaction } from "../lib/errors.js";
import { activeIdea, notify } from "./communityService.js";
const author = { select: { id: true, fullName: true } };
export function ideaData(title, description, tags = []) {
  if (
    !Array.isArray(tags) ||
    tags.length > 15 ||
    tags.some(
      (tag) => typeof tag !== "string" || !tag.trim() || tag.length > 50,
    )
  )
    fail(400, "Provide at most 15 nonempty tags of 50 characters");
  return {
    title: text(title, "Title", 200),
    description: text(description, "Description"),
    tags: [...new Set(tags.map((tag) => tag.trim()))],
  };
}
export const createIdea = (title, description, userId, tags) =>
  prisma.idea.create({
    data: { ...ideaData(title, description, tags), userId },
    include: { author },
  });
export const getLeaderboardIdeas = () =>
  prisma.idea.findMany({
    where: { hidden: false, mergedIntoId: null },
    include: { author, _count: { select: { votes: true, comments: true } } },
    orderBy: [{ votes: { _count: "desc" } }, { createdAt: "desc" }],
    take: 10,
  });
export async function getAllIdeas() {
  const ideas = await prisma.idea.findMany({
    where: { hidden: false, mergedIntoId: null },
    include: { author, _count: { select: { comments: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (ideas.length === 0) return ideas;

  const voteGroups = await prisma.vote.groupBy({
    by: ["ideaId", "voteType"],
    where: { ideaId: { in: ideas.map((idea) => idea.id) } },
    _count: { _all: true },
  });
  const scores = new Map();

  for (const voteGroup of voteGroups) {
    const score = scores.get(voteGroup.ideaId) || { upvotes: 0, downvotes: 0 };
    if (voteGroup.voteType === "UPVOTE") score.upvotes = voteGroup._count._all;
    if (voteGroup.voteType === "DOWNVOTE") score.downvotes = voteGroup._count._all;
    scores.set(voteGroup.ideaId, score);
  }

  return ideas.map((idea) => {
    const score = scores.get(idea.id) || { upvotes: 0, downvotes: 0 };
    return {
      ...idea,
      upvotes: score.upvotes,
      downvotes: score.downvotes,
      totalScore: score.upvotes - score.downvotes,
    };
  });
}
export const getIdeaById = (id) => activeIdea(prisma, id);
export async function getFavoriteIdeas(userId) {
  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
      idea: { hidden: false, mergedIntoId: null },
    },
    include: {
      idea: {
        include: {
          author,
          _count: { select: { comments: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return favorites.map(({ idea }) => ({ ...idea, isFavorite: true }));
}
export async function toggleFavorite(userId, ideaId) {
  return transaction(prisma, async (tx) => {
    await activeIdea(tx, ideaId);
    const where = { userId_ideaId: { userId, ideaId } };
    const existing = await tx.favorite.findUnique({ where });
    if (existing) {
      await tx.favorite.delete({ where });
      return false;
    }
    await tx.favorite.create({ data: { userId, ideaId } });
    return true;
  });
}
export async function updateIdeaStatus(id, status) {
  const order = ["UNDER_REVIEW", "PLANNED", "DONE"];
  if (!order.includes(status)) fail(400, "Invalid idea status");
  return transaction(prisma, async (tx) => {
    const idea = await activeIdea(tx, id);
    if (
      status !== idea.status &&
      order.indexOf(status) !== order.indexOf(idea.status) + 1
    )
      fail(409, "Move an idea from Under Review to Planned, then Done");
    const result = await tx.idea.update({ where: { id }, data: { status } });
    if (status !== idea.status)
      await notify(
        tx,
        idea.userId,
        "“" +
          idea.title +
          "” is now " +
          status.replaceAll("_", " ").toLowerCase() +
          ".",
        id,
      );
    return result;
  });
}
export const updateIdeaDetails = (id, title, description, tags) =>
  prisma.idea.update({
    where: { id },
    data: ideaData(title, description, tags),
  });
export const deleteIdea = (id) => prisma.idea.delete({ where: { id } });
