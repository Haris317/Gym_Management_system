require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
  /**
   * Create a payment intent for a membership plan
   */
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent; // Return the raw Stripe object
    } catch (error) {
      console.error('Stripe Payment Intent Error:', error);
      throw new Error(`Stripe payment intent creation failed: ${error.message}`);
    }
  }

  /**
   * Confirm a payment intent
   */
  async retrievePaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent; // Return the raw Stripe object
    } catch (error) {
      console.error('Stripe Retrieve Payment Intent Error:', error);
      throw new Error(`Stripe payment intent retrieval failed: ${error.message}`);
    }
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(email, name, metadata = {}) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata
      });

      return {
        success: true,
        customer
      };
    } catch (error) {
      console.error('Stripe Create Customer Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a subscription for recurring payments
   */
  async createSubscription(customerId, priceId, metadata = {}) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      return {
        success: true,
        subscription,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret
      };
    } catch (error) {
      console.error('Stripe Create Subscription Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return {
        success: true,
        subscription
      };
    } catch (error) {
      console.error('Stripe Cancel Subscription Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a refund
   */
  async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await stripe.refunds.create(refundData);

      return {
        success: true,
        refund
      };
    } catch (error) {
      console.error('Stripe Refund Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment method details
   */
  async getPaymentMethod(paymentMethodId) {
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      return {
        success: true,
        paymentMethod
      };
    } catch (error) {
      console.error('Stripe Get Payment Method Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Webhook signature verification
   */
  verifyWebhookSignature(payload, signature, endpointSecret) {
    try {
      const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
      return {
        success: true,
        event
      };
    } catch (error) {
      console.error('Stripe Webhook Verification Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new StripeService();