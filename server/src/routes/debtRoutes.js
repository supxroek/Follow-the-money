import express from "express";
import { auth } from "../middleware/authMiddleware.js";
import {
  getDebts,
  getDebt,
  settleDebt,
  getDebtsByGroup,
  getDebtsByUser,
  calculateGroupDebts,
  getDebtSummary,
} from "../controllers/debtController.js";

const router = express.Router();

// All debt routes require authentication
router.use(auth);

// Debt routes
router.get("/", getDebts);
router.get("/:id", getDebt);
router.post("/:id/settle", settleDebt);

// Debt query routes
router.get("/group/:groupId", getDebtsByGroup);
router.get("/user/:userId", getDebtsByUser);
router.post("/group/:groupId/calculate", calculateGroupDebts);
router.get("/summary", getDebtSummary);

export default router;
