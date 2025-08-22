const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    return false;
  }
};

// Create admin user
const createAdminUser = async () => {
  try {
    console.log('👤 Creating admin user...');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@gym.com' });
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      console.log('📧 Email: admin@gym.com');
      console.log('🔑 Password: admin123');
      return existingAdmin;
    }

    // Create new admin user
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@gym.com',
      password: 'admin123', // This will be hashed automatically by the User model
      phone: '+1234567890',
      role: 'admin',
      isActive: true,
      address: {
        street: '123 Gym Street',
        city: 'Fitness City',
        state: 'Active State',
        zipCode: '12345',
        country: 'Gym Country'
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@gym.com');
    console.log('🔑 Password: admin123');
    console.log('🆔 User ID:', adminUser._id);

    return adminUser;
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    throw error;
  }
};

// Create sample trainer
const createSampleTrainer = async () => {
  try {
    console.log('🏋️ Creating sample trainer...');

    const existingTrainer = await User.findOne({ email: 'trainer@gym.com' });
    if (existingTrainer) {
      console.log('ℹ️  Sample trainer already exists');
      return existingTrainer;
    }

    const trainer = await User.create({
      firstName: 'John',
      lastName: 'Trainer',
      email: 'trainer@gym.com',
      password: 'trainer123',
      phone: '+1234567891',
      role: 'trainer',
      specializations: ['Weight Training', 'Cardio', 'HIIT'],
      experience: 5,
      certifications: [
        {
          name: 'Certified Personal Trainer',
          issuedBy: 'NASM',
          issuedDate: new Date('2020-01-15'),
          expiryDate: new Date('2025-01-15')
        },
        {
          name: 'Nutrition Specialist',
          issuedBy: 'ACSM',
          issuedDate: new Date('2021-03-10'),
          expiryDate: new Date('2026-03-10')
        }
      ],
      isActive: true
    });

    console.log('✅ Sample trainer created!');
    console.log('📧 Email: trainer@gym.com');
    console.log('🔑 Password: trainer123');

    return trainer;
  } catch (error) {
    console.error('❌ Error creating trainer:', error.message);
    throw error;
  }
};

// Create sample member
const createSampleMember = async () => {
  try {
    console.log('👥 Creating sample member...');

    const existingMember = await User.findOne({ email: 'member@gym.com' });
    if (existingMember) {
      console.log('ℹ️  Sample member already exists');
      return existingMember;
    }

    const member = await User.create({
      firstName: 'Jane',
      lastName: 'Member',
      email: 'member@gym.com',
      password: 'member123',
      phone: '+1234567892',
      role: 'member',
      membershipType: 'premium',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'female',
      isActive: true
    });

    console.log('✅ Sample member created!');
    console.log('📧 Email: member@gym.com');
    console.log('🔑 Password: member123');

    return member;
  } catch (error) {
    console.error('❌ Error creating member:', error.message);
    throw error;
  }
};

// Main setup function
const setupInitialData = async () => {
  console.log('🚀 Setting up initial data...');
  console.log('=' .repeat(50));

  try {
    // Connect to database
    const connected = await connectDB();
    if (!connected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }

    // Create users
    await createAdminUser();
    await createSampleTrainer();
    await createSampleMember();

    // Display summary
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Initial setup completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('┌─────────────────────────────────────────┐');
    console.log('│ ADMIN LOGIN                             │');
    console.log('│ Email: admin@gym.com                    │');
    console.log('│ Password: admin123                      │');
    console.log('├─────────────────────────────────────────┤');
    console.log('│ TRAINER LOGIN                           │');
    console.log('│ Email: trainer@gym.com                  │');
    console.log('│ Password: trainer123                    │');
    console.log('├─────────────────────────────────────────┤');
    console.log('│ MEMBER LOGIN                            │');
    console.log('│ Email: member@gym.com                   │');
    console.log('│ Password: member123                     │');
    console.log('└─────────────────────────────────────────┘');
    
    console.log('\n🌐 Next steps:');
    console.log('1. Start your backend: npm run dev');
    console.log('2. Start your frontend: npm run dev (in Frontend folder)');
    console.log('3. Go to http://localhost:5173');
    console.log('4. Login with admin@gym.com / admin123');

    // Get collection stats
    const userCount = await User.countDocuments();
    console.log(`\n📊 Database Stats:`);
    console.log(`   Users: ${userCount}`);

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Run setup
setupInitialData();
