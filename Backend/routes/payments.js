const express = require('express');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const stripeService = require('../services/stripeService');

const router = express.Router();

// @desc    Get subscription plans
// @route   GET /api/payments/subscription-plans
// @access  Private
router.get('/subscription-plans', protect, async (req, res) => {
  try {
    // Get all subscription plans (membership plans)
    const plans = await Plan.find({ 
      type: { $in: ['membership', 'subscription'] },
      isActive: true 
    }).sort({ 'pricing.amount': 1 });

    // If no plans found with type filter, get all plans
    let subscriptionPlans = plans;
    if (plans.length === 0) {
      subscriptionPlans = await Plan.find({ isActive: { $ne: false } }).sort({ 'pricing.amount': 1 });
    }

    // Format the plans for frontend consumption
    const formattedPlans = subscriptionPlans.map(plan => ({
      id: plan._id,
      name: plan.name,
      description: plan.description,
      price: {
        amount: plan.pricing?.amount || 0,
        currency: plan.pricing?.currency || 'USD'
      },
      duration: {
        value: plan.duration?.value || 1,
        unit: plan.duration?.unit || 'month'
      },
      features: plan.features || [],
      category: plan.category,
      popular: plan.category === 'premium', // Mark premium as popular
      type: plan.type || 'membership'
    }));

    res.status(200).json({
      success: true,
      data: formattedPlans
    });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
      error: error.message
    });
  }
});

// @desc    Process payment
// @route   POST /api/payments/process
// @access  Private
router.post('/process', protect, [
  body('planId').notEmpty().withMessage('Plan ID is required'),
  body('paymentMethod').isIn(['card', 'cash', 'bank_transfer']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { planId, paymentMethod, billingAddress, cardLast4, cardBrand } = req.body;
    const memberId = req.user.id;

    // Get plan details
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Get member details
    const member = await User.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Calculate membership period
    const startDate = new Date();
    const endDate = new Date(startDate);

    switch (plan.duration.unit) {
      case 'days':
        endDate.setDate(endDate.getDate() + plan.duration.value);
        break;
      case 'weeks':
        endDate.setDate(endDate.getDate() + (plan.duration.value * 7));
        break;
      case 'months':
        endDate.setMonth(endDate.getMonth() + plan.duration.value);
        break;
      case 'years':
        endDate.setFullYear(endDate.getFullYear() + plan.duration.value);
        break;
    }

    // Create payment record
    const payment = await Payment.create({
      member: memberId,
      memberName: `${member.firstName} ${member.lastName}`,
      relatedPlan: planId,
      amount: plan.pricing.discountedPrice || plan.pricing.amount,
      currency: plan.pricing.currency,
      paymentMethod,
      paymentType: 'membership',
      status: paymentMethod === 'cash' ? 'completed' : 'pending',
      description: `Payment for ${plan.name}`,
      paymentDate: new Date(),
      processedBy: req.user.id
    });

    // If payment is completed, update member's membership
    if (payment.status === 'completed') {
      const startDate = new Date();
      const endDate = new Date(startDate);
      
      switch (plan.duration.unit) {
        case 'days':
          endDate.setDate(endDate.getDate() + plan.duration.value);
          break;
        case 'weeks':
          endDate.setDate(endDate.getDate() + (plan.duration.value * 7));
          break;
        case 'months':
          endDate.setMonth(endDate.getMonth() + plan.duration.value);
          break;
        case 'years':
          endDate.setFullYear(endDate.getFullYear() + plan.duration.value);
          break;
      }
      
      await User.findByIdAndUpdate(memberId, {
        membershipType: plan.category,
        membershipStartDate: startDate,
        membershipEndDate: endDate
      });
    }

    // Populate plan details for response
    await payment.populate('relatedPlan', 'name type category');

    res.status(201).json({
      success: true,
      message: 'Payment processed successfully',
      data: payment
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: error.message
    });
  }
});

// @desc    Get payment history for current user
// @route   GET /api/payments/my-history
// @access  Private
router.get('/my-history', protect, async (req, res) => {
  try {
    console.log('Fetching payment history for user:', req.user.id);
    
    const payments = await Payment.find({ member: req.user.id })
      .populate('relatedPlan', 'name type category')
      .sort({ createdAt: -1 });

    console.log(`Found ${payments.length} payments for user ${req.user.id}`);

    // Ensure all payments have valid amount values
    const validatedPayments = payments.map(payment => {
      const paymentObj = payment.toObject();
      return {
        ...paymentObj,
        amount: typeof paymentObj.amount === 'number' ? paymentObj.amount : 0
      };
    });

    res.status(200).json({
      success: true,
      data: validatedPayments
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

// @desc    Get all payments (Admin only)
// @route   GET /api/payments
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, memberId, planId, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.paymentStatus = status;
    if (memberId) filter.member = memberId;
    if (planId) filter.plan = planId;

    const payments = await Payment.find(filter)
      .populate('member', 'firstName lastName email')
      .populate('relatedPlan', 'name type category')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
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

// @desc    Create payment intent
// @route   POST /api/payments/create-intent
// @access  Private
router.post('/create-intent', protect, async (req, res) => {
  try {
    const { planId, memberId } = req.body;

    // Get plan details
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Get member details
    const member = await User.findById(memberId || req.user.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent(
      plan.pricing.amount,
      plan.pricing.currency.toLowerCase(),
      {
        planId: plan._id.toString(),
        memberId: member._id.toString(),
        memberName: `${member.firstName} ${member.lastName}`,
        planName: plan.name
      }
    );

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
});

// @desc    Confirm payment
// @route   POST /api/payments/confirm
// @access  Private
router.post('/confirm', protect, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripeService.retrievePaymentIntent(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Create payment record in database
      const payment = await Payment.create({
        member: paymentIntent.metadata.memberId,
        memberName: paymentIntent.metadata.memberName,
        relatedPlan: paymentIntent.metadata.planId,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency.toUpperCase(),
        paymentMethod: 'card',
        paymentType: 'membership',
        status: 'completed',
        description: `Payment for ${paymentIntent.metadata.planName}`,
        paymentDate: new Date(),
        stripePaymentIntentId: paymentIntent.id,
        processedBy: req.user.id
      });

      // Update member's membership
      const plan = await Plan.findById(paymentIntent.metadata.planId);
      if (plan) {
        const startDate = new Date();
        const endDate = new Date(startDate);
        
        switch (plan.duration.unit) {
          case 'days':
            endDate.setDate(endDate.getDate() + plan.duration.value);
            break;
          case 'weeks':
            endDate.setDate(endDate.getDate() + (plan.duration.value * 7));
            break;
          case 'months':
            endDate.setMonth(endDate.getMonth() + plan.duration.value);
            break;
          case 'years':
            endDate.setFullYear(endDate.getFullYear() + plan.duration.value);
            break;
        }
        
        await User.findByIdAndUpdate(paymentIntent.metadata.memberId, {
          membershipType: plan.category,
          membershipStartDate: startDate,
          membershipEndDate: endDate
        });
      }

      await payment.populate('relatedPlan', 'name type category');

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: payment
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not completed',
        status: paymentIntent.status
      });
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message
    });
  }
});

module.exports = router;
