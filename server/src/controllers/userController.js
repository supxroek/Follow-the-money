import User from "../models/User.js";
import Group from "../models/Group.js";
import Expense from "../models/Expense.js";
import Debt from "../models/Debt.js";
import { logger } from "../utils/logger.js";

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { displayName, pictureUrl } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { displayName, pictureUrl },
      { new: true, select: "-password" }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Delete user profile
// @route   DELETE /api/users/profile
// @access  Private
export const deleteProfile = async (req, res) => {
  try {
    // TODO: Implement proper cleanup (remove from groups, settle debts, etc.)
    await User.findByIdAndDelete(req.user.id);

    res.json({
      success: true,
      message: "User profile deleted successfully",
    });
  } catch (error) {
    logger.error("Delete profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get user groups
// @route   GET /api/users/groups
// @access  Private
export const getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.user.id,
    }).populate("members", "displayName pictureUrl");

    res.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    logger.error("Get user groups error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get user expenses
// @route   GET /api/users/expenses
// @access  Private
export const getUserExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({
      $or: [{ paidBy: req.user.id }, { "splitDetails.user": req.user.id }],
    })
      .populate("group", "name")
      .populate("paidBy", "displayName pictureUrl")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    logger.error("Get user expenses error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get user debts
// @route   GET /api/users/debts
// @access  Private
export const getUserDebts = async (req, res) => {
  try {
    const debts = await Debt.find({
      $or: [{ creditor: req.user.id }, { debtor: req.user.id }],
    })
      .populate("creditor", "displayName pictureUrl")
      .populate("debtor", "displayName pictureUrl")
      .populate("group", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: debts,
    });
  } catch (error) {
    logger.error("Get user debts error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
