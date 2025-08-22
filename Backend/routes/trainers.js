const express = require('express');
const User = require('../models/User');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Middleware to ensure only trainers can access these routes
const trainerOnly = (req, res, next) => {
  if (req.user.role !== 'trainer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Trainer role required.'
    });
  }
  next();
};

// @desc    Get trainer's assigned members
// @route   GET /api/trainers/my-members
// @access  Private (Trainer only)
router.get('/my-members', protect, trainerOnly, async (req, res) => {
  try {
    const trainerId = req.user.id;

    // Get all members assigned to this trainer
    const assignedMembers = await User.find({
      role: 'member',
      assignedTrainer: trainerId,
      isActive: true
    }).select('firstName lastName email phone membershipType membershipStartDate createdAt');

    res.status(200).json({
      success: true,
      data: assignedMembers,
      count: assignedMembers.length
    });
  } catch (error) {
    console.error('Get trainer members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assigned members',
      error: error.message
    });
  }
});

// @desc    Get trainer's classes
// @route   GET /api/trainers/my-classes
// @access  Private (Trainer only)
router.get('/my-classes', protect, trainerOnly, async (req, res) => {
  try {
    const trainerId = req.user.id;
    const { period = 'all' } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'today':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        dateFilter = {
          startDate: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        };
        break;
      case 'week':
        const startOfWeek = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
        const endOfWeek = new Date(startOfWeek.getTime() + (7 * 24 * 60 * 60 * 1000));
        dateFilter = {
          startDate: {
            $gte: startOfWeek,
            $lt: endOfWeek
          }
        };
        break;
      case 'upcoming':
        dateFilter = {
          startDate: { $gte: now }
        };
        break;
      default:
        // All classes
        break;
    }

    const classes = await Class.find({
      trainer: trainerId,
      ...dateFilter
    }).populate('trainer', 'firstName lastName email')
      .sort({ startDate: 1 });

    res.status(200).json({
      success: true,
      data: classes,
      count: classes.length
    });
  } catch (error) {
    console.error('Get trainer classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trainer classes',
      error: error.message
    });
  }
});

// @desc    Get trainer's dashboard stats
// @route   GET /api/trainers/stats
// @access  Private (Trainer only)
router.get('/stats', protect, trainerOnly, async (req, res) => {
  try {
    const trainerId = req.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Get assigned members count
    const totalAssignedMembers = await User.countDocuments({
      role: 'member',
      assignedTrainer: trainerId,
      isActive: true
    });

    // Get today's classes count
    const todayClasses = await Class.countDocuments({
      trainer: trainerId,
      startDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    // Get completed sessions this month
    const completedSessions = await Attendance.countDocuments({
      trainer: trainerId,
      status: 'present',
      date: { $gte: startOfMonth }
    });

    // Get total classes
    const totalClasses = await Class.countDocuments({
      trainer: trainerId
    });

    res.status(200).json({
      success: true,
      data: {
        totalAssignedMembers,
        todayClasses,
        completedSessions,
        totalClasses
      }
    });
  } catch (error) {
    console.error('Get trainer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trainer statistics',
      error: error.message
    });
  }
});

// @desc    Get trainer's attendance records
// @route   GET /api/trainers/attendance
// @access  Private (Trainer only)
router.get('/attendance', protect, trainerOnly, async (req, res) => {
  try {
    const trainerId = req.user.id;
    const { period = 'month', memberId } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'week':
        const startOfWeek = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
        dateFilter = { date: { $gte: startOfWeek } };
        break;
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { date: { $gte: startOfMonth } };
        break;
      case 'all':
      default:
        break;
    }

    let query = {
      trainer: trainerId,
      ...dateFilter
    };

    if (memberId) {
      query.member = memberId;
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('member', 'firstName lastName email')
      .populate('class', 'name startDate')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: attendanceRecords,
      count: attendanceRecords.length
    });
  } catch (error) {
    console.error('Get trainer attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance records',
      error: error.message
    });
  }
});

module.exports = router;