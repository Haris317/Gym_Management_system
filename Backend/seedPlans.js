const mongoose = require('mongoose');
const Plan = require('./models/Plan');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Default plans data
const defaultPlans = [
  {
    name: 'Basic Monthly',
    description: 'Perfect for beginners who want to start their fitness journey',
    type: 'membership',
    category: 'basic',
    pricing: {
      amount: 29.99,
      currency: 'USD',
      billingCycle: 'monthly'
    },
    duration: {
      value: 1,
      unit: 'months'
    },
    features: [
      { name: 'Gym Access', included: true },
      { name: 'Basic Equipment', included: true },
      { name: 'Locker Room Access', included: true }
    ],
    access: {
      gymAccess: true,
      equipmentAccess: ['cardio', 'strength', 'locker_room'],
      classAccess: {
        unlimited: false,
        monthlyLimit: 2
      }
    },
    availability: {
      isActive: true,
      maxMembers: 500
    },
    sortOrder: 1
  },
  {
    name: 'Premium Monthly',
    description: 'Great for regular gym-goers who want more flexibility',
    type: 'membership',
    category: 'premium',
    pricing: {
      amount: 49.99,
      currency: 'USD',
      billingCycle: 'monthly'
    },
    duration: {
      value: 1,
      unit: 'months'
    },
    features: [
      { name: 'Gym Access', included: true },
      { name: 'All Equipment', included: true },
      { name: 'Group Classes', included: true, limit: 10 },
      { name: 'Locker Room Access', included: true },
      { name: 'Guest Pass', included: true, limit: 2 }
    ],
    access: {
      gymAccess: true,
      equipmentAccess: ['cardio', 'strength', 'free_weights', 'locker_room'],
      classAccess: {
        unlimited: false,
        monthlyLimit: 10
      }
    },
    availability: {
      isActive: true,
      maxMembers: 300
    },
    sortOrder: 2,
    isPopular: true
  },
  {
    name: 'VIP Monthly',
    description: 'Ultimate fitness experience with all premium features',
    type: 'membership',
    category: 'vip',
    pricing: {
      amount: 99.99,
      currency: 'USD',
      billingCycle: 'monthly'
    },
    duration: {
      value: 1,
      unit: 'months'
    },
    features: [
      { name: 'Gym Access', included: true, unlimited: true },
      { name: 'All Equipment', included: true, unlimited: true },
      { name: 'Unlimited Group Classes', included: true, unlimited: true },
      { name: 'Personal Training', included: true, limit: 4 },
      { name: 'Nutrition Consultation', included: true, limit: 2 },
      { name: 'Pool & Sauna Access', included: true },
      { name: 'Guest Passes', included: true, limit: 5 }
    ],
    access: {
      gymAccess: true,
      equipmentAccess: ['cardio', 'strength', 'free_weights', 'pool', 'sauna', 'steam_room', 'locker_room'],
      classAccess: {
        unlimited: true
      },
      personalTraining: {
        included: true,
        sessionsPerMonth: 4
      },
      nutritionConsultation: {
        included: true,
        sessionsPerMonth: 2
      }
    },
    availability: {
      isActive: true,
      maxMembers: 100
    },
    sortOrder: 3
  },
  {
    name: 'Basic Annual',
    description: 'Save money with our annual basic membership',
    type: 'membership',
    category: 'basic',
    pricing: {
      amount: 299.99,
      currency: 'USD',
      billingCycle: 'yearly',
      discountedPrice: 299.99 // 16% discount from monthly
    },
    duration: {
      value: 1,
      unit: 'years'
    },
    features: [
      { name: 'Gym Access', included: true },
      { name: 'Basic Equipment', included: true },
      { name: 'Locker Room Access', included: true },
      { name: '2 Months Free', included: true }
    ],
    access: {
      gymAccess: true,
      equipmentAccess: ['cardio', 'strength', 'locker_room'],
      classAccess: {
        unlimited: false,
        monthlyLimit: 2
      }
    },
    availability: {
      isActive: true,
      maxMembers: 500
    },
    sortOrder: 4
  },
  {
    name: 'Premium Annual',
    description: 'Best value for serious fitness enthusiasts',
    type: 'membership',
    category: 'premium',
    pricing: {
      amount: 499.99,
      currency: 'USD',
      billingCycle: 'yearly',
      discountedPrice: 499.99 // 17% discount from monthly
    },
    duration: {
      value: 1,
      unit: 'years'
    },
    features: [
      { name: 'Gym Access', included: true },
      { name: 'All Equipment', included: true },
      { name: 'Group Classes', included: true, limit: 10 },
      { name: 'Locker Room Access', included: true },
      { name: 'Guest Pass', included: true, limit: 2 },
      { name: '2 Months Free', included: true }
    ],
    access: {
      gymAccess: true,
      equipmentAccess: ['cardio', 'strength', 'free_weights', 'locker_room'],
      classAccess: {
        unlimited: false,
        monthlyLimit: 10
      }
    },
    availability: {
      isActive: true,
      maxMembers: 300
    },
    sortOrder: 5
  },
  {
    name: 'VIP Annual',
    description: 'Ultimate annual membership with maximum savings',
    type: 'membership',
    category: 'vip',
    pricing: {
      amount: 999.99,
      currency: 'USD',
      billingCycle: 'yearly',
      discountedPrice: 999.99 // 17% discount from monthly
    },
    duration: {
      value: 1,
      unit: 'years'
    },
    features: [
      { name: 'Gym Access', included: true, unlimited: true },
      { name: 'All Equipment', included: true, unlimited: true },
      { name: 'Unlimited Group Classes', included: true, unlimited: true },
      { name: 'Personal Training', included: true, limit: 4 },
      { name: 'Nutrition Consultation', included: true, limit: 2 },
      { name: 'Pool & Sauna Access', included: true },
      { name: 'Guest Passes', included: true, limit: 5 },
      { name: '2 Months Free', included: true }
    ],
    access: {
      gymAccess: true,
      equipmentAccess: ['cardio', 'strength', 'free_weights', 'pool', 'sauna', 'steam_room', 'locker_room'],
      classAccess: {
        unlimited: true
      },
      personalTraining: {
        included: true,
        sessionsPerMonth: 4
      },
      nutritionConsultation: {
        included: true,
        sessionsPerMonth: 2
      }
    },
    availability: {
      isActive: true,
      maxMembers: 100
    },
    sortOrder: 6
  }
];

// Seed function
const seedPlans = async () => {
  try {
    console.log('🌱 Starting to seed plans...');

    // Clear existing plans
    await Plan.deleteMany({});
    console.log('🗑️  Cleared existing plans');

    // Insert new plans
    const createdPlans = await Plan.insertMany(defaultPlans);
    console.log(`✅ Successfully created ${createdPlans.length} plans`);

    // Display created plans
    createdPlans.forEach(plan => {
      console.log(`   - ${plan.name}: $${plan.pricing.amount}/${plan.pricing.billingCycle}`);
    });

    console.log('🎉 Plan seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  }
};

// Run the seeder
const runSeeder = async () => {
  await connectDB();
  await seedPlans();
};

runSeeder();
