import React, { useState } from 'react';
import './Profile.css';

const HelpSupport = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState('faq');
  const [contactForm, setContactForm] = useState({
    subject: '',
    category: 'general',
    message: '',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const faqData = [
    {
      category: 'Account',
      questions: [
        {
          q: 'How do I reset my password?',
          a: 'Go to the login page and click "Forgot Password". Enter your email address and follow the instructions sent to your email.'
        },
        {
          q: 'How do I update my profile information?',
          a: 'Click on your profile picture in the top right corner, select "My Profile", and click "Edit Profile" to make changes.'
        },
        {
          q: 'How do I change my membership plan?',
          a: 'Go to the Payments section in your dashboard and select "Upgrade Membership" to view available plans.'
        }
      ]
    },
    {
      category: 'Classes',
      questions: [
        {
          q: 'How do I book a class?',
          a: 'Go to the Classes section, find the class you want to attend, and click "Book Now". You can also view class details before booking.'
        },
        {
          q: 'Can I cancel a booked class?',
          a: 'Yes, you can cancel a booked class up to 2 hours before the start time. Go to your booked classes and click "Cancel".'
        },
        {
          q: 'What happens if a class is full?',
          a: 'You can join the waitlist for full classes. If someone cancels, you\'ll be automatically enrolled and notified.'
        }
      ]
    },
    {
      category: 'Payments',
      questions: [
        {
          q: 'What payment methods do you accept?',
          a: 'We accept all major credit cards, debit cards through Stripe, and cash payments at the gym reception.'
        },
        {
          q: 'How do I view my payment history?',
          a: 'Go to the Payments section in your dashboard to view all your past payments and download receipts.'
        },
        {
          q: 'Can I get a refund?',
          a: 'Refunds are available within 7 days of payment for unused services. Contact support for assistance.'
        }
      ]
    },
    {
      category: 'Technical',
      questions: [
        {
          q: 'The app is running slowly, what should I do?',
          a: 'Try refreshing the page, clearing your browser cache, or using a different browser. Contact support if issues persist.'
        },
        {
          q: 'I\'m not receiving notifications, how do I fix this?',
          a: 'Check your notification settings in Settings > Notifications and ensure your browser allows notifications from our site.'
        },
        {
          q: 'How do I report a bug?',
          a: 'Use the contact form below with category "Technical Issue" to report bugs. Include as much detail as possible.'
        }
      ]
    }
  ];

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess('Your message has been sent successfully! We\'ll get back to you within 24 hours.');
      setContactForm({
        subject: '',
        category: 'general',
        message: '',
        priority: 'medium'
      });
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const renderFAQ = () => (
    <div className="help-section">
      <h3>Frequently Asked Questions</h3>
      <div className="faq-container">
        {faqData.map((category, categoryIndex) => (
          <div key={categoryIndex} className="faq-category">
            <h4>{category.category}</h4>
            <div className="faq-questions">
              {category.questions.map((item, questionIndex) => (
                <details key={questionIndex} className="faq-item">
                  <summary className="faq-question">{item.q}</summary>
                  <div className="faq-answer">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="help-section">
      <h3>Contact Support</h3>
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleContactSubmit} className="contact-form">
        <div className="form-row">
          <div className="form-group">
            <label>Subject</label>
            <input
              type="text"
              name="subject"
              value={contactForm.subject}
              onChange={handleInputChange}
              placeholder="Brief description of your issue"
              required
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select
              name="category"
              value={contactForm.category}
              onChange={handleInputChange}
            >
              <option value="general">General Question</option>
              <option value="account">Account Issue</option>
              <option value="billing">Billing & Payments</option>
              <option value="technical">Technical Issue</option>
              <option value="classes">Classes & Booking</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label>Priority</label>
          <select
            name="priority"
            value={contactForm.priority}
            onChange={handleInputChange}
          >
            <option value="low">Low - General inquiry</option>
            <option value="medium">Medium - Standard issue</option>
            <option value="high">High - Urgent issue</option>
            <option value="critical">Critical - System down</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Message</label>
          <textarea
            name="message"
            value={contactForm.message}
            onChange={handleInputChange}
            placeholder="Please describe your issue in detail..."
            rows="6"
            required
          />
        </div>
        
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );

  const renderGuides = () => (
    <div className="help-section">
      <h3>User Guides</h3>
      <div className="guides-container">
        <div className="guide-item">
          <div className="guide-icon">📱</div>
          <div className="guide-content">
            <h4>Getting Started</h4>
            <p>Learn the basics of using the gym management system</p>
            <button className="btn-secondary">View Guide</button>
          </div>
        </div>
        
        <div className="guide-item">
          <div className="guide-icon">📅</div>
          <div className="guide-content">
            <h4>Booking Classes</h4>
            <p>Step-by-step guide to booking and managing your classes</p>
            <button className="btn-secondary">View Guide</button>
          </div>
        </div>
        
        <div className="guide-item">
          <div className="guide-icon">💳</div>
          <div className="guide-content">
            <h4>Payment & Billing</h4>
            <p>Understanding membership plans and payment options</p>
            <button className="btn-secondary">View Guide</button>
          </div>
        </div>
        
        <div className="guide-item">
          <div className="guide-icon">📊</div>
          <div className="guide-content">
            <h4>Tracking Progress</h4>
            <p>How to monitor your fitness journey and attendance</p>
            <button className="btn-secondary">View Guide</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemInfo = () => (
    <div className="help-section">
      <h3>System Information</h3>
      <div className="system-info">
        <div className="info-group">
          <h4>Contact Information</h4>
          <div className="contact-details">
            <div className="contact-item">
              <span className="contact-icon">📧</span>
              <span>support@gympro.com</span>
            </div>
            <div className="contact-item">
              <span className="contact-icon">📞</span>
              <span>+1 (555) 123-4567</span>
            </div>
            <div className="contact-item">
              <span className="contact-icon">🕒</span>
              <span>Mon-Fri: 9AM-6PM EST</span>
            </div>
          </div>
        </div>
        
        <div className="info-group">
          <h4>System Status</h4>
          <div className="status-item">
            <span className="status-indicator online"></span>
            <span>All systems operational</span>
          </div>
          <div className="status-item">
            <span className="status-indicator online"></span>
            <span>Payment processing: Normal</span>
          </div>
          <div className="status-item">
            <span className="status-indicator online"></span>
            <span>Class booking: Normal</span>
          </div>
        </div>
        
        <div className="info-group">
          <h4>Version Information</h4>
          <div className="version-info">
            <div>App Version: 2.1.0</div>
            <div>Last Updated: {new Date().toLocaleDateString()}</div>
            <div>Browser: {navigator.userAgent.split(' ')[0]}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal help-modal">
        <div className="modal-header">
          <h2>Help & Support</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="help-tabs">
            <button
              className={`help-tab ${activeTab === 'faq' ? 'active' : ''}`}
              onClick={() => setActiveTab('faq')}
            >
              ❓ FAQ
            </button>
            <button
              className={`help-tab ${activeTab === 'contact' ? 'active' : ''}`}
              onClick={() => setActiveTab('contact')}
            >
              📧 Contact
            </button>
            <button
              className={`help-tab ${activeTab === 'guides' ? 'active' : ''}`}
              onClick={() => setActiveTab('guides')}
            >
              📚 Guides
            </button>
            <button
              className={`help-tab ${activeTab === 'system' ? 'active' : ''}`}
              onClick={() => setActiveTab('system')}
            >
              ℹ️ System Info
            </button>
          </div>
          
          <div className="help-content">
            {activeTab === 'faq' && renderFAQ()}
            {activeTab === 'contact' && renderContact()}
            {activeTab === 'guides' && renderGuides()}
            {activeTab === 'system' && renderSystemInfo()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;