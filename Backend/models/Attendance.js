const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Member is required']
  },
  memberName: {
    type: String,
    required: [true, 'Member name is required']
  },
  class: {
    type: mongoose.Schema.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required']
  },
  className: {
    type: String,
    required: [true, 'Class name is required']
  },
  trainer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  trainerName: String,
  // Date and time information
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  scheduledStartTime: {
    type: String,
    required: [true, 'Scheduled start time is required']
  },
  scheduledEndTime: {
    type: String,
    required: [true, 'Scheduled end time is required']
  },
  // Actual attendance times
  checkInTime: {
    type: Date
  },
  checkOutTime: {
    type: Date
  },
  // Attendance status
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused', 'cancelled'],
    default: 'absent'
  },
  // How attendance was marked
  attendanceMethod: {
    type: String,
    enum: ['qr_code', 'manual', 'auto', 'mobile_app', 'biometric'],
    default: 'manual'
  },
  // QR Code information
  qrCode: {
    code: String,
    generatedAt: Date,
    expiresAt: Date,
    scannedAt: Date,
    isUsed: {
      type: Boolean,
      default: false
    }
  },
  // Location and device information
  location: {
    room: String,
    floor: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  device: {
    type: String, // mobile, tablet, desktop, kiosk
    userAgent: String,
    ipAddress: String
  },
  // Late arrival information
  lateArrival: {
    isLate: {
      type: Boolean,
      default: false
    },
    minutesLate: {
      type: Number,
      min: 0
    },
    reason: String
  },
  // Early departure information
  earlyDeparture: {
    isEarly: {
      type: Boolean,
      default: false
    },
    minutesEarly: {
      type: Number,
      min: 0
    },
    reason: String
  },
  // Absence information
  absence: {
    reason: String,
    isExcused: {
      type: Boolean,
      default: false
    },
    notificationSent: {
      type: Boolean,
      default: false
    },
    makeupClassOffered: {
      type: Boolean,
      default: false
    },
    makeupClass: {
      type: mongoose.Schema.ObjectId,
      ref: 'Class'
    }
  },
  // Performance and participation
  participation: {
    level: {
      type: String,
      enum: ['excellent', 'good', 'average', 'poor', 'not_applicable'],
      default: 'not_applicable'
    },
    notes: String,
    modifications: [String], // Exercise modifications made
    injuries: [String] // Any injuries reported
  },
  // Booking information
  booking: {
    bookedAt: Date,
    bookingMethod: {
      type: String,
      enum: ['online', 'mobile_app', 'phone', 'walk_in', 'admin']
    },
    waitlisted: {
      type: Boolean,
      default: false
    },
    waitlistPosition: Number
  },
  // Payment and credits
  payment: {
    required: {
      type: Boolean,
      default: false
    },
    amount: {
      type: Number,
      min: 0
    },
    paid: {
      type: Boolean,
      default: false
    },
    paymentMethod: String,
    creditsUsed: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  // Notifications
  notifications: {
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderSentAt: Date,
    confirmationSent: {
      type: Boolean,
      default: false
    },
    followUpSent: {
      type: Boolean,
      default: false
    }
  },
  // System fields
  markedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  lastModifiedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  notes: String,
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for duration attended
attendanceSchema.virtual('durationAttended').get(function() {
  if (this.checkInTime && this.checkOutTime) {
    const duration = this.checkOutTime - this.checkInTime;
    return Math.round(duration / (1000 * 60)); // Duration in minutes
  }
  return null;
});

// Virtual for attendance status display
attendanceSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    excused: 'Excused',
    cancelled: 'Cancelled'
  };
  return statusMap[this.status] || this.status;
});

// Virtual for check-in status
attendanceSchema.virtual('isCheckedIn').get(function() {
  return this.checkInTime && !this.checkOutTime;
});

// Virtual for session completed
attendanceSchema.virtual('isSessionCompleted').get(function() {
  return this.checkInTime && this.checkOutTime;
});

// Compound indexes for efficient queries
attendanceSchema.index({ member: 1, date: -1 });
attendanceSchema.index({ class: 1, date: -1 });
attendanceSchema.index({ trainer: 1, date: -1 });
attendanceSchema.index({ date: -1, status: 1 });
attendanceSchema.index({ 'qrCode.code': 1 });

// Pre-save middleware to calculate late arrival and early departure
attendanceSchema.pre('save', function(next) {
  if (this.checkInTime && this.scheduledStartTime) {
    const scheduledStart = new Date(`${this.date.toDateString()} ${this.scheduledStartTime}`);
    const checkIn = new Date(this.checkInTime);
    
    if (checkIn > scheduledStart) {
      this.lateArrival.isLate = true;
      this.lateArrival.minutesLate = Math.round((checkIn - scheduledStart) / (1000 * 60));
      if (this.status === 'absent') {
        this.status = 'late';
      }
    }
  }
  
  if (this.checkOutTime && this.scheduledEndTime) {
    const scheduledEnd = new Date(`${this.date.toDateString()} ${this.scheduledEndTime}`);
    const checkOut = new Date(this.checkOutTime);
    
    if (checkOut < scheduledEnd) {
      this.earlyDeparture.isEarly = true;
      this.earlyDeparture.minutesEarly = Math.round((scheduledEnd - checkOut) / (1000 * 60));
    }
  }
  
  // Set status to present if checked in
  if (this.checkInTime && this.status === 'absent') {
    this.status = 'present';
  }
  
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
