import React, { useState } from 'react';
import {
  useStripe,
  useElements,
  CardElement,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement
} from '@stripe/react-stripe-js';
import { paymentsAPI } from '../../services/api';

const StripePaymentForm = ({ selectedPlan, onSuccess, onCancel, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe has not loaded yet. Please try again.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Create payment intent on the backend
      const paymentIntentResponse = await paymentsAPI.createStripePaymentIntent({
        planId: selectedPlan.id || selectedPlan._id,
        memberId: selectedPlan.memberId
      });

      if (!paymentIntentResponse.success) {
        throw new Error(paymentIntentResponse.message || 'Failed to create payment intent');
      }

      // Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement);
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        paymentIntentResponse.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: `${selectedPlan.memberName || 'Member'}`,
            },
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        await paymentsAPI.confirmStripePayment({
          paymentIntentId: paymentIntent.id
        });

        onSuccess({
          paymentIntent,
          message: 'Payment completed successfully!'
        });
      } else {
        setError('Payment was not completed. Please try again.');
      }

    } catch (err) {
      console.error('Payment error:', err);
      let errorMessage = 'An error occurred during payment processing';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      onError && onError(err);
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <div className="stripe-payment-form">
      <div className="payment-header">
        <h3>Complete Your Payment</h3>
        <div className="plan-summary">
          <div className="plan-info">
            <h4>{selectedPlan.name}</h4>
            <p className="plan-description">{selectedPlan.description || 'Premium gym membership with exclusive benefits'}</p>
            <div className="plan-details">
              <div className="detail-item">
                <span className="label">Duration:</span>
                <span className="value">{selectedPlan.duration?.value || 1} {selectedPlan.duration?.unit || 'month'}{(selectedPlan.duration?.value || 1) > 1 ? 's' : ''}</span>
              </div>
              <div className="detail-item">
                <span className="label">Category:</span>
                <span className="value">{selectedPlan.category || 'Standard'}</span>
              </div>
              {selectedPlan.memberName && (
                <div className="detail-item">
                  <span className="label">Member:</span>
                  <span className="value">{selectedPlan.memberName}</span>
                </div>
              )}
            </div>
          </div>
          <div className="price-display">
            <span className="currency">${(selectedPlan.price?.amount || selectedPlan.price || 0).toFixed(2)}</span>
            <span className="period">/{selectedPlan.duration?.value || 1} {selectedPlan.duration?.unit || 'month'}{(selectedPlan.duration?.value || 1) > 1 ? 's' : ''}</span>
          </div>
        </div>
        
        {selectedPlan.features && selectedPlan.features.length > 0 && (
          <div className="plan-features-summary">
            <h5>What's Included:</h5>
            <div className="features-grid">
              {selectedPlan.features.slice(0, 6).map((feature, index) => (
                <div key={index} className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span className="feature-text">{typeof feature === 'string' ? feature : feature.name || feature.description || 'Feature'}</span>
                </div>
              ))}
              {selectedPlan.features.length > 6 && (
                <div className="feature-item">
                  <span className="feature-icon">+</span>
                  <span className="feature-text">{selectedPlan.features.length - 6} more features</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="stripe-form">
        <div className="card-element-container">
          <label htmlFor="card-element">
            Credit or Debit Card
          </label>
          <CardElement
            id="card-element"
            options={cardElementOptions}
            className="card-element"
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="payment-breakdown">
          <h5>Payment Summary</h5>
          <div className="breakdown-item">
            <span className="breakdown-label">{selectedPlan.name}</span>
            <span className="breakdown-value">${(selectedPlan.price?.amount || selectedPlan.price || 0).toFixed(2)}</span>
          </div>
          <div className="breakdown-item">
            <span className="breakdown-label">Processing Fee</span>
            <span className="breakdown-value">$0.00</span>
          </div>
          <div className="breakdown-item total">
            <span className="breakdown-label">Total Amount</span>
            <span className="breakdown-value">${(selectedPlan.price?.amount || selectedPlan.price || 0).toFixed(2)}</span>
          </div>
          <div className="payment-note">
            <small>💡 Your membership will be activated immediately after successful payment</small>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="cancel-btn"
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || processing}
            className="pay-btn"
          >
            {processing ? (
              <>
                <div className="button-spinner"></div>
                Processing...
              </>
            ) : (
              `Pay $${(selectedPlan.price?.amount || selectedPlan.price || 0).toFixed(2)}`
            )}
          </button>
        </div>
      </form>

      <div className="payment-security">
        <div className="security-badges">
          <span>🔒 Secured by Stripe</span>
          <span>💳 All major cards accepted</span>
        </div>
      </div>
    </div>
  );
};

export default StripePaymentForm;