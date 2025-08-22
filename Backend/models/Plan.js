const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
    maxlength: [100, 'Plan name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Plan description is required'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  type: {
    type: String,
    required: [true, 'Plan type is required'],
    enum: ['membership', 'class_package', 'personal_training', 'nutrition', 'combo']
  },
  category: {
    type: String,
    enum: ['basic', 'premium', 'vip', 'student', 'senior', 'family'],
    default: 'basic'
  },
  // Pricing information
  pricing: {
    amount: {
      type: Number,
      required: [true, 'Price amount is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'PKR']
    },
    billingCycle: {
      type: String,
      required: [true, 'Billing cycle is required'],
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one_time']
    },
    setupFee: {
      type: Number,
      default: 0,
      min: 0
    },
    discountedPrice: {
      type: Number,
      min: 0
    }
  },
  // Duration and validity
  duration: {
    value: {
      type: Number,
      required: [true, 'Duration value is required'],
      min: 1
    },
    unit: {
      type: String,
      required: [true, 'Duration unit is required'],
      enum: ['days', 'weeks', 'months', 'years']
    }
  },
  // Features and benefits
  features: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    included: {
      type: Boolean,
      default: true
    },
    limit: {
      type: Number, // e.g., 10 classes per month
      min: 0
    },
    unlimited: {
      type: Boolean,
      default: false
    }
  }],
  // Access permissions
  access: {
    gymAccess: {
      type: Boolean,
      default: true
    },
    equipmentAccess: [{
      type: String,
      enum: ['cardio', 'strength', 'free_weights', 'pool', 'sauna', 'steam_room', 'locker_room']
    }],
    classAccess: {
      unlimited: {
        type: Boolean,
        default: false
      },
      monthlyLimit: {
        type: Number,
        min: 0
      },
      allowedClasses: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Class'
      }],
      classTypes: [{
        type: String,
        enum: ['yoga', 'pilates', 'hiit', 'cardio', 'strength', 'crossfit', 'dance', 'martial_arts', 'swimming']
      }]
    },
    personalTraining: {
      included: {
        type: Boolean,
        default: false
      },
      sessionsPerMonth: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    nutritionConsultation: {
      included: {
        type: Boolean,
        default: false
      },
      sessionsPerMonth: {
        type: Number,
        default: 0,
        min: 0
      }
    }
  },
  // Restrictions and requirements
  restrictions: {
    ageLimit: {
      min: {
        type: Number,
        min: 0,
        max: 100
      },
      max: {
        type: Number,
        min: 0,
        max: 100
      }
    },
    membershipRequired: {
      type: Boolean,
      default: false
    },
    prerequisites: [String],
    blackoutDates: [{
      start: Date,
      end: Date,
      reason: String
    }]
  },
  // Availability and scheduling
  availability: {
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    },
    maxMembers: {
      type: Number,
      min: 1
    },
    currentMembers: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  // Trial and promotional options
  trial: {
    available: {
      type: Boolean,
      default: false
    },
    duration: {
      value: Number,
      unit: {
        type: String,
        enum: ['days', 'weeks', 'months']
      }
    },
    price: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  // Promotional pricing
  promotions: [{
    name: String,
    description: String,
    discountType: {
      type: String,
      enum: ['percentage', 'fixed_amount']
    },
    discountValue: {
      type: Number,
      min: 0
    },
    validFrom: Date,
    validUntil: Date,
    isActive: {
      type: Boolean,
      default: true
    },
    conditions: [String]
  }],
  // Terms and conditions
  terms: {
    cancellationPolicy: String,
    freezePolicy: String,
    transferPolicy: String,
    refundPolicy: String,
    autoRenewal: {
      type: Boolean,
      default: true
    },
    noticePeriod: {
      value: {
        type: Number,
        default: 30
      },
      unit: {
        type: String,
        default: 'days',
        enum: ['days', 'weeks', 'months']
      }
    }
  },
  // System fields
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for display price
planSchema.virtual('displayPrice').get(function() {
  const price = this.pricing.discountedPrice || this.pricing.amount || 0;
  const currency = this.pricing.currency || 'USD';
  return `${currency} ${price.toFixed(2)}`;
});

// Virtual for duration display
planSchema.virtual('durationDisplay').get(function() {
  const { value, unit } = this.duration;
  return `${value} ${unit}${value > 1 ? '' : ''}`;
});

// Virtual for availability status
planSchema.virtual('isAvailable').get(function() {
  const now = new Date();
  return this.availability.isActive && 
         (!this.availability.endDate || this.availability.endDate > now) &&
         (!this.availability.maxMembers || this.availability.currentMembers < this.availability.maxMembers);
});

// Index for efficient queries
planSchema.index({ type: 1, category: 1 });
planSchema.index({ 'availability.isActive': 1 });
planSchema.index({ 'pricing.amount': 1 });
planSchema.index({ sortOrder: 1 });

module.exports = mongoose.model('Plan', planSchema);
