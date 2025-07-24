import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  // Basic expense information
  title: {
    type: String,
    required: [true, 'Expense title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  
  currency: {
    type: String,
    enum: ['THB', 'USD', 'EUR', 'JPY'],
    default: 'THB'
  },
  
  // Expense category
  category: {
    type: String,
    enum: [
      'food', 'transport', 'accommodation', 'entertainment', 
      'shopping', 'utilities', 'groceries', 'healthcare', 
      'education', 'other'
    ],
    default: 'other'
  },
  
  // Who paid for this expense
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Which group this expense belongs to
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  
  // Split details - who owes how much
  splits: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paidAt: {
      type: Date
    }
  }],
  
  // Split method used
  splitMethod: {
    type: String,
    enum: ['equal', 'custom', 'percentage'],
    default: 'equal'
  },
  
  // Receipt/proof image
  receiptUrl: {
    type: String,
    default: ''
  },
  
  // Expense date (when it actually occurred)
  expenseDate: {
    type: Date,
    default: Date.now
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Settlement status
  isSettled: {
    type: Boolean,
    default: false
  },
  settledAt: {
    type: Date
  },
  
  // Additional metadata
  tags: [{
    type: String,
    trim: true
  }],
  
  location: {
    name: { type: String, default: '' },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  
  // Notes or comments
  notes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: {
      type: String,
      required: true,
      maxlength: 200
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
expenseSchema.index({ group: 1, createdAt: -1 });
expenseSchema.index({ paidBy: 1 });
expenseSchema.index({ 'splits.user': 1 });
expenseSchema.index({ isActive: 1, isSettled: 1 });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ category: 1 });

// Virtual for total owed amount (excluding the payer)
expenseSchema.virtual('totalOwed').get(function() {
  return this.splits
    .filter(split => split.user.toString() !== this.paidBy.toString())
    .reduce((total, split) => total + split.amount, 0);
});

// Virtual for remaining debt amount
expenseSchema.virtual('remainingDebt').get(function() {
  return this.splits
    .filter(split => !split.isPaid && split.user.toString() !== this.paidBy.toString())
    .reduce((total, split) => total + split.amount, 0);
});

// Virtual for settlement percentage
expenseSchema.virtual('settlementPercentage').get(function() {
  const totalOwed = this.totalOwed;
  if (totalOwed === 0) return 100;
  
  const paidAmount = this.splits
    .filter(split => split.isPaid && split.user.toString() !== this.paidBy.toString())
    .reduce((total, split) => total + split.amount, 0);
    
  return Math.round((paidAmount / totalOwed) * 100);
});

// Method to check if user is involved in this expense
expenseSchema.methods.isUserInvolved = function(userId) {
  return this.paidBy.toString() === userId.toString() || 
         this.splits.some(split => split.user.toString() === userId.toString());
};

// Method to get user's split amount
expenseSchema.methods.getUserSplitAmount = function(userId) {
  const split = this.splits.find(split => split.user.toString() === userId.toString());
  return split ? split.amount : 0;
};

// Method to mark user's split as paid
expenseSchema.methods.markSplitAsPaid = function(userId) {
  const split = this.splits.find(split => split.user.toString() === userId.toString());
  if (split && !split.isPaid) {
    split.isPaid = true;
    split.paidAt = new Date();
    
    // Check if all splits are paid
    const allPaid = this.splits.every(split => 
      split.isPaid || split.user.toString() === this.paidBy.toString()
    );
    
    if (allPaid) {
      this.isSettled = true;
      this.settledAt = new Date();
    }
  }
  
  return this.save();
};

// Method to calculate equal splits
expenseSchema.methods.calculateEqualSplits = function(userIds) {
  const splitAmount = this.amount / userIds.length;
  this.splits = userIds.map(userId => ({
    user: userId,
    amount: Math.round(splitAmount * 100) / 100, // Round to 2 decimal places
    percentage: Math.round((100 / userIds.length) * 100) / 100,
    isPaid: userId.toString() === this.paidBy.toString()
  }));
  
  this.splitMethod = 'equal';
  return this;
};

// Method to calculate custom splits
expenseSchema.methods.calculateCustomSplits = function(customSplits) {
  // customSplits: [{ userId, amount }]
  let totalSplit = customSplits.reduce((sum, split) => sum + split.amount, 0);
  
  if (Math.abs(totalSplit - this.amount) > 0.01) {
    throw new Error('Custom split amounts must equal the total expense amount');
  }
  
  this.splits = customSplits.map(split => ({
    user: split.userId,
    amount: split.amount,
    percentage: Math.round((split.amount / this.amount) * 10000) / 100,
    isPaid: split.userId.toString() === this.paidBy.toString()
  }));
  
  this.splitMethod = 'custom';
  return this;
};

// Method to calculate percentage splits
expenseSchema.methods.calculatePercentageSplits = function(percentageSplits) {
  // percentageSplits: [{ userId, percentage }]
  const totalPercentage = percentageSplits.reduce((sum, split) => sum + split.percentage, 0);
  
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error('Percentage splits must total 100%');
  }
  
  this.splits = percentageSplits.map(split => ({
    user: split.userId,
    amount: Math.round((this.amount * split.percentage / 100) * 100) / 100,
    percentage: split.percentage,
    isPaid: split.userId.toString() === this.paidBy.toString()
  }));
  
  this.splitMethod = 'percentage';
  return this;
};

// Method to add a note
expenseSchema.methods.addNote = function(userId, message) {
  this.notes.push({
    user: userId,
    message: message,
    createdAt: new Date()
  });
  
  return this.save();
};

// Static method to find expenses by group
expenseSchema.statics.findByGroup = function(groupId, options = {}) {
  const query = { group: groupId, isActive: true };
  
  return this.find(query)
    .populate('paidBy', 'displayName pictureUrl lineUserId')
    .populate('splits.user', 'displayName pictureUrl lineUserId')
    .sort({ expenseDate: -1, createdAt: -1 })
    .limit(options.limit || 50);
};

// Static method to find expenses by user
expenseSchema.statics.findByUser = function(userId, options = {}) {
  const query = {
    $or: [
      { paidBy: userId },
      { 'splits.user': userId }
    ],
    isActive: true
  };
  
  return this.find(query)
    .populate('group', 'name')
    .populate('paidBy', 'displayName pictureUrl')
    .populate('splits.user', 'displayName pictureUrl')
    .sort({ expenseDate: -1, createdAt: -1 })
    .limit(options.limit || 50);
};

// Middleware to validate splits before saving
expenseSchema.pre('save', function(next) {
  if (this.splits && this.splits.length > 0) {
    const totalSplitAmount = this.splits.reduce((total, split) => total + split.amount, 0);
    
    if (Math.abs(totalSplitAmount - this.amount) > 0.01) {
      return next(new Error('Split amounts must equal the total expense amount'));
    }
  }
  
  next();
});

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;