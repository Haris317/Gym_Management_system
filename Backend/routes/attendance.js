const express = require('express');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const { body, param, query, validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');
const QRCodeSession = require('../models/QRCodeSession');
const Class = require('../models/Class');
const User = require('../models/User');
const { protect, authorize, checkTrainerAccess } = require('../middleware/auth');
const { validateObjectId, handleValidationErrors } = require('../middleware/validation');
const { sensitiveOperationLimiter } = require('../middleware/rateLimiting');

const router = express.Router();

// @desc    Generate QR code for class attendance
// @route   POST /api/attendance/generate-qr/:classId
// @access  Private (Trainer/Admin)
router.post('/generate-qr/:classId', 
  protect, 
  authorize('trainer', 'admin'),
  [
    validateObjectId('classId'),
    body('sessionType').optional().isIn(['checkin', 'checkout', 'both']).withMessage('Invalid session type'),
    body('expiresInHours').optional().isInt({ min: 1, max: 24 }).withMessage('Expires in hours must be between 1 and 24'),
    body('maxUsage').optional().isInt({ min: 1, max: 500 }).withMessage('Max usage must be between 1 and 500'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { classId } = req.params;
      const { sessionType = 'both', expiresInHours = 2, maxUsage = 100 } = req.body;

      // Get class details
      const classDetails = await Class.findById(classId).populate('trainer', 'firstName lastName email');
      
      if (!classDetails) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      // Check if user is authorized to generate QR for this class
      if (req.user.role === 'trainer' && classDetails.trainer._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only generate QR codes for your own classes'
        });
      }

      // Check if there's already an active QR session for this class
      const existingSession = await QRCodeSession.getActiveSessionForClass(classId);
      
      if (existingSession) {
        // Return existing session if still valid
        if (existingSession.isValidForScanning()) {
          const qrCodeDataURL = await QRCode.toDataURL(existingSession.qrCode, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });

          return res.status(200).json({
            success: true,
            message: 'Active QR session found',
            data: {
              qrSession: existingSession,
              qrCodeImage: qrCodeDataURL,
              scanStats: existingSession.scanStats
            }
          });
        } else {
          // Deactivate expired session
          await existingSession.deactivate();
        }
      }

      // Generate new QR code
      const qrCode = QRCodeSession.generateQRCode();
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

      // Create QR session
      const qrSession = await QRCodeSession.create({
        class: classId,
        qrCode,
        generatedBy: req.user._id,
        expiresAt,
        sessionType,
        maxUsage,
        location: {
          room: classDetails.location?.room || 'Main Gym'
        },
        metadata: {
          classDate: new Date(),
          startTime: classDetails.schedule?.startTime,
          endTime: classDetails.schedule?.endTime,
          capacity: classDetails.capacity
        }
      });

      await qrSession.populate('class generatedBy');

      // Generate QR code image
      const qrCodeDataURL = await QRCode.toDataURL(qrCode, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      console.log(`✅ QR code generated for class: ${classDetails.name} by ${req.user.firstName} ${req.user.lastName}`);

      res.status(201).json({
        success: true,
        message: 'QR code generated successfully',
        data: {
          qrSession,
          qrCodeImage: qrCodeDataURL,
          scanInstructions: {
            message: 'Members can scan this QR code to mark attendance',
            validUntil: expiresAt,
            maxScans: maxUsage,
            sessionType
          }
        }
      });

    } catch (error) {
      console.error('❌ Generate QR code error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate QR code',
        error: error.message
      });
    }
  }
);

