import React, { useState, useEffect } from 'react';
import { classesAPI, adminAPI, trainersAPI } from '../../services/api';
import './Classes.css';

const ClassManagement = ({ userRole, userId, userName }) => {
  const [classes, setClasses] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(userRole === 'member' ? 'available' : 'manage');
  
  // Form states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Success popup states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successType, setSuccessType] = useState('booking'); // 'booking' or 'cancel'
  
  const [classForm, setClassForm] = useState({
    name: '',
    trainer: '',
    trainerId: '',
    time: '',
    endTime: '',
    date: '',
    dayOfWeek: '',
    capacity: '',
    type: 'general',
    description: '',
    location: '',
    price: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const promises = [];
      
      if (userRole === 'admin') {
        promises.push(classesAPI.getAllClasses());
        promises.push(adminAPI.getTrainers());
      } else if (userRole === 'trainer') {
        promises.push(trainersAPI.getMyClasses());
        // Trainers don't need the full trainers list, just their own info
      }
      
      if (userRole === 'member' || userRole === 'admin') {
        promises.push(classesAPI.getAvailableClasses());
      }

      const results = await Promise.all(promises);
      
      if (userRole === 'admin') {
        setClasses(results[0].data);
        setTrainers(results[1].data);
        if (results[2]) setAvailableClasses(results[2].data);
      } else if (userRole === 'trainer') {
        setClasses(results[0].data);
        // For trainers, we'll set their own info as the only trainer
        const name = userName || 'Trainer';
        setTrainers([{
          _id: userId,
          firstName: name.split(' ')[0] || 'Trainer',
          lastName: name.split(' ')[1] || '',
          email: 'trainer@gym.com'
        }]);
      } else {
        setAvailableClasses(results[0].data);
      }
    } catch (error) {
      setError('Failed to load class data');
      console.error('Class data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.addClass(classForm);
      setClassForm({
        name: '', trainer: '', trainerId: '', time: '', endTime: '', date: '',
        dayOfWeek: '', capacity: '', type: 'general', description: '', location: '', price: ''
      });
      setShowCreateForm(false);
      loadData();
    } catch (error) {
      setError('Failed to create class');
    }
  };

  const handleBookClass = async (classId) => {
    try {
      const response = await classesAPI.bookClass(classId, userId);
      if (response.success) {
        // Find the class name for the success message
        const bookedClass = availableClasses.find(cls => (cls._id || cls.id) === classId);
        setSuccessMessage(`Successfully enrolled in ${bookedClass?.name || 'the class'}!`);
        setSuccessType('booking');
        setShowSuccessModal(true);
        loadData();
        
        // Auto-hide success modal after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 3000);
      }
    } catch (error) {
      setError('Failed to book class');
    }
  };

  const handleCancelBooking = async (classId) => {
    try {
      const response = await classesAPI.cancelBooking(classId, userId);
      if (response.success) {
        // Find the class name for the success message
        const cancelledClass = availableClasses.find(cls => (cls._id || cls.id) === classId);
        setSuccessMessage(`Successfully cancelled booking for ${cancelledClass?.name || 'the class'}!`);
        setSuccessType('cancel');
        setShowSuccessModal(true);
        loadData();
        
        // Auto-hide success modal after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 3000);
      }
    } catch (error) {
      setError('Failed to cancel booking');
    }
  };

  const handleDeleteClass = async (classId) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        await adminAPI.deleteClass(classId);
        loadData();
      } catch (error) {
        setError('Failed to delete class');
      }
    }
  };

  if (loading) return <div className="loading">Loading classes...</div>;

  return (
    <div className="class-management">
      <div className="class-header">
        <h2>Class Management</h2>
        {(userRole === 'admin' || userRole === 'trainer') && (
          <button className="create-btn" onClick={() => setShowCreateForm(true)}>
            Create New Class
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Navigation Tabs */}
      <div className="class-tabs">
        {(userRole === 'admin' || userRole === 'trainer') && (
          <button 
            className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            Manage Classes ({classes.length})
          </button>
        )}
        <button 
          className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`}
          onClick={() => setActiveTab('available')}
        >
          Available Classes ({availableClasses.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'manage' && (userRole === 'admin' || userRole === 'trainer') && (
          <div className="manage-classes">
            <div className="classes-grid">
              {classes.map(classItem => (
                <div key={classItem.id} className="class-card">
                  <div className="class-header">
                    <h3>{classItem.name}</h3>
                    <span className={`class-type ${classItem.type}`}>{classItem.type}</span>
                  </div>
                  <div className="class-details">
                    <p><strong>Trainer:</strong> {
                      classItem.trainer
                        ? (typeof classItem.trainer === 'object'
                            ? `${classItem.trainer.firstName} ${classItem.trainer.lastName}`
                            : classItem.trainer)
                        : 'No trainer assigned'
                    }</p>
                    <p><strong>Time:</strong> {
                      classItem.schedule?.startTime || classItem.time || 'Not set'
                    } - {
                      classItem.schedule?.endTime || classItem.endTime || 'Not set'
                    }</p>
                    <p><strong>Date:</strong> {
                      classItem.startDate
                        ? new Date(classItem.startDate).toLocaleDateString()
                        : classItem.date || 'Not set'
                    }</p>
                    <p><strong>Capacity:</strong> {
                      classItem.currentEnrollment || classItem.enrolled || 0
                    }/{classItem.capacity}</p>
                    <p><strong>Location:</strong> {
                      classItem.location?.room || classItem.location || 'Not specified'
                    }</p>
                    <p><strong>Price:</strong> ${
                      classItem.pricing?.dropInRate || classItem.price || '0'
                    }</p>
                  </div>
                  <div className="class-actions">
                    <button className="edit-btn">Edit</button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteClass(classItem.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'available' && (
          <div className="available-classes">
            <div className="classes-grid">
              {availableClasses.map(classItem => (
                <div key={classItem.id} className="class-card available">
                  <div className="class-header">
                    <h3>{classItem.name}</h3>
                    <span className={`class-type ${classItem.type}`}>{classItem.type}</span>
                  </div>
                  <div className="class-details">
                    <p><strong>Trainer:</strong> {
                      classItem.trainer
                        ? (typeof classItem.trainer === 'object'
                            ? `${classItem.trainer.firstName} ${classItem.trainer.lastName}`
                            : classItem.trainer)
                        : 'No trainer assigned'
                    }</p>
                    <p><strong>Time:</strong> {
                      classItem.schedule?.startTime || classItem.time || 'Not set'
                    } - {
                      classItem.schedule?.endTime || classItem.endTime || 'Not set'
                    }</p>
                    <p><strong>Date:</strong> {
                      classItem.startDate
                        ? new Date(classItem.startDate).toLocaleDateString()
                        : classItem.date || 'Not set'
                    }</p>
                    <p><strong>Available Spots:</strong> {
                      classItem.capacity - (classItem.currentEnrollment || classItem.enrolled || 0)
                    }</p>
                    <p><strong>Location:</strong> {
                      classItem.location?.room || classItem.location || 'Not specified'
                    }</p>
                    <p><strong>Price:</strong> ${
                      classItem.pricing?.dropInRate || classItem.price || '0'
                    }</p>
                    {classItem.description && <p><strong>Description:</strong> {classItem.description}</p>}
                  </div>
                  {userRole === 'member' && (
                    <div className="class-actions">
                      {classItem.enrolledMembers?.some(enrollment =>
                        (typeof enrollment === 'object' ? enrollment.member : enrollment) === userId
                      ) ? (
                        <button
                          className="cancel-btn"
                          onClick={() => handleCancelBooking(classItem._id || classItem.id)}
                        >
                          Cancel Booking
                        </button>
                      ) : (
                        <button
                          className="book-btn"
                          onClick={() => handleBookClass(classItem._id || classItem.id)}
                          disabled={(classItem.currentEnrollment || classItem.enrolled || 0) >= classItem.capacity}
                        >
                          {(classItem.currentEnrollment || classItem.enrolled || 0) >= classItem.capacity ? 'Join Waitlist' : 'Book Class'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Class Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal large">
            <h3>Create New Class</h3>
            <form onSubmit={handleCreateClass}>
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
                  <option value="general">General</option>
                  <option value="yoga">Yoga</option>
                  <option value="pilates">Pilates</option>
                  <option value="hiit">HIIT</option>
                  <option value="strength">Strength</option>
                  <option value="cardio">Cardio</option>
                </select>
              </div>
              
              <div className="form-row">
                <select
                  value={classForm.trainerId}
                  onChange={(e) => {
                    const trainer = trainers.find(t => t.id === parseInt(e.target.value));
                    setClassForm({
                      ...classForm, 
                      trainerId: e.target.value,
                      trainer: trainer ? `${trainer.firstName} ${trainer.lastName}` : ''
                    });
                  }}
                  required
                >
                  <option value="">Select Trainer</option>
                  {trainers.map(trainer => (
                    <option key={trainer.id} value={trainer.id}>
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
                  value={classForm.date}
                  onChange={(e) => setClassForm({...classForm, date: e.target.value})}
                  required
                />
                <input
                  type="time"
                  placeholder="Start Time"
                  value={classForm.time}
                  onChange={(e) => setClassForm({...classForm, time: e.target.value})}
                  required
                />
                <input
                  type="time"
                  placeholder="End Time"
                  value={classForm.endTime}
                  onChange={(e) => setClassForm({...classForm, endTime: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <input
                  type="text"
                  placeholder="Location"
                  value={classForm.location}
                  onChange={(e) => setClassForm({...classForm, location: e.target.value})}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={classForm.price}
                  onChange={(e) => setClassForm({...classForm, price: e.target.value})}
                />
              </div>

              <textarea
                placeholder="Class Description"
                value={classForm.description}
                onChange={(e) => setClassForm({...classForm, description: e.target.value})}
                rows="3"
              />

              <div className="modal-actions">
                <button type="submit">Create Class</button>
                <button type="button" onClick={() => setShowCreateForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay success-overlay">
          <div className="success-modal">
            <div className="success-animation">
              <div className="success-checkmark">
                <div className="check-icon">
                  <span className="icon-line line-tip"></span>
                  <span className="icon-line line-long"></span>
                  <div className="icon-circle"></div>
                  <div className="icon-fix"></div>
                </div>
              </div>
            </div>
            
            <div className="success-content">
              <h2 className="success-title">
                {successType === 'booking' ? '🎉 Booking Confirmed!' : '✅ Booking Cancelled!'}
              </h2>
              <p className="success-message">{successMessage}</p>
              
              <div className="success-details">
                {successType === 'booking' ? (
                  <>
                    <div className="success-tip">
                      <span className="tip-icon">💡</span>
                      <span>Don't forget to arrive 10 minutes early!</span>
                    </div>
                    <div className="success-actions">
                      <button 
                        className="btn-primary"
                        onClick={() => setShowSuccessModal(false)}
                      >
                        View My Classes
                      </button>
                      <button 
                        className="btn-secondary"
                        onClick={() => setShowSuccessModal(false)}
                      >
                        Book Another Class
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="success-tip">
                      <span className="tip-icon">ℹ️</span>
                      <span>You can book this class again anytime!</span>
                    </div>
                    <div className="success-actions">
                      <button 
                        className="btn-primary"
                        onClick={() => setShowSuccessModal(false)}
                      >
                        Browse Classes
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <button 
              className="success-close"
              onClick={() => setShowSuccessModal(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;
