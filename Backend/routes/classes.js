const express = require('express');
const { body, validationResult } = require('express-validator');
const Class = require('../models/Class');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all available classes
// @route   GET /api/classes/available
// @access  Public
router.get('/available', async (req, res) => {
  try {
    const { type, trainer, date, limit = 10 } = req.query;

    // Build filter for available classes
    const filter = {
      isActive: true,
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: new Date() } }
      ]
    };

    // Add optional filters
    if (type) filter.type = type;
    if (trainer) filter.trainer = trainer;
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      filter.startDate = { $gte: startDate, $lt: endDate };
    }

    const classes = await Class.find(filter)
      .populate('trainer', 'firstName lastName email')
      .sort({ startDate: 1, 'schedule.startTime': 1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: classes,
      count: classes.length
    });
  } catch (error) {
    console.error('Get available classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available classes',
      error: error.message
    });
  }
});

// @desc    Get all classes (Admin/Trainer)
// @route   GET /api/classes
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { type, trainer, status, page = 1, limit = 10 } = req.query;

    // Build filter based on user role
    const filter = {};

    if (req.user.role === 'trainer') {
      filter.trainer = req.user.id;
    }
    // Admin can see all classes

    // Add optional filters
    if (type) filter.type = type;
    if (trainer && req.user.role === 'admin') filter.trainer = trainer;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const classes = await Class.find(filter)
      .populate('trainer', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Class.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: classes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classes',
      error: error.message
    });
  }
});

// @desc    Enroll in a class
// @route   POST /api/classes/:id/enroll
// @access  Private (Members only)
router.post('/:id/enroll', protect, async (req, res) => {
  try {
    const classId = req.params.id;
    const { memberId } = req.body;

    // Use the authenticated user's ID if no memberId provided
    const enrollMemberId = memberId || req.user.id;

    console.log('📝 Class enrollment request:', { classId, enrollMemberId, userRole: req.user.role });

    // Find the class
    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if class is active
    if (!classItem.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Class is not available for enrollment'
      });
    }

    // Check if member exists
    const member = await User.findById(enrollMemberId);
    if (!member || member.role !== 'member') {
      return res.status(400).json({
        success: false,
        message: 'Invalid member ID'
      });
    }

    // Use the built-in enrollment method
    try {
      const enrollmentResult = classItem.enrollMember(enrollMemberId);
      await classItem.save();

      if (enrollmentResult.status === 'waitlisted') {
        return res.status(200).json({
          success: true,
          message: 'Added to waitlist - class is currently full',
          data: {
            classId: classItem._id,
            className: classItem.name,
            status: 'waitlisted',
            enrolledCount: classItem.currentEnrollment,
            capacity: classItem.capacity,
            waitlistPosition: classItem.waitlist.length
          }
        });
      }
    } catch (enrollError) {
      return res.status(400).json({
        success: false,
        message: enrollError.message
      });
    }

    console.log('✅ Member enrolled successfully');

    res.status(200).json({
      success: true,
      message: 'Successfully enrolled in class',
      data: {
        classId: classItem._id,
        className: classItem.name,
        enrolledCount: classItem.currentEnrollment,
        capacity: classItem.capacity
      }
    });
  } catch (error) {
    console.error('❌ Class enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll in class',
      error: error.message
    });
  }
});

// @desc    Cancel class enrollment
// @route   DELETE /api/classes/:id/enroll
// @access  Private (Members only)
router.delete('/:id/enroll', protect, async (req, res) => {
  try {
    const classId = req.params.id;
    const { memberId } = req.body;

    // Use the authenticated user's ID if no memberId provided
    const cancelMemberId = memberId || req.user.id;

    console.log('🗑️ Class enrollment cancellation request:', { classId, cancelMemberId });

    // Find the class
    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if member is enrolled
    const isEnrolled = classItem.enrolledMembers.some(
      enrollment => enrollment.member.toString() === cancelMemberId.toString()
    );

    if (!isEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'Not enrolled in this class'
      });
    }

    // Use the built-in cancellation method
    classItem.cancelEnrollment(cancelMemberId);
    await classItem.save();

    console.log('✅ Enrollment cancelled successfully');

    res.status(200).json({
      success: true,
      message: 'Successfully cancelled enrollment',
      data: {
        classId: classItem._id,
        className: classItem.name,
        enrolledCount: classItem.currentEnrollment,
        capacity: classItem.capacity
      }
    });
  } catch (error) {
    console.error('❌ Cancel enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel enrollment',
      error: error.message
    });
  }
});

module.exports = router;