// @desc    Scan QR code for attendance
// @route   POST /api/attendance/scan-qr
// @access  Private (Member)
router.post('/scan-qr',
  protect,
  [
    body('qrCode').notEmpty().withMessage('QR code is required'),
    body('scanType').optional().isIn(['checkin', 'checkout']).withMessage('Invalid scan type'),
    body('location').optional(),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { qrCode, scanType = 'checkin', location } = req.body;
      const memberId = req.user._id;

      // Find QR session
      const qrSession = await QRCodeSession.findOne({ qrCode, isActive: true })
        .populate('class', 'name trainer capacity enrolledMembers')
        .populate('generatedBy', 'firstName lastName');

      if (!qrSession) {
        return res.status(404).json({
          success: false,
          message: 'Invalid or expired QR code'
        });
      }

      // Validate QR session
      if (!qrSession.isValidForScanning()) {
        return res.status(400).json({
          success: false,
          message: qrSession.isExpired() ? 'QR code has expired' : 'QR code has reached maximum usage limit'
        });
      }

      // Check if member is enrolled in the class
      const isEnrolled = qrSession.class.enrolledMembers.some(
        enrollment => enrollment.member.toString() === memberId.toString()
      );

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'You are not enrolled in this class'
        });
      }

      // Check if member already scanned for this type
      const existingScan = qrSession.scannedBy.find(scan => 
        scan.member.toString() === memberId.toString() && 
        scan.scanType === scanType
      );

      if (existingScan) {
        return res.status(400).json({
          success: false,
          message: `You have already ${scanType === 'checkin' ? 'checked in' : 'checked out'} for this session`
        });
      }

      // Record the scan
      await qrSession.recordScan(memberId, scanType, location);

      // Find or create attendance record
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let attendance = await Attendance.findOne({
        member: memberId,
        class: qrSession.class._id,
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      });

      if (!attendance) {
        // Create new attendance record
        attendance = await Attendance.create({
          member: memberId,
          memberName: `${req.user.firstName} ${req.user.lastName}`,
          class: qrSession.class._id,
          className: qrSession.class.name,
          trainer: qrSession.class.trainer,
          date: new Date(),
          scheduledStartTime: qrSession.metadata.startTime || '09:00',
          scheduledEndTime: qrSession.metadata.endTime || '10:00',
          attendanceMethod: 'qr_code',
          qrCode: {
            code: qrCode,
            scannedAt: new Date(),
            isUsed: true
          },
          location: {
            room: qrSession.location?.room,
            coordinates: location
          },
          markedBy: req.user._id
        });
      }

      // Update attendance based on scan type
      if (scanType === 'checkin') {
        attendance.checkInTime = new Date();
        attendance.status = 'present';
      } else if (scanType === 'checkout') {
        attendance.checkOutTime = new Date();
      }

      await attendance.save();

      console.log(`✅ ${scanType} recorded for member: ${req.user.firstName} ${req.user.lastName} in class: ${qrSession.class.name}`);

      res.status(200).json({
        success: true,
        message: `${scanType === 'checkin' ? 'Check-in' : 'Check-out'} successful`,
        data: {
          attendance,
          scanTime: new Date(),
          className: qrSession.class.name,
          sessionStats: qrSession.scanStats
        }
      });

    } catch (error) {
      console.error('❌ QR scan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process QR scan',
        error: error.message
      });
    }
  }
);

