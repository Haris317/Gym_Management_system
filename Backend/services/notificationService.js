const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  // Create a notification for a specific user
  static async createNotification(data) {
    try {
      return await Notification.createNotification(data);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create notifications for multiple users
  static async createBulkNotifications(recipients, notificationData) {
    try {
      const notifications = recipients.map(recipientId => ({
        ...notificationData,
        recipient: recipientId
      }));

      return await Notification.insertMany(notifications);
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // Class-related notifications
  static async notifyClassScheduled(classData, members = []) {
    try {
      const notifications = [];

      // Notify enrolled members
      for (const memberId of members) {
        notifications.push({
          recipient: memberId,
          title: 'New Class Scheduled',
          message: `A new ${classData.name} class has been scheduled for ${new Date(classData.startDate).toLocaleDateString()} at ${classData.schedule.startTime}`,
          type: 'class_scheduled',
          priority: 'medium',
          data: {
            classId: classData._id,
            className: classData.name,
            startDate: classData.startDate,
            startTime: classData.schedule.startTime
          }
        });
      }

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }

      return notifications.length;
    } catch (error) {
      console.error('Error notifying class scheduled:', error);
      throw error;
    }
  }

  static async notifyClassCancelled(classData, members = []) {
    try {
      const notifications = [];

      for (const memberId of members) {
        notifications.push({
          recipient: memberId,
          title: 'Class Cancelled',
          message: `The ${classData.name} class scheduled for ${new Date(classData.startDate).toLocaleDateString()} has been cancelled`,
          type: 'class_cancelled',
          priority: 'high',
          data: {
            classId: classData._id,
            className: classData.name,
            startDate: classData.startDate
          }
        });
      }

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }

      return notifications.length;
    } catch (error) {
      console.error('Error notifying class cancelled:', error);
      throw error;
    }
  }

  // Payment-related notifications
  static async notifyPaymentReminder(memberId, paymentData) {
    try {
      return await this.createNotification({
        recipient: memberId,
        title: 'Payment Reminder',
        message: `Your payment of $${paymentData.amount} is due in ${paymentData.daysUntilDue} days`,
        type: 'payment_reminder',
        priority: paymentData.daysUntilDue <= 3 ? 'high' : 'medium',
        data: {
          amount: paymentData.amount,
          dueDate: paymentData.dueDate,
          daysUntilDue: paymentData.daysUntilDue
        }
      });
    } catch (error) {
      console.error('Error notifying payment reminder:', error);
      throw error;
    }
  }

  static async notifyPaymentReceived(memberId, paymentData) {
    try {
      return await this.createNotification({
        recipient: memberId,
        title: 'Payment Received',
        message: `Your payment of $${paymentData.amount} has been successfully processed`,
        type: 'payment_received',
        priority: 'low',
        data: {
          amount: paymentData.amount,
          paymentDate: paymentData.paymentDate,
          paymentId: paymentData.paymentId
        }
      });
    } catch (error) {
      console.error('Error notifying payment received:', error);
      throw error;
    }
  }

  // Plan-related notifications
  static async notifyPlanAssigned(memberId, planData, trainerId) {
    try {
      return await this.createNotification({
        recipient: memberId,
        sender: trainerId,
        title: 'New Plan Assigned',
        message: `A new ${planData.type} plan "${planData.title}" has been assigned to you`,
        type: 'plan_assigned',
        priority: 'medium',
        data: {
          planId: planData._id,
          planTitle: planData.title,
          planType: planData.type,
          trainerId: trainerId
        }
      });
    } catch (error) {
      console.error('Error notifying plan assigned:', error);
      throw error;
    }
  }

  static async notifyPlanUpdated(memberId, planData, trainerId) {
    try {
      return await this.createNotification({
        recipient: memberId,
        sender: trainerId,
        title: 'Plan Updated',
        message: `Your ${planData.type} plan "${planData.title}" has been updated`,
        type: 'plan_updated',
        priority: 'medium',
        data: {
          planId: planData._id,
          planTitle: planData.title,
          planType: planData.type,
          trainerId: trainerId
        }
      });
    } catch (error) {
      console.error('Error notifying plan updated:', error);
      throw error;
    }
  }

  // Membership-related notifications
  static async notifyMembershipExpiring(memberId, daysUntilExpiry) {
    try {
      return await this.createNotification({
        recipient: memberId,
        title: 'Membership Expiring Soon',
        message: `Your membership will expire in ${daysUntilExpiry} days. Please renew to continue enjoying our services`,
        type: 'membership_expiring',
        priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
        data: {
          daysUntilExpiry: daysUntilExpiry
        }
      });
    } catch (error) {
      console.error('Error notifying membership expiring:', error);
      throw error;
    }
  }

  // Trainer assignment notifications
  static async notifyTrainerAssigned(memberId, trainerId) {
    try {
      const trainer = await User.findById(trainerId).select('firstName lastName');
      
      return await this.createNotification({
        recipient: memberId,
        sender: trainerId,
        title: 'Trainer Assigned',
        message: `${trainer.firstName} ${trainer.lastName} has been assigned as your personal trainer`,
        type: 'trainer_assigned',
        priority: 'medium',
        data: {
          trainerId: trainerId,
          trainerName: `${trainer.firstName} ${trainer.lastName}`
        }
      });
    } catch (error) {
      console.error('Error notifying trainer assigned:', error);
      throw error;
    }
  }

  // Booking notifications
  static async notifyBookingConfirmed(memberId, classData) {
    try {
      return await this.createNotification({
        recipient: memberId,
        title: 'Booking Confirmed',
        message: `Your booking for ${classData.name} on ${new Date(classData.startDate).toLocaleDateString()} at ${classData.schedule.startTime} has been confirmed`,
        type: 'booking_confirmed',
        priority: 'medium',
        data: {
          classId: classData._id,
          className: classData.name,
          startDate: classData.startDate,
          startTime: classData.schedule.startTime
        }
      });
    } catch (error) {
      console.error('Error notifying booking confirmed:', error);
      throw error;
    }
  }

  // System announcements
  static async createSystemAnnouncement(title, message, recipients = 'all', priority = 'medium') {
    try {
      let userIds = [];

      if (recipients === 'all') {
        const users = await User.find({ isActive: true }).select('_id');
        userIds = users.map(user => user._id);
      } else if (Array.isArray(recipients)) {
        userIds = recipients;
      } else {
        // Recipients is a role
        const users = await User.find({ role: recipients, isActive: true }).select('_id');
        userIds = users.map(user => user._id);
      }

      const notifications = userIds.map(userId => ({
        recipient: userId,
        title: title,
        message: message,
        type: 'system_announcement',
        priority: priority,
        data: {
          isSystemAnnouncement: true
        }
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }

      return notifications.length;
    } catch (error) {
      console.error('Error creating system announcement:', error);
      throw error;
    }
  }

  // Generate sample notifications for testing
  static async generateSampleNotifications(userId) {
    try {
      const sampleNotifications = [
        {
          recipient: userId,
          title: 'Welcome to the Gym!',
          message: 'Welcome to our gym management system. We\'re excited to have you on board!',
          type: 'system_announcement',
          priority: 'medium'
        },
        {
          recipient: userId,
          title: 'Payment Due Soon',
          message: 'Your monthly membership payment of $50 is due in 3 days',
          type: 'payment_reminder',
          priority: 'high',
          data: { amount: 50, daysUntilDue: 3 }
        },
        {
          recipient: userId,
          title: 'New Yoga Class Available',
          message: 'A new yoga class has been scheduled for tomorrow at 6:00 PM',
          type: 'class_scheduled',
          priority: 'medium',
          data: { className: 'Yoga', startTime: '6:00 PM' }
        }
      ];

      await Notification.insertMany(sampleNotifications);
      return sampleNotifications.length;
    } catch (error) {
      console.error('Error generating sample notifications:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;