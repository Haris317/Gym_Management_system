import React, { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';
import './Profile.css';

const Settings = ({ user, onClose }) => {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      sms: false,
      push: true,
      classReminders: true,
      paymentReminders: true,
      promotions: false
    },
    privacy: {
      profileVisibility: 'members',
      showEmail: false,
      showPhone: false
    },
    preferences: {
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      theme: 'light'
    },
    security: {
      twoFactorAuth: false,
      loginAlerts: true
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('notifications');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await authAPI.getUserSettings();
      if (response.data) {
        setSettings(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await authAPI.updateUserSettings(settings);
      
      if (response.success) {
        setSuccess('Settings updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const renderNotificationSettings = () => (
    <div className="settings-section">
      <h3>Notification Preferences</h3>
      <div className="settings-group">
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.notifications.email}
              onChange={(e) => handleSettingChange('notifications', 'email', e.target.checked)}
            />
            <span>Email Notifications</span>
          </label>
          <p>Receive notifications via email</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.notifications.sms}
              onChange={(e) => handleSettingChange('notifications', 'sms', e.target.checked)}
            />
            <span>SMS Notifications</span>
          </label>
          <p>Receive notifications via text message</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.notifications.push}
              onChange={(e) => handleSettingChange('notifications', 'push', e.target.checked)}
            />
            <span>Push Notifications</span>
          </label>
          <p>Receive browser push notifications</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.notifications.classReminders}
              onChange={(e) => handleSettingChange('notifications', 'classReminders', e.target.checked)}
            />
            <span>Class Reminders</span>
          </label>
          <p>Get reminded about upcoming classes</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.notifications.paymentReminders}
              onChange={(e) => handleSettingChange('notifications', 'paymentReminders', e.target.checked)}
            />
            <span>Payment Reminders</span>
          </label>
          <p>Get reminded about upcoming payments</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.notifications.promotions}
              onChange={(e) => handleSettingChange('notifications', 'promotions', e.target.checked)}
            />
            <span>Promotional Offers</span>
          </label>
          <p>Receive information about special offers</p>
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="settings-section">
      <h3>Privacy Settings</h3>
      <div className="settings-group">
        <div className="setting-item">
          <label>Profile Visibility</label>
          <select
            value={settings.privacy.profileVisibility}
            onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
          >
            <option value="public">Public</option>
            <option value="members">Members Only</option>
            <option value="trainers">Trainers Only</option>
            <option value="private">Private</option>
          </select>
          <p>Who can see your profile information</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.privacy.showEmail}
              onChange={(e) => handleSettingChange('privacy', 'showEmail', e.target.checked)}
            />
            <span>Show Email Address</span>
          </label>
          <p>Allow others to see your email address</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.privacy.showPhone}
              onChange={(e) => handleSettingChange('privacy', 'showPhone', e.target.checked)}
            />
            <span>Show Phone Number</span>
          </label>
          <p>Allow others to see your phone number</p>
        </div>
      </div>
    </div>
  );

  const renderPreferences = () => (
    <div className="settings-section">
      <h3>General Preferences</h3>
      <div className="settings-group">
        <div className="setting-item">
          <label>Language</label>
          <select
            value={settings.preferences.language}
            onChange={(e) => handleSettingChange('preferences', 'language', e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label>Timezone</label>
          <select
            value={settings.preferences.timezone}
            onChange={(e) => handleSettingChange('preferences', 'timezone', e.target.value)}
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label>Date Format</label>
          <select
            value={settings.preferences.dateFormat}
            onChange={(e) => handleSettingChange('preferences', 'dateFormat', e.target.value)}
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label>Theme</label>
          <select
            value={settings.preferences.theme}
            onChange={(e) => handleSettingChange('preferences', 'theme', e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="settings-section">
      <h3>Security Settings</h3>
      <div className="settings-group">
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.security.twoFactorAuth}
              onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
            />
            <span>Two-Factor Authentication</span>
          </label>
          <p>Add an extra layer of security to your account</p>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.security.loginAlerts}
              onChange={(e) => handleSettingChange('security', 'loginAlerts', e.target.checked)}
            />
            <span>Login Alerts</span>
          </label>
          <p>Get notified when someone logs into your account</p>
        </div>
        
        <div className="setting-item">
          <button className="btn-secondary">Change Password</button>
          <p>Update your account password</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal settings-modal">
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <div className="settings-tabs">
            <button
              className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              🔔 Notifications
            </button>
            <button
              className={`settings-tab ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              🔒 Privacy
            </button>
            <button
              className={`settings-tab ${activeTab === 'preferences' ? 'active' : ''}`}
              onClick={() => setActiveTab('preferences')}
            >
              ⚙️ Preferences
            </button>
            <button
              className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              🛡️ Security
            </button>
          </div>
          
          <div className="settings-content">
            {activeTab === 'notifications' && renderNotificationSettings()}
            {activeTab === 'privacy' && renderPrivacySettings()}
            {activeTab === 'preferences' && renderPreferences()}
            {activeTab === 'security' && renderSecuritySettings()}
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;