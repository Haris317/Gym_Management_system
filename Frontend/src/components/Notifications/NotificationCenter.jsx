import React, { useState, useEffect, useRef } from 'react';
import { notificationAPI } from '../../services/api';
import './Notifications.css';

const NotificationCenter = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await notificationAPI.getNotifications({ limit: 10 });
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await notificationAPI.markAsRead(notification._id);
        setNotifications(prev => 
          prev.map(n => 
            n._id === notification._id 
              ? { ...n, isRead: true, readAt: new Date() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      loadNotifications();
      loadUnreadCount();
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'class_scheduled': '📅',
      'class_cancelled': '❌',
      'class_updated': '📝',
      'payment_reminder': '💳',
      'payment_received': '💰',
      'plan_assigned': '📋',
      'plan_updated': '📝',
      'membership_expiring': '⏰',
      'attendance_marked': '✅',
      'system_announcement': '📢',
      'trainer_assigned': '🏋️',
      'booking_confirmed': '✅',
      'booking_cancelled': '❌'
    };
    return icons[type] || '📢';
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button className="notification-bell" onClick={toggleDropdown}>
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3 className="notification-dropdown-title">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#007bff', 
                  cursor: 'pointer',
                  fontSize: '12px',
                  float: 'right',
                  marginTop: '-20px'
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading && (
              <div className="notification-loading">Loading notifications...</div>
            )}

            {error && (
              <div className="notification-error">{error}</div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="notification-empty">
                <div className="notification-empty-icon">🔔</div>
                <p className="notification-empty-text">No notifications yet</p>
              </div>
            )}

            {!loading && !error && notifications.map(notification => (
              <div
                key={notification._id}
                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-item-content">
                  <div className="notification-item-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-item-text">
                    <h4 className="notification-item-title">{notification.title}</h4>
                    <p className="notification-item-message">{notification.message}</p>
                    <span className="notification-item-time">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {notifications.length > 0 && (
            <div className="notification-dropdown-footer">
              <a href="#" className="notification-view-all">View all notifications</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;