import React, { useState, useEffect } from 'react';
import ClassManagement from '../Classes/ClassManagement';
import PlanManagement from '../Plans/PlanManagement';
import AttendanceManagement from '../Attendance/AttendanceManagement';
import Navbar from '../Navbar/Navbar';
import { authAPI, trainersAPI, classesAPI, attendanceAPI } from '../../services/api';
import './Dashboard.css';

const TrainerDashboard = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [assignedMembers, setAssignedMembers] = useState([]);
  const [todayClasses, setTodayClasses] = useState([]);
  const [stats, setStats] = useState({
    totalAssignedMembers: 0,
    todayClasses: 0,
    completedSessions: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTrainerData();
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

  const loadTrainerData = async () => {
    try {
      setLoading(true);

      // Get trainer's assigned members
      const membersResponse = await trainersAPI.getMyMembers();
      const assignedMembersList = (membersResponse.data || []).map(member => ({
        id: member._id,
        name: `${member.firstName} ${member.lastName}`,
        plan: member.membershipType || 'Basic',
        lastSession: 'N/A' // This would need attendance data
      }));
      setAssignedMembers(assignedMembersList);

      // Get today's classes for this trainer
      const classesResponse = await trainersAPI.getMyClasses('today');
      const trainerTodayClasses = (classesResponse.data || []).map(cls => ({
        id: cls._id,
        name: cls.name,
        time: cls.schedule?.startTime || 'TBD',
        participants: cls.currentEnrollment || 0
      }));
      setTodayClasses(trainerTodayClasses);

      // Get trainer statistics
      const statsResponse = await trainersAPI.getStats();
      setStats(statsResponse.data || {
        totalAssignedMembers: 0,
        todayClasses: 0,
        completedSessions: 0
      });

    } catch (error) {
      console.error('Error loading trainer data:', error);
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
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>{stats.totalAssignedMembers}</h3>
              <p>Assigned Members</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <h3>{stats.todayClasses}</h3>
              <p>Today's Classes</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <h3>{stats.completedSessions}</h3>
              <p>Completed Sessions</p>
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
            Class Management
          </button>
          <button
            className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            Workout & Diet Plans
          </button>
          <button
            className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            Attendance
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="dashboard-sections">
              <div className="section">
                <h2>Quick Actions</h2>
                <div className="action-buttons">
                  <button className="action-btn" onClick={() => setActiveTab('plans')}>
                    Upload Workout Plan
                  </button>
                  <button className="action-btn" onClick={() => setActiveTab('plans')}>
                    Upload Diet Plan
                  </button>
                  <button className="action-btn" onClick={() => setActiveTab('attendance')}>
                    Mark Attendance
                  </button>
                  <button className="action-btn" onClick={() => setActiveTab('classes')}>
                    Schedule Class
                  </button>
                </div>
              </div>

              <div className="section">
                <h2>Today's Classes</h2>
                <div className="classes-list">
                  {todayClasses.map(classItem => (
                    <div key={classItem.id} className="class-item">
                      <div className="class-info">
                        <h4>{classItem.name}</h4>
                        <p>Time: {classItem.time}</p>
                        <p>Participants: {classItem.participants}</p>
                      </div>
                      <div className="class-actions">
                        <button className="btn-small">Start Class</button>
                        <button className="btn-small">View Details</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="section">
                <h2>Assigned Members</h2>
                <div className="members-list">
                  {assignedMembers.map(member => (
                    <div key={member.id} className="member-item">
                      <div className="member-info">
                        <h4>{member.name}</h4>
                        <p>Plan: {member.plan}</p>
                        <p>Last Session: {member.lastSession}</p>
                      </div>
                      <div className="member-actions">
                        <button className="btn-small">View Progress</button>
                        <button className="btn-small">Update Plan</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <ClassManagement
              userRole="trainer"
              userId={user.id}
              userName={`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Trainer'}
            />
          )}

          {activeTab === 'plans' && (
            <PlanManagement
              userRole="trainer"
              userId={user.id}
              userName={`${user.firstName} ${user.lastName}`}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceManagement
              userRole="trainer"
              userId={user.id}
              userName={`${user.firstName} ${user.lastName}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainerDashboard;
