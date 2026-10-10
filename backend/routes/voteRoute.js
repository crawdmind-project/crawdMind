import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { voteOnIdea, getIdeaVotes, getMyVote } from "../services/voteService.js";
const router = express.Router();
router.get("/:ideaId/me", authenticateToken, getMyVote);
router.get("/:ideaId", getIdeaVotes);
router.post("/:ideaId", authenticateToken, voteOnIdea);
export default router;
