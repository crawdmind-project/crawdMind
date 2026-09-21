import express from "express";
import {
  createIdea,
  getAllIdeas,
  getIdeaById,
  updateIdeaStatus,
  updateIdeaDetails,
  deleteIdea,
} from "../services/ideaService.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

// 1. Create Idea
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Title and description are required",
        });
    }

    const newIdea = await createIdea(title, description, req.user.id);
    res.status(201).json({ success: true, data: newIdea });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Get All Ideas
router.get("/", async (req, res) => {
  try {
    const ideas = await getAllIdeas();
    res.json({ success: true, data: ideas });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
//UPDATE -OWNER

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    const idea = await getIdeaById(req.params.id);

    if (!idea) {
      return res
        .status(404)
        .json({ success: false, message: "Idea not found" });
    }

    if (idea.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only update your own idea",
      });
    }

    const updatedIdea = await updateIdeaDetails(
      req.params.id,
      title,
      description,
    );

    res.json({
      success: true,
      message: "Idea updated successfully",
      data: updatedIdea,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Update Idea Status (Admin & Moderator)
router.put(
  "/:id/status",
  authenticateToken,
  authorizeRoles("ADMIN", "MODERATOR"),
  async (req, res) => {
    try {
      const { status } = req.body;
      const updatedIdea = await updateIdeaStatus(req.params.id, status);
      res.json({
        success: true,
        message: "Status updated successfully",
        data: updatedIdea,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);


// 4. Delete Idea
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const idea = await getIdeaById(req.params.id);
    if (!idea) {
      return res
        .status(404)
        .json({ success: false, message: "Idea not found" });
    }

    const isOwner = idea.userId === req.user.id;
    const isStaff = req.user.role === "ADMIN" || req.user.role === "MODERATOR";

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have permission to delete this idea",
      });
    }

    await deleteIdea(req.params.id);
    res.json({ success: true, message: "Idea deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
