const jwt = require('jsonwebtoken');

/**
 * 1. VERIFY JWT TOKEN
 * Extracts the Bearer token from the Authorization header and attaches the decoded user payload to req.user.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if Authorization header exists and follows "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. Authorization token missing or malformed.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const jwtSecret = process.env.JWT_SECRET || 'your_fallback_secret_key';
    const decoded = jwt.verify(token, jwtSecret);

    // Attach user payload (id, email, role) to the request object
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

/**
 * 2. ROLE-BASED ACCESS CONTROL (RBAC)
 * Restricts access to routes based on user roles (e.g., 'APPROVER', 'ADMIN').
 * Usage: authorizeRoles('APPROVER', 'ADMIN')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'Unauthorized. User authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden. Role '${req.user.role}' does not have permission to access this resource.` 
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};