const mongoose = require('mongoose');
const Payment = require('./models/Payment');
const User = require('./models/User');
require('dotenv').config();

const seedPayments = async () => {
  console.log('🌱 Seeding Payment Data...');
  console.log('=' .repeat(50));

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all members
    const members = await User.find({ role: 'member', isActive: true });
    console.log(`👥 Found ${members.length} members`);

    if (members.length === 0) {
      console.log('❌ No members found. Please create members first.');
      return;
    }

    // Clear existing payments
    await Payment.deleteMany({});
    console.log('🗑️ Cleared existing payments');

    // Create sample payments
    const paymentTypes = ['membership', 'class_package', 'personal_training', 'drop_in'];
    const paymentMethods = ['card', 'cash', 'bank_transfer'];
    const statuses = ['completed', 'pending', 'failed'];
    
    const payments = [];
    
    // Create payments for the last 6 months
    for (let monthsAgo = 0; monthsAgo < 6; monthsAgo++) {
      const paymentDate = new Date();
      paymentDate.setMonth(paymentDate.getMonth() - monthsAgo);
      
      // Create 3-8 payments per month
      const paymentsThisMonth = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < paymentsThisMonth; i++) {
        const member = members[Math.floor(Math.random() * members.length)];
        const paymentType = paymentTypes[Math.floor(Math.random() * paymentTypes.length)];
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        // Set payment date within the month
        const dayOfMonth = Math.floor(Math.random() * 28) + 1;
        const thisPaymentDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), dayOfMonth);
        
        // Calculate amount based on payment type
        let amount;
        let description;
        switch (paymentType) {
          case 'membership':
            amount = Math.floor(Math.random() * 50) + 30; // $30-80
            description = `Monthly membership fee - ${member.membershipType || 'Basic'}`;
            break;
          case 'class_package':
            amount = Math.floor(Math.random() * 100) + 50; // $50-150
            description = '10-class package';
            break;
          case 'personal_training':
            amount = Math.floor(Math.random() * 80) + 60; // $60-140
            description = 'Personal training session';
            break;
          case 'drop_in':
            amount = Math.floor(Math.random() * 20) + 15; // $15-35
            description = 'Drop-in class fee';
            break;
        }
        
        const payment = {
          member: member._id,
          memberName: `${member.firstName} ${member.lastName}`,
          amount,
          paymentMethod,
          paymentType,
          description,
          status,
          paymentDate: thisPaymentDate,
          transactionId: status === 'completed' ? `TXN${Date.now()}${Math.floor(Math.random() * 1000)}` : null,
          processingFee: paymentMethod === 'card' ? Math.round(amount * 0.029 * 100) / 100 : 0, // 2.9% for card
          currency: 'USD'
        };
        
        payments.push(payment);
      }
    }
    
    // Insert all payments
    const createdPayments = await Payment.insertMany(payments);
    console.log(`✅ Created ${createdPayments.length} payment records`);
    
    // Calculate and display statistics
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$netAmount' } } }
    ]);
    
    const paymentsByType = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$paymentType', count: { $sum: 1 }, total: { $sum: '$netAmount' } } },
      { $sort: { total: -1 } }
    ]);
    
    console.log('\n📊 Payment Statistics:');
    console.log(`💰 Total Revenue: $${totalRevenue[0]?.total.toFixed(2) || 0}`);
    console.log('\n📋 Revenue by Type:');
    paymentsByType.forEach(type => {
      console.log(`   ${type._id}: ${type.count} payments, $${type.total.toFixed(2)}`);
    });
    
    // Test monthly revenue calculation
    const currentDate = new Date();
    const monthlyRevenue = await Payment.getMonthlyRevenue(currentDate.getFullYear(), currentDate.getMonth() + 1);
    console.log(`\n📅 Current Month Revenue: $${monthlyRevenue.totalRevenue.toFixed(2)} (${monthlyRevenue.totalPayments} payments)`);
    
    console.log('\n🎉 Payment seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding payments:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

seedPayments();