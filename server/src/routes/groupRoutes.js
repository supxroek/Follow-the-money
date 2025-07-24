import express from "express";
import { auth } from "../middleware/authMiddleware.js";
import {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  getGroupExpenses,
  getGroupDebts,
  getGroupStats,
  leaveGroup,
} from "../controllers/groupController.js";

const router = express.Router();

// All group routes require authentication
router.use(auth);

// Group CRUD routes
router.route("/").post(createGroup).get(getGroups);

router.route("/:id").get(getGroup).put(updateGroup).delete(deleteGroup);

// Group member management
router.post("/:id/members", addMember);
router.delete("/:id/members/:userId", removeMember);
router.post("/:id/leave", leaveGroup);

// Group data routes
router.get("/:id/expenses", getGroupExpenses);
router.get("/:id/debts", getGroupDebts);
router.get("/:id/stats", getGroupStats);

export default router;
