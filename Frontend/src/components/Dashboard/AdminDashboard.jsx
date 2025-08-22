import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminAPI, authAPI } from '../../services/api';
import Navbar from '../Navbar/Navbar';
import './Dashboard.css';

const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalTrainers: 0,
    totalClasses: 0,
    monthlyRevenue: 0
  });

  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [analyticsData, setAnalyticsData] = useState({
    memberGrowth: 0,
    revenueGrowth: 0,
    avgAttendance: 0,
    avgRating: 0
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);

  // Enhanced notification states
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState({
    message: '',
    type: 'success',
    icon: '✅'
  });

  // Confirmation modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState(null);

  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState(null);

  // Form states
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [showAddTrainerForm, setShowAddTrainerForm] = useState(false);
  const [showAddClassForm, setShowAddClassForm] = useState(false);

  const [memberForm, setMemberForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    membershipType: 'basic'
  });

  const [trainerForm, setTrainerForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specializations: ''
  });

  const [classForm, setClassForm] = useState({
    name: '',
    trainerId: '',
    startTime: '',
    endTime: '',
    startDate: '',
    capacity: '',
    type: 'other',
    description: '',
    location: '',
    pricing: {
      memberRate: '',
      dropInRate: ''
    }
  });

  useEffect(() => {
    loadDashboardData();
    loadUserData();
  }, []);

  // Update activeTab when URL parameters change
  useEffect(() => {
    const tab = searchParams.get('tab') || 'overview';
    setActiveTab(tab);
  }, [searchParams]);

  // Calculate analytics when data changes
  useEffect(() => {
    if (members.length > 0 || classes.length > 0) {
      calculateAnalytics();
    }
  }, [members, classes]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const calculateAnalytics = () => {
    // Calculate member growth (members joined this month vs last month)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const thisMonthMembers = members.filter(member => {
      const joinDate = new Date(member.createdAt);
      return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
    }).length;
    
    const lastMonthMembers = members.filter(member => {
      const joinDate = new Date(member.createdAt);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return joinDate.getMonth() === lastMonth && joinDate.getFullYear() === lastMonthYear;
    }).length;
    
    const memberGrowth = lastMonthMembers > 0 ? ((thisMonthMembers - lastMonthMembers) / lastMonthMembers * 100) : 0;
    
    // Calculate average class attendance
    const totalCapacity = classes.reduce((sum, cls) => sum + (cls.capacity || 0), 0);
    const totalEnrolled = classes.reduce((sum, cls) => sum + (cls.currentEnrollment || cls.enrolled || 0), 0);
    const avgAttendance = totalCapacity > 0 ? (totalEnrolled / totalCapacity * 100) : 0;
    
    // Simulate revenue growth (in real app, this would come from payment data)
    const revenueGrowth = Math.floor(Math.random() * 20) + 5; // 5-25% growth
    
    // Simulate average rating
    const avgRating = (4.2 + Math.random() * 0.8).toFixed(1); // 4.2-5.0 rating
    
    setAnalyticsData({
      memberGrowth: memberGrowth.toFixed(1),
      revenueGrowth: revenueGrowth.toFixed(1),
      avgAttendance: avgAttendance.toFixed(1),
      avgRating: avgRating
    });
  };

  // Quick Reports handlers
  const handleMemberReport = () => {
    const reportData = {
      title: 'Member Report',
      icon: '👥',
      type: 'member',
      summary: {
        totalMembers: stats.totalMembers,
        activeMembers: members.filter(m => m.isActive).length,
        newThisMonth: members.filter(member => {
          const joinDate = new Date(member.createdAt);
          const currentDate = new Date();
          return joinDate.getMonth() === currentDate.getMonth() && 
                 joinDate.getFullYear() === currentDate.getFullYear();
        }).length,
        growth: analyticsData.memberGrowth
      },
      breakdown: {
        basic: members.filter(m => m.membershipType === 'basic').length,
        premium: members.filter(m => m.membershipType === 'premium').length,
        vip: members.filter(m => m.membershipType === 'vip').length
      }
    };
    
    setCurrentReport(reportData);
    setShowReportModal(true);
  };

  const handleRevenueReport = () => {
    const reportData = {
      title: 'Revenue Report',
      icon: '💰',
      type: 'revenue',
      summary: {
        monthlyRevenue: stats.monthlyRevenue,
        totalPayments: payments.length,
        avgPayment: payments.length > 0 ? (stats.monthlyRevenue / payments.length).toFixed(2) : 0,
        growth: analyticsData.revenueGrowth
      },
      breakdown: {
        basic: members.filter(m => m.membershipType === 'basic').length * 1,
        premium: members.filter(m => m.membershipType === 'premium').length * 10,
        vip: members.filter(m => m.membershipType === 'vip').length * 20
      }
    };
    
    setCurrentReport(reportData);
    setShowReportModal(true);
  };

  const handleClassReport = () => {
    const classTypes = {};
    classes.forEach(cls => {
      classTypes[cls.type] = (classTypes[cls.type] || 0) + 1;
    });

    const reportData = {
      title: 'Class Report',
      icon: '📅',
      type: 'class',
      summary: {
        totalClasses: stats.totalClasses,
        totalCapacity: classes.reduce((sum, cls) => sum + (cls.capacity || 0), 0),
        totalEnrolled: classes.reduce((sum, cls) => sum + (cls.currentEnrollment || cls.enrolled || 0), 0),
        avgAttendance: analyticsData.avgAttendance
      },
      breakdown: classTypes
    };
    
    setCurrentReport(reportData);
    setShowReportModal(true);
  };

  const handleTrainerReport = () => {
    const specializations = {};
    trainers.forEach(trainer => {
      if (trainer.specializations) {
        trainer.specializations.forEach(spec => {
          specializations[spec] = (specializations[spec] || 0) + 1;
        });
      }
    });

    const reportData = {
      title: 'Trainer Report',
      icon: '🏋️',
      type: 'trainer',
      summary: {
        totalTrainers: stats.totalTrainers,
        activeTrainers: trainers.filter(t => t.isActive).length,
        avgRating: analyticsData.avgRating,
        experience: trainers.reduce((sum, t) => sum + (t.experience || 0), 0) / trainers.length || 0
      },
      breakdown: specializations
    };
    
    setCurrentReport(reportData);
    setShowReportModal(true);
  };

  // Export Report Handler
  const handleExportReport = () => {
    if (!currentReport) return;

    // Create CSV content
    let csvContent = `${currentReport.title}\n`;
    csvContent += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    
    // Add summary data
    csvContent += "Summary\n";
    Object.entries(currentReport.summary).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      csvContent += `${label},${value}\n`;
    });
    
    csvContent += "\nBreakdown\n";
    Object.entries(currentReport.breakdown).forEach(([key, value]) => {
      csvContent += `${key.charAt(0).toUpperCase() + key.slice(1)},${value}\n`;
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentReport.title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message
    setSuccessMessage(`${currentReport.title} exported successfully!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const loadUserData = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      const userData = response.user;
      
      // Update user state with profile image
      const updatedUser = {
        ...user,
        ...userData,
        profileImage: userData.profileImage ? `http://localhost:5002/api/auth/profile-image/${userData.profileImage.split('/').pop()}` : null
      };
      
      setUser(updatedUser);
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, membersRes, trainersRes, classesRes, paymentsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getMembers(),
        adminAPI.getTrainers(),
        adminAPI.getClasses(),
        adminAPI.getPayments()
      ]);

      setStats(statsRes.data);
      setMembers(membersRes.data);
      setTrainers(trainersRes.data);
      setClasses(classesRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Add Member Handler
  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const response = await adminAPI.addMember(memberForm);
      setMemberForm({ firstName: '', lastName: '', email: '', phone: '', membershipType: 'basic' });
      setShowAddMemberForm(false);
      
      // Show enhanced notification
      setNotificationData({
        message: `Member Added Successfully! ${response.data.firstName} ${response.data.lastName} has been added as a member.`,
        type: 'success',
        icon: '👤'
      });
      setShowNotification(true);
      
      loadDashboardData(); // Refresh data
      
      // Auto-hide notification after 4 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 4000);
    } catch (error) {
      setError(error.message || 'Failed to add member');
    }
  };

  // Add Trainer Handler
  const handleAddTrainer = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const trainerData = {
        ...trainerForm,
        specializations: trainerForm.specializations.split(',').map(s => s.trim())
      };
      const response = await adminAPI.addTrainer(trainerData);
      setTrainerForm({ firstName: '', lastName: '', email: '', phone: '', specializations: '' });
      setShowAddTrainerForm(false);
      
      // Show enhanced notification
      setNotificationData({
        message: `Trainer Added Successfully! ${response.data.firstName} ${response.data.lastName} has been added to the team.`,
        type: 'success',
        icon: '🏋️'
      });
      setShowNotification(true);
      
      loadDashboardData(); // Refresh data
      
      // Auto-hide notification after 4 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 4000);
    } catch (error) {
      setError(error.message || 'Failed to add trainer');
    }
  };

  // Add Class Handler
  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const response = await adminAPI.addClass(classForm);
      setClassForm({
        name: '', trainerId: '', startTime: '', endTime: '', startDate: '',
        capacity: '', type: 'other', description: '', location: '',
        pricing: { memberRate: '', dropInRate: '' }
      });
      setShowAddClassForm(false);
      
      // Show enhanced notification
      setNotificationData({
        message: `Class Created Successfully! "${response.data.name}" has been added to the schedule.`,
        type: 'success',
        icon: '📅'
      });
      setShowNotification(true);
      
      // Auto-hide notification after 4 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 4000);
      
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Class creation error:', error);

      // Handle validation errors
      if (error.errors && Array.isArray(error.errors)) {
        const errorMessages = error.errors.map(err => `${err.field}: ${err.message}`).join(', ');
        setError(`Validation errors: ${errorMessages}`);
      } else {
        setError(error.message || 'Failed to add class');
      }
    }
  };

  // Delete Member Handler
  const handleDeleteMember = async (memberId) => {
    // Find member details
    const member = members.find(m => m._id === memberId || m.id === memberId);
    const memberName = member ? `${member.firstName} ${member.lastName}` : 'Unknown Member';
    
    // Show custom delete confirmation modal
    setDeleteModalData({
      type: 'member',
      id: memberId,
      name: memberName,
      title: 'Delete Member',
      message: `Are you sure you want to delete ${memberName}? This action cannot be undone.`,
      icon: '👤',
      confirmText: 'Delete Member',
      onConfirm: () => performDeleteMember(memberId, memberName),
      onCancel: () => setShowDeleteModal(false)
    });
    setShowDeleteModal(true);
  };

  // Perform actual member deletion
  const performDeleteMember = async (memberId, memberName) => {
    setShowDeleteModal(false);
    try {
      await adminAPI.deleteMember(memberId);
      setNotificationData({
        message: `Member ${memberName} deleted successfully!`,
        type: 'success',
        icon: '🗑️'
      });
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      loadDashboardData(); // Refresh data
    } catch (error) {
      setError(`Failed to delete member: ${error.message || 'Please try again'}`);
    }
  };

  // Delete Trainer Handler
  const handleDeleteTrainer = async (trainerId) => {
    // Find trainer details
    const trainer = trainers.find(t => t._id === trainerId || t.id === trainerId);
    const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : 'Unknown Trainer';
    
    // Show custom delete confirmation modal
    setDeleteModalData({
      type: 'trainer',
      id: trainerId,
      name: trainerName,
      title: 'Delete Trainer',
      message: `Are you sure you want to delete ${trainerName}? This action cannot be undone.`,
      icon: '🏋️',
      confirmText: 'Delete Trainer',
      onConfirm: () => performDeleteTrainer(trainerId, trainerName),
      onCancel: () => setShowDeleteModal(false)
    });
    setShowDeleteModal(true);
  };

  // Perform actual trainer deletion
  const performDeleteTrainer = async (trainerId, trainerName) => {
    console.log('🗑️ Attempting to delete trainer:', { trainerId, trainerName });
    setShowDeleteModal(false);
    
    try {
      console.log('📡 Calling API to delete trainer...');
      const response = await adminAPI.deleteTrainer(trainerId);
      console.log('✅ Delete API response:', response);
      
      // Show success notification
      setNotificationData({
        message: `Trainer ${trainerName} deleted successfully!`,
        type: 'success',
        icon: '🗑️'
      });
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      
      console.log('🔄 Refreshing trainer data...');
      await loadDashboardData(); // Refresh data
      console.log('✅ Data refreshed successfully');
      
    } catch (error) {
      console.error('❌ Delete trainer error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.status
      });
      
      // Show error notification instead of just setting error
      setNotificationData({
        message: `Failed to delete trainer: ${error.message || 'Please try again'}`,
        type: 'error',
        icon: '❌'
      });
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    }
  };

  // Delete Class Handler
  const handleDeleteClass = async (classId, forceDelete = false) => {
    // Find the class details before deletion
    const classToDelete = classes.find(cls => (cls._id || cls.id) === classId);
    const className = classToDelete?.name || 'Unknown Class';
    const trainerName = classToDelete?.trainer 
      ? (typeof classToDelete.trainer === 'object' 
          ? `${classToDelete.trainer.firstName} ${classToDelete.trainer.lastName}`
          : classToDelete.trainer)
      : 'Unknown Trainer';
    
    // Show custom confirmation modal
    setConfirmModalData({
      type: forceDelete ? 'force-delete' : 'delete',
      title: forceDelete ? 'Force Delete Class?' : 'Delete Class?',
      message: forceDelete 
        ? `This will permanently delete "${className}" and unenroll all members. This action cannot be undone.`
        : `Are you sure you want to delete "${className}"? This action cannot be undone.`,
      icon: forceDelete ? '⚠️' : '🗑️',
      className: className,
      trainerName: trainerName,
      classId: classId,
      forceDelete: forceDelete,
      confirmText: forceDelete ? 'Force Delete' : 'Delete Class',
      cancelText: 'Cancel',
      onConfirm: () => performDeleteClass(classId, forceDelete),
      onCancel: () => setShowConfirmModal(false)
    });
    setShowConfirmModal(true);
  };

  // Perform the actual deletion
  const performDeleteClass = async (classId, forceDelete = false) => {
    const classToDelete = classes.find(cls => (cls._id || cls.id) === classId);
    const className = classToDelete?.name || 'Unknown Class';
    
    setShowConfirmModal(false); // Close confirmation modal
    
    try {
      await adminAPI.deleteClass(classId, forceDelete);
      
      // Show enhanced notification
      setNotificationData({
        message: `Class Deleted Successfully! "${className}" has been removed from the schedule.`,
        type: 'success',
        icon: '🗑️'
      });
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 4000);
      
      loadDashboardData(); // Refresh data
      
    } catch (error) {
      console.error('Delete class error:', error);
      
      // Check if it's an enrollment error that can be force deleted
      if (error.canForceDelete && error.enrolledCount > 0) {
        // Show force delete confirmation
        setConfirmModalData({
          type: 'force-delete-option',
          title: 'Class Has Enrolled Members',
          message: `${error.message}\n\nWould you like to force delete this class? This will unenroll all ${error.enrolledCount} members.`,
          icon: '⚠️',
          className: className,
          enrolledCount: error.enrolledCount,
          classId: classId,
          confirmText: 'Force Delete',
          cancelText: 'Cancel',
          onConfirm: () => performDeleteClass(classId, true),
          onCancel: () => setShowConfirmModal(false)
        });
        setShowConfirmModal(true);
      } else {
        // Show error message
        setError(`Failed to Delete Class: ${error.message || 'Please try again or contact support'}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Navbar user={user} onLogout={handleLogout} />

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="dashboard-content">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>{stats.totalMembers}</h3>
              <p>Total Members</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏋️</div>
            <div className="stat-info">
              <h3>{stats.totalTrainers}</h3>
              <p>Total Trainers</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <h3>{stats.totalClasses}</h3>
              <p>Total Classes</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>${stats.monthlyRevenue}</h3>
              <p>Monthly Revenue</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => handleTabChange('members')}
          >
            Members ({members.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'trainers' ? 'active' : ''}`}
            onClick={() => handleTabChange('trainers')}
          >
            Trainers ({trainers.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => handleTabChange('classes')}
          >
            Classes ({classes.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => handleTabChange('payments')}
          >
            Payments ({payments.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleTabChange('analytics')}
          >
            Analytics
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-section">
              <h2>Quick Actions</h2>
              <div className="action-buttons">
                <button className="action-btn" onClick={() => setShowAddMemberForm(true)}>
                  Add New Member
                </button>
                <button className="action-btn" onClick={() => setShowAddTrainerForm(true)}>
                  Add New Trainer
                </button>
                <button className="action-btn" onClick={() => setShowAddClassForm(true)}>
                  Create Class
                </button>
                <button className="action-btn" onClick={() => setActiveTab('payments')}>
                  View Payments
                </button>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="members-section">
              <div className="section-header">
                <h2>Members Management</h2>
                <button className="action-btn" onClick={() => setShowAddMemberForm(true)}>
                  Add New Member
                </button>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Membership</th>
                      <th>Join Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => (
                      <tr key={member._id || member.id}>
                        <td>{member.firstName} {member.lastName}</td>
                        <td>{member.email}</td>
                        <td>{member.membershipType}</td>
                        <td>{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <span className={`status ${member.isActive ? 'active' : 'inactive'}`}>
                            {member.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteMember(member._id || member.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'trainers' && (
            <div className="trainers-section">
              <div className="section-header">
                <h2>Trainers Management</h2>
                <button className="action-btn" onClick={() => setShowAddTrainerForm(true)}>
                  Add New Trainer
                </button>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Specializations</th>
                      <th>Join Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainers.map(trainer => (
                      <tr key={trainer._id || trainer.id}>
                        <td>{trainer.firstName} {trainer.lastName}</td>
                        <td>{trainer.email}</td>
                        <td>{trainer.specializations?.join(', ') || 'N/A'}</td>
                        <td>{trainer.createdAt ? new Date(trainer.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <span className={`status ${trainer.isActive ? 'active' : 'inactive'}`}>
                            {trainer.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteTrainer(trainer._id || trainer.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="classes-section">
              <div className="section-header">
                <h2>Classes Management</h2>
                <button className="action-btn" onClick={() => setShowAddClassForm(true)}>
                  Create New Class
                </button>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th>Trainer</th>
                      <th>Time</th>
                      <th>Capacity</th>
                      <th>Enrolled</th>
                      <th>Type</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map(classItem => (
                      <tr key={classItem._id || classItem.id}>
                        <td>{classItem.name}</td>
                        <td>
                          {classItem.trainer
                            ? (typeof classItem.trainer === 'object'
                                ? `${classItem.trainer.firstName} ${classItem.trainer.lastName}`
                                : classItem.trainer)
                            : 'No trainer assigned'
                          }
                        </td>
                        <td>
                          {classItem.schedule?.startTime || classItem.time || 'Not set'}
                          {classItem.schedule?.endTime && ` - ${classItem.schedule.endTime}`}
                        </td>
                        <td>{classItem.capacity}</td>
                        <td>{classItem.currentEnrollment || classItem.enrolled || 0}</td>
                        <td>{classItem.type}</td>
                        <td>
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteClass(classItem._id || classItem.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="payments-section">
              <h2>Payments Management</h2>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(payment => (
                      <tr key={payment.id}>
                        <td>{payment.memberName}</td>
                        <td>${payment.amount}</td>
                        <td>{payment.date}</td>
                        <td>{payment.type}</td>
                        <td>
                          <span className={`status ${payment.status === 'completed' ? 'active' : 'inactive'}`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-section">
              <h2>Analytics & Reports</h2>
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h3>📊 Member Growth</h3>
                  <div className="analytics-content">
                    <div className="metric">
                      <span className="metric-value">{stats.totalMembers}</span>
                      <span className="metric-label">Total Members</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">+{analyticsData.memberGrowth}%</span>
                      <span className="metric-label">This Month</span>
                    </div>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>💰 Revenue Analytics</h3>
                  <div className="analytics-content">
                    <div className="metric">
                      <span className="metric-value">${stats.monthlyRevenue}</span>
                      <span className="metric-label">Monthly Revenue</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">+{analyticsData.revenueGrowth}%</span>
                      <span className="metric-label">Growth Rate</span>
                    </div>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>🏋️ Class Performance</h3>
                  <div className="analytics-content">
                    <div className="metric">
                      <span className="metric-value">{stats.totalClasses}</span>
                      <span className="metric-label">Total Classes</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{analyticsData.avgAttendance}%</span>
                      <span className="metric-label">Avg Attendance</span>
                    </div>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>👥 Staff Performance</h3>
                  <div className="analytics-content">
                    <div className="metric">
                      <span className="metric-value">{stats.totalTrainers}</span>
                      <span className="metric-label">Active Trainers</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{analyticsData.avgRating}/5</span>
                      <span className="metric-label">Avg Rating</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="reports-section">
                <h3>📈 Quick Reports</h3>
                <div className="reports-grid">
                  <button className="report-btn" onClick={handleMemberReport}>
                    <span className="report-icon">📊</span>
                    <span className="report-text">Member Report</span>
                  </button>
                  <button className="report-btn" onClick={handleRevenueReport}>
                    <span className="report-icon">💰</span>
                    <span className="report-text">Revenue Report</span>
                  </button>
                  <button className="report-btn" onClick={handleClassReport}>
                    <span className="report-icon">📅</span>
                    <span className="report-text">Class Report</span>
                  </button>
                  <button className="report-btn" onClick={handleTrainerReport}>
                    <span className="report-icon">🏋️</span>
                    <span className="report-text">Trainer Report</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Member Modal */}
        {showAddMemberForm && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Add New Member</h3>
              <form onSubmit={handleAddMember}>
                <input
                  type="text"
                  placeholder="First Name"
                  value={memberForm.firstName}
                  onChange={(e) => setMemberForm({...memberForm, firstName: e.target.value})}
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={memberForm.lastName}
                  onChange={(e) => setMemberForm({...memberForm, lastName: e.target.value})}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({...memberForm, email: e.target.value})}
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})}
                  required
                />
                <select
                  value={memberForm.membershipType}
                  onChange={(e) => setMemberForm({...memberForm, membershipType: e.target.value})}
                >
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="vip">VIP</option>
                </select>
                <div className="modal-actions">
                  <button type="submit">Add Member</button>
                  <button type="button" onClick={() => setShowAddMemberForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Trainer Modal */}
        {showAddTrainerForm && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Add New Trainer</h3>
              <form onSubmit={handleAddTrainer}>
                <input
                  type="text"
                  placeholder="First Name"
                  value={trainerForm.firstName}
                  onChange={(e) => setTrainerForm({...trainerForm, firstName: e.target.value})}
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={trainerForm.lastName}
                  onChange={(e) => setTrainerForm({...trainerForm, lastName: e.target.value})}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={trainerForm.email}
                  onChange={(e) => setTrainerForm({...trainerForm, email: e.target.value})}
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={trainerForm.phone}
                  onChange={(e) => setTrainerForm({...trainerForm, phone: e.target.value})}
                  required
                />
                <input
                  type="text"
                  placeholder="Specializations (comma separated)"
                  value={trainerForm.specializations}
                  onChange={(e) => setTrainerForm({...trainerForm, specializations: e.target.value})}
                />
                <div className="modal-actions">
                  <button type="submit">Add Trainer</button>
                  <button type="button" onClick={() => setShowAddTrainerForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Class Modal */}
        {showAddClassForm && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Create New Class</h3>
              <form onSubmit={handleAddClass}>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Class Name"
                    value={classForm.name}
                    onChange={(e) => setClassForm({...classForm, name: e.target.value})}
                    required
                  />
                  <select
                    value={classForm.type}
                    onChange={(e) => setClassForm({...classForm, type: e.target.value})}
                  >
                    <option value="other">Other</option>
                    <option value="yoga">Yoga</option>
                    <option value="pilates">Pilates</option>
                    <option value="hiit">HIIT</option>
                    <option value="strength">Strength</option>
                    <option value="cardio">Cardio</option>
                    <option value="crossfit">CrossFit</option>
                    <option value="dance">Dance</option>
                    <option value="martial_arts">Martial Arts</option>
                    <option value="swimming">Swimming</option>
                  </select>
                </div>

                <div className="form-row">
                  <select
                    value={classForm.trainerId}
                    onChange={(e) => setClassForm({...classForm, trainerId: e.target.value})}
                    required
                  >
                    <option value="">Select Trainer</option>
                    {trainers.map(trainer => (
                      <option key={trainer._id || trainer.id} value={trainer._id || trainer.id}>
                        {trainer.firstName} {trainer.lastName}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Capacity"
                    value={classForm.capacity}
                    onChange={(e) => setClassForm({...classForm, capacity: e.target.value})}
                    required
                  />
                </div>

                <div className="form-row">
                  <input
                    type="date"
                    value={classForm.startDate}
                    onChange={(e) => setClassForm({...classForm, startDate: e.target.value})}
                    required
                  />
                  <input
                    type="time"
                    placeholder="Start Time"
                    value={classForm.startTime}
                    onChange={(e) => setClassForm({...classForm, startTime: e.target.value})}
                    required
                  />
                  <input
                    type="time"
                    placeholder="End Time"
                    value={classForm.endTime}
                    onChange={(e) => setClassForm({...classForm, endTime: e.target.value})}
                  />
                </div>

                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Location (optional)"
                    value={classForm.location}
                    onChange={(e) => setClassForm({...classForm, location: e.target.value})}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Drop-in Rate (optional)"
                    value={classForm.pricing.dropInRate}
                    onChange={(e) => setClassForm({
                      ...classForm,
                      pricing: { ...classForm.pricing, dropInRate: e.target.value }
                    })}
                  />
                </div>

                <textarea
                  placeholder="Class Description (optional)"
                  value={classForm.description}
                  onChange={(e) => setClassForm({...classForm, description: e.target.value})}
                  rows="3"
                />

                <div className="modal-actions">
                  <button type="submit">Create Class</button>
                  <button type="button" onClick={() => setShowAddClassForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && currentReport && (
          <div className="modal-overlay">
            <div className="modal report-modal">
              <div className="modal-header">
                <div className="report-header">
                  <span className="report-header-icon">{currentReport.icon}</span>
                  <h2>{currentReport.title}</h2>
                </div>
                <button 
                  className="modal-close-btn" 
                  onClick={() => setShowReportModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="modal-content">
                <div className="report-content">
                  {/* Summary Cards */}
                  <div className="report-summary">
                    <h3>📊 Summary</h3>
                    <div className="summary-grid">
                      {currentReport.type === 'member' && (
                        <>
                          <div className="summary-card">
                            <div className="summary-value">{currentReport.summary.totalMembers}</div>
                            <div className="summary-label">Total Members</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-value">{currentReport.summary.activeMembers}</div>
                            <div className="summary-label">Active Members</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-value">{currentReport.summary.newThisMonth}</div>
                            <div className="summary-label">New This Month</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-value">+{currentReport.summary.growth}%</div>
                            <div className="summary-label">Growth Rate</div>
                          </div>
                        </>
                      )}
                      
                      {currentReport.type === 'revenue' && (
                        <>
                          <div className="summary-card">
                            <div className="summary-value">${currentReport.summary.monthlyRevenue}</div>
                            <div className="summary-label">Monthly Revenue</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-value">{currentReport.summary.totalPayments}</div>
                            <div className="summary-label">Total Payments</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-value">${currentReport.summary.avgPayment}</div>
                            <div className="summary-label">Avg Payment</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-value">+{currentReport.summary.growth}%</div>
                            <div className="summary-label">Growth Rate</div>
                          </div>
                        </>
                      )}
                      
                      {currentReport.type === 'class' && (
                        <>
                          <div className="summary-card">
                            <div className="summary-value">{currentReport.summary.totalClasses}</div>
                            <div className="summary-label">Total Classes</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-value">{currentReport.summary.totalCapacity}</div>
                            <div className="summary-label">Total Capacity</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-value">{currentReport.summary.totalEnrolled}</div>
                            <div className="summary-label">Total Enrolled</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-value">{currentReport.summary.avgAttendance}%</div>
                            <div className="summary-label">Avg Attendance</div>
                          </div>
                        </>
                      )}
                      
                      {currentReport.type === 'trainer' && (
                        <>
                          <div className="summary-card">
                            <div className="summary-value">{currentReport.summary.totalTrainers}</div>
                            <div className="summary-label">Total Trainers</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-value">{currentReport.summary.activeTrainers}</div>
                            <div className="summary-label">Active Trainers</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-value">{currentReport.summary.avgRating}/5</div>
                            <div className="summary-label">Avg Rating</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-value">{currentReport.summary.experience.toFixed(1)}</div>
                            <div className="summary-label">Avg Experience</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Breakdown Section */}
                  <div className="report-breakdown">
                    <h3>📈 Breakdown</h3>
                    <div className="breakdown-grid">
                      {Object.entries(currentReport.breakdown).map(([key, value]) => (
                        <div key={key} className="breakdown-item">
                          <div className="breakdown-bar">
                            <div className="breakdown-label">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
                            <div className="breakdown-value">{value}</div>
                          </div>
                          <div className="breakdown-progress">
                            <div 
                              className="breakdown-fill" 
                              style={{ 
                                width: `${Math.min((value / Math.max(...Object.values(currentReport.breakdown))) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="btn-secondary" 
                  onClick={() => setShowReportModal(false)}
                >
                  Close
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleExportReport}
                >
                  Export Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Old notification system removed - now using react-toastify */}

        {/* Custom Confirmation Modal */}
        {showConfirmModal && confirmModalData && (
          <div className="confirm-modal-overlay">
            <div className={`confirm-modal ${confirmModalData.type}`}>
              <div className="confirm-modal-header">
                <div className="confirm-icon">{confirmModalData.icon}</div>
                <h3 className="confirm-title">{confirmModalData.title}</h3>
              </div>
              
              <div className="confirm-modal-content">
                <p className="confirm-message">{confirmModalData.message}</p>
                
                <div className="confirm-details">
                  <div className="detail-item">
                    <span className="detail-label">Class:</span>
                    <span className="detail-value">{confirmModalData.className}</span>
                  </div>
                  {confirmModalData.trainerName && (
                    <div className="detail-item">
                      <span className="detail-label">Trainer:</span>
                      <span className="detail-value">{confirmModalData.trainerName}</span>
                    </div>
                  )}
                  {confirmModalData.enrolledCount && (
                    <div className="detail-item warning">
                      <span className="detail-label">Enrolled Members:</span>
                      <span className="detail-value">{confirmModalData.enrolledCount} students</span>
                    </div>
                  )}
                </div>
                
                {confirmModalData.type === 'force-delete' && (
                  <div className="warning-box">
                    <div className="warning-icon">⚠️</div>
                    <div className="warning-text">
                      <strong>Warning:</strong> This action will permanently remove the class and unenroll all members. This cannot be undone.
                    </div>
                  </div>
                )}
                
                {confirmModalData.type === 'force-delete-option' && (
                  <div className="info-box">
                    <div className="info-icon">ℹ️</div>
                    <div className="info-text">
                      Force deleting will automatically unenroll all members from this class before deletion.
                    </div>
                  </div>
                )}
              </div>
              
              <div className="confirm-modal-actions">
                <button 
                  className="confirm-btn cancel"
                  onClick={confirmModalData.onCancel}
                >
                  {confirmModalData.cancelText}
                </button>
                <button 
                  className={`confirm-btn ${confirmModalData.type.includes('force') ? 'danger' : 'delete'}`}
                  onClick={confirmModalData.onConfirm}
                >
                  {confirmModalData.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Delete Confirmation Modal */}
        {showDeleteModal && deleteModalData && (
          <div className="delete-modal-overlay">
            <div className="delete-modal">
              <div className="delete-modal-header">
                <div className="delete-modal-icon">
                  <div className="icon-circle">
                    <span className="warning-icon">⚠️</span>
                  </div>
                </div>
                <h3 className="delete-modal-title">{deleteModalData.title}</h3>
                <button 
                  className="delete-modal-close"
                  onClick={() => setShowDeleteModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="delete-modal-content">
                <div className="delete-modal-info">
                  <div className="entity-icon">{deleteModalData.icon}</div>
                  <div className="entity-details">
                    <div className="entity-name">{deleteModalData.name}</div>
                    <div className="entity-type">{deleteModalData.type}</div>
                  </div>
                </div>
                
                <p className="delete-modal-message">{deleteModalData.message}</p>
                
                <div className="delete-modal-warning">
                  <span className="warning-text">⚠️ This action is permanent and cannot be undone</span>
                </div>
              </div>
              
              <div className="delete-modal-actions">
                <button 
                  className="delete-modal-cancel"
                  onClick={deleteModalData.onCancel}
                >
                  Cancel
                </button>
                <button 
                  className="delete-modal-confirm"
                  onClick={deleteModalData.onConfirm}
                >
                  {deleteModalData.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced notification popup */}
        {showNotification && (
          <div className={`enhanced-notification ${notificationData.type}`}>
            <div className="notification-content">
              <div className="notification-icon">{notificationData.icon}</div>
              <div className="notification-text">
                <div className="notification-title">
                  {notificationData.type === 'success' ? 'Success!' : 
                   notificationData.type === 'error' ? 'Error!' : 
                   notificationData.type === 'warning' ? 'Warning!' : 'Info!'}
                </div>
                <div className="notification-message">{notificationData.message}</div>
              </div>
              <button className="notification-close" onClick={() => setShowNotification(false)}>×</button>
            </div>
            <div className="notification-progress"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
