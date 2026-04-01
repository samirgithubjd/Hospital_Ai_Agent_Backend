const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const {
  getCurrentAgent,
  getAgentStats,
  getAgentConfig
} = require('../controllers/agentController');

/**
 * @route   GET /api/agents/current
 * @desc    Get current AI agent information
 * @access  Authenticated Users
 */
router.get('/current', authMiddleware, getCurrentAgent);

/**
 * @route   GET /api/agents/stats
 * @desc    Get agent statistics and performance
 * @access  Authenticated Users
 * @query   { startDate, endDate }
 */
router.get('/stats', authMiddleware, getAgentStats);

/**
 * @route   GET /api/agents/config
 * @desc    Get agent configuration (Admin only)
 * @access  Admin
 */
router.get('/config', authMiddleware, roleMiddleware('admin'), getAgentConfig);

module.exports = router;
