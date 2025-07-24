import Debt from "../models/Debt.js";
import Group from "../models/Group.js";
import { logger } from "../utils/logger.js";
import { calculateDebts } from "../utils/debtCalculator.js";

// @desc    Get all debts for user
// @route   GET /api/debts
// @access  Private
export const getDebts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = "pending" } = req.query;

    const query = {
      $or: [{ creditor: req.user.id }, { debtor: req.user.id }],
      status,
    };

    const debts = await Debt.find(query)
      .populate("creditor", "displayName pictureUrl")
      .populate("debtor", "displayName pictureUrl")
      .populate("group", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Debt.countDocuments(query);

    res.json({
      success: true,
      data: debts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get debts error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get single debt
// @route   GET /api/debts/:id
// @access  Private
export const getDebt = async (req, res) => {
  try {
    const debt = await Debt.findById(req.params.id)
      .populate("creditor", "displayName pictureUrl")
      .populate("debtor", "displayName pictureUrl")
      .populate("group", "name");

    if (!debt) {
      return res.status(404).json({
        success: false,
        message: "Debt not found",
      });
    }

    // Check if user has access to this debt
    const hasAccess =
      debt.creditor._id.toString() === req.user.id ||
      debt.debtor._id.toString() === req.user.id;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      data: debt,
    });
  } catch (error) {
    logger.error("Get debt error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Settle a debt
// @route   POST /api/debts/:id/settle
// @access  Private
export const settleDebt = async (req, res) => {
  try {
    const debt = await Debt.findById(req.params.id);

    if (!debt) {
      return res.status(404).json({
        success: false,
        message: "Debt not found",
      });
    }

    // Only the debtor or creditor can settle the debt
    const canSettle =
      debt.creditor.toString() === req.user.id ||
      debt.debtor.toString() === req.user.id;

    if (!canSettle) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    debt.status = "settled";
    debt.settledAt = new Date();
    debt.settledBy = req.user.id;

    await debt.save();
    await debt.populate([
      { path: "creditor", select: "displayName pictureUrl" },
      { path: "debtor", select: "displayName pictureUrl" },
      { path: "group", select: "name" },
    ]);

    res.json({
      success: true,
      data: debt,
    });
  } catch (error) {
    logger.error("Settle debt error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get debts by group
// @route   GET /api/debts/group/:groupId
// @access  Private
export const getDebtsByGroup = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = "pending" } = req.query;

    const debts = await Debt.find({
      group: req.params.groupId,
      status,
    })
      .populate("creditor", "displayName pictureUrl")
      .populate("debtor", "displayName pictureUrl")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Debt.countDocuments({
      group: req.params.groupId,
      status,
    });

    res.json({
      success: true,
      data: debts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get debts by group error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get debts by user
// @route   GET /api/debts/user/:userId
// @access  Private
export const getDebtsByUser = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = "pending" } = req.query;

    const debts = await Debt.find({
      $or: [{ creditor: req.params.userId }, { debtor: req.params.userId }],
      status,
    })
      .populate("creditor", "displayName pictureUrl")
      .populate("debtor", "displayName pictureUrl")
      .populate("group", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Debt.countDocuments({
      $or: [{ creditor: req.params.userId }, { debtor: req.params.userId }],
      status,
    });

    res.json({
      success: true,
      data: debts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get debts by user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Calculate group debts
// @route   POST /api/debts/group/:groupId/calculate
// @access  Private
export const calculateGroupDebts = async (req, res) => {
  try {
    const groupId = req.params.groupId;

    // Verify group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!group.members.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await calculateDebts(groupId);

    const debts = await Debt.find({
      group: groupId,
      status: "pending",
    })
      .populate("creditor", "displayName pictureUrl")
      .populate("debtor", "displayName pictureUrl");

    res.json({
      success: true,
      message: "Debts calculated successfully",
      data: debts,
    });
  } catch (error) {
    logger.error("Calculate group debts error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get debt summary for user
// @route   GET /api/debts/summary
// @access  Private
export const getDebtSummary = async (req, res) => {
  try {
    const [owedToMe, iOwe] = await Promise.all([
      Debt.aggregate([
        {
          $match: {
            creditor: req.user.id,
            status: "pending",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Debt.aggregate([
        {
          $match: {
            debtor: req.user.id,
            status: "pending",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = {
      owedToMe: {
        amount: owedToMe[0]?.total || 0,
        count: owedToMe[0]?.count || 0,
      },
      iOwe: {
        amount: iOwe[0]?.total || 0,
        count: iOwe[0]?.count || 0,
      },
      netBalance: (owedToMe[0]?.total || 0) - (iOwe[0]?.total || 0),
    };

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error("Get debt summary error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
