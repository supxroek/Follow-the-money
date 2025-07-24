import Expense from "../models/Expense.js";
import Group from "../models/Group.js";
import { logger } from "../utils/logger.js";
import { calculateDebts } from "../utils/debtCalculator.js";

// @desc    Create a new expense
// @route   POST /api/expenses
// @access  Private
export const createExpense = async (req, res) => {
  try {
    const { description, amount, category, group, splitDetails } = req.body;

    // Verify group exists and user is a member
    const groupDoc = await Group.findById(group);
    if (!groupDoc) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!groupDoc.members.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const expense = new Expense({
      description,
      amount,
      category,
      group,
      paidBy: req.user.id,
      splitDetails,
    });

    await expense.save();
    await expense.populate([
      { path: "paidBy", select: "displayName pictureUrl" },
      { path: "group", select: "name" },
    ]);

    // Recalculate debts for the group
    await calculateDebts(group);

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    logger.error("Create expense error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get all expenses for user
// @route   GET /api/expenses
// @access  Private
export const getExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 10, group } = req.query;

    let query = {
      $or: [{ paidBy: req.user.id }, { "splitDetails.user": req.user.id }],
    };

    if (group) {
      query.group = group;
    }

    const expenses = await Expense.find(query)
      .populate("paidBy", "displayName pictureUrl")
      .populate("group", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Expense.countDocuments(query);

    res.json({
      success: true,
      data: expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get expenses error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private
export const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("paidBy", "displayName pictureUrl")
      .populate("group", "name")
      .populate("splitDetails.user", "displayName pictureUrl");

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    // Check if user has access to this expense
    const hasAccess =
      expense.paidBy._id.toString() === req.user.id ||
      expense.splitDetails.some(
        (split) => split.user._id.toString() === req.user.id
      );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    logger.error("Get expense error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
export const updateExpense = async (req, res) => {
  try {
    const { description, amount, category, splitDetails } = req.body;

    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    // Only the person who paid can update the expense
    if (expense.paidBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    expense.description = description || expense.description;
    expense.amount = amount || expense.amount;
    expense.category = category || expense.category;
    expense.splitDetails = splitDetails || expense.splitDetails;

    await expense.save();
    await expense.populate([
      { path: "paidBy", select: "displayName pictureUrl" },
      { path: "group", select: "name" },
    ]);

    // Recalculate debts for the group
    await calculateDebts(expense.group);

    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    logger.error("Update expense error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    // Only the person who paid can delete the expense
    if (expense.paidBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const groupId = expense.group;
    await Expense.findByIdAndDelete(req.params.id);

    // Recalculate debts for the group
    await calculateDebts(groupId);

    res.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    logger.error("Delete expense error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get expenses by group
// @route   GET /api/expenses/group/:groupId
// @access  Private
export const getExpensesByGroup = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const expenses = await Expense.find({ group: req.params.groupId })
      .populate("paidBy", "displayName pictureUrl")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Expense.countDocuments({ group: req.params.groupId });

    res.json({
      success: true,
      data: expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get expenses by group error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get expenses by user
// @route   GET /api/expenses/user/:userId
// @access  Private
export const getExpensesByUser = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const expenses = await Expense.find({
      $or: [
        { paidBy: req.params.userId },
        { "splitDetails.user": req.params.userId },
      ],
    })
      .populate("paidBy", "displayName pictureUrl")
      .populate("group", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Expense.countDocuments({
      $or: [
        { paidBy: req.params.userId },
        { "splitDetails.user": req.params.userId },
      ],
    });

    res.json({
      success: true,
      data: expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get expenses by user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get expense categories
// @route   GET /api/expenses/categories
// @access  Private
export const getExpenseCategories = async (req, res) => {
  try {
    const categories = [
      "Food & Dining",
      "Transportation",
      "Shopping",
      "Entertainment",
      "Bills & Utilities",
      "Healthcare",
      "Travel",
      "Education",
      "Groceries",
      "Other",
    ];

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    logger.error("Get expense categories error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