// @desc    Manual attendance marking (Trainer/Admin)
// @route   POST /api/attendance/manual
// @access  Private (Trainer/Admin)
router.post('/manual',
  protect,
  authorize('trainer', 'admin'),
  [
    body('memberId').isMongoId().withMessage('Valid member ID is required'),
    body('classId').isMongoId().withMessage('Valid class ID is required'),
    body('status').isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status'),
    body('date').optional().isISO8601().withMessage('Invalid date format'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { memberId, classId, status, date, notes, checkInTime, checkOutTime } = req.body;

      // Get class and verify trainer access
      const classDetails = await Class.findById(classId).populate('trainer');
      
      if (!classDetails) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      // Check trainer authorization
      if (req.user.role === 'trainer' && classDetails.trainer._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only mark attendance for your own classes'
        });
      }

      // Get member details
      const member = await User.findById(memberId);
      if (!member || member.role !== 'member') {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }

      // Check if member is enrolled
      const isEnrolled = classDetails.enrolledMembers.some(
        enrollment => enrollment.member.toString() === memberId.toString()
      );

      if (!isEnrolled) {
        return res.status(400).json({
          success: false,
          message: 'Member is not enrolled in this class'
        });
      }

      const attendanceDate = date ? new Date(date) : new Date();
      attendanceDate.setHours(0, 0, 0, 0);

      // Find or create attendance record
      let attendance = await Attendance.findOne({
        member: memberId,
        class: classId,
        date: {
          $gte: attendanceDate,
          $lt: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000)
        }
      });

      if (attendance) {
        // Update existing record
        attendance.status = status;
        attendance.notes = notes || attendance.notes;
        attendance.lastModifiedBy = req.user._id;
        
        if (checkInTime) attendance.checkInTime = new Date(checkInTime);
        if (checkOutTime) attendance.checkOutTime = new Date(checkOutTime);
        
      } else {
        // Create new record
        attendance = await Attendance.create({
          member: memberId,
          memberName: `${member.firstName} ${member.lastName}`,
          class: classId,
          className: classDetails.name,
          trainer: classDetails.trainer._id,
          trainerName: `${classDetails.trainer.firstName} ${classDetails.trainer.lastName}`,
          date: attendanceDate,
          scheduledStartTime: classDetails.schedule?.startTime || '09:00',
          scheduledEndTime: classDetails.schedule?.endTime || '10:00',
          status,
          attendanceMethod: 'manual',
          checkInTime: checkInTime ? new Date(checkInTime) : (status === 'present' ? new Date() : null),
          checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
          notes,
          markedBy: req.user._id,
          location: {
            room: classDetails.location?.room
          }
        });
      }

      await attendance.save();

      console.log(`✅ Manual attendance marked for ${member.firstName} ${member.lastName} in ${classDetails.name}: ${status}`);

      res.status(200).json({
        success: true,
        message: 'Attendance marked successfully',
        data: attendance
      });

    } catch (error) {
      console.error('❌ Manual attendance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark attendance',
        error: error.message
      });
    }
  }
);

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private
router.get('/',
  protect,
  [
    query('classId').optional().isMongoId().withMessage('Invalid class ID'),
    query('memberId').optional().isMongoId().withMessage('Invalid member ID'),
    query('trainerId').optional().isMongoId().withMessage('Invalid trainer ID'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
    query('status').optional().isIn(['present', 'absent', 'late', 'excused', 'cancelled']).withMessage('Invalid status'),
    query('period').optional().isString().withMessage('Period must be a string'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const {
        classId,
        memberId,
        trainerId,
        startDate,
        endDate,
        period,
        status,
        page = 1,
        limit = 20
      } = req.query;

      // Build query based on user role and filters
      let query = {};

      // Role-based filtering
      if (req.user.role === 'member') {
        query.member = req.user._id;
      } else if (req.user.role === 'trainer') {
        query.trainer = req.user._id;
      }

      // Apply additional filters
      if (classId) query.class = classId;
      if (memberId && req.user.role !== 'member') query.member = memberId;
      if (trainerId && req.user.role === 'admin') query.trainer = trainerId;
      if (status) query.status = status;
      
      // Handle period parameter (day, week, month, year)
      if (period && typeof period === 'string') {
        const now = new Date();
        let periodValue = 1; // Default to 1 unit
        let periodType = period;
        
        // Check if period has a value like 'month:3'
        if (period.includes(':')) {
          const [type, value] = period.split(':');
          periodType = type;
          periodValue = parseInt(value) || 1;
        }
        
        query.date = {};
        
        // Calculate start date based on period
        switch (periodType) {
          case 'day':
            query.date.$gte = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (periodValue - 1));
            break;
          case 'week':
            query.date.$gte = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (periodValue * 7));
            break;
          case 'month':
            query.date.$gte = new Date(now.getFullYear(), now.getMonth() - (periodValue - 1), 1);
            break;
          case 'year':
            query.date.$gte = new Date(now.getFullYear() - (periodValue - 1), 0, 1);
            break;
          default:
            // If invalid period, don't apply date filter
            delete query.date;
        }
        
        // Set end date to current date
        if (query.date) {
          query.date.$lte = now;
        }
      }

      // Date range filter
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      // Pagination
      const skip = (page - 1) * limit;

      // Execute query
      const attendance = await Attendance.find(query)
        .populate('member', 'firstName lastName email phone')
        .populate('class', 'name type schedule location')
        .populate('trainer', 'firstName lastName email')
        .populate('markedBy', 'firstName lastName role')
        .sort({ date: -1, checkInTime: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Attendance.countDocuments(query);

      // Ensure attendance is an array
      const attendanceData = Array.isArray(attendance) ? attendance : [];

      res.status(200).json({
        success: true,
        data: attendanceData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('❌ Get attendance error:', error);
      console.error('Query parameters:', req.query);
      console.error('Built query:', query);
      
      res.status(500).json({
        success: false,
        message: 'Failed to get attendance records',
        error: error.message,
        debug: process.env.NODE_ENV === 'development' ? {
          query: req.query,
          builtQuery: query,
          stack: error.stack
        } : undefined
      });
    }
  }
);

// @desc    Get attendance statistics
// @route   GET /api/attendance/stats
// @access  Private (Trainer/Admin)
router.get('/stats',
  protect,
  authorize('trainer', 'admin'),
  [
    query('classId').optional().isMongoId().withMessage('Invalid class ID'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { classId, startDate, endDate } = req.query;

      let matchQuery = {};

      // Role-based filtering
      if (req.user.role === 'trainer') {
        matchQuery.trainer = req.user._id;
      }

      if (classId) matchQuery.class = new mongoose.Types.ObjectId(classId);

      // Date range
      if (startDate || endDate) {
        matchQuery.date = {};
        if (startDate) matchQuery.date.$gte = new Date(startDate);
        if (endDate) matchQuery.date.$lte = new Date(endDate);
      }

      // Aggregate statistics
      const stats = await Attendance.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            presentCount: {
              $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
            },
            absentCount: {
              $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
            },
            lateCount: {
              $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
            },
            excusedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] }
            },
            qrCodeScans: {
              $sum: { $cond: [{ $eq: ['$attendanceMethod', 'qr_code'] }, 1, 0] }
            },
            manualEntries: {
              $sum: { $cond: [{ $eq: ['$attendanceMethod', 'manual'] }, 1, 0] }
            },
            avgDuration: {
              $avg: {
                $cond: [
                  { $and: ['$checkInTime', '$checkOutTime'] },
                  { $divide: [{ $subtract: ['$checkOutTime', '$checkInTime'] }, 1000 * 60] },
                  null
                ]
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalSessions: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        qrCodeScans: 0,
        manualEntries: 0,
        avgDuration: 0
      };

      // Calculate attendance rate
      result.attendanceRate = result.totalSessions > 0 
        ? ((result.presentCount + result.lateCount) / result.totalSessions * 100).toFixed(2)
        : 0;

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Get attendance stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get attendance statistics',
        error: error.message
      });
    }
  }
);

