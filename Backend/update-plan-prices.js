const mongoose = require('mongoose');
require('dotenv').config();

const updatePlanPrices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management');
    console.log('Connected to MongoDB');

    // Update Basic plan to $1
    await mongoose.connection.db.collection('plans').updateOne(
      { category: 'basic' },
      { 
        $set: { 
          'pricing.amount': 1,
          'pricing.currency': 'USD'
        }
      }
    );
    console.log('Updated Basic plan to $1');

    // Update Premium plan to $10
    await mongoose.connection.db.collection('plans').updateOne(
      { category: 'premium' },
      { 
        $set: { 
          'pricing.amount': 10,
          'pricing.currency': 'USD'
        }
      }
    );
    console.log('Updated Premium plan to $10');

    // Update VIP plan to $20
    await mongoose.connection.db.collection('plans').updateOne(
      { category: 'vip' },
      { 
        $set: { 
          'pricing.amount': 20,
          'pricing.currency': 'USD'
        }
      }
    );
    console.log('Updated VIP plan to $20');

    // Verify updates
    const plans = await mongoose.connection.db.collection('plans').find({}).toArray();
    console.log('\nUpdated plans:');
    plans.forEach(plan => {
      console.log(`- ${plan.name}: $${plan.pricing?.amount || plan.price} ${plan.pricing?.currency || 'USD'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

updatePlanPrices();