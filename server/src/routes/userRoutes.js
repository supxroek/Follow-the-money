import express from "express";
import { auth } from "../middleware/authMiddleware.js";
import {
  getProfile,
  updateProfile,
  deleteProfile,
  getUserGroups,
  getUserExpenses,
  getUserDebts,
} from "../controllers/userController.js";

const router = express.Router();

// All user routes require authentication
router.use(auth);

// Profile routes
router
  .route("/profile")
  .get(getProfile)
  .put(updateProfile)
  .delete(deleteProfile);

// User data routes
router.get("/groups", getUserGroups);
router.get("/expenses", getUserExpenses);
router.get("/debts", getUserDebts);

export default router;
