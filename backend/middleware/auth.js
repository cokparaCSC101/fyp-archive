// =====================================================================
//  Authentication & authorisation middleware
//
//  verifyToken   -> ensures the request carries a valid JWT.
//                   Any authenticated role may pass (read access).
//  requireAdmin  -> ensures the authenticated user has the 'admin' role
//                   (write access: create / update / delete projects).
// =====================================================================
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // Expected format:  Authorization: Bearer <token>
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { user_id, full_name, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res
      .status(403)
      .json({ message: 'Access denied. Administrator privileges required.' });
  }
  next();
};

module.exports = { verifyToken, requireAdmin };
