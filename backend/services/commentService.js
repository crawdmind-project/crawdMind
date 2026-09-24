import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


export const createComment = async (content, ideaId, userId) => {
  return await prisma.comment.create({
    data: {
      content,
      ideaId,
      userId,
    },
    include: {
      user: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });
};


export const getCommentsByIdea = async (ideaId) => {
  return await prisma.comment.findMany({
    where: { ideaId },
    include: {
      user: {
        select: { id: true, fullName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getCommentById = async (id) => {
  return await prisma.comment.findUnique({
    where: { id },
  });
};

export const deleteComment = async (id) => {
  return await prisma.comment.delete({
    where: { id },
  });
};
