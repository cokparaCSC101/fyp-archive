// =====================================================================
//  Authentication & authorisation middleware
//
//  verifyToken     -> ensures the request carries a valid JWT.
//  requireAdmin    -> 'admin' only (technical owner).
//  requireApprover -> 'admin' or 'hod' (can act on the archive directly
//                     and approve/deny lecturer requests).
//  requireStaff    -> 'admin', 'hod' or 'lecturer' (may reach the write
//                     endpoints; the controller decides whether the action
//                     is applied immediately or queued for approval).
// =====================================================================
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { user_id, full_name, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// Factory: allow only the listed roles.
const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied. You do not have permission for this action.' });
  }
  next();
};

const requireAdmin = requireRoles('admin');
const requireApprover = requireRoles('admin', 'hod');
const requireStaff = requireRoles('admin', 'hod', 'lecturer');

module.exports = { verifyToken, requireRoles, requireAdmin, requireApprover, requireStaff };
