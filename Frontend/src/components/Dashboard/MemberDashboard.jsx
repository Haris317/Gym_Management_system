import React, { useState, useEffect } from 'react';
import ClassManagement from '../Classes/ClassManagement';
import PlanManagement from '../Plans/PlanManagement';
import AttendanceManagement from '../Attendance/AttendanceManagement';
import PaymentManagement from '../Payments/PaymentManagement';
import Navbar from '../Navbar/Navbar';
import { authAPI, classesAPI, attendanceAPI, plansAPI } from '../../services/api';
import './Dashboard.css';

const MemberDashboard = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [memberInfo, setMemberInfo] = useState({});
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [dietPlan, setDietPlan] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMemberData();
    loadUserData();
  }, []);

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

  const loadMemberData = async () => {
    try {
      setLoading(true);

      // Get current user info
      const userResponse = await authAPI.getCurrentUser();
      const user = userResponse.user;

      setMemberInfo({
        name: `${user.firstName} ${user.lastName}`,
        membershipType: user.membershipType || 'Basic',
        joinDate: user.membershipStartDate ? new Date(user.membershipStartDate).toLocaleDateString() : 'N/A',
        trainer: user.assignedTrainer ? `${user.assignedTrainer.firstName} ${user.assignedTrainer.lastName}` : 'Not Assigned'
      });

      // Get available classes (upcoming)
      const classesResponse = await classesAPI.getAvailableClasses();
      const upcomingClasses = classesResponse.data
        .filter(cls => new Date(cls.startDate) > new Date())
        .slice(0, 3)
        .map(cls => ({
          id: cls._id,
          name: cls.name,
          date: new Date(cls.startDate).toLocaleDateString(),
          time: cls.schedule.startTime,
          trainer: cls.trainer ? `${cls.trainer.firstName} ${cls.trainer.lastName}` : 'TBA'
        }));
      setUpcomingClasses(upcomingClasses);

      // Get member's workout and diet plans from backend
      try {
        const plansResponse = await plansAPI.getMemberWorkoutDietPlans(user._id);
        const plans = plansResponse.data || [];

        // Find the latest workout and diet plans
        const workoutPlans = plans.filter(plan => plan.type === 'workout');
        const dietPlans = plans.filter(plan => plan.type === 'diet');

        if (workoutPlans.length > 0) {
          const latestWorkout = workoutPlans[0]; // Already sorted by createdAt desc
          setWorkoutPlan({
            name: latestWorkout.title,
            duration: latestWorkout.duration ? `${latestWorkout.duration} min` : 'Ongoing',
            uploadDate: new Date(latestWorkout.createdAt).toLocaleDateString(),
            trainer: latestWorkout.trainer ? `${latestWorkout.trainer.firstName} ${latestWorkout.trainer.lastName}` : 'Unknown',
            category: latestWorkout.category,
            difficulty: latestWorkout.difficulty,
            id: latestWorkout._id
          });
        } else {
          setWorkoutPlan({
            name: 'No Workout Plan Assigned',
            duration: 'N/A',
            uploadDate: 'Contact your trainer for a personalized plan'
          });
        }

        if (dietPlans.length > 0) {
          const latestDiet = dietPlans[0]; // Already sorted by createdAt desc
          setDietPlan({
            name: latestDiet.title,
            duration: 'Ongoing',
            uploadDate: new Date(latestDiet.createdAt).toLocaleDateString(),
            trainer: latestDiet.trainer ? `${latestDiet.trainer.firstName} ${latestDiet.trainer.lastName}` : 'Unknown',
            category: latestDiet.category,
            difficulty: latestDiet.difficulty,
            id: latestDiet._id
          });
        } else {
          setDietPlan({
            name: 'No Diet Plan Assigned',
            duration: 'N/A',
            uploadDate: 'Contact your trainer for a personalized nutrition plan'
          });
        }

        console.log('📋 Loaded plans for member dashboard:', {
          workoutPlans: workoutPlans.length,
          dietPlans: dietPlans.length
        });
      } catch (error) {
        console.error('Failed to load member plans:', error);
        // Fallback to default state
        setWorkoutPlan({
          name: 'Unable to Load Workout Plan',
          duration: 'N/A',
          uploadDate: 'Please try refreshing the page'
        });
        setDietPlan({
          name: 'Unable to Load Diet Plan',
          duration: 'N/A',
          uploadDate: 'Please try refreshing the page'
        });
      }

      // Get attendance statistics
      const attendanceResponse = await attendanceAPI.getAttendance({
        memberId: user._id,
        period: 'month'
      });

      const attendanceData = attendanceResponse.data || [];
      const thisMonth = attendanceData.filter(record =>
        record.status === 'present' &&
        new Date(record.date).getMonth() === new Date().getMonth()
      ).length;

      const totalSessions = attendanceData.length;
      const presentSessions = attendanceData.filter(record => record.status === 'present').length;

      // Calculate streak (simplified)
      let streak = 0;
      const sortedAttendance = attendanceData
        .filter(record => record.status === 'present')
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      for (let i = 0; i < sortedAttendance.length; i++) {
        const currentDate = new Date(sortedAttendance[i].date);
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);

        if (currentDate.toDateString() === expectedDate.toDateString()) {
          streak++;
        } else {
          break;
        }
      }

      setAttendanceStats({
        thisMonth,
        totalSessions,
        streak
      });

    } catch (error) {
      console.error('Error loading member data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="dashboard-container">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="dashboard-content">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <h3>{attendanceStats.thisMonth}</h3>
              <p>This Month</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏃</div>
            <div className="stat-info">
              <h3>{attendanceStats.totalSessions}</h3>
              <p>Total Sessions</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-info">
              <h3>{attendanceStats.streak}</h3>
              <p>Day Streak</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            Classes
          </button>
          <button
            className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            My Plans
          </button>
          <button
            className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            Attendance
          </button>
          <button
            className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            Payments
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="dashboard-sections">
              <div className="section">
                <h2>Quick Actions</h2>
                <div className="action-buttons">
                  <button className="action-btn" onClick={() => setActiveTab('classes')}>
                    Book Class
                  </button>
                  <button className="action-btn" onClick={() => setActiveTab('classes')}>
                    View Schedule
                  </button>
                  <button className="action-btn" onClick={() => setActiveTab('attendance')}>
                    Check Attendance
                  </button>
                  <button className="action-btn" onClick={() => setActiveTab('payments')}>
                    Payment History
                  </button>
                </div>
              </div>

              <div className="section">
                <h2>My Plans</h2>
                <div className="plans-container">
                  {workoutPlan && (
                    <div className="plan-card">
                      <h4>🏋️ Workout Plan</h4>
                      <p><strong>{workoutPlan.name}</strong></p>
                      <p>Duration: {workoutPlan.duration}</p>
                      {workoutPlan.trainer && (
                        <p>Trainer: {workoutPlan.trainer}</p>
                      )}
                      {workoutPlan.category && workoutPlan.difficulty && (
                        <p>Level: {workoutPlan.difficulty} • Category: {workoutPlan.category}</p>
                      )}
                      <p>Created: {workoutPlan.uploadDate}</p>
                      <button
                        className="btn-small"
                        onClick={() => {
                          if (workoutPlan.id) {
                            // Navigate to full plan view or download
                            setActiveTab('plans');
                          }
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  )}

                  {dietPlan && (
                    <div className="plan-card">
                      <h4>🥗 Diet Plan</h4>
                      <p><strong>{dietPlan.name}</strong></p>
                      <p>Duration: {dietPlan.duration}</p>
                      {dietPlan.trainer && (
                        <p>Trainer: {dietPlan.trainer}</p>
                      )}
                      {dietPlan.category && dietPlan.difficulty && (
                        <p>Level: {dietPlan.difficulty} • Category: {dietPlan.category}</p>
                      )}
                      <p>Created: {dietPlan.uploadDate}</p>
                      <button
                        className="btn-small"
                        onClick={() => {
                          if (dietPlan.id) {
                            // Navigate to full plan view or download
                            setActiveTab('plans');
                          }
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="section">
                <h2>Upcoming Classes</h2>
                <div className="classes-list">
                  {upcomingClasses.map(classItem => (
                    <div key={classItem.id} className="class-item">
                      <div className="class-info">
                        <h4>{classItem.name}</h4>
                        <p>Date: {classItem.date}</p>
                        <p>Time: {classItem.time}</p>
                        <p>Trainer: {classItem.trainer}</p>
                      </div>
                      <div className="class-actions">
                        <button className="btn-small">Cancel</button>
                        <button className="btn-small">Details</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="section">
                <h2>Membership Info</h2>
                <div className="membership-info">
                  <p><strong>Type:</strong> {memberInfo.membershipType}</p>
                  <p><strong>Join Date:</strong> {memberInfo.joinDate}</p>
                  <p><strong>Trainer:</strong> {memberInfo.trainer}</p>
                  <button className="action-btn" onClick={() => setActiveTab('payments')}>
                    Upgrade Membership
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <ClassManagement
              userRole="member"
              userId={user.id}
            />
          )}

          {activeTab === 'plans' && (
            <PlanManagement
              userRole="member"
              userId={user.id}
              userName={`${user.firstName} ${user.lastName}`}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceManagement
              userRole="member"
              userId={user.id}
              userName={`${user.firstName} ${user.lastName}`}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentManagement
              userRole="member"
              userId={user.id}
              userName={`${user.firstName} ${user.lastName}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;
