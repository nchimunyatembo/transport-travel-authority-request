const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Applicant, Approver, or Admin)
 * @access  Private (ADMIN)
 */
router.post('/register', authenticateToken, authorizeRoles('ADMIN'), authController.register);

router.get('/users', authenticateToken, authorizeRoles('ADMIN'), authController.getUsers);
router.patch('/users/:id/password', authenticateToken, authorizeRoles('ADMIN'), authController.resetPassword);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & return JWT token
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get logged-in user profile details
 * @access  Private (Requires valid JWT token)
 */
router.get('/me', authenticateToken, authController.getProfile);

module.exports = router;