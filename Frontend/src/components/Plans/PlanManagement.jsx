import React, { useState, useEffect } from 'react';
import { plansAPI, adminAPI } from '../../services/api';
import './Plans.css';

const PlanManagement = ({ userRole, userId, userName }) => {
  const [plans, setPlans] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [members, setMembers] = useState([]);
  const [currentMembership, setCurrentMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(userRole === 'member' ? 'workout-diet' : 'workout');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [planForm, setPlanForm] = useState({
    type: 'workout',
    title: '',
    description: '',
    category: 'general',
    difficulty: 'beginner',
    duration: 30, // Duration in minutes for workout plans
    content: '', // For diet plans
    exercises: [], // For workout plans
    equipment: [],
    tags: '',
    assignToMembers: [], // Array of member IDs to assign the plan to
    isPublic: true // Make plans public by default so members can see them
  });

  useEffect(() => {
    loadPlans();
    
    // Load members list for trainers to assign plans
    if (userRole === 'trainer') {
      loadMembers();
    }
  }, [userRole, userId]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      let response;
      
      if (userRole === 'trainer') {
        response = await plansAPI.getTrainerPlans(userId);
        setPlans(response.data);
      } else if (userRole === 'member') {
        // For members, get workout/diet plans and try to get subscription plans
        let workoutDietPlans = [];
        let subscriptionPlansData = [];
        
        // Get workout/diet plans
        try {
          const workoutDietResponse = await plansAPI.getMemberWorkoutDietPlans(userId);
          workoutDietPlans = workoutDietResponse.data || [];
          setPlans(workoutDietPlans);
        } catch (workoutDietError) {
          console.error('Error loading workout/diet plans:', workoutDietError);
          setPlans([]);
        }
        
        // Try to get subscription plans (this might not be implemented yet)
        try {
          const subscriptionResponse = await plansAPI.getMemberPlans(userId);
          setCurrentMembership(subscriptionResponse.data.currentMembership || null);
          subscriptionPlansData = subscriptionResponse.data.availablePlans || [];
          setSubscriptionPlans(subscriptionPlansData);
        } catch (subscriptionError) {
          console.log('Subscription plans not available:', subscriptionError.message);
          setSubscriptionPlans([]);
          setCurrentMembership(null);
        }

        console.log('📋 Loaded plans for member:', {
          subscriptionPlans: subscriptionPlansData.length,
          workoutDietPlans: workoutDietPlans.length
        });
      } else if (userRole === 'admin') {
        // For admin, get all plans (we'll need to modify backend for this)
        response = await plansAPI.getTrainerPlans(userId);
        setPlans(response.data);
      }
    } catch (error) {
      setError('Failed to load plans');
      console.error('Plans error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadMembers = async () => {
    try {
      // Get all members assigned to this trainer
      const membersResponse = await adminAPI.getMembers();
      const allMembers = membersResponse.data || [];
      const assignedMembersList = allMembers
        .filter(member => member.assignedTrainer && member.assignedTrainer._id === userId)
        .map(member => ({
          id: member._id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email
        }));
      setMembers(assignedMembersList);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };



  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      const planData = {
        ...planForm,
        trainerId: userId,
        trainerName: userName,
        // Convert tags from string to array if needed
        tags: planForm.tags ? planForm.tags.split(',').map(tag => tag.trim()) : []
      };

      console.log('Creating plan with data:', planData);
      await plansAPI.createPlan(userId, planData);
      setPlanForm({
        type: 'workout',
        title: '',
        description: '',
        category: 'general',
        difficulty: 'beginner',
        duration: 30,
        content: '',
        exercises: [],
        equipment: [],
        tags: '',
        assignToMembers: [],
        isPublic: true
      });
      setShowCreateForm(false);
      loadPlans();
    } catch (error) {
      setError('Failed to create plan');
      console.error('Error creating plan:', error);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      try {
        await plansAPI.deletePlan(userId, planId);
        loadPlans();
      } catch (error) {
        setError('Failed to delete plan');
      }
    }
  };

  const downloadPlan = (plan) => {
    // Create downloadable content
    let content = `${plan.title}\n${'='.repeat(plan.title.length)}\n\n`;
    content += `Description: ${plan.description}\n`;
    content += `Type: ${plan.type}\n`;
    content += `Category: ${plan.category}\n`;
    content += `Difficulty: ${plan.difficulty}\n`;

    if (plan.duration) {
      content += `Duration: ${plan.duration} minutes\n`;
    }

    if (plan.equipment && plan.equipment.length > 0) {
      content += `Equipment: ${plan.equipment.join(', ')}\n`;
    }

    if (plan.tags && plan.tags.length > 0) {
      const tags = Array.isArray(plan.tags) ? plan.tags.join(', ') : plan.tags;
      content += `Tags: ${tags}\n`;
    }

    content += `\n${plan.type === 'diet' ? 'Nutrition Plan' : 'Workout Plan'}:\n`;
    content += '-'.repeat(20) + '\n';

    if (plan.content) {
      content += plan.content;
    } else if (plan.exercises && plan.exercises.length > 0) {
      content += 'Exercises:\n';
      plan.exercises.forEach((exercise, index) => {
        content += `${index + 1}. ${exercise.name}\n`;
        if (exercise.sets) content += `   Sets: ${exercise.sets}\n`;
        if (exercise.reps) content += `   Reps: ${exercise.reps}\n`;
        if (exercise.weight) content += `   Weight: ${exercise.weight}\n`;
        if (exercise.duration) content += `   Duration: ${exercise.duration}\n`;
        if (exercise.notes) content += `   Notes: ${exercise.notes}\n`;
        content += '\n';
      });
    } else {
      content += 'No detailed content available.\n';
    }

    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${plan.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSubscribe = async (planId) => {
    try {
      // This would typically integrate with a payment system
      alert('Subscription functionality would integrate with payment processing here.');
      console.log('Subscribe to plan:', planId);
      // After successful payment, you would update the user's membership
      // await subscriptionAPI.subscribe(planId);
      // loadPlans(); // Refresh to show updated membership
    } catch (error) {
      setError('Failed to process subscription');
      console.error('Subscription error:', error);
    }
  };

  const workoutPlans = plans.filter(plan => plan.type === 'workout');
  const dietPlans = plans.filter(plan => plan.type === 'diet');

  if (loading) return <div className="loading">Loading plans...</div>;

  return (
    <div className="plan-management">
      <div className="plan-header">
        <h2>
          {userRole === 'member' ? 'My Plans' : 'Plan Management'}
        </h2>
        {(userRole === 'trainer' || userRole === 'admin') && (
          <button className="create-btn" onClick={() => setShowCreateForm(true)}>
            Create New Plan
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Navigation Tabs */}
      <div className="plan-tabs">
        {userRole === 'member' ? (
          <>
            <button
              className={`tab-btn ${activeTab === 'subscription' ? 'active' : ''}`}
              onClick={() => setActiveTab('subscription')}
            >
              💳 My Membership
            </button>
            <button
              className={`tab-btn ${activeTab === 'available' ? 'active' : ''}`}
              onClick={() => setActiveTab('available')}
            >
              💳 Subscription Plans ({subscriptionPlans.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'workout-diet' ? 'active' : ''}`}
              onClick={() => setActiveTab('workout-diet')}
            >
              📋 My Workout & Diet Plans ({plans.length})
            </button>
          </>
        ) : (
          <>
            <button
              className={`tab-btn ${activeTab === 'workout' ? 'active' : ''}`}
              onClick={() => setActiveTab('workout')}
            >
              🏋️ Workout Plans ({workoutPlans.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'diet' ? 'active' : ''}`}
              onClick={() => setActiveTab('diet')}
            >
              🥗 Diet Plans ({dietPlans.length})
            </button>
          </>
        )}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {userRole === 'member' && activeTab === 'subscription' && (
          <div className="membership-status">
            <h3>Current Membership</h3>
            {currentMembership ? (
              <div className="membership-card">
                <div className="membership-info">
                  <h4>Membership Type: {currentMembership.type?.toUpperCase()}</h4>
                  <p><strong>Start Date:</strong> {new Date(currentMembership.startDate).toLocaleDateString()}</p>
                  {currentMembership.endDate && (
                    <p><strong>End Date:</strong> {new Date(currentMembership.endDate).toLocaleDateString()}</p>
                  )}
                  <p><strong>Status:</strong>
                    <span className={`status ${currentMembership.isActive ? 'active' : 'inactive'}`}>
                      {currentMembership.isActive ? 'Active' : 'Expired'}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="no-membership">
                <p>No active membership found.</p>
              </div>
            )}
          </div>
        )}

        {userRole === 'member' && activeTab === 'available' && (
          <div className="available-plans">
            <h3>Available Subscription Plans</h3>
            <div className="plans-grid">
              {subscriptionPlans && subscriptionPlans.length > 0 ? subscriptionPlans.map(plan => (
                <div key={plan._id} className="plan-card subscription">
                  <div className="plan-header">
                    <h4>{plan.name}</h4>
                    <div className="plan-price">
                      ${plan.pricing.amount}
                      <span className="period">/{plan.pricing.period}</span>
                    </div>
                  </div>
                  <div className="plan-content">
                    <p>{plan.description}</p>
                    <ul className="plan-features">
                      {plan.features.map((feature, index) => (
                        <li key={index}>✓ {feature}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="plan-actions">
                    <button
                      className="subscribe-btn"
                      onClick={() => handleSubscribe(plan._id)}
                      disabled={currentMembership?.type === plan.name.toLowerCase()}
                    >
                      {currentMembership?.type === plan.name.toLowerCase() ? 'Current Plan' : 'Subscribe'}
                    </button>
                  </div>
                </div>
              )) : (
                <div className="no-plans">
                  <p>No subscription plans available at the moment.</p>
                  <p>Please check back later or contact support.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {userRole === 'member' && activeTab === 'workout-diet' && (
          <div className="member-workout-diet-plans">
            <h3>My Workout & Diet Plans</h3>
            <div className="plans-grid">
              {plans.map(plan => (
                <div key={plan._id || plan.id} className={`plan-card ${plan.type}`}>
                  <div className="plan-header">
                    <h3>{plan.title}</h3>
                    <div className="plan-meta">
                      {plan.duration && <span className="plan-duration">{plan.duration} min</span>}
                      <span className="plan-difficulty">{plan.difficulty}</span>
                      <span className="plan-category">{plan.category}</span>
                    </div>
                  </div>
                  <div className="plan-details">
                    <p className="plan-description">{plan.description}</p>
                    {plan.trainer && (
                      <p><strong>Trainer:</strong> {
                        typeof plan.trainer === 'object'
                          ? `${plan.trainer.firstName} ${plan.trainer.lastName}`
                          : plan.trainer
                      }</p>
                    )}
                    <p><strong>Created:</strong> {new Date(plan.createdAt).toLocaleDateString()}</p>
                    {plan.equipment && plan.equipment.length > 0 && (
                      <p><strong>Equipment:</strong> {plan.equipment.join(', ')}</p>
                    )}
                    {plan.tags && plan.tags.length > 0 && (
                      <p><strong>Tags:</strong> {
                        Array.isArray(plan.tags) ? plan.tags.join(', ') : plan.tags
                      }</p>
                    )}
                    {plan.content && (
                      <div className="plan-content">
                        <strong>{plan.type === 'diet' ? 'Nutrition Plan:' : 'Plan Details:'}</strong>
                        <div className="content-preview">
                          {plan.content.substring(0, 150)}
                          {plan.content.length > 150 && '...'}
                        </div>
                      </div>
                    )}
                    {plan.exercises && plan.exercises.length > 0 && (
                      <div className="plan-exercises">
                        <strong>Exercises:</strong>
                        <div className="exercises-preview">
                          {plan.exercises.slice(0, 3).map((exercise, index) => (
                            <span key={index} className="exercise-tag">
                              {exercise.name}
                            </span>
                          ))}
                          {plan.exercises.length > 3 && (
                            <span className="more-exercises">+{plan.exercises.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="plan-actions">
                    <button 
                      className="download-btn"
                      onClick={() => downloadPlan(plan)}
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {(!plans || plans.length === 0) && (
              <div className="no-plans">
                <p>No workout or diet plans assigned to you yet.</p>
                <p>Contact your trainer to get personalized plans!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'workout' && (
          <div className="plans-grid">
            {workoutPlans.map(plan => (
              <div key={plan._id || plan.id} className="plan-card workout">
                <div className="plan-header">
                  <h3>{plan.title}</h3>
                  <div className="plan-meta">
                    <span className="plan-duration">{plan.duration} min</span>
                    <span className="plan-difficulty">{plan.difficulty}</span>
                    <span className="plan-category">{plan.category}</span>
                  </div>
                </div>
                <div className="plan-details">
                  <p className="plan-description">{plan.description}</p>
                  {userRole === 'member' && plan.trainer && (
                    <p><strong>Trainer:</strong> {
                      typeof plan.trainer === 'object'
                        ? `${plan.trainer.firstName} ${plan.trainer.lastName}`
                        : plan.trainer
                    }</p>
                  )}
                  <p><strong>Created:</strong> {new Date(plan.createdAt).toLocaleDateString()}</p>
                  {plan.equipment && plan.equipment.length > 0 && (
                    <p><strong>Equipment:</strong> {plan.equipment.join(', ')}</p>
                  )}
                  {plan.tags && plan.tags.length > 0 && (
                    <p><strong>Tags:</strong> {
                      Array.isArray(plan.tags) ? plan.tags.join(', ') : plan.tags
                    }</p>
                  )}
                  {plan.content && (
                    <div className="plan-content">
                      <strong>Plan Details:</strong>
                      <div className="content-preview">
                        {plan.content.substring(0, 150)}
                        {plan.content.length > 150 && '...'}
                      </div>
                    </div>
                  )}
                  {plan.exercises && plan.exercises.length > 0 && (
                    <div className="plan-exercises">
                      <strong>Exercises:</strong>
                      <div className="exercises-preview">
                        {plan.exercises.slice(0, 3).map((exercise, index) => (
                          <span key={index} className="exercise-tag">
                            {exercise.name}
                          </span>
                        ))}
                        {plan.exercises.length > 3 && (
                          <span className="more-exercises">+{plan.exercises.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="plan-actions">
                  <button 
                    className="download-btn"
                    onClick={() => downloadPlan(plan)}
                  >
                    Download
                  </button>
                  {(userRole === 'trainer' || userRole === 'admin') && (
                    <>
                      <button className="edit-btn">Edit</button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeletePlan(plan._id || plan.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'diet' && (
          <div className="plans-grid">
            {dietPlans.map(plan => (
              <div key={plan._id || plan.id} className="plan-card diet">
                <div className="plan-header">
                  <h3>{plan.title}</h3>
                  <div className="plan-meta">
                    <span className="plan-difficulty">{plan.difficulty}</span>
                    <span className="plan-category">{plan.category}</span>
                  </div>
                </div>
                <div className="plan-details">
                  <p className="plan-description">{plan.description}</p>
                  {userRole === 'member' && plan.trainer && (
                    <p><strong>Trainer:</strong> {
                      typeof plan.trainer === 'object'
                        ? `${plan.trainer.firstName} ${plan.trainer.lastName}`
                        : plan.trainer
                    }</p>
                  )}
                  <p><strong>Created:</strong> {new Date(plan.createdAt).toLocaleDateString()}</p>
                  {plan.tags && plan.tags.length > 0 && (
                    <p><strong>Tags:</strong> {
                      Array.isArray(plan.tags) ? plan.tags.join(', ') : plan.tags
                    }</p>
                  )}
                  {plan.content && (
                    <div className="plan-content">
                      <strong>Nutrition Plan:</strong>
                      <div className="content-preview">
                        {plan.content.substring(0, 150)}
                        {plan.content.length > 150 && '...'}
                      </div>
                    </div>
                  )}
                </div>
                <div className="plan-actions">
                  <button 
                    className="download-btn"
                    onClick={() => downloadPlan(plan)}
                  >
                    Download
                  </button>
                  {(userRole === 'trainer' || userRole === 'admin') && (
                    <>
                      <button className="edit-btn">Edit</button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeletePlan(plan._id || plan.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Plan Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal large">
            <h3>Create New Plan</h3>
            <form onSubmit={handleCreatePlan}>
              <div className="form-row">
                <select
                  value={planForm.type}
                  onChange={(e) => setPlanForm({...planForm, type: e.target.value})}
                >
                  <option value="workout">Workout Plan</option>
                  <option value="diet">Diet Plan</option>
                </select>
                <input
                  type="text"
                  placeholder="Plan Title"
                  value={planForm.title}
                  onChange={(e) => setPlanForm({...planForm, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <select
                  value={planForm.category}
                  onChange={(e) => setPlanForm({...planForm, category: e.target.value})}
                >
                  <option value="general">General</option>
                  <option value="strength">Strength</option>
                  <option value="cardio">Cardio</option>
                  <option value="flexibility">Flexibility</option>
                  <option value="hiit">HIIT</option>
                  <option value="bodyweight">Bodyweight</option>
                  <option value="weight_loss">Weight Loss</option>
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="endurance">Endurance</option>
                </select>
                <select
                  value={planForm.difficulty}
                  onChange={(e) => setPlanForm({...planForm, difficulty: e.target.value})}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {planForm.type === 'workout' && (
                <div className="form-row">
                  <input
                    type="number"
                    placeholder="Duration (minutes)"
                    value={planForm.duration}
                    onChange={(e) => setPlanForm({...planForm, duration: parseInt(e.target.value) || 30})}
                    min="5"
                    max="300"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Equipment (comma separated)"
                    value={planForm.equipment.join(', ')}
                    onChange={(e) => setPlanForm({
                      ...planForm,
                      equipment: e.target.value.split(',').map(item => item.trim()).filter(item => item)
                    })}
                  />
                </div>
              )}

              <textarea
                placeholder="Plan Description"
                value={planForm.description}
                onChange={(e) => setPlanForm({...planForm, description: e.target.value})}
                rows="2"
                required
              />

              <input
                type="text"
                placeholder="Tags (comma separated, e.g., beginner, full-body)"
                value={planForm.tags}
                onChange={(e) => setPlanForm({...planForm, tags: e.target.value})}
              />

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={planForm.isPublic}
                      onChange={(e) => setPlanForm({...planForm, isPublic: e.target.checked})}
                    />
                    Make this plan public (visible to all members)
                  </label>
                </div>
              </div>
              
              {userRole === 'trainer' && members.length > 0 && (
                <div className="form-row member-assignment">
                  <label>Assign to Members:</label>
                  <div className="member-checkboxes">
                    {members.map(member => (
                      <div key={member.id} className="member-checkbox">
                        <input
                          type="checkbox"
                          id={`member-${member.id}`}
                          value={member.id}
                          checked={planForm.assignToMembers.includes(member.id)}
                          onChange={(e) => {
                            const memberId = e.target.value;
                            if (e.target.checked) {
                              setPlanForm({
                                ...planForm,
                                assignToMembers: [...planForm.assignToMembers, memberId]
                              });
                            } else {
                              setPlanForm({
                                ...planForm,
                                assignToMembers: planForm.assignToMembers.filter(id => id !== memberId)
                              });
                            }
                          }}
                        />
                        <label htmlFor={`member-${member.id}`}>{member.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {planForm.type === 'diet' && (
                <textarea
                  placeholder="Enter detailed diet plan content (meals, nutrition guidelines, etc.)"
                  value={planForm.content}
                  onChange={(e) => setPlanForm({...planForm, content: e.target.value})}
                  rows="8"
                  required
                />
              )}

              {planForm.type === 'workout' && (
                <textarea
                  placeholder="Enter workout exercises and instructions (optional - can be added later)"
                  value={planForm.content}
                  onChange={(e) => setPlanForm({...planForm, content: e.target.value})}
                  rows="6"
                />
              )}

              <div className="modal-actions">
                <button type="submit">Create Plan</button>
                <button type="button" onClick={() => setShowCreateForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanManagement;
