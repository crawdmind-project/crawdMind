import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  createComment,
  getCommentsByIdea,
  getCommentById,
  deleteComment,
} from "../services/commentService.js";

const router = express.Router();

// 1. POST /api/comments
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { content, ideaId } = req.body;

    if (!content || !ideaId) {
      return res.status(400).json({
        success: false,
        message: "Content and ideaId are required",
      });
    }

    const comment = await createComment(content, ideaId, req.user.id);

    return res.status(201).json({
      success: true,
      message: "Comment created successfully",
      data: comment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating comment",
      error: error.message,
    });
  }
});

// 2. GET /api/comments/idea/:ideaId
router.get("/idea/:ideaId", async (req, res) => {
  try {
    const { ideaId } = req.params;
    const comments = await getCommentsByIdea(ideaId);

    return res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching comments",
      error: error.message,
    });
  }
});

// 3. DELETE /api/comments/:id
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await getCommentById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Permission check
    const isOwner = comment.userId === req.user.id;
    const isStaff = req.user.role === "ADMIN" || req.user.role === "MODERATOR";

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
      });
    }

    await deleteComment(id);

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting comment",
      error: error.message,
    });
  }
});

export default router;
