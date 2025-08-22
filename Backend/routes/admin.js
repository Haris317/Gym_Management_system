const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Class = require('../models/Class');
const WorkoutPlan = require('../models/WorkoutPlan');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    // Get counts for different entities
    const [totalMembers, totalTrainers, totalClasses, totalPlans] = await Promise.all([
      User.countDocuments({ role: 'member', isActive: true }),
      User.countDocuments({ role: 'trainer', isActive: true }),
      Class.countDocuments({ isActive: true }),
      WorkoutPlan.countDocuments({ isActive: true })
    ]);

    // Calculate monthly revenue from actual payments
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const monthlyRevenueData = await Payment.getMonthlyRevenue(currentYear, currentMonth);
    const monthlyRevenue = monthlyRevenueData.totalRevenue;

    // Get recent activity stats
    const recentAttendance = await Attendance.countDocuments({
      date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    res.status(200).json({
      success: true,
      data: {
        totalMembers,
        totalTrainers,
        totalClasses,
        totalPlans,
        monthlyRevenue,
        recentAttendance
      }
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin stats',
      error: error.message
    });
  }
});

// @desc    Get all members
// @route   GET /api/admin/members
// @access  Private/Admin
router.get('/members', protect, authorize('admin'), async (req, res) => {
  try {
    const members = await User.find({ role: 'member', isActive: true })
      .select('firstName lastName email phone membershipType isActive createdAt assignedTrainer')
      .populate('assignedTrainer', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('Error getting members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get members',
      error: error.message
    });
  }
});

// @desc    Get all trainers
// @route   GET /api/admin/trainers
// @access  Private/Admin
router.get('/trainers', protect, authorize('admin'), async (req, res) => {
  try {
    const trainers = await User.find({ role: 'trainer', isActive: true })
      .select('firstName lastName email phone specializations experience isActive createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: trainers
    });
  } catch (error) {
    console.error('Error getting trainers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trainers',
      error: error.message
    });
  }
});

// @desc    Get all classes
// @route   GET /api/admin/classes
// @access  Private/Admin
router.get('/classes', protect, authorize('admin'), async (req, res) => {
  try {
    // Only return active classes (not soft deleted)
    const classes = await Class.find({ isActive: { $ne: false } })
      .populate('trainer', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('Error getting classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get classes',
      error: error.message
    });
  }
});

// @desc    Get all payments
// @route   GET /api/admin/payments
// @access  Private/Admin
router.get('/payments', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status, paymentType, startDate, endDate } = req.query;
    
    // Build query filters
    const query = {};
    if (status) query.status = status;
    if (paymentType) query.paymentType = paymentType;
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    // Get payments with pagination
    const payments = await Payment.find(query)
      .populate('member', 'firstName lastName email')
      .populate('relatedClass', 'name')
      .sort({ paymentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const totalPayments = await Payment.countDocuments(query);

    // Format payments for frontend
    const formattedPayments = payments.map(payment => ({
      id: payment._id,
      memberName: payment.memberName || `${payment.member?.firstName} ${payment.member?.lastName}`,
      amount: payment.amount,
      date: payment.paymentDate.toLocaleDateString(),
      type: payment.paymentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      status: payment.status,
      transactionId: payment.transactionId || 'N/A',
      paymentMethod: payment.paymentMethod,
      description: payment.description
    }));

    res.status(200).json({
      success: true,
      data: formattedPayments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPayments / limit),
        totalPayments,
        hasNext: page * limit < totalPayments,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error getting payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payments',
      error: error.message
    });
  }
});

// @desc    Add new member
// @route   POST /api/admin/members
// @access  Private/Admin
router.post('/members', protect, authorize('admin'), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, membershipType } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new member
    const member = await User.create({
      firstName,
      lastName,
      email,
      phone,
      role: 'member',
      membershipType: membershipType || 'basic',
      password: 'defaultPassword123', // You should generate a random password and send it via email
      isActive: true
    });

    // Remove password from response
    member.password = undefined;

    // Create notification for the new member
    try {
      await Notification.createNotification({
        recipient: member._id,
        sender: req.user.id,
        title: 'Welcome to the Gym!',
        message: `Welcome ${member.firstName}! Your membership has been activated. You can now book classes and access all gym facilities.`,
        type: 'system_announcement',
        priority: 'medium',
        channels: ['in_app']
      });
    } catch (notificationError) {
      console.error('Failed to create welcome notification:', notificationError);
      // Don't fail the member creation if notification fails
    }

    res.status(201).json({
      success: true,
      data: member,
      message: 'Member created successfully'
    });
  } catch (error) {
    console.error('Error creating member:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create member',
      error: error.message
    });
  }
});

// @desc    Add new trainer
// @route   POST /api/admin/trainers
// @access  Private/Admin
router.post('/trainers', protect, authorize('admin'), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, specializations } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new trainer
    const trainer = await User.create({
      firstName,
      lastName,
      email,
      phone,
      role: 'trainer',
      specializations: Array.isArray(specializations) ? specializations : [],
      password: 'defaultPassword123', // You should generate a random password and send it via email
      isActive: true
    });

    // Remove password from response
    trainer.password = undefined;

    // Create notification for the new trainer
    try {
      await Notification.createNotification({
        recipient: trainer._id,
        sender: req.user.id,
        title: 'Welcome to the Team!',
        message: `Welcome ${trainer.firstName}! You've been added as a trainer. You can now manage classes and work with assigned members.`,
        type: 'trainer_assigned',
        priority: 'medium',
        channels: ['in_app']
      });
    } catch (notificationError) {
      console.error('Failed to create trainer welcome notification:', notificationError);
      // Don't fail the trainer creation if notification fails
    }

    res.status(201).json({
      success: true,
      data: trainer,
      message: 'Trainer created successfully'
    });
  } catch (error) {
    console.error('Error creating trainer:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create trainer',
      error: error.message
    });
  }
});

