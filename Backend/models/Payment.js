const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Member is required']
  },
  memberName: {
    type: String,
    required: [true, 'Member name is required']
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'PKR']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['card', 'cash', 'bank_transfer', 'paypal', 'stripe']
  },
  paymentType: {
    type: String,
    required: [true, 'Payment type is required'],
    enum: ['membership', 'class_package', 'personal_training', 'drop_in', 'equipment', 'other']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  status: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    sparse: true // Allows multiple null values
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  // For recurring payments
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringInterval: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    required: function() {
      return this.isRecurring;
    }
  },
  nextPaymentDate: {
    type: Date,
    required: function() {
      return this.isRecurring;
    }
  },
  // Related entities
  relatedClass: {
    type: mongoose.Schema.ObjectId,
    ref: 'Class'
  },
  relatedPlan: {
    type: mongoose.Schema.ObjectId,
    ref: 'Plan'
  },
  // Payment processing details
  processingFee: {
    type: Number,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    min: 0
  },
  // Refund information
  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  refundReason: {
    type: String,
    maxlength: [200, 'Refund reason cannot exceed 200 characters']
  },
  refundDate: {
    type: Date
  },
  // Metadata
  metadata: {
    type: Map,
    of: String
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return `${this.currency} ${this.amount.toFixed(2)}`;
});

// Virtual for payment age
paymentSchema.virtual('paymentAge').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.paymentDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware to calculate net amount
paymentSchema.pre('save', function(next) {
  // Always calculate net amount
  this.netAmount = (this.amount || 0) - (this.processingFee || 0);
  next();
});

// Static method to get monthly revenue
paymentSchema.statics.getMonthlyRevenue = async function(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const result = await this.aggregate([
    {
      $match: {
        paymentDate: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$netAmount' },
        totalPayments: { $sum: 1 }
      }
    }
  ]);
  
  return result[0] || { totalRevenue: 0, totalPayments: 0 };
};

// Static method to get revenue by payment type
paymentSchema.statics.getRevenueByType = async function(startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        paymentDate: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$paymentType',
        totalRevenue: { $sum: '$netAmount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    }
  ]);
};

// Indexes for efficient queries
paymentSchema.index({ member: 1, paymentDate: -1 });
paymentSchema.index({ status: 1, paymentDate: -1 });
paymentSchema.index({ paymentType: 1, paymentDate: -1 });
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ paymentDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);