const mongoose = require('mongoose');
const Class = require('./models/Class');
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

// Sample classes data
const createSampleClasses = async () => {
  try {
    console.log('🏋️ Creating sample classes...');

    // Find a trainer to assign classes to
    let trainer = await User.findOne({ role: 'trainer' });
    if (!trainer) {
      console.log('⚠️  No trainer found, creating sample trainer...');
      trainer = await User.create({
        firstName: 'Sarah',
        lastName: 'Wilson',
        email: 'sarah.trainer@gym.com',
        password: 'trainer123',
        phone: '+1234567893',
        role: 'trainer',
        specializations: ['Yoga', 'Pilates', 'HIIT'],
        experience: 3,
        certifications: ['Yoga Alliance RYT-200', 'HIIT Certified'],
        isActive: true
      });
    }

    // Clear existing classes
    await Class.deleteMany({});
    console.log('🗑️  Cleared existing classes');

    const sampleClasses = [
      {
        name: 'Morning Yoga',
        description: 'Start your day with a peaceful yoga session focusing on flexibility and mindfulness.',
        type: 'yoga',
        trainer: trainer._id,
        schedule: {
          startTime: '08:00',
          endTime: '09:00',
          daysOfWeek: ['monday', 'wednesday', 'friday'],
          isRecurring: true
        },
        capacity: 20,
        currentEnrollment: 0,
        location: {
          room: 'Yoga Studio',
          floor: 'Ground Floor'
        },
        pricing: {
          memberRate: 0,
          dropInRate: 15
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        isActive: true
      },
      {
        name: 'HIIT Training',
        description: 'High-intensity interval training to boost your metabolism and build strength.',
        type: 'hiit',
        trainer: trainer._id,
        schedule: {
          startTime: '10:00',
          endTime: '11:00',
          daysOfWeek: ['tuesday', 'thursday', 'saturday'],
          isRecurring: true
        },
        capacity: 15,
        currentEnrollment: 0,
        location: {
          room: 'Main Gym',
          floor: 'Ground Floor'
        },
        pricing: {
          memberRate: 0,
          dropInRate: 20
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      {
        name: 'Evening Pilates',
        description: 'Wind down with a relaxing pilates class focusing on core strength and flexibility.',
        type: 'pilates',
        trainer: trainer._id,
        schedule: {
          startTime: '18:00',
          endTime: '19:00',
          daysOfWeek: ['monday', 'wednesday', 'friday'],
          isRecurring: true
        },
        capacity: 18,
        currentEnrollment: 0,
        location: {
          room: 'Pilates Studio',
          floor: 'First Floor'
        },
        pricing: {
          memberRate: 0,
          dropInRate: 18
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      {
        name: 'Strength Training',
        description: 'Build muscle and increase strength with guided weight training.',
        type: 'strength',
        trainer: trainer._id,
        schedule: {
          startTime: '07:00',
          endTime: '08:00',
          daysOfWeek: ['tuesday', 'thursday', 'saturday'],
          isRecurring: true
        },
        capacity: 12,
        currentEnrollment: 0,
        location: {
          room: 'Weight Room',
          floor: 'Ground Floor'
        },
        pricing: {
          memberRate: 0,
          dropInRate: 25
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      {
        name: 'Cardio Blast',
        description: 'High-energy cardio workout to improve cardiovascular health.',
        type: 'cardio',
        trainer: trainer._id,
        schedule: {
          startTime: '19:00',
          endTime: '20:00',
          daysOfWeek: ['monday', 'wednesday', 'friday'],
          isRecurring: true
        },
        capacity: 25,
        currentEnrollment: 0,
        location: {
          room: 'Cardio Room',
          floor: 'First Floor'
        },
        pricing: {
          memberRate: 0,
          dropInRate: 15
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      {
        name: 'Weekend CrossFit',
        description: 'Intense CrossFit workout combining strength, cardio, and functional movements.',
        type: 'crossfit',
        trainer: trainer._id,
        schedule: {
          startTime: '09:00',
          endTime: '10:30',
          daysOfWeek: ['saturday', 'sunday'],
          isRecurring: true
        },
        capacity: 10,
        currentEnrollment: 0,
        location: {
          room: 'CrossFit Box',
          floor: 'Ground Floor'
        },
        pricing: {
          memberRate: 5,
          dropInRate: 30
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    ];

    // Create classes
    const createdClasses = await Class.insertMany(sampleClasses);
    console.log(`✅ Successfully created ${createdClasses.length} classes`);

    // Display created classes
    createdClasses.forEach(cls => {
      console.log(`   - ${cls.name}: ${cls.schedule.daysOfWeek.join(', ')} at ${cls.schedule.startTime}`);
    });

    return createdClasses;
  } catch (error) {
    console.error('❌ Error creating classes:', error.message);
    throw error;
  }
};

// Main seed function
const seedClasses = async () => {
  console.log('🌱 Starting to seed classes...');
  console.log('=' .repeat(50));

  try {
    // Connect to database
    const connected = await connectDB();
    if (!connected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }

    // Create classes
    await createSampleClasses();

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Class seeding completed successfully!');
    console.log('\n📋 Available Classes:');
    console.log('- Morning Yoga (Mon, Wed, Fri at 8:00 AM)');
    console.log('- HIIT Training (Tue, Thu, Sat at 10:00 AM)');
    console.log('- Evening Pilates (Mon, Wed, Fri at 6:00 PM)');
    console.log('- Strength Training (Tue, Thu, Sat at 7:00 AM)');
    console.log('- Cardio Blast (Mon, Wed, Fri at 7:00 PM)');
    console.log('- Weekend CrossFit (Sat, Sun at 9:00 AM)');

    console.log('\n🌐 Next steps:');
    console.log('1. Start your backend: npm run dev');
    console.log('2. Test the classes endpoint: GET /api/classes/available');
    console.log('3. Login to your frontend and check the member dashboard');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
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

// Run seeder
seedClasses();