// @desc    Add new class
// @route   POST /api/admin/classes
// @access  Private/Admin
router.post('/classes', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      name,
      trainerId,
      startTime,
      endTime,
      startDate,
      capacity,
      type,
      description,
      location,
      pricing
    } = req.body;

    // Verify trainer exists
    const trainer = await User.findById(trainerId);
    if (!trainer || trainer.role !== 'trainer') {
      return res.status(400).json({
        success: false,
        message: 'Invalid trainer selected'
      });
    }

    // Create class data
    const startDateObj = new Date(startDate);
    const dayOfWeek = startDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // Calculate duration in minutes
    const startTimeMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endTimeMinutes = endTime ? 
      parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]) : 
      startTimeMinutes + 60; // Default to 1 hour if no end time
    const duration = endTimeMinutes - startTimeMinutes;

    const classData = {
      name,
      trainer: trainerId,
      type: type || 'other',
      description,
      capacity: parseInt(capacity),
      duration: duration > 0 ? duration : 60, // Default to 60 minutes if calculation fails
      startDate: startDateObj,
      schedule: {
        dayOfWeek,
        startTime,
        endTime: endTime || startTime
      },
      location: {
        room: location || 'Main Gym'
      },
      pricing: {
        memberRate: pricing?.memberRate ? parseFloat(pricing.memberRate) : 0,
        dropInRate: pricing?.dropInRate ? parseFloat(pricing.dropInRate) : 0
      },
      isActive: true
    };

    const newClass = await Class.create(classData);
    
    // Populate trainer info for response
    await newClass.populate('trainer', 'firstName lastName email');

    // Create notification for the assigned trainer
    try {
      await Notification.createNotification({
        recipient: trainerId,
        sender: req.user.id,
        title: 'New Class Assigned',
        message: `You've been assigned to teach "${newClass.name}" starting ${startDateObj.toLocaleDateString()}. Check your schedule for details.`,
        type: 'class_scheduled',
        priority: 'medium',
        channels: ['in_app'],
        data: {
          classId: newClass._id,
          className: newClass.name,
          startDate: startDateObj
        }
      });
    } catch (notificationError) {
      console.error('Failed to create class assignment notification:', notificationError);
      // Don't fail the class creation if notification fails
    }

    res.status(201).json({
      success: true,
      data: newClass,
      message: 'Class created successfully'
    });
  } catch (error) {
    console.error('Error creating class:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create class',
      error: error.message
    });
  }
});

// @desc    Delete member
// @route   DELETE /api/admin/members/:id
// @access  Private/Admin
router.delete('/members/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const member = await User.findById(req.params.id);
    
    if (!member || member.role !== 'member') {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Soft delete - set isActive to false instead of actually deleting
    member.isActive = false;
    await member.save();

    res.status(200).json({
      success: true,
      message: 'Member deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete member',
      error: error.message
    });
  }
});

// @desc    Delete trainer
// @route   DELETE /api/admin/trainers/:id
// @access  Private/Admin
router.delete('/trainers/:id', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('🗑️ DELETE /api/admin/trainers/:id called with ID:', req.params.id);
    
    const trainer = await User.findById(req.params.id);
    console.log('👤 Found trainer:', trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Not found');
    
    if (!trainer || trainer.role !== 'trainer') {
      console.log('❌ Trainer not found or not a trainer');
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    // Check if trainer has active classes
    const activeClasses = await Class.countDocuments({ 
      trainer: req.params.id, 
      isActive: true 
    });
    console.log('📅 Active classes for trainer:', activeClasses);

    if (activeClasses > 0) {
      console.log('⚠️ Cannot delete trainer - has active classes');
      return res.status(400).json({
        success: false,
        message: `Cannot delete trainer. They have ${activeClasses} active classes. Please reassign or cancel these classes first.`
      });
    }

    // Soft delete - set isActive to false
    console.log('🔄 Setting trainer isActive to false...');
    trainer.isActive = false;
    await trainer.save();
    console.log('✅ Trainer deactivated successfully');

    res.status(200).json({
      success: true,
      message: 'Trainer deactivated successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting trainer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete trainer',
      error: error.message
    });
  }
});

// @desc    Delete class
// @route   DELETE /api/admin/classes/:id
// @access  Private/Admin
router.delete('/classes/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { force } = req.query; // Allow force delete via query parameter
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Get enrollment count from both fields
    const enrollmentCount = Math.max(
      classItem.currentEnrollment || 0,
      classItem.enrolledMembers?.length || 0
    );

    // Check if class has enrolled members (unless force delete)
    if (enrollmentCount > 0 && force !== 'true') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class "${classItem.name}". It has ${enrollmentCount} enrolled members. Please cancel their enrollments first or use force delete.`,
        enrolledCount: enrollmentCount,
        canForceDelete: true
      });
    }

    // If force delete, clear enrollments first
    if (force === 'true' && enrollmentCount > 0) {
      classItem.enrolledMembers = [];
      classItem.currentEnrollment = 0;
      console.log(`Force deleting class "${classItem.name}" and unenrolling ${enrollmentCount} members`);
    }

    // Soft delete - set isActive to false
    classItem.isActive = false;
    await classItem.save();

    res.status(200).json({
      success: true,
      message: force === 'true' && enrollmentCount > 0 
        ? `Class "${classItem.name}" deleted and ${enrollmentCount} members unenrolled`
        : `Class "${classItem.name}" deleted successfully`,
      unenrolledMembers: force === 'true' ? enrollmentCount : 0
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete class',
      error: error.message
    });
  }
});

module.exports = router;