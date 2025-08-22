import axios from 'axios';

// Create axios instance with base configuration
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5002/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
API.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = user.token || user.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API calls
export const authAPI = {
  // Login user
  login: async (credentials) => {
    try {
      const response = await API.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  },

  // Register user
  register: async (userData) => {
    try {
      const response = await API.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  },

  // Register user with image
  registerWithImage: async (formData) => {
    try {
      const response = await API.post('/auth/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await API.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get user data' };
    }
  },

  // Update profile
  updateProfile: async (profileData) => {
    try {
      const response = await API.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Profile update failed' };
    }
  },

  // Upload profile image
  uploadProfileImage: async (formData) => {
    try {
      const response = await API.post('/auth/upload-profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Photo upload failed' };
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      const response = await API.put('/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Password change failed' };
    }
  },

  // Get user settings
  getUserSettings: async () => {
    try {
      const response = await API.get('/auth/settings');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to load settings' };
    }
  },

  // Update user settings
  updateUserSettings: async (settings) => {
    try {
      const response = await API.put('/auth/settings', settings);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update settings' };
    }
  },

  // Logout
  logout: async () => {
    try {
      await API.post('/auth/logout');
      localStorage.removeItem('user');
      return { success: true };
    } catch (error) {
      // Even if API call fails, remove local storage
      localStorage.removeItem('user');
      return { success: true };
    }
  }
};

// Admin API calls
export const adminAPI = {
  // Get admin dashboard stats
  getStats: async () => {
    try {
      const response = await API.get('/admin/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get admin stats' };
    }
  },

  // Get all members
  getMembers: async () => {
    try {
      const response = await API.get('/admin/members');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get members' };
    }
  },

  // Get all trainers
  getTrainers: async () => {
    try {
      const response = await API.get('/admin/trainers');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get trainers' };
    }
  },

  // Get all classes
  getClasses: async () => {
    try {
      const response = await API.get('/admin/classes');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get classes' };
    }
  },

  // Get all payments
  getPayments: async () => {
    try {
      const response = await API.get('/admin/payments');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get payments' };
    }
  },

  // Add new member
  addMember: async (memberData) => {
    try {
      const response = await API.post('/admin/members', memberData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add member' };
    }
  },

  // Add new trainer
  addTrainer: async (trainerData) => {
    try {
      const response = await API.post('/admin/trainers', trainerData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add trainer' };
    }
  },

  // Add new class
  addClass: async (classData) => {
    try {
      const response = await API.post('/admin/classes', classData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add class' };
    }
  },

  // Delete member
  deleteMember: async (memberId) => {
    try {
      const response = await API.delete(`/admin/members/${memberId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete member' };
    }
  },

  // Delete trainer
  deleteTrainer: async (trainerId) => {
    try {
      const response = await API.delete(`/admin/trainers/${trainerId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete trainer' };
    }
  },

  // Delete class
  deleteClass: async (classId, forceDelete = false) => {
    try {
      const url = forceDelete 
        ? `/admin/classes/${classId}?force=true`
        : `/admin/classes/${classId}`;
      const response = await API.delete(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete class' };
    }
  }
};

// Users API calls
export const usersAPI = {
  // Get all users (Admin only)
  getAllUsers: async () => {
    try {
      const response = await API.get('/users');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get users' };
    }
  },

  // Get single user
  getUser: async (userId) => {
    try {
      const response = await API.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get user' };
    }
  }
};

// Classes API calls
export const classesAPI = {
  // Get all classes (for authenticated users)
  getAllClasses: async () => {
    try {
      const response = await API.get('/classes');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get classes' };
    }
  },

  // Get all classes (Admin only)
  getAdminClasses: async () => {
    try {
      const response = await API.get('/admin/classes');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get admin classes' };
    }
  },

  // Get available classes for members
  getAvailableClasses: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await API.get(`/classes/available?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get available classes' };
    }
  },

  // Book a class
  bookClass: async (classId, memberId) => {
    try {
      const response = await API.post(`/classes/${classId}/enroll`, { memberId });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to book class' };
    }
  },

  // Cancel booking
  cancelBooking: async (classId, memberId) => {
    try {
      const response = await API.delete(`/classes/${classId}/enroll`, { data: { memberId } });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to cancel booking' };
    }
  },

  // Update class (Admin/Trainer)
  updateClass: async (classId, classData) => {
    try {
      const response = await API.put(`/admin/classes/${classId}`, classData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update class' };
    }
  }
};

// Plans API calls
export const plansAPI = {
  // Get plans for trainer
  getTrainerPlans: async (trainerId) => {
    try {
      const response = await API.get(`/plans/trainer/${trainerId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get trainer plans' };
    }
  },

  // Get plans for member
  getMemberPlans: async (memberId) => {
    try {
      const response = await API.get(`/plans/member/${memberId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get member plans' };
    }
  },

  // Create new plan (for trainers)
  createPlan: async (trainerId, planData) => {
    try {
      const response = await API.post(`/plans/trainer/${trainerId}`, planData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create plan' };
    }
  },

  // Update plan
  updatePlan: async (planId, planData) => {
    try {
      const response = await API.put(`/plans/${planId}`, planData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update plan' };
    }
  },

  // Delete plan (for trainers)
  deletePlan: async (trainerId, planId) => {
    try {
      const response = await API.delete(`/plans/trainer/${trainerId}/${planId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete plan' };
    }
  },

  // Get public workout/diet plans (for members)
  getPublicPlans: async () => {
    try {
      const response = await API.get('/plans/public');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get public plans' };
    }
  },

  // Get member's workout/diet plans (assigned + public)
  getMemberWorkoutDietPlans: async (memberId) => {
    try {
      const response = await API.get(`/plans/member/${memberId}/workout-diet`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get member workout/diet plans' };
    }
  }
};

// Attendance API calls
export const attendanceAPI = {
  // Get attendance records
  getAttendance: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await API.get(`/attendance?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get attendance' };
    }
  },

  // Mark attendance
  markAttendance: async (attendanceData) => {
    try {
      const response = await API.post('/attendance/mark', attendanceData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark attendance' };
    }
  },

  // Generate QR code for class
  generateQRCode: async (classId) => {
    try {
      const response = await API.post(`/attendance/generate-qr/${classId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to generate QR code' };
    }
  },

  // Scan QR code for attendance
  scanQRCode: async (scanData) => {
    try {
      const response = await API.post('/attendance/scan-qr', scanData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to scan QR code' };
    }
  },

  // Get attendance statistics
  getAttendanceStats: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await API.get(`/attendance/stats?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get attendance statistics' };
    }
  }
};

// Payments API calls
export const paymentsAPI = {
  // Get subscription plans
  getSubscriptionPlans: async () => {
    try {
      const response = await API.get('/payments/subscription-plans');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get subscription plans' };
    }
  },

  // Process payment
  processPayment: async (paymentData) => {
    try {
      const response = await API.post('/payments/process', paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to process payment' };
    }
  },

  // Get payment history for current user
  getMyPaymentHistory: async () => {
    try {
      const response = await API.get('/payments/my-history');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get payment history' };
    }
  },

  // Get payment history for current user
  getPaymentHistory: async (memberId) => {
    try {
      // For members, use my-history endpoint (memberId is ignored)
      const response = await API.get('/payments/my-history');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get payment history' };
    }
  },

  // Get payment history for specific member (Admin only)
  getPaymentHistoryForMember: async (memberId) => {
    try {
      const response = await API.get(`/payments?memberId=${memberId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get payment history' };
    }
  },

  // Cancel subscription
  cancelSubscription: async (memberId, reason) => {
    try {
      const response = await API.post('/subscriptions/cancel', { memberId, reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to cancel subscription' };
    }
  },

  // Stripe payment methods
  createStripePaymentIntent: async (paymentData) => {
    try {
      const response = await API.post('/stripe/create-payment-intent', paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create payment intent' };
    }
  },

  confirmStripePayment: async (confirmationData) => {
    try {
      const response = await API.post('/stripe/confirm-payment', confirmationData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to confirm payment' };
    }
  },

  createStripeCustomer: async () => {
    try {
      const response = await API.post('/stripe/create-customer');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create Stripe customer' };
    }
  },

  // Reactivate subscription
  reactivateSubscription: async (memberId, planId) => {
    try {
      const response = await API.post('/subscriptions/reactivate', { memberId, planId });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to reactivate subscription' };
    }
  }
};

// Notifications API calls
export const notificationsAPI = {
  // Get notifications
  getNotifications: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await API.get(`/notifications?${queryParams}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get notifications' };
    }
  },

  // Get unread count
  getUnreadCount: async () => {
    try {
      const response = await API.get('/notifications/unread-count');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get unread count' };
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await API.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark notification as read' };
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await API.put('/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark all notifications as read' };
    }
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    try {
      const response = await API.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete notification' };
    }
  },

  // Create notification (Admin only)
  createNotification: async (notificationData) => {
    try {
      const response = await API.post('/notifications', notificationData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create notification' };
    }
  }
};

// Trainers API calls
export const trainersAPI = {
  // Get trainer's assigned members
  getMyMembers: async () => {
    try {
      const response = await API.get('/trainers/my-members');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get assigned members' };
    }
  },

  // Get trainer's classes
  getMyClasses: async (period = 'all') => {
    try {
      const response = await API.get(`/trainers/my-classes?period=${period}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get trainer classes' };
    }
  },

  // Get trainer's dashboard stats
  getStats: async () => {
    try {
      const response = await API.get('/trainers/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get trainer stats' };
    }
  },

  // Get trainer's attendance records
  getAttendance: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await API.get(`/trainers/attendance?${queryParams}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get attendance records' };
    }
  }
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await API.get('/health');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Health check failed' };
  }
};

export default API;
