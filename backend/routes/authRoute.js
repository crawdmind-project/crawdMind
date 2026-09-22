import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { updateUser, deleteUser } from "../services/userService.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "fullName, email, and password are required",
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: { fullName, email, password: hashedPassword },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.status(201).json({ success: true, token, data: newUser });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error registering user",
        error: error.message,
      });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    const { password: _password, ...userWithoutPassword } = user;

    res.status(200).json({ success: true, token, data: userWithoutPassword });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error logging in",
        error: error.message,
      });
  }
});

// GET MY PROFILE
router.get("/me", authenticateToken, async (req, res) => {
  res.json({ success: true, data: req.user });
});

// UPDATE MY PROFILE
router.put("/me", authenticateToken, async (req, res) => {
  try {
    const updatedUser = await updateUser(req.user.id, req.body);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res
      .status(error.statusCode || 400)
      .json({ success: false, message: error.message });
  }
});

// DELETE MY PROFILE
router.delete("/me", authenticateToken, async (req, res) => {
  try {
    await deleteUser(req.user.id);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res
      .status(error.statusCode || 400)
      .json({ success: false, message: error.message });
  }
});

// ADMIN: GET ALL USERS
router.get(
  "/admin/users",
  authenticateToken,
  authorizeRoles("ADMIN", "MODERATOR"),
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching users",
        error: error.message,
      });
    }
  },
);

// ADMIN: UPDATE ANY USER BY ID
router.put(
  "/admin/users/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const updatedUser = await updateUser(req.params.id, req.body);
      res.json({
        success: true,
        message: "User updated successfully by Admin",
        data: updatedUser,
      });
    } catch (error) {
      res
        .status(error.statusCode || 400)
        .json({ success: false, message: error.message });
    }
  },
);

// ADMIN: DELETE ANY USER BY ID
router.delete(
  "/admin/users/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      await deleteUser(req.params.id);
      res.json({
        success: true,
        message: "User deleted successfully by Admin",
      });
    } catch (error) {
      res
        .status(error.statusCode || 400)
        .json({ success: false, message: error.message });
    }
  },
);
export default router;
