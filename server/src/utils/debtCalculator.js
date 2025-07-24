import Expense from "../models/Expense.js";
import Debt from "../models/Debt.js";
import Group from "../models/Group.js";
import { logger } from "./logger.js";

/**
 * Calculate and update debts for a group based on all expenses
 * @param {string} groupId - The group ID to calculate debts for
 */
export async function calculateDebts(groupId) {
  try {
    logger.info("Calculating debts for group:", groupId);

    // Get all expenses for the group
    const expenses = await Expense.find({ group: groupId })
      .populate("paidBy")
      .populate("splitDetails.user");

    // Get group members
    const group = await Group.findById(groupId).populate("members");
    if (!group) {
      throw new Error("Group not found");
    }

    const members = group.members;
    const memberBalances = {};

    // Initialize balances for all members
    members.forEach((member) => {
      memberBalances[member._id.toString()] = 0;
    });

    // Calculate net balances from expenses
    expenses.forEach((expense) => {
      const paidBy = expense.paidBy._id.toString();
      const totalAmount = expense.amount;

      // Add the total amount to the person who paid
      memberBalances[paidBy] += totalAmount;

      // Subtract each person's share
      expense.splitDetails.forEach((split) => {
        const userId = split.user._id.toString();
        memberBalances[userId] -= split.amount;
      });
    });

    // Clear existing pending debts for this group
    await Debt.deleteMany({ group: groupId, status: "pending" });

    // Calculate optimal debt settlements using simplified algorithm
    const debts = calculateOptimalDebts(memberBalances, members);

    // Create new debt records
    const debtPromises = debts.map((debt) => {
      return new Debt({
        creditor: debt.creditor,
        debtor: debt.debtor,
        amount: debt.amount,
        group: groupId,
        status: "pending",
      }).save();
    });

    await Promise.all(debtPromises);

    logger.info(`Created ${debts.length} debt records for group ${groupId}`);
    return debts;
  } catch (error) {
    logger.error("Error calculating debts:", error);
    throw error;
  }
}

/**
 * Calculate optimal debt settlements to minimize number of transactions
 * @param {Object} balances - Member balances (positive = owes money to group, negative = group owes money to them)
 * @param {Array} members - Group members
 * @returns {Array} Array of debt objects
 */
function calculateOptimalDebts(balances, members) {
  const debts = [];

  // Separate creditors (negative balance - group owes them money) and debtors (positive balance - they owe money)
  const creditors = [];
  const debtors = [];

  Object.entries(balances).forEach(([userId, balance]) => {
    if (balance > 0.01) {
      // They owe money (threshold for floating point precision)
      debtors.push({ userId, amount: balance });
    } else if (balance < -0.01) {
      // They are owed money
      creditors.push({ userId, amount: Math.abs(balance) });
    }
  });

  // Match debtors with creditors to minimize transactions
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    // Create debt record
    debts.push({
      debtor: debtor.userId,
      creditor: creditor.userId,
      amount: Math.round(settleAmount * 100) / 100, // Round to 2 decimal places
    });

    // Update remaining amounts
    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    // Move to next debtor/creditor if current one is settled
    if (debtor.amount < 0.01) {
      debtorIndex++;
    }
    if (creditor.amount < 0.01) {
      creditorIndex++;
    }
  }

  return debts;
}

/**
 * Get debt summary for a user across all groups
 * @param {string} userId - The user ID
 * @returns {Object} Debt summary
 */
export async function getUserDebtSummary(userId) {
  try {
    const [owedToUser, userOwes] = await Promise.all([
      Debt.aggregate([
        { $match: { creditor: userId, status: "pending" } },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]),
      Debt.aggregate([
        { $match: { debtor: userId, status: "pending" } },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]),
    ]);

    return {
      owedToUser: {
        amount: owedToUser[0]?.total || 0,
        count: owedToUser[0]?.count || 0,
      },
      userOwes: {
        amount: userOwes[0]?.total || 0,
        count: userOwes[0]?.count || 0,
      },
      netBalance: (owedToUser[0]?.total || 0) - (userOwes[0]?.total || 0),
    };
  } catch (error) {
    logger.error("Error getting user debt summary:", error);
    throw error;
  }
}

/**
 * Get debt summary for a group
 * @param {string} groupId - The group ID
 * @returns {Object} Group debt summary
 */
export async function getGroupDebtSummary(groupId) {
  try {
    const [totalDebts, settledDebts, pendingDebts] = await Promise.all([
      Debt.aggregate([
        { $match: { group: groupId } },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]),
      Debt.aggregate([
        { $match: { group: groupId, status: "settled" } },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]),
      Debt.aggregate([
        { $match: { group: groupId, status: "pending" } },
        {
          $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } },
        },
      ]),
    ]);

    return {
      total: {
        amount: totalDebts[0]?.total || 0,
        count: totalDebts[0]?.count || 0,
      },
      settled: {
        amount: settledDebts[0]?.total || 0,
        count: settledDebts[0]?.count || 0,
      },
      pending: {
        amount: pendingDebts[0]?.total || 0,
        count: pendingDebts[0]?.count || 0,
      },
    };
  } catch (error) {
    logger.error("Error getting group debt summary:", error);
    throw error;
  }
}
