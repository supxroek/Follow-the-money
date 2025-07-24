import Group from "../models/Group.js";
import User from "../models/User.js";
import Expense from "../models/Expense.js";
import Debt from "../models/Debt.js";
import { logger } from "../utils/logger.js";

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
export const createGroup = async (req, res) => {
  try {
    const { name, description, currency = "THB" } = req.body;

    const group = new Group({
      name,
      description,
      currency,
      createdBy: req.user.id,
      members: [req.user.id],
    });

    await group.save();
    await group.populate("members", "displayName pictureUrl");

    res.status(201).json({
      success: true,
      data: group,
    });
  } catch (error) {
    logger.error("Create group error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get all user groups
// @route   GET /api/groups
// @access  Private
export const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.user.id,
    })
      .populate("members", "displayName pictureUrl")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    logger.error("Get groups error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get single group
// @route   GET /api/groups/:id
// @access  Private
export const getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate(
      "members",
      "displayName pictureUrl"
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Check if user is a member
    if (
      !group.members.some((member) => member._id.toString() === req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    logger.error("Get group error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Update group
// @route   PUT /api/groups/:id
// @access  Private
export const updateGroup = async (req, res) => {
  try {
    const { name, description, currency } = req.body;

    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Check if user is the creator or admin
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    group.name = name || group.name;
    group.description = description || group.description;
    group.currency = currency || group.currency;

    await group.save();
    await group.populate("members", "displayName pictureUrl");

    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    logger.error("Update group error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Delete group
// @route   DELETE /api/groups/:id
// @access  Private
export const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Check if user is the creator
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // TODO: Handle cleanup of expenses and debts
    await Group.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    logger.error("Delete group error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Add member to group
// @route   POST /api/groups/:id/members
// @access  Private
export const addMember = async (req, res) => {
  try {
    const { lineUserId } = req.body;

    const group = await Group.findById(req.params.id);
    const user = await User.findOne({ lineUserId });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is already a member
    if (group.members.includes(user._id)) {
      return res.status(400).json({
        success: false,
        message: "User is already a member",
      });
    }

    group.members.push(user._id);
    await group.save();
    await group.populate("members", "displayName pictureUrl");

    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    logger.error("Add member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Remove member from group
// @route   DELETE /api/groups/:id/members/:userId
// @access  Private
export const removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Check if user has permission to remove members
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    group.members = group.members.filter(
      (member) => member.toString() !== req.params.userId
    );

    await group.save();
    await group.populate("members", "displayName pictureUrl");

    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    logger.error("Remove member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Leave group
// @route   POST /api/groups/:id/leave
// @access  Private
export const leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Creator cannot leave, must transfer ownership or delete group
    if (group.createdBy.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message:
          "Group creator cannot leave. Transfer ownership or delete group.",
      });
    }

    group.members = group.members.filter(
      (member) => member.toString() !== req.user.id
    );

    await group.save();

    res.json({
      success: true,
      message: "Left group successfully",
    });
  } catch (error) {
    logger.error("Leave group error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get group expenses
// @route   GET /api/groups/:id/expenses
// @access  Private
export const getGroupExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ group: req.params.id })
      .populate("paidBy", "displayName pictureUrl")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    logger.error("Get group expenses error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get group debts
// @route   GET /api/groups/:id/debts
// @access  Private
export const getGroupDebts = async (req, res) => {
  try {
    const debts = await Debt.find({ group: req.params.id })
      .populate("creditor", "displayName pictureUrl")
      .populate("debtor", "displayName pictureUrl")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: debts,
    });
  } catch (error) {
    logger.error("Get group debts error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get group statistics
// @route   GET /api/groups/:id/stats
// @access  Private
export const getGroupStats = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const [totalExpenses, totalDebts, expenseCount] = await Promise.all([
      Expense.aggregate([
        { $match: { group: group._id } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Debt.aggregate([
        { $match: { group: group._id, status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Expense.countDocuments({ group: group._id }),
    ]);

    const stats = {
      memberCount: group.members.length,
      totalExpenses: totalExpenses[0]?.total || 0,
      totalDebts: totalDebts[0]?.total || 0,
      expenseCount,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Get group stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
