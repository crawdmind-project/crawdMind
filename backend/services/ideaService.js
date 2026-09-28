import prisma from "../lib/prisma.js";

export const createIdea = async (title, description, userId) => {
  return await prisma.idea.create({
    data: {
      title,
      description,
      userId,
    },
    include: {
      author: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });
};

export const getAllIdeas = async () => {
  return await prisma.idea.findMany({
    include: {
      author: {
        select: { id: true, fullName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getIdeaById = async (id) => {
  return await prisma.idea.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });
};

export const updateIdeaStatus = async (id, status) => {
  return await prisma.idea.update({
    where: { id },
    data: { status },
  });
};

export const updateIdeaDetails = async (id, title, description) => {
  return await prisma.idea.update({
    where: { id },
    data: { title, description },
  });
};

export const deleteIdea = async (id) => {
  return await prisma.idea.delete({
    where: { id },
  });
};
