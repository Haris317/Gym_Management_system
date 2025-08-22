import React, { useState } from 'react';
import './Profile.css';

const Preferences = ({ user, onClose }) => {
  const [preferences, setPreferences] = useState({
    dashboard: {
      defaultView: 'overview',
      showStats: true,
      showQuickActions: true,
      showUpcomingClasses: true,
      showRecentActivity: true
    },
    classes: {
      autoBookFavorites: false,
      reminderTime: 30,
      showInstructor: true,
      showDifficulty: true,
      defaultFilter: 'all'
    },
    workouts: {
      defaultDuration: 60,
      preferredDifficulty: 'intermediate',
      showProgress: true,
      trackPersonalRecords: true
    },
    appearance: {
      compactMode: false,
      showAnimations: true,
      highContrast: false,
      fontSize: 'medium'
    }
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handlePreferenceChange = (category, setting, value) => {
    setPreferences(prev => ({
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save to localStorage for now
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      
      setSuccess('Preferences saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    setPreferences({
      dashboard: {
        defaultView: 'overview',
        showStats: true,
        showQuickActions: true,
        showUpcomingClasses: true,
        showRecentActivity: true
      },
      classes: {
        autoBookFavorites: false,
        reminderTime: 30,
        showInstructor: true,
        showDifficulty: true,
        defaultFilter: 'all'
      },
      workouts: {
        defaultDuration: 60,
        preferredDifficulty: 'intermediate',
        showProgress: true,
        trackPersonalRecords: true
      },
      appearance: {
        compactMode: false,
        showAnimations: true,
        highContrast: false,
        fontSize: 'medium'
      }
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal preferences-modal">
        <div className="modal-header">
          <h2>Preferences</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          {success && <div className="success-message">{success}</div>}
          
          <div className="preferences-content">
            {/* Dashboard Preferences */}
            <div className="preference-section">
              <h3>🏠 Dashboard</h3>
              <div className="preference-group">
                <div className="preference-item">
                  <label>Default View</label>
                  <select
                    value={preferences.dashboard.defaultView}
                    onChange={(e) => handlePreferenceChange('dashboard', 'defaultView', e.target.value)}
                  >
                    <option value="overview">Overview</option>
                    <option value="classes">Classes</option>
                    <option value="plans">My Plans</option>
                    <option value="attendance">Attendance</option>
                  </select>
                </div>
                
                <div className="preference-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={preferences.dashboard.showStats}
                      onChange={(e) => handlePreferenceChange('dashboard', 'showStats', e.target.checked)}
                    />
                    <span>Show Statistics Cards</span>
                  </label>
                </div>
                
                <div className="preference-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={preferences.dashboard.showQuickActions}
                      onChange={(e) => handlePreferenceChange('dashboard', 'showQuickActions', e.target.checked)}
                    />
                    <span>Show Quick Actions</span>
                  </label>
                </div>
                
                <div className="preference-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={preferences.dashboard.showUpcomingClasses}
                      onChange={(e) => handlePreferenceChange('dashboard', 'showUpcomingClasses', e.target.checked)}
                    />
                    <span>Show Upcoming Classes</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Classes Preferences */}
            <div className="preference-section">
              <h3>📅 Classes</h3>
              <div className="preference-group">
                <div className="preference-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={preferences.classes.autoBookFavorites}
                      onChange={(e) => handlePreferenceChange('classes', 'autoBookFavorites', e.target.checked)}
                    />
                    <span>Auto-book Favorite Classes</span>
                  </label>
                  <p>Automatically book recurring favorite classes</p>
                </div>
                
                <div className="preference-item">
                  <label>Reminder Time (minutes before class)</label>
                  <select
                    value={preferences.classes.reminderTime}
                    onChange={(e) => handlePreferenceChange('classes', 'reminderTime', parseInt(e.target.value))}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
                
                <div className="preference-item">
                  <label>Default Filter</label>
                  <select
                    value={preferences.classes.defaultFilter}
                    onChange={(e) => handlePreferenceChange('classes', 'defaultFilter', e.target.value)}
                  >
                    <option value="all">All Classes</option>
                    <option value="available">Available Only</option>
                    <option value="booked">My Bookings</option>
                    <option value="favorites">Favorites</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Workout Preferences */}
            <div className="preference-section">
              <h3>🏋️ Workouts</h3>
              <div className="preference-group">
                <div className="preference-item">
                  <label>Default Workout Duration (minutes)</label>
                  <select
                    value={preferences.workouts.defaultDuration}
                    onChange={(e) => handlePreferenceChange('workouts', 'defaultDuration', parseInt(e.target.value))}
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
                
                <div className="preference-item">
                  <label>Preferred Difficulty Level</label>
                  <select
                    value={preferences.workouts.preferredDifficulty}
                    onChange={(e) => handlePreferenceChange('workouts', 'preferredDifficulty', e.target.value)}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                
                <div className="preference-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={preferences.workouts.showProgress}
                      onChange={(e) => handlePreferenceChange('workouts', 'showProgress', e.target.checked)}
                    />
                    <span>Show Progress Tracking</span>
                  </label>
                </div>
                
                <div className="preference-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={preferences.workouts.trackPersonalRecords}
                      onChange={(e) => handlePreferenceChange('workouts', 'trackPersonalRecords', e.target.checked)}
                    />
                    <span>Track Personal Records</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Appearance Preferences */}
            <div className="preference-section">
              <h3>🎨 Appearance</h3>
              <div className="preference-group">
                <div className="preference-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={preferences.appearance.compactMode}
                      onChange={(e) => handlePreferenceChange('appearance', 'compactMode', e.target.checked)}
                    />
                    <span>Compact Mode</span>
                  </label>
                  <p>Show more information in less space</p>
                </div>
                
                <div className="preference-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={preferences.appearance.showAnimations}
                      onChange={(e) => handlePreferenceChange('appearance', 'showAnimations', e.target.checked)}
                    />
                    <span>Show Animations</span>
                  </label>
                  <p>Enable smooth transitions and animations</p>
                </div>
                
                <div className="preference-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={preferences.appearance.highContrast}
                      onChange={(e) => handlePreferenceChange('appearance', 'highContrast', e.target.checked)}
                    />
                    <span>High Contrast Mode</span>
                  </label>
                  <p>Improve visibility with higher contrast colors</p>
                </div>
                
                <div className="preference-item">
                  <label>Font Size</label>
                  <select
                    value={preferences.appearance.fontSize}
                    onChange={(e) => handlePreferenceChange('appearance', 'fontSize', e.target.value)}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="extra-large">Extra Large</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-secondary" onClick={resetToDefaults}>
            Reset to Defaults
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Preferences;