import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // LINE user information
  lineUserId: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  pictureUrl: {
    type: String,
    default: ''
  },
  
  // User preferences and settings
  email: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email'
    }
  },
  
  // Payment information
  promptPayId: {
    type: String,
    default: ''
  },
  bankAccount: {
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountName: { type: String, default: '' }
  },
  
  // App settings
  notificationSettings: {
    debtReminders: { type: Boolean, default: true },
    newExpenses: { type: Boolean, default: true },
    paymentConfirmations: { type: Boolean, default: true },
    weeklyReports: { type: Boolean, default: false }
  },
  
  // User status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  
  // Groups the user belongs to
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  
  // User role (for future admin features)
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
userSchema.index({ lineUserId: 1 });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ groups: 1 });
userSchema.index({ isActive: 1 });

// Virtual for user's full name or display name
userSchema.virtual('name').get(function() {
  return this.displayName;
});

// Method to check if user has PromptPay setup
userSchema.methods.hasPromptPay = function() {
  return !!(this.promptPayId || (this.bankAccount && this.bankAccount.accountNumber));
};

// Method to get payment info for QR generation
userSchema.methods.getPaymentInfo = function() {
  if (this.promptPayId) {
    return {
      type: 'promptpay',
      id: this.promptPayId
    };
  } else if (this.bankAccount && this.bankAccount.accountNumber) {
    return {
      type: 'bank',
      bankName: this.bankAccount.bankName,
      accountNumber: this.bankAccount.accountNumber,
      accountName: this.bankAccount.accountName
    };
  }
  return null;
};

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

// Static method to find user by LINE ID
userSchema.statics.findByLineId = function(lineUserId) {
  return this.findOne({ lineUserId, isActive: true });
};

// Static method to find users in group
userSchema.statics.findByGroup = function(groupId) {
  return this.find({ groups: groupId, isActive: true }).populate('groups');
};

// Middleware to update timestamps
userSchema.pre('save', function(next) {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

const User = mongoose.model('User', userSchema);

export default User;