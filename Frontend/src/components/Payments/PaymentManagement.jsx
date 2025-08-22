import React, { useState, useEffect } from 'react';
import { paymentsAPI } from '../../services/api';
import StripeProvider from './StripeProvider';
import StripePaymentForm from './StripePaymentForm';
import './Payments.css';

const PaymentManagement = ({ userRole, userId, userName }) => {
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(userRole === 'member' ? 'plans' : 'history');
  
  // Payment form states
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('stripe'); // 'stripe' or 'manual'
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: ''
  });

  useEffect(() => {
    loadData();
  }, [userRole, userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      const promises = [];
      
      // Load subscription plans
      promises.push(paymentsAPI.getSubscriptionPlans());
      
      // Load payment history for members
      if (userRole === 'member') {
        promises.push(paymentsAPI.getPaymentHistory(userId));
      }

      const results = await Promise.all(promises);
      
      // Handle subscription plans
      if (results[0] && results[0].data) {
        setSubscriptionPlans(results[0].data);
      }
      
      // Handle payment history
      if (results[1] && results[1].data) {
        // Ensure all payment amounts are valid numbers
        const validatedPayments = results[1].data.map(payment => ({
          ...payment,
          amount: typeof payment.amount === 'number' ? payment.amount : 0
        }));
        setPaymentHistory(validatedPayments);
      }
    } catch (error) {
      setError('Failed to load payment data');
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setPaymentMethod('stripe'); // Default to Stripe payment
    setError(''); // Clear any previous errors
    setShowPaymentForm(true);
  };

  const processPayment = async (e) => {
    e.preventDefault();
    try {
      const paymentData = {
        memberId: userId,
        memberName: userName,
        planId: selectedPlan.id,
        amount: selectedPlan.price?.amount || selectedPlan.price,
        paymentMethod: 'card'
      };

      const response = await paymentsAPI.processPayment(paymentData);
      
      if (response.success) {
        alert('Payment processed successfully!');
        setShowPaymentForm(false);
        setSelectedPlan(null);
        setPaymentForm({
          cardNumber: '', expiryDate: '', cvv: '', 
          cardholderName: '', billingAddress: ''
        });
        loadData(); // Refresh data
      }
    } catch (error) {
      setError('Payment processing failed');
    }
  };

  const cancelSubscription = async () => {
    if (window.confirm('Are you sure you want to cancel your subscription?')) {
      try {
        await paymentsAPI.cancelSubscription(userId, 'User requested cancellation');
        alert('Subscription cancelled successfully');
        loadData();
      } catch (error) {
        setError('Failed to cancel subscription');
      }
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  if (loading) return <div className="loading">Loading payment data...</div>;

  return (
    <div className="payment-management">
      <div className="payment-header">
        <h2>Payment & Subscription Management</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Navigation Tabs */}
      <div className="payment-tabs">
        <button 
          className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          Subscription Plans
        </button>
        {userRole === 'member' && (
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Payment History ({paymentHistory.length})
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'plans' && (
          <div className="subscription-plans">
            <div className="plans-grid">
              {subscriptionPlans.map(plan => (
                <div key={plan.id} className={`plan-card ${plan.popular ? 'popular' : ''}`}>
                  {plan.popular && <div className="popular-badge">Most Popular</div>}
                  <div className="plan-header">
                    <h3>{plan.name}</h3>
                    <div className="plan-price">
                      <span className="price">${(plan.price?.amount || plan.price || 0).toFixed(2)}</span>
                      <span className="duration">/{plan.duration?.value} {plan.duration?.unit || plan.duration}</span>
                    </div>
                  </div>
                  <div className="plan-features">
                    <ul>
                      {plan.features && plan.features.map((feature, index) => (
                        <li key={index}>
                          ✓ {typeof feature === 'string' ? feature : feature.name || feature.description || 'Feature'}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {userRole === 'member' && (
                    <div className="plan-actions">
                      <button 
                        className="select-plan-btn"
                        onClick={() => handleSelectPlan(plan)}
                      >
                        Select Plan
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && userRole === 'member' && (
          <div className="payment-history">
            <div className="history-header">
              <h3>Payment History</h3>
              <button className="cancel-subscription-btn" onClick={cancelSubscription}>
                Cancel Subscription
              </button>
            </div>
            <div className="history-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Transaction ID</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.length > 0 ? paymentHistory.map(payment => (
                    <tr key={payment._id || payment.id}>
                      <td>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 
                           payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}</td>
                      <td>${payment.amount && typeof payment.amount === 'number' ? payment.amount.toFixed(2) : '0.00'}</td>
                      <td>{payment.relatedPlan?.name || payment.plan || payment.paymentType || 'N/A'}</td>
                      <td>
                        <span className={`status ${payment.status || 'unknown'}`}>
                          {payment.status || 'Unknown'}
                        </span>
                      </td>
                      <td>{payment.transactionId || payment.stripePaymentIntentId || 'N/A'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                        No payment history found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && selectedPlan && (
        <div className="modal-overlay">
          <div className="modal payment-modal">
            <div className="modal-header">
              <h3>Complete Payment</h3>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowPaymentForm(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="selected-plan-info">
                <h4>{selectedPlan.name}</h4>
                <p>${(selectedPlan.price?.amount || selectedPlan.price || 0).toFixed(2)}/{selectedPlan.duration?.value} {selectedPlan.duration?.unit || selectedPlan.duration}</p>
              </div>

            {/* Payment Method Selection */}
            <div className="payment-method-selection">
              <h4>Choose Payment Method</h4>
              <div className="payment-methods">
                <label className={`payment-method-option ${paymentMethod === 'stripe' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="stripe"
                    checked={paymentMethod === 'stripe'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="method-info">
                    <span className="method-name">💳 Credit/Debit Card</span>
                    <span className="method-desc">Secure payment with Stripe</span>
                  </div>
                </label>
                
                <label className={`payment-method-option ${paymentMethod === 'manual' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="manual"
                    checked={paymentMethod === 'manual'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="method-info">
                    <span className="method-name">💵 Cash Payment</span>
                    <span className="method-desc">Pay at gym reception</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Stripe Payment Form */}
            {paymentMethod === 'stripe' && (
              <div className="stripe-payment-container">
                <StripeProvider>
                  <StripePaymentForm
                    selectedPlan={{
                      ...selectedPlan,
                      memberId: userId,
                      memberName: userName
                    }}
                    onSuccess={(result) => {
                      console.log('Payment success:', result);
                      alert('Payment completed successfully! Your membership has been activated.');
                      setShowPaymentForm(false);
                      setSelectedPlan(null);
                      setError(''); // Clear any previous errors
                      loadData(); // Refresh data
                    }}
                    onCancel={() => setShowPaymentForm(false)}
                    onError={(error) => {
                      console.error('Payment error:', error);
                      const errorMessage = error?.message || error?.response?.data?.message || 'Payment failed. Please try again.';
                      setError(errorMessage);
                    }}
                  />
                </StripeProvider>
              </div>
            )}

            {/* Cash Payment Form */}
            {paymentMethod === 'manual' && (
              <div className="cash-payment-form">
                <div className="cash-payment-header">
                  <h3>💵 Cash Payment Instructions</h3>
                  <p>Please visit the gym reception to complete your payment</p>
                </div>

                <div className="cash-payment-info">
                  <div className="payment-reference">
                    <h4>Payment Reference</h4>
                    <div className="reference-code">
                      REF-{Date.now().toString().slice(-6)}
                    </div>
                  </div>

                  <div className="payment-details">
                    <h5>Payment Details</h5>
                    <div className="details-grid">
                      <div className="detail-row">
                        <span className="detail-label">Member Name:</span>
                        <span className="detail-value">{userName}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Plan Selected:</span>
                        <span className="detail-value">{selectedPlan.name}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Plan Category:</span>
                        <span className="detail-value">{selectedPlan.category || 'Standard'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Duration:</span>
                        <span className="detail-value">{selectedPlan.duration?.value} {selectedPlan.duration?.unit || selectedPlan.duration}</span>
                      </div>
                      <div className="detail-row total-row">
                        <span className="detail-label">Total Amount:</span>
                        <span className="detail-value">${(selectedPlan.price?.amount || selectedPlan.price || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedPlan.features && selectedPlan.features.length > 0 && (
                    <div className="plan-benefits">
                      <h5>Plan Benefits</h5>
                      <div className="benefits-list">
                        {selectedPlan.features.slice(0, 4).map((feature, index) => (
                          <div key={index} className="benefit-item">
                            ✓ {typeof feature === 'string' ? feature : feature.name || feature.description || 'Feature'}
                          </div>
                        ))}
                        {selectedPlan.features.length > 4 && (
                          <div className="benefit-item">
                            + {selectedPlan.features.length - 4} more benefits
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="payment-instructions">
                    <h5>Instructions</h5>
                    <ol>
                      <li>Visit the gym reception desk during business hours</li>
                      <li>Show this payment reference to the staff</li>
                      <li>Pay the exact amount in cash</li>
                      <li>Collect your membership activation receipt</li>
                    </ol>
                  </div>

                  <div className="business-hours">
                    <h5>Reception Hours</h5>
                    <div className="hours-info">
                      <div>Monday - Friday: 6:00 AM - 10:00 PM</div>
                      <div>Saturday - Sunday: 7:00 AM - 9:00 PM</div>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" onClick={() => setShowPaymentForm(false)} className="cancel-btn">
                    Close
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement;
