import express from "express";
import { auth } from "../middleware/authMiddleware.js";
import {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpensesByGroup,
  getExpensesByUser,
  getExpenseCategories,
} from "../controllers/expenseController.js";

const router = express.Router();

// All expense routes require authentication
router.use(auth);

// Expense CRUD routes
router.route("/").post(createExpense).get(getExpenses);

router.route("/:id").get(getExpense).put(updateExpense).delete(deleteExpense);

// Expense query routes
router.get("/group/:groupId", getExpensesByGroup);
router.get("/user/:userId", getExpensesByUser);
router.get("/categories", getExpenseCategories);

export default router;
