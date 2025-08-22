const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
    maxlength: [100, 'Class name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Class description is required'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  type: {
    type: String,
    required: [true, 'Class type is required'],
    enum: ['yoga', 'pilates', 'hiit', 'cardio', 'strength', 'crossfit', 'dance', 'martial_arts', 'swimming', 'other']
  },
  trainer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Trainer is required']
  },
  schedule: {
    dayOfWeek: {
      type: String,
      required: [true, 'Day of week is required'],
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
    }
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [180, 'Duration cannot exceed 180 minutes']
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [100, 'Capacity cannot exceed 100']
  },
  currentEnrollment: {
    type: Number,
    default: 0,
    min: [0, 'Current enrollment cannot be negative']
  },
  enrolledMembers: [{
    member: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['enrolled', 'waitlisted', 'cancelled'],
      default: 'enrolled'
    }
  }],
  waitlist: [{
    member: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  location: {
    room: {
      type: String,
      required: [true, 'Room is required']
    },
    floor: String,
    equipment: [String]
  },
  requirements: {
    fitnessLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all_levels'],
      default: 'all_levels'
    },
    ageRestriction: {
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
    prerequisites: [String]
  },
  pricing: {
    dropInRate: {
      type: Number,
      min: 0
    },
    packageRate: {
      type: Number,
      min: 0
    },
    memberRate: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isRecurring: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date
  },
  cancelledSessions: [{
    date: Date,
    reason: String,
    cancelledBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    cancelledAt: {
      type: Date,
      default: Date.now
    }
  }],
  specialInstructions: String,
  tags: [String],
  image: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for available spots
classSchema.virtual('availableSpots').get(function() {
  return this.capacity - this.currentEnrollment;
});

// Virtual for is full
classSchema.virtual('isFull').get(function() {
  return this.currentEnrollment >= this.capacity;
});

// Virtual for waitlist count
classSchema.virtual('waitlistCount').get(function() {
  return this.waitlist ? this.waitlist.length : 0;
});

// Index for efficient queries
classSchema.index({ trainer: 1, 'schedule.dayOfWeek': 1, 'schedule.startTime': 1 });
classSchema.index({ type: 1, isActive: 1 });
classSchema.index({ 'enrolledMembers.member': 1 });

// Pre-save middleware to update current enrollment
classSchema.pre('save', function(next) {
  this.currentEnrollment = this.enrolledMembers ? this.enrolledMembers.filter(enrollment => 
    enrollment.status === 'enrolled'
  ).length : 0;
  next();
});

// Method to enroll a member
classSchema.methods.enrollMember = function(memberId) {
  // Initialize arrays if they don't exist
  if (!this.enrolledMembers) this.enrolledMembers = [];
  if (!this.waitlist) this.waitlist = [];
  
  // Check if member is already enrolled
  const existingEnrollment = this.enrolledMembers.find(
    enrollment => enrollment.member.toString() === memberId.toString()
  );
  
  if (existingEnrollment) {
    throw new Error('Member is already enrolled in this class');
  }
  
  // Check capacity
  if (this.currentEnrollment >= this.capacity) {
    // Add to waitlist
    this.waitlist.push({ member: memberId });
    return { status: 'waitlisted' };
  } else {
    // Enroll directly
    this.enrolledMembers.push({ member: memberId });
    return { status: 'enrolled' };
  }
};

// Method to cancel enrollment
classSchema.methods.cancelEnrollment = function(memberId) {
  // Initialize arrays if they don't exist
  if (!this.enrolledMembers) this.enrolledMembers = [];
  if (!this.waitlist) this.waitlist = [];
  
  // Remove from enrolled members
  this.enrolledMembers = this.enrolledMembers.filter(
    enrollment => enrollment.member.toString() !== memberId.toString()
  );
  
  // Remove from waitlist if present
  this.waitlist = this.waitlist.filter(
    waitlistEntry => waitlistEntry.member.toString() !== memberId.toString()
  );
  
  // Move first person from waitlist to enrolled if there's space
  if (this.waitlist.length > 0 && this.currentEnrollment < this.capacity) {
    const nextMember = this.waitlist.shift();
    this.enrolledMembers.push({ 
      member: nextMember.member,
      enrolledAt: new Date()
    });
  }
};

module.exports = mongoose.model('Class', classSchema);
