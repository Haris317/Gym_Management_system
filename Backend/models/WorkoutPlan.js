const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Exercise name is required'],
    trim: true
  },
  sets: {
    type: Number,
    min: [1, 'Sets must be at least 1']
  },
  reps: {
    type: String, // Can be "10-12" or "30 seconds" etc.
    trim: true
  },
  weight: {
    type: String, // Can be "bodyweight", "15kg", etc.
    trim: true
  },
  duration: {
    type: String, // For cardio exercises
    trim: true
  },
  notes: {
    type: String,
    maxlength: [200, 'Exercise notes cannot exceed 200 characters']
  }
});

const workoutPlanSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Workout plan title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    required: [true, 'Plan type is required'],
    enum: ['workout', 'diet'],
    default: 'workout'
  },
  category: {
    type: String,
    enum: ['strength', 'cardio', 'flexibility', 'hiit', 'bodyweight', 'weight_loss', 'muscle_gain', 'endurance', 'general'],
    default: 'general'
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration: {
    type: Number, // Duration in minutes
    min: [5, 'Duration must be at least 5 minutes'],
    max: [300, 'Duration cannot exceed 300 minutes']
  },
  // For workout plans
  exercises: [exerciseSchema],
  
  // For diet plans
  content: {
    type: String, // Rich text content for diet plans
    maxlength: [5000, 'Content cannot exceed 5000 characters']
  },
  
  // Plan metadata
  trainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Trainer is required']
  },
  targetAudience: {
    type: String,
    enum: ['beginners', 'intermediate', 'advanced', 'all'],
    default: 'all'
  },
  equipment: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Usage tracking
  assignedMembers: [{
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused'],
      default: 'active'
    }
  }],
  
  // Plan status
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: false // Private to trainer by default
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
workoutPlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance methods
workoutPlanSchema.methods.assignToMember = function(memberId) {
  // Check if member is already assigned
  const existingAssignment = this.assignedMembers.find(
    assignment => assignment.member.toString() === memberId.toString()
  );
  
  if (existingAssignment) {
    throw new Error('Member is already assigned to this plan');
  }
  
  this.assignedMembers.push({
    member: memberId,
    assignedAt: new Date(),
    status: 'active'
  });
  
  return this.save();
};

workoutPlanSchema.methods.removeFromMember = function(memberId) {
  this.assignedMembers = this.assignedMembers.filter(
    assignment => assignment.member.toString() !== memberId.toString()
  );
  
  return this.save();
};

// Static methods
workoutPlanSchema.statics.findByTrainer = function(trainerId) {
  return this.find({ trainer: trainerId, isActive: true })
    .populate('trainer', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

workoutPlanSchema.statics.findPublicPlans = function() {
  return this.find({ isPublic: true, isActive: true })
    .populate('trainer', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Indexes
workoutPlanSchema.index({ trainer: 1, type: 1 });
workoutPlanSchema.index({ isPublic: 1, isActive: 1 });
workoutPlanSchema.index({ tags: 1 });
workoutPlanSchema.index({ category: 1, difficulty: 1 });

module.exports = mongoose.model('WorkoutPlan', workoutPlanSchema);
