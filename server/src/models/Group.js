import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [50, 'Group name cannot exceed 50 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: ''
  },
  
  // Group settings
  groupType: {
    type: String,
    enum: ['family', 'friends', 'roommates', 'trip', 'event', 'other'],
    default: 'friends'
  },
  
  currency: {
    type: String,
    enum: ['THB', 'USD', 'EUR', 'JPY'],
    default: 'THB'
  },
  
  // Group avatar/image
  imageUrl: {
    type: String,
    default: ''
  },
  
  // Members management
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Group creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Group status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Group statistics (for caching)
  stats: {
    totalExpenses: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    activeDebts: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now }
  },
  
  // Group settings
  settings: {
    autoReminders: { type: Boolean, default: true },
    reminderInterval: { type: Number, default: 24 }, // hours
    allowMemberInvites: { type: Boolean, default: true },
    requireApprovalForExpenses: { type: Boolean, default: false },
    defaultSplitMethod: {
      type: String,
      enum: ['equal', 'custom', 'percentage'],
      default: 'equal'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ createdBy: 1 });
groupSchema.index({ isActive: 1 });
groupSchema.index({ 'stats.lastActivity': -1 });

// Virtual for active members count
groupSchema.virtual('activeMembersCount').get(function() {
  return this.members.filter(member => member.isActive).length;
});

// Virtual for admin members
groupSchema.virtual('admins').get(function() {
  return this.members.filter(member => member.role === 'admin' && member.isActive);
});

// Virtual for regular members
groupSchema.virtual('regularMembers').get(function() {
  return this.members.filter(member => member.role === 'member' && member.isActive);
});

// Method to check if user is member of group
groupSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && member.isActive
  );
};

// Method to check if user is admin of group
groupSchema.methods.isAdmin = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && 
    member.role === 'admin' && 
    member.isActive
  );
};

// Method to add member to group
groupSchema.methods.addMember = function(userId, role = 'member') {
  // Check if user is already a member
  const existingMember = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    if (!existingMember.isActive) {
      existingMember.isActive = true;
      existingMember.joinedAt = new Date();
    }
    return this.save();
  }
  
  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date()
  });
  
  return this.save();
};

// Method to remove member from group
groupSchema.methods.removeMember = function(userId) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (member) {
    member.isActive = false;
  }
  
  return this.save();
};

// Method to update group statistics
groupSchema.methods.updateStats = async function() {
  const Expense = mongoose.model('Expense');
  const Debt = mongoose.model('Debt');
  
  const [expenseStats, debtCount] = await Promise.all([
    Expense.aggregate([
      { $match: { group: this._id, isActive: true } },
      { 
        $group: { 
          _id: null, 
          totalExpenses: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        } 
      }
    ]),
    Debt.countDocuments({ group: this._id, isPaid: false, isActive: true })
  ]);
  
  this.stats = {
    totalExpenses: expenseStats[0]?.totalExpenses || 0,
    totalAmount: expenseStats[0]?.totalAmount || 0,
    activeDebts: debtCount,
    lastActivity: new Date()
  };
  
  return this.save();
};

// Static method to find groups by user
groupSchema.statics.findByUser = function(userId) {
  return this.find({
    'members.user': userId,
    'members.isActive': true,
    isActive: true
  }).populate('members.user', 'displayName pictureUrl lineUserId');
};

// Static method to find groups where user is admin
groupSchema.statics.findByAdmin = function(userId) {
  return this.find({
    'members.user': userId,
    'members.role': 'admin',
    'members.isActive': true,
    isActive: true
  });
};

// Middleware to ensure at least one admin exists
groupSchema.pre('save', function(next) {
  const activeAdmins = this.members.filter(member => 
    member.role === 'admin' && member.isActive
  );
  
  if (activeAdmins.length === 0) {
    const error = new Error('Group must have at least one admin');
    return next(error);
  }
  
  next();
});

const Group = mongoose.model('Group', groupSchema);

export default Group;