// @desc    Get active QR sessions (Trainer/Admin)
// @route   GET /api/attendance/qr-sessions
// @access  Private (Trainer/Admin)
router.get('/qr-sessions',
  protect,
  authorize('trainer', 'admin'),
  async (req, res) => {
    try {
      let query = { isActive: true, expiresAt: { $gt: new Date() } };

      // Filter by trainer for trainer role
      if (req.user.role === 'trainer') {
        query.generatedBy = req.user._id;
      }

      const sessions = await QRCodeSession.find(query)
        .populate('class', 'name type schedule location capacity')
        .populate('generatedBy', 'firstName lastName email')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: sessions
      });

    } catch (error) {
      console.error('❌ Get QR sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get QR sessions',
        error: error.message
      });
    }
  }
);

// @desc    Deactivate QR session
// @route   PUT /api/attendance/qr-sessions/:sessionId/deactivate
// @access  Private (Trainer/Admin)
router.put('/qr-sessions/:sessionId/deactivate',
  protect,
  authorize('trainer', 'admin'),
  [
    validateObjectId('sessionId'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      const session = await QRCodeSession.findById(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'QR session not found'
        });
      }

      // Check authorization
      if (req.user.role === 'trainer' && session.generatedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only deactivate your own QR sessions'
        });
      }

      await session.deactivate();

      res.status(200).json({
        success: true,
        message: 'QR session deactivated successfully'
      });

    } catch (error) {
      console.error('❌ Deactivate QR session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate QR session',
        error: error.message
      });
    }
  }
);

module.exports = router;