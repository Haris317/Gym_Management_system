const express = require('express');
const { body, validationResult } = require('express-validator');
const stripeService = require('../services/stripeService');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Create payment intent for Stripe
// @route   POST /api/stripe/create-payment-intent
// @access  Private
router.post('/create-payment-intent', protect, [
  body('planId').notEmpty().withMessage('Plan ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number')
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

    const { planId, amount, currency = 'usd' } = req.body;
    const userId = req.user.id;

    // Get plan details
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create payment intent
    const paymentIntentResult = await stripeService.createPaymentIntent(
      amount,
      currency,
      {
        planId: plan._id.toString(),
        planName: plan.name,
        userId: user._id.toString(),
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email
      }
    );

    if (!paymentIntentResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create payment intent',
        error: paymentIntentResult.error
      });
    }

    // Create pending payment record
    const payment = await Payment.create({
      member: userId,
      memberName: `${user.firstName} ${user.lastName}`,
      relatedPlan: planId,
      amount: amount,
      currency: currency.toUpperCase(),
      paymentMethod: 'stripe',
      paymentType: 'membership',
      status: 'pending',
      description: `Stripe payment for ${plan.name}`,
      paymentDate: new Date(),
      metadata: new Map([
        ['stripePaymentIntentId', paymentIntentResult.paymentIntentId],
        ['stripeClientSecret', paymentIntentResult.clientSecret]
      ])
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntentResult.clientSecret,
      paymentId: payment._id,
      message: 'Payment intent created successfully'
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

// @desc    Confirm payment success
// @route   POST /api/stripe/confirm-payment
// @access  Private
router.post('/confirm-payment', protect, [
  body('paymentIntentId').notEmpty().withMessage('Payment Intent ID is required'),
  body('paymentId').notEmpty().withMessage('Payment ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { paymentIntentId, paymentId } = req.body;

    // Verify payment with Stripe
    const confirmResult = await stripeService.confirmPaymentIntent(paymentIntentId);
    
    if (!confirmResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to confirm payment',
        error: confirmResult.error
      });
    }

    // Update payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Update payment status based on Stripe status
    let paymentStatus = 'pending';
    if (confirmResult.status === 'succeeded') {
      paymentStatus = 'completed';
    } else if (confirmResult.status === 'canceled' || confirmResult.status === 'payment_failed') {
      paymentStatus = 'failed';
    }

    payment.status = paymentStatus;
    payment.metadata.set('stripeStatus', confirmResult.status);
    
    if (confirmResult.paymentIntent.charges?.data?.[0]) {
      const charge = confirmResult.paymentIntent.charges.data[0];
      payment.metadata.set('stripeChargeId', charge.id);
      
      if (charge.payment_method_details?.card) {
        payment.metadata.set('cardLast4', charge.payment_method_details.card.last4);
        payment.metadata.set('cardBrand', charge.payment_method_details.card.brand);
      }
    }

    await payment.save();

    // If payment is successful, update user membership
    if (paymentStatus === 'completed') {
      const plan = await Plan.findById(payment.relatedPlan);
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
        
        await User.findByIdAndUpdate(payment.member, {
          membershipType: plan.category,
          membershipStartDate: startDate,
          membershipEndDate: endDate
        });
      }
    }

    res.status(200).json({
      success: true,
      payment,
      message: paymentStatus === 'completed' ? 'Payment completed successfully' : 'Payment status updated'
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message
    });
  }
});

// @desc    Create Stripe customer
// @route   POST /api/stripe/create-customer
// @access  Private
router.post('/create-customer', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already has a Stripe customer ID
    if (user.stripeCustomerId) {
      return res.status(200).json({
        success: true,
        customerId: user.stripeCustomerId,
        message: 'Customer already exists'
      });
    }

    // Create Stripe customer
    const customerResult = await stripeService.createCustomer(
      user.email,
      `${user.firstName} ${user.lastName}`,
      {
        userId: user._id.toString(),
        role: user.role
      }
    );

    if (!customerResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create Stripe customer',
        error: customerResult.error
      });
    }

    // Update user with Stripe customer ID
    user.stripeCustomerId = customerResult.customer.id;
    await user.save();

    res.status(200).json({
      success: true,
      customerId: customerResult.customer.id,
      message: 'Stripe customer created successfully'
    });

  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error.message
    });
  }
});

// @desc    Stripe webhook handler
// @route   POST /api/stripe/webhook
// @access  Public (but verified by Stripe signature)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('Stripe webhook secret not configured');
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const verifyResult = stripeService.verifyWebhookSignature(
      req.body,
      signature,
      endpointSecret
    );

    if (!verifyResult.success) {
      console.error('Webhook signature verification failed:', verifyResult.error);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = verifyResult.event;
    console.log('Stripe webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Helper functions for webhook handlers
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    const payment = await Payment.findOne({
      'metadata.stripePaymentIntentId': paymentIntent.id
    });

    if (payment && payment.status !== 'completed') {
      payment.status = 'completed';
      payment.metadata.set('stripeStatus', 'succeeded');
      await payment.save();
      console.log(`Payment ${payment._id} marked as completed`);
    }
  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  try {
    const payment = await Payment.findOne({
      'metadata.stripePaymentIntentId': paymentIntent.id
    });

    if (payment && payment.status !== 'failed') {
      payment.status = 'failed';
      payment.metadata.set('stripeStatus', 'payment_failed');
      await payment.save();
      console.log(`Payment ${payment._id} marked as failed`);
    }
  } catch (error) {
    console.error('Error handling payment_intent.payment_failed:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  // Handle subscription payment success
  console.log('Invoice payment succeeded:', invoice.id);
}

async function handleSubscriptionDeleted(subscription) {
  // Handle subscription cancellation
  console.log('Subscription deleted:', subscription.id);
}

module.exports = router;