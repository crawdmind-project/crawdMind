import "dotenv/config";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { fail } from "../lib/errors.js";
export const publicUser = { id: true, fullName: true, email: true, role: true, createdAt: true, updatedAt: true };
function secret() { if (!process.env.JWT_SECRET) fail(503, "JWT_SECRET must be configured"); return process.env.JWT_SECRET; }
export function signToken(user) { return jwt.sign({ id: user.id, version: user.tokenVersion || 0 }, secret(), { expiresIn: "24h", algorithm: "HS256" }); }
export async function authenticateToken(req, res, next) {
  try {
    const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || "");
    if (!match) fail(401, "Access token required");
    const decoded = jwt.verify(match[1], secret(), { algorithms: ["HS256"] });
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || (decoded.version || 0) !== user.tokenVersion) fail(401, "Session expired. Please sign in again");
    req.user = Object.fromEntries(Object.keys(publicUser).map(key => [key, user[key]]));
    next();
  } catch (error) {
    if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error.name)) error = Object.assign(new Error("Invalid or expired token"), { statusCode: 401 });
    next(error);
  }
}
export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return next(Object.assign(new Error("You do not have permission for this action"), { statusCode: 403 }));
  next();
};
