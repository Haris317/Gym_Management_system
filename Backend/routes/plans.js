const express = require('express');
const router = express.Router();
const WorkoutPlan = require('../models/WorkoutPlan');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @desc    Get trainer's plans
// @route   GET /api/plans/trainer/:trainerId
// @access  Private
router.get('/trainer/:trainerId', protect, async (req, res) => {
  try {
    const { trainerId } = req.params;
    
    // Verify trainer exists and user has permission
    if (req.user.id !== trainerId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const plans = await WorkoutPlan.findByTrainer(trainerId);
    
    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error getting trainer plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trainer plans',
      error: error.message
    });
  }
});

// @desc    Create new plan
// @route   POST /api/plans/trainer/:trainerId
// @access  Private
router.post('/trainer/:trainerId', protect, async (req, res) => {
  try {
    const { trainerId } = req.params;
    
    // Verify trainer exists and user has permission
    if (req.user.id !== trainerId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const planData = {
      ...req.body,
      trainer: trainerId
    };

    const plan = new WorkoutPlan(planData);
    await plan.save();

    // Populate trainer info
    await plan.populate('trainer', 'firstName lastName email');

    res.status(201).json({
      success: true,
      data: plan,
      message: 'Plan created successfully'
    });
  } catch (error) {
    console.error('Error creating plan:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create plan',
      error: error.message
    });
  }
});

// @desc    Update plan
// @route   PUT /api/plans/:planId
// @access  Private
router.put('/:planId', protect, async (req, res) => {
  try {
    const { planId } = req.params;
    
    const plan = await WorkoutPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Verify user has permission to update this plan
    if (plan.trainer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedPlan = await WorkoutPlan.findByIdAndUpdate(
      planId,
      req.body,
      { new: true, runValidators: true }
    ).populate('trainer', 'firstName lastName email');

    res.status(200).json({
      success: true,
      data: updatedPlan,
      message: 'Plan updated successfully'
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update plan',
      error: error.message
    });
  }
});

// @desc    Delete plan
// @route   DELETE /api/plans/trainer/:trainerId/:planId
// @access  Private
router.delete('/trainer/:trainerId/:planId', protect, async (req, res) => {
  try {
    const { trainerId, planId } = req.params;
    
    // Verify user has permission
    if (req.user.id !== trainerId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const plan = await WorkoutPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Verify plan belongs to trainer
    if (plan.trainer.toString() !== trainerId) {
      return res.status(403).json({
        success: false,
        message: 'Plan does not belong to this trainer'
      });
    }

    await WorkoutPlan.findByIdAndDelete(planId);

    res.status(200).json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plan',
      error: error.message
    });
  }
});

// @desc    Get public plans
// @route   GET /api/plans/public
// @access  Private
router.get('/public', protect, async (req, res) => {
  try {
    const plans = await WorkoutPlan.findPublicPlans();
    
    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error getting public plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get public plans',
      error: error.message
    });
  }
});

// @desc    Get member's assigned plans
// @route   GET /api/plans/member/:memberId
// @access  Private
router.get('/member/:memberId', protect, async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // Verify user has permission
    if (req.user.id !== memberId && req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get plans assigned to this member
    const plans = await WorkoutPlan.find({
      'assignedMembers.member': memberId,
      'assignedMembers.status': 'active',
      isActive: true
    }).populate('trainer', 'firstName lastName email');

    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error getting member plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get member plans',
      error: error.message
    });
  }
});

// @desc    Get member's workout/diet plans (assigned + public)
// @route   GET /api/plans/member/:memberId/workout-diet
// @access  Private
router.get('/member/:memberId/workout-diet', protect, async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // Verify user has permission
    if (req.user.id !== memberId && req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get both assigned and public plans
    const [assignedPlans, publicPlans] = await Promise.all([
      WorkoutPlan.find({
        'assignedMembers.member': memberId,
        'assignedMembers.status': 'active',
        isActive: true
      }).populate('trainer', 'firstName lastName email'),
      
      WorkoutPlan.find({
        isPublic: true,
        isActive: true
      }).populate('trainer', 'firstName lastName email')
    ]);

    // Combine and deduplicate plans
    const allPlans = [...assignedPlans];
    publicPlans.forEach(publicPlan => {
      if (!assignedPlans.find(assigned => assigned._id.toString() === publicPlan._id.toString())) {
        allPlans.push(publicPlan);
      }
    });

    res.status(200).json({
      success: true,
      data: allPlans
    });
  } catch (error) {
    console.error('Error getting member workout/diet plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get member workout/diet plans',
      error: error.message
    });
  }
});

// @desc    Assign plan to member
// @route   POST /api/plans/:planId/assign/:memberId
// @access  Private
router.post('/:planId/assign/:memberId', protect, async (req, res) => {
  try {
    const { planId, memberId } = req.params;
    
    const plan = await WorkoutPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Verify user has permission (trainer who owns the plan or admin)
    if (plan.trainer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Verify member exists
    const member = await User.findById(memberId);
    if (!member || member.role !== 'member') {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    await plan.assignToMember(memberId);

    res.status(200).json({
      success: true,
      message: 'Plan assigned to member successfully'
    });
  } catch (error) {
    console.error('Error assigning plan:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to assign plan',
      error: error.message
    });
  }
});

module.exports = router;
