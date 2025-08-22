import React from 'react';
import './Notifications.css';

const NotificationToast = ({ notification, onClose }) => {
  if (!notification) return null;

  const { type, title, message, icon, simple } = notification;

  return (
    <div className={`notification-toast ${type} ${simple ? 'simple' : ''}`}>
      <div className="notification-content">
        <div className="notification-icon">
          {icon || (type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️')}
        </div>
        <div className="notification-text">
          <h4 className="notification-title">{title}</h4>
          <p className="notification-message">{message}</p>
        </div>
        <button className="notification-close" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;