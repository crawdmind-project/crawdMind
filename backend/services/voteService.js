
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// 1. POST /api/votes/:ideaId
export const voteOnIdea = async (req, res) => {
  try {
    const { ideaId } = req.params;
    const { voteType } = req.body; // "UPVOTE" OR "DOWNVOTE"
    const userId = req.user.id; 

    const ideaExists = await prisma.idea.findUnique({
      where: { id: ideaId },
    });

    if (!ideaExists) {
      return res.status(404).json({ message: "Idea not found" });
    }

    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_ideaId: {
          userId,
          ideaId,
        },
      },
    });

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        await prisma.vote.delete({
          where: { id: existingVote.id },
        });
        return res.status(200).json({ message: "Vote removed successfully" });
      }

      const updatedVote = await prisma.vote.update({
        where: { id: existingVote.id },
        data: { voteType },
      });
      return res
        .status(200)
        .json({ message: "Vote updated", vote: updatedVote });
    }

    const newVote = await prisma.vote.create({
      data: {
        userId,
        ideaId,
        voteType,
      },
    });

    return res
      .status(201)
      .json({ message: "Voted successfully", vote: newVote });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// 2. GET /api/votes/:ideaId
export const getIdeaVotes = async (req, res) => {
  try {
    const { ideaId } = req.params;

    const upvotes = await prisma.vote.count({
      where: { ideaId, voteType: "UPVOTE" },
    });

    const downvotes = await prisma.vote.count({
      where: { ideaId, voteType: "DOWNVOTE" },
    });

    return res.status(200).json({
      success: true,
      data: {
        ideaId,
        upvotes,
        downvotes,
        totalScore: upvotes - downvotes,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
