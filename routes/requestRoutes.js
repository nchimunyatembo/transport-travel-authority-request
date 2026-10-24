const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Enforce JWT authentication across all transport request endpoints
router.use(authenticateToken);

/**
 * @route   POST /api/requests
 * @desc    Submit a new transport request with optional supporting attachments
 * @access  Private (APPLICANT, ADMIN)
 */
router.post(
  '/', 
  authorizeRoles('APPLICANT', 'RECOMMENDER', 'APPROVER', 'ADMIN'),
  upload.array('attachments', 5), // Accepts up to 5 supporting documents under field 'attachments'
  requestController.createRequest
);

/**
 * @route   GET /api/requests
 * @desc    Get all transport requests (Applicants see their own; Approvers/Admins see all)
 * @access  Private
 */
router.get('/', requestController.getAllRequests);

router.get('/:id/attachments/:attachmentId', requestController.downloadAttachment);

/**
 * @route   GET /api/requests/:id
 * @desc    Get detailed information for a single transport request (includes attachments & approval data)
 * @access  Private
 */
router.get('/:id', requestController.getRequestById);

router.put(
  '/:id',
  authorizeRoles('APPLICANT', 'RECOMMENDER', 'ADMIN'),
  upload.array('attachments', 5),
  requestController.updateRequest
);

router.delete(
  '/:id',
  authorizeRoles('APPLICANT', 'RECOMMENDER', 'ADMIN'),
  requestController.deleteRequest
);

router.patch(
  '/:id/recommend',
  authorizeRoles('RECOMMENDER'),
  requestController.recommendRequest
);

/**
 * @route   POST /api/requests/:id/approve
 * @desc    Approve or reject a transport request with comments and digital signature
 * @access  Private (APPROVER, ADMIN only)
 */
router.patch(
  '/:id/status',
  authorizeRoles('APPROVER', 'ADMIN'), 
  requestController.approveOrRejectRequest
);

router.post(
  '/:id/approve',
  authorizeRoles('APPROVER', 'ADMIN'),
  requestController.approveOrRejectRequest
);

module.exports = router;