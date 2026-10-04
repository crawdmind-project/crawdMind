import "dotenv/config";
import express from "express";
import cors from "cors";
import { createVotingRouter } from "./routes/ideaRoute.js";

// Safe default until the teammate supplies verified authentication.
const authenticationNotConnected = (req, res) =>
  res.status(401).json({ success: false, message: "Authentication required; teammate authentication is not connected" });

export function createApp({ authenticateUser = authenticationNotConnected } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "32kb" }));
  app.use("/api/ideas", createVotingRouter(authenticateUser));
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
      return res.status(err.status).json({ success: false, message: err.type === "entity.parse.failed" ? "Invalid JSON" : "Request body too large" });
    }
    console.error(err);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  });
  app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
  return app;
}

export default createApp();
