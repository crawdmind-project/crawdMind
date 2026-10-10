import express from "express";
import { authenticateToken as auth } from "../middleware/auth.js";
import { createComment, getCommentsByIdea, getCommentById, deleteComment } from "../services/commentService.js";
import { fail } from "../lib/errors.js";
const router = express.Router();
router.post("/", auth, async (req, res) => res.status(201).json({ success: true, data: await createComment(req.body.content, req.body.ideaId, req.user.id) }));
router.get("/idea/:ideaId", async (req, res) => res.json({ success: true, data: await getCommentsByIdea(req.params.ideaId) }));
router.delete("/:id", auth, async (req, res) => {
  const comment = await getCommentById(req.params.id);
  if (!comment) fail(404, "Comment not found");
  if (comment.userId !== req.user.id && !["ADMIN", "MODERATOR"].includes(req.user.role)) fail(403, "You cannot delete this comment");
  await deleteComment(comment.id); res.json({ success: true });
});
export default router;
