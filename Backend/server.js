const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Security middleware with cross-origin policy for images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http://localhost:5002", "http://localhost:5173"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  }
}));

// Rate limiting - Increased limits for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration - Simplified and more permissive for development
const corsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Access-Token'
  ],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Additional CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,X-Access-Token');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization middleware
const { sanitizeInput } = require('./middleware/validation');
app.use(sanitizeInput);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'}`);
  next();
});

// ============ IMPORT MODELS ============
const User = require('./models/User');
const Class = require('./models/Class');
const Payment = require('./models/Payment');
const Plan = require('./models/Plan');
const WorkoutPlan = require('./models/WorkoutPlan');
const Attendance = require('./models/Attendance');
const RefreshToken = require('./models/RefreshToken');
const QRCodeSession = require('./models/QRCodeSession');
const Notification = require('./models/Notification');

// ============ IMPORT SERVICES ============
const tokenCleanupService = require('./services/tokenCleanup');

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const classCount = await Class.countDocuments();
    const paymentCount = await Payment.countDocuments();
    const planCount = await Plan.countDocuments();
    const attendanceCount = await Attendance.countDocuments();
    const qrSessionCount = await QRCodeSession.countDocuments();
    const notificationCount = await Notification.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Gym Management API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: mongoose.connection.readyState === 1 ? 'Connected to MongoDB' : 'MongoDB Disconnected',
      mongoStatus: mongoose.connection.readyState,
      collections: {
        users: userCount,
        classes: classCount,
        payments: paymentCount,
        plans: planCount,
        attendance: attendanceCount,
        qrSessions: qrSessionCount,
        notifications: notificationCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Generate sample notifications for testing (Development only)
app.post('/api/debug/generate-notifications/:userId', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only available in development mode'
      });
    }

    const userId = req.params.userId;
    const NotificationService = require('./services/notificationService');
    
    const count = await NotificationService.generateSampleNotifications(userId);
    
    res.status(200).json({
      success: true,
      message: `Generated ${count} sample notifications for user ${userId}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate sample notifications',
      error: error.message
    });
  }
});

// Debug endpoint to see all users
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').limit(10);
    res.status(200).json({
      success: true,
      users,
      count: users.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// Get plans for trainer (workout/diet plans)
app.get('/api/plans/trainer/:trainerId', async (req, res) => {
  try {
    const trainerId = req.params.trainerId;
    console.log('📋 Getting workout/diet plans for trainer:', trainerId);

    // Verify trainer exists
    const trainer = await User.findById(trainerId);
    if (!trainer || trainer.role !== 'trainer') {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    // Get trainer's workout and diet plans
    const plans = await WorkoutPlan.findByTrainer(trainerId);

    console.log(`✅ Found ${plans.length} plans for trainer`);

    res.status(200).json({
      success: true,
      data: plans,
      trainerInfo: {
        id: trainer._id,
        name: `${trainer.firstName} ${trainer.lastName}`,
        email: trainer.email
      }
    });
  } catch (error) {
    console.error('❌ Get trainer plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trainer plans',
      error: error.message
    });
  }
});

// Create new workout/diet plan (Trainer only)
app.post('/api/plans/trainer/:trainerId', async (req, res) => {
  try {
    const trainerId = req.params.trainerId;
    const { title, description, type, category, difficulty, duration, exercises, content, equipment, tags, assignToMembers } = req.body;

    console.log('📝 Creating new plan for trainer:', trainerId);
    console.log('📋 Full request body:', req.body);
    console.log('🔍 Extracted data:', { title, description, type, category, difficulty });

    // Verify trainer exists
    const trainer = await User.findById(trainerId);
    if (!trainer || trainer.role !== 'trainer') {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    // Validate required fields
    if (!title || !description || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and type are required'
      });
    }

    // Create plan data
    const planData = {
      title: title.trim(),
      description: description.trim(),
      type,
      category: category || 'general',
      difficulty: difficulty || 'beginner',
      trainer: trainerId,
      isActive: true,
      isPublic: true, // Make plans public by default so members can see them
      assignedMembers: [] // Initialize empty array for assigned members
    };

    // Add type-specific data
    if (type === 'workout') {
      planData.exercises = exercises || [];
      planData.duration = duration || 30;
      planData.equipment = equipment || [];
    } else if (type === 'diet') {
      planData.content = content || '';
    }

    if (tags) {
      planData.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
    }

    // Create the plan
    const newPlan = await WorkoutPlan.create(planData);
    await newPlan.populate('trainer', 'firstName lastName email');

    // If members are specified to assign the plan to, add them
    if (assignToMembers && Array.isArray(assignToMembers) && assignToMembers.length > 0) {
      console.log('🔗 Assigning plan to members:', assignToMembers);
      
      for (const memberId of assignToMembers) {
        try {
          // Verify member exists
          const member = await User.findById(memberId);
          if (member && member.role === 'member') {
            // Add member to assignedMembers array
            newPlan.assignedMembers.push({
              member: memberId,
              assignedAt: new Date(),
              status: 'active'
            });
          }
        } catch (err) {
          console.error(`Error assigning plan to member ${memberId}:`, err);
        }
      }
      
      // Save the updated plan with assigned members
      await newPlan.save();
    }

    console.log('✅ Plan created successfully:', newPlan._id);

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: newPlan
    });
  } catch (error) {
    console.error('❌ Create plan error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create plan',
      error: error.message
    });
  }
});

// Delete workout/diet plan (Trainer only)
app.delete('/api/plans/trainer/:trainerId/:planId', async (req, res) => {
  try {
    const { trainerId, planId } = req.params;
    console.log('🗑️ Deleting plan:', planId, 'for trainer:', trainerId);

    // Find the plan and verify it belongs to the trainer
    const plan = await WorkoutPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    if (plan.trainer.toString() !== trainerId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own plans'
      });
    }

    await WorkoutPlan.findByIdAndDelete(planId);
    console.log('✅ Plan deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plan',
      error: error.message
    });
  }
});

// Get public workout/diet plans for members
app.get('/api/plans/public', async (req, res) => {
  try {
    console.log('📋 Getting public workout/diet plans for members');

    // Get all public workout and diet plans
    const publicPlans = await WorkoutPlan.find({
      isPublic: true,
      isActive: true
    })
    .populate('trainer', 'firstName lastName email')
    .sort({ createdAt: -1 });

    console.log(`✅ Found ${publicPlans.length} public plans`);

    res.status(200).json({
      success: true,
      data: publicPlans
    });
  } catch (error) {
    console.error('❌ Get public plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get public plans',
      error: error.message
    });
  }
});

// Get all workout/diet plans for members (including assigned plans)
app.get('/api/plans/member/:memberId/workout-diet', async (req, res) => {
  try {
    const memberId = req.params.memberId;
    console.log('📋 Getting workout/diet plans for member:', memberId);

    // Get member's assigned plans
    const assignedPlans = await WorkoutPlan.find({
      'assignedMembers.member': memberId,
      'assignedMembers.status': 'active',
      isActive: true
    })
    .populate('trainer', 'firstName lastName email')
    .sort({ createdAt: -1 });

    // Get public plans (that member can view)
    const publicPlans = await WorkoutPlan.find({
      isPublic: true,
      isActive: true
    })
    .populate('trainer', 'firstName lastName email')
    .sort({ createdAt: -1 });

    // Combine and deduplicate plans
    const allPlans = [...assignedPlans];
    publicPlans.forEach(publicPlan => {
      const isAlreadyIncluded = allPlans.some(plan =>
        plan._id.toString() === publicPlan._id.toString()
      );
      if (!isAlreadyIncluded) {
        allPlans.push(publicPlan);
      }
    });

    console.log(`✅ Found ${allPlans.length} plans for member (${assignedPlans.length} assigned, ${publicPlans.length} public)`);

    res.status(200).json({
      success: true,
      data: allPlans,
      memberInfo: {
        assignedCount: assignedPlans.length,
        publicCount: publicPlans.length,
        totalCount: allPlans.length
      }
    });
  } catch (error) {
    console.error('❌ Get member workout/diet plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get member plans',
      error: error.message
    });
  }
});

// ============ ROUTES ============
// Authentication routes
app.use('/api/auth', require('./routes/auth'));

// Payment routes
app.use('/api/payments', require('./routes/payments'));

// Stripe payment routes
app.use('/api/stripe', require('./routes/stripe'));

// Notification routes
app.use('/api/notifications', require('./routes/notifications'));

// Other routes
app.use('/api/classes', require('./routes/classes'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/trainers', require('./routes/trainers'));

// Static files with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Specific route for profile images with enhanced CORS
app.get('/uploads/profiles/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'uploads', 'profiles', filename);
  
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  // Check if file exists
  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    res.status(404).json({ success: false, message: 'Image not found' });
  }
});

// ============ ADMIN MANAGEMENT ENDPOINTS ============
app.use('/api/admin', require('./routes/admin'));

// Admin dashboard stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalMembers = await User.countDocuments({ role: 'member' });
    const totalTrainers = await User.countDocuments({ role: 'trainer' });
    const totalClasses = await Class.countDocuments();

    // Calculate monthly revenue from completed payments
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyPayments = await Payment.find({
      paymentStatus: 'completed',
      paidDate: { $gte: startOfMonth }
    });

    const monthlyRevenue = monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        totalMembers,
        totalTrainers,
        totalClasses,
        monthlyRevenue: monthlyRevenue.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin statistics',
      error: error.message
    });
  }
});

// Get all members (Admin only)
app.get('/api/admin/members', async (req, res) => {
  try {
    const members = await User.find({ role: 'member' })
      .populate('assignedTrainer', 'firstName lastName email')
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: members
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch members',
      error: error.message
    });
  }
});

// Get all trainers (Admin only)
app.get('/api/admin/trainers', async (req, res) => {
  try {
    const trainers = await User.find({ role: 'trainer' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: trainers
    });
  } catch (error) {
    console.error('Get trainers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainers',
      error: error.message
    });
  }
});

// Get all classes (Admin only)
app.get('/api/admin/classes', async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('trainer', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: classes
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

// Get all payments (Admin only)
app.get('/api/admin/payments', async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('member', 'firstName lastName email')
      .populate('plan', 'name type')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
});

// Add new member
app.post('/api/admin/members', async (req, res) => {
  try {
    console.log('📝 Received member creation request:', req.body);

    const { firstName, lastName, email, phone, membershipType, dateOfBirth, gender } = req.body;

    // Detailed validation logging
    console.log('🔍 Validation check:');
    console.log('  firstName:', firstName);
    console.log('  lastName:', lastName);
    console.log('  email:', email);
    console.log('  phone:', phone);

    if (!firstName || !lastName || !email || !phone) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and phone are required',
        received: { firstName, lastName, email, phone }
      });
    }

    // Check if user already exists
    console.log('🔍 Checking if user exists with email:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Prepare user data
    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password: 'Member123!', // Strong default password
      role: 'member',
      membershipType: membershipType || 'basic',
      isActive: true
    };

    // Add optional fields if provided
    if (dateOfBirth) userData.dateOfBirth = new Date(dateOfBirth);
    if (gender) userData.gender = gender;

    console.log('📝 Creating user with data:', { ...userData, password: '[HIDDEN]' });

    // Create new member
    const newMember = await User.create(userData);
    console.log('✅ Member created successfully:', newMember._id);

    // Remove password from response
    const memberResponse = newMember.toObject();
    delete memberResponse.password;

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      data: memberResponse
    });
  } catch (error) {
    console.error('❌ Add member error:', error);

    // Detailed error logging
    if (error.name === 'ValidationError') {
      console.error('📋 Validation errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`  ${key}: ${error.errors[key].message}`);
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    if (error.code === 11000) {
      console.error('📧 Duplicate email error');
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add member',
      error: error.message
    });
  }
});

// Add new trainer
app.post('/api/admin/trainers', async (req, res) => {
  try {
    console.log('🏋️ Received trainer creation request:', req.body);

    const { firstName, lastName, email, phone, specializations, experience, certifications } = req.body;

    // Detailed validation logging
    console.log('🔍 Trainer validation check:');
    console.log('  firstName:', firstName);
    console.log('  lastName:', lastName);
    console.log('  email:', email);
    console.log('  phone:', phone);
    console.log('  specializations:', specializations);

    if (!firstName || !lastName || !email || !phone) {
      console.log('❌ Trainer validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and phone are required',
        received: { firstName, lastName, email, phone }
      });
    }

    // Check if user already exists
    console.log('🔍 Checking if trainer exists with email:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ Trainer already exists');
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Prepare trainer data
    const trainerData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password: 'Trainer123!', // Strong default password
      role: 'trainer',
      specializations: Array.isArray(specializations) ? specializations : (specializations ? specializations.split(',').map(s => s.trim()) : []),
      experience: experience ? parseInt(experience) : 0,
      certifications: Array.isArray(certifications) ? certifications : (certifications ? certifications.split(',').map(s => s.trim()) : []),
      isActive: true
    };

    console.log('📝 Creating trainer with data:', { ...trainerData, password: '[HIDDEN]' });

    // Create new trainer
    const newTrainer = await User.create(trainerData);
    console.log('✅ Trainer created successfully:', newTrainer._id);

    // Remove password from response
    const trainerResponse = newTrainer.toObject();
    delete trainerResponse.password;

    res.status(201).json({
      success: true,
      message: 'Trainer added successfully',
      data: trainerResponse
    });
  } catch (error) {
    console.error('❌ Add trainer error:', error);

    // Detailed error logging
    if (error.name === 'ValidationError') {
      console.error('📋 Trainer validation errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`  ${key}: ${error.errors[key].message}`);
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    if (error.code === 11000) {
      console.error('📧 Duplicate trainer email error');
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add trainer',
      error: error.message
    });
  }
});

// Add new class
app.post('/api/admin/classes', async (req, res) => {
  try {
    console.log('🏫 Creating new class with data:', req.body);
    const NotificationService = require('./services/notificationService');

    const {
      name,
      trainerId,
      description,
      type,
      startTime,
      endTime,
      capacity,
      location,
      pricing,
      startDate,
      endDate,
      isRecurring,
      schedule
    } = req.body;

    // Detailed validation logging
    console.log('🔍 Class validation check:');
    console.log('  name:', name);
    console.log('  trainerId:', trainerId);
    console.log('  startTime:', startTime);
    console.log('  capacity:', capacity);
    console.log('  startDate:', startDate);
    console.log('  type:', type);

    // Validation
    if (!name || !trainerId || !startTime || !capacity || !startDate) {
      console.log('❌ Class validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Name, trainer, start time, capacity, and start date are required',
        received: { name, trainerId, startTime, capacity, startDate }
      });
    }

    // Verify trainer exists
    const trainer = await User.findById(trainerId);
    if (!trainer || trainer.role !== 'trainer') {
      return res.status(400).json({
        success: false,
        message: 'Invalid trainer ID'
      });
    }

    // Calculate duration from start and end time
    const calculateDuration = (start, end) => {
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return endMinutes - startMinutes;
    };

    // Get day of week from startDate
    const getDayOfWeek = (dateString) => {
      const date = new Date(dateString);
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      return days[date.getDay()];
    };

    const finalEndTime = endTime ? endTime.trim() : startTime.trim();
    const duration = calculateDuration(startTime.trim(), finalEndTime);
    const dayOfWeek = getDayOfWeek(startDate);

    // Validate duration
    if (duration <= 0) {
      console.log('❌ Invalid duration - end time must be after start time');
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time',
        received: { startTime: startTime.trim(), endTime: finalEndTime, duration }
      });
    }

    // Prepare class data
    const classData = {
      name: name.trim(),
      description: description || `${name.trim()} class`, // Provide default description
      type: type || 'other',
      trainer: trainerId,
      schedule: {
        dayOfWeek: dayOfWeek, // Required field
        startTime: startTime.trim(),
        endTime: finalEndTime,
        daysOfWeek: schedule?.daysOfWeek || [dayOfWeek],
        isRecurring: isRecurring || false
      },
      duration: duration, // Required field
      capacity: parseInt(capacity),
      location: {
        room: location || 'Main Gym'
      },
      pricing: {
        memberRate: pricing?.memberRate || 0,
        dropInRate: pricing?.dropInRate ? parseFloat(pricing.dropInRate) : 0
      },
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      isActive: true
    };

    console.log('📝 Creating class with data:', { ...classData, trainer: '[TRAINER_ID]' });

    // Create new class
    const newClass = await Class.create(classData);

    // Populate trainer info for response
    await newClass.populate('trainer', 'firstName lastName email');

    console.log('✅ New class created:', newClass);

    // Create notifications for all members about the new class
    try {
      const members = await User.find({ role: 'member', isActive: true }).select('_id');
      const memberIds = members.map(member => member._id);
      
      if (memberIds.length > 0) {
        await NotificationService.notifyClassScheduled(newClass, memberIds);
        console.log(`📢 Sent class notifications to ${memberIds.length} members`);
      }
    } catch (notificationError) {
      console.error('Failed to send class notifications:', notificationError);
      // Don't fail the class creation if notifications fail
    }

    res.status(201).json({
      success: true,
      message: 'Class added successfully',
      data: newClass
    });

  } catch (error) {
    console.error('❌ Error creating class:', error);

    // Detailed error logging
    if (error.name === 'ValidationError') {
      console.error('📋 Class validation errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`  ${key}: ${error.errors[key].message}`);
      });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    if (error.name === 'CastError') {
      console.error('🔄 Cast error - invalid data type');
      return res.status(400).json({
        success: false,
        message: 'Invalid data format provided'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add class',
      error: error.message
    });
  }
});

// Delete member
app.delete('/api/admin/members/:id', async (req, res) => {
  try {
    const memberId = req.params.id;
    console.log('🗑️ Deleting member with ID:', memberId);

    const member = await User.findById(memberId);
    if (!member || member.role !== 'member') {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    await User.findByIdAndDelete(memberId);
    console.log('✅ Member deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete member',
      error: error.message
    });
  }
});

// Delete trainer
app.delete('/api/admin/trainers/:id', async (req, res) => {
  try {
    const trainerId = req.params.id;
    console.log('🗑️ Deleting trainer with ID:', trainerId);

    const trainer = await User.findById(trainerId);
    if (!trainer || trainer.role !== 'trainer') {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    await User.findByIdAndDelete(trainerId);
    console.log('✅ Trainer deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Trainer deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete trainer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete trainer',
      error: error.message
    });
  }
});

// Delete class
app.delete('/api/admin/classes/:id', async (req, res) => {
  try {
    const classId = req.params.id;
    console.log('🗑️ Deleting class with ID:', classId);

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    await Class.findByIdAndDelete(classId);
    console.log('✅ Class deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete class error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete class',
      error: error.message
    });
  }
});

// ============ MEMBER/TRAINER ENDPOINTS ============

// Get available classes - moved to /api/classes/available route

// Get plans for member (available plans + current membership)
app.get('/api/plans/member/:memberId', async (req, res) => {
  try {
    const memberId = req.params.memberId;
    console.log('📋 Getting plans for member:', memberId);

    // Get the member's current information
    const member = await User.findById(memberId).select('membershipType membershipStartDate membershipEndDate firstName lastName email');
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Get all available plans
    const availablePlans = await Plan.find({ 'availability.isActive': true })
      .sort({ sortOrder: 1, 'pricing.amount': 1 });

    // Prepare response with member's current membership and available plans
    const response = {
      currentMembership: {
        type: member.membershipType,
        startDate: member.membershipStartDate,
        endDate: member.membershipEndDate,
        isActive: member.membershipEndDate ? new Date() < member.membershipEndDate : true
      },
      availablePlans: availablePlans,
      memberInfo: {
        id: member._id,
        name: `${member.firstName} ${member.lastName}`,
        email: member.email
      }
    };

    console.log('✅ Member plans retrieved successfully');

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('❌ Get member plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get member plans',
      error: error.message
    });
  }
});

// Attendance routes are handled in ./routes/attendance.js

// Get subscription plans
app.get('/api/subscriptions/plans', async (req, res) => {
  try {
    const plans = await Plan.find({ 'availability.isActive': true })
      .sort({ sortOrder: 1, 'pricing.amount': 1 });

    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
      error: error.message
    });
  }
});

// Get payment history
app.get('/api/payments/history/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;

    // Verify member exists
    const member = await User.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const memberPayments = await Payment.find({ member: memberId })
      .populate('plan', 'name type')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: memberPayments
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
});

// Book a class - moved to /api/classes/:id/enroll route

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('🌐 MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');

    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
    });

    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('🔧 Please check your MONGO_URI in .env file');
    console.error('🌐 Make sure your MongoDB Atlas cluster is running and accessible');

    // Log more specific error information
    if (error.message.includes('ENOTFOUND')) {
      console.error('🌐 Network error: Cannot reach MongoDB server');
    } else if (error.message.includes('authentication failed')) {
      console.error('🔐 Authentication error: Check username/password');
    } else if (error.message.includes('timeout')) {
      console.error('⏰ Connection timeout: Check network connectivity');
    }

    return false;
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 5002;

const startServer = async () => {
  try {
    const dbConnected = await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);

      if (dbConnected) {
        console.log(`✅ MongoDB Status: Connected`);
        console.log(`💾 Data storage: MongoDB + Dynamic arrays`);
        
        // Start token cleanup service
        tokenCleanupService.startScheduledCleanup();
      } else {
        console.log(`⚠️  MongoDB Status: Disconnected`);
        console.log(`💾 Data storage: Dynamic arrays only (data will reset on restart)`);
        console.log(`💡 To connect to MongoDB:`);
        console.log(`   1. Install MongoDB: https://www.mongodb.com/try/download/community`);
        console.log(`   2. Start MongoDB service`);
        console.log(`   3. Update MONGODB_URI in .env file`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', err);
  // Don't exit in development, just log the error
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

startServer();

module.exports = app;

module.exports = app;
