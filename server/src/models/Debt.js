import mongoose from "mongoose";

const debtSchema = new mongoose.Schema(
  {
    // Who owes money (debtor)
    debtor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who is owed money (creditor)
    creditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Related expense
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      required: true,
    },

    // Which group this debt belongs to
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },

    // Debt amount
    amount: {
      type: Number,
      required: true,
      min: [0.01, "Debt amount must be greater than 0"],
    },

    originalAmount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      enum: ["THB", "USD", "EUR", "JPY"],
      default: "THB",
    },

    // Payment status
    isPaid: {
      type: Boolean,
      default: false,
    },

    paidAt: {
      type: Date,
    },

    // Partial payments tracking
    partialPayments: [
      {
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        paidAt: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
          maxlength: 200,
          default: "",
        },
        confirmedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    // Reminder tracking
    reminderCount: {
      type: Number,
      default: 0,
    },

    lastReminderSent: {
      type: Date,
    },

    nextReminderDate: {
      type: Date,
    },

    // Settlement method
    settlementMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "promptpay", "other"],
      default: "promptpay",
    },

    // Settlement proof (e.g., transaction screenshot)
    settlementProofUrl: {
      type: String,
      default: "",
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Due date (optional)
    dueDate: {
      type: Date,
    },

    // Priority
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    // Notes
    notes: {
      type: String,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
debtSchema.index({ debtor: 1, isPaid: 1 });
debtSchema.index({ creditor: 1, isPaid: 1 });
debtSchema.index({ group: 1, isPaid: 1 });
debtSchema.index({ expense: 1 });
debtSchema.index({ isPaid: 1, isActive: 1 });
debtSchema.index({ nextReminderDate: 1 });
debtSchema.index({ dueDate: 1 });

// Compound indexes
debtSchema.index({ debtor: 1, creditor: 1, expense: 1 }, { unique: true });

// Virtual for remaining amount after partial payments
debtSchema.virtual("remainingAmount").get(function () {
  const totalPaid = this.partialPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  return Math.max(0, this.amount - totalPaid);
});

// Virtual for total paid amount
debtSchema.virtual("totalPaid").get(function () {
  return this.partialPayments.reduce((sum, payment) => sum + payment.amount, 0);
});

// Virtual for payment progress percentage
debtSchema.virtual("paymentProgress").get(function () {
  if (this.originalAmount === 0) return 100;
  return Math.round((this.totalPaid / this.originalAmount) * 100);
});

// Virtual for overdue status
debtSchema.virtual("isOverdue").get(function () {
  return this.dueDate && new Date() > this.dueDate && !this.isPaid;
});

// Virtual for days overdue
debtSchema.virtual("daysOverdue").get(function () {
  if (!this.isOverdue) return 0;
  const diffTime = Date.now() - this.dueDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to add partial payment
debtSchema.methods.addPartialPayment = function (
  amount,
  note = "",
  confirmedBy = null
) {
  if (amount <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }

  if (amount > this.remainingAmount) {
    throw new Error("Payment amount cannot exceed remaining debt");
  }

  this.partialPayments.push({
    amount: amount,
    note: note,
    confirmedBy: confirmedBy,
    paidAt: new Date(),
  });

  // Check if debt is fully paid
  if (this.remainingAmount <= 0.01) {
    // Account for floating point precision
    this.isPaid = true;
    this.paidAt = new Date();
  }

  return this.save();
};

// Method to mark as fully paid
debtSchema.methods.markAsPaid = function (
  settlementMethod = "promptpay",
  settlementProofUrl = ""
) {
  this.isPaid = true;
  this.paidAt = new Date();
  this.settlementMethod = settlementMethod;
  this.settlementProofUrl = settlementProofUrl;

  // Add final payment if there's remaining amount
  const remaining = this.remainingAmount;
  if (remaining > 0) {
    this.partialPayments.push({
      amount: remaining,
      note: "Final payment",
      paidAt: new Date(),
    });
  }

  return this.save();
};

// Method to calculate next reminder date
debtSchema.methods.calculateNextReminder = function () {
  const now = new Date();
  const hours = 24; // Default reminder interval
  this.nextReminderDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
  return this;
};

// Method to send reminder
debtSchema.methods.sendReminder = function () {
  this.reminderCount += 1;
  this.lastReminderSent = new Date();
  this.calculateNextReminder();
  return this.save();
};

// Static method to find debts by debtor
debtSchema.statics.findByDebtor = function (debtorId, options = {}) {
  const query = {
    debtor: debtorId,
    isActive: true,
    ...(options.isPaid !== undefined && { isPaid: options.isPaid }),
  };

  return this.find(query)
    .populate("creditor", "displayName pictureUrl lineUserId")
    .populate("expense", "title amount expenseDate")
    .populate("group", "name")
    .sort({ isPaid: 1, createdAt: -1 });
};

// Static method to find debts by creditor
debtSchema.statics.findByCreditor = function (creditorId, options = {}) {
  const query = {
    creditor: creditorId,
    isActive: true,
    ...(options.isPaid !== undefined && { isPaid: options.isPaid }),
  };

  return this.find(query)
    .populate("debtor", "displayName pictureUrl lineUserId")
    .populate("expense", "title amount expenseDate")
    .populate("group", "name")
    .sort({ isPaid: 1, createdAt: -1 });
};

// Static method to find debts by group
debtSchema.statics.findByGroup = function (groupId, options = {}) {
  const query = {
    group: groupId,
    isActive: true,
    ...(options.isPaid !== undefined && { isPaid: options.isPaid }),
  };

  return this.find(query)
    .populate("debtor", "displayName pictureUrl lineUserId")
    .populate("creditor", "displayName pictureUrl lineUserId")
    .populate("expense", "title amount expenseDate")
    .sort({ isPaid: 1, dueDate: 1, createdAt: -1 });
};

// Static method to find debts needing reminders
debtSchema.statics.findNeedingReminders = function () {
  const now = new Date();
  return this.find({
    isPaid: false,
    isActive: true,
    $or: [
      { nextReminderDate: { $lte: now } },
      { nextReminderDate: { $exists: false } },
    ],
  })
    .populate("debtor", "displayName lineUserId notificationSettings")
    .populate("creditor", "displayName")
    .populate("expense", "title amount")
    .populate("group", "name");
};

// Static method to get debt summary for user
debtSchema.statics.getDebtSummary = async function (userId) {
  const [owedToMe, owedByMe] = await Promise.all([
    // Money owed to me
    this.aggregate([
      { $match: { creditor: userId, isPaid: false, isActive: true } },
      {
        $group: {
          _id: "$currency",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    // Money I owe
    this.aggregate([
      { $match: { debtor: userId, isPaid: false, isActive: true } },
      {
        $group: {
          _id: "$currency",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  return {
    owedToMe: owedToMe.reduce((acc, item) => {
      acc[item._id] = { amount: item.totalAmount, count: item.count };
      return acc;
    }, {}),
    owedByMe: owedByMe.reduce((acc, item) => {
      acc[item._id] = { amount: item.totalAmount, count: item.count };
      return acc;
    }, {}),
  };
};

// Static method to optimize debts (net off mutual debts)
debtSchema.statics.optimizeDebts = async function (groupId) {
  const debts = await this.find({
    group: groupId,
    isPaid: false,
    isActive: true,
  });

  // Create a map of mutual debts
  const debtMap = new Map();

  for (const debt of debts) {
    const key1 = `${debt.debtor}-${debt.creditor}`;
    const key2 = `${debt.creditor}-${debt.debtor}`;

    if (debtMap.has(key2)) {
      // Found mutual debt, calculate net amount
      const mutualDebt = debtMap.get(key2);
      const netAmount = debt.amount - mutualDebt.amount;

      if (netAmount > 0) {
        // Current debt is larger
        debt.amount = netAmount;
        await debt.save();

        // Mark mutual debt as settled
        await this.findByIdAndUpdate(mutualDebt._id, {
          isPaid: true,
          paidAt: new Date(),
          notes: "Netted off with mutual debt",
        });
      } else if (netAmount < 0) {
        // Mutual debt is larger
        await this.findByIdAndUpdate(mutualDebt._id, {
          amount: Math.abs(netAmount),
        });

        // Mark current debt as settled
        debt.isPaid = true;
        debt.paidAt = new Date();
        debt.notes = "Netted off with mutual debt";
        await debt.save();
      } else {
        // Equal amounts, both settled
        debt.isPaid = true;
        debt.paidAt = new Date();
        debt.notes = "Netted off with equal mutual debt";
        await debt.save();

        await this.findByIdAndUpdate(mutualDebt._id, {
          isPaid: true,
          paidAt: new Date(),
          notes: "Netted off with equal mutual debt",
        });
      }

      debtMap.delete(key2);
    } else {
      debtMap.set(key1, debt);
    }
  }

  return true;
};

// Middleware to set due date if not provided
debtSchema.pre("save", function (next) {
  if (this.isNew && !this.dueDate) {
    // Set default due date to 7 days from creation
    this.dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  if (this.isNew && !this.nextReminderDate) {
    this.calculateNextReminder();
  }

  next();
});

const Debt = mongoose.model("Debt", debtSchema);

export default Debt;
