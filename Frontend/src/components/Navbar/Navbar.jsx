import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../../services/api';
import MyProfile from '../Profile/MyProfile';
import Settings from '../Profile/Settings';
import Preferences from '../Profile/Preferences';
import HelpSupport from '../Profile/HelpSupport';
import './Navbar.css';

const Navbar = ({ user, onLogout }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const navigate = useNavigate();

  // Load notifications on component mount
  useEffect(() => {
    if (user && user.id) {
      loadNotifications();
      loadUnreadCount();
      
      // Set up polling for real-time updates (every 30 seconds)
      const interval = setInterval(() => {
        loadUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await notificationsAPI.getNotifications({ limit: 10 });
      setNotifications(response.data || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await notificationsAPI.markAsRead(notification._id);
        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationDropdownToggle = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && notifications.length === 0) {
      loadNotifications();
    }
  };

  const handleLogout = () => {
    setShowDropdown(false);
    onLogout();
  };

  const handleModalOpen = (modalType) => {
    setActiveModal(modalType);
    setShowDropdown(false);
  };

  const handleModalClose = () => {
    setActiveModal(null);
  };

  const handleProfileUpdate = (updatedUser) => {
    // Update user data in parent component if needed
    console.log('Profile updated:', updatedUser);
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#dc3545';
      case 'trainer': return '#28a745';
      case 'member': return '#007bff';
      default: return '#6c757d';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return '👑';
      case 'trainer': return '🏋️';
      case 'member': return '👤';
      default: return '👤';
    }
  };

  return (
    <nav className="modern-navbar">
      <div className="navbar-container">
        {/* Logo Section */}
        <div className="navbar-brand">
          <div className="brand-icon">💪</div>
          <div className="brand-text">
            <span className="brand-name">GymPro</span>
            <span className="brand-tagline">Management System</span>
          </div>
        </div>

        {/* Center Navigation - Removed as requested */}
        <div className="navbar-nav">
          {/* All navigation buttons removed */}
        </div>

        {/* Right Section */}
        <div className="navbar-actions">
          {/* Search */}
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search..." 
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>

          {/* Notifications */}
          <div className="notification-container" ref={notificationRef}>
            <button 
              className="notification-btn"
              onClick={handleNotificationDropdownToggle}
            >
              <span className="notification-icon">🔔</span>
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h3>Notifications</h3>
                  {unreadCount > 0 && (
                    <button className="mark-all-read" onClick={handleMarkAllRead}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="notification-list">
                  {loadingNotifications ? (
                    <div className="notification-loading">
                      <span>Loading notifications...</span>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="notification-empty">
                      <span>No notifications yet</span>
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div 
                        key={notification._id} 
                        className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="notification-content">
                          <h4 className="notification-title">{notification.title}</h4>
                          <p className="notification-message">{notification.message}</p>
                          <span className="notification-time">{notification.timeAgo}</span>
                        </div>
                        {!notification.isRead && <div className="unread-dot"></div>}
                      </div>
                    ))
                  )}
                </div>
                <div className="notification-footer">
                  <button className="view-all-btn">View All Notifications</button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="profile-container" ref={dropdownRef}>
            <button 
              className="profile-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="profile-avatar">
                {user.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt="Profile" 
                    className="profile-image"
                  />
                ) : (
                  <div className="profile-initials">
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                )}
                <div 
                  className="role-indicator"
                  style={{ backgroundColor: getRoleColor(user.role) }}
                >
                  {getRoleIcon(user.role)}
                </div>
              </div>
              <div className="profile-info">
                <span className="profile-name">{user.firstName} {user.lastName}</span>
                <span className="profile-role">{user.role}</span>
              </div>
              <span className="dropdown-arrow">▼</span>
            </button>

            {showDropdown && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">
                    {user.profileImage ? (
                      <img 
                        src={user.profileImage} 
                        alt="Profile" 
                        className="dropdown-profile-image"
                      />
                    ) : (
                      <div className="dropdown-profile-initials">
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                    )}
                  </div>
                  <div className="dropdown-info">
                    <h4>{user.firstName} {user.lastName}</h4>
                    <p>{user.email}</p>
                    <span className="role-badge" style={{ backgroundColor: getRoleColor(user.role) }}>
                      {getRoleIcon(user.role)} {user.role}
                    </span>
                  </div>
                </div>

                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={() => handleModalOpen('profile')}>
                    <span className="item-icon">👤</span>
                    <span>My Profile</span>
                  </button>
                  <button className="dropdown-item" onClick={() => handleModalOpen('settings')}>
                    <span className="item-icon">⚙️</span>
                    <span>Settings</span>
                  </button>
                  <button className="dropdown-item" onClick={() => handleModalOpen('preferences')}>
                    <span className="item-icon">🎨</span>
                    <span>Preferences</span>
                  </button>
                  <button className="dropdown-item" onClick={() => handleModalOpen('help')}>
                    <span className="item-icon">❓</span>
                    <span>Help & Support</span>
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout-item" onClick={handleLogout}>
                    <span className="item-icon">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Modals */}
      {activeModal === 'profile' && (
        <MyProfile
          user={user}
          onClose={handleModalClose}
          onUpdate={handleProfileUpdate}
        />
      )}

      {activeModal === 'settings' && (
        <Settings
          user={user}
          onClose={handleModalClose}
        />
      )}

      {activeModal === 'preferences' && (
        <Preferences
          user={user}
          onClose={handleModalClose}
        />
      )}

      {activeModal === 'help' && (
        <HelpSupport
          user={user}
          onClose={handleModalClose}
        />
      )}
    </nav>
  );
};

export default Navbar;