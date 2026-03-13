module.exports = function roleMiddleware(requiredRole) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Role not found in token' });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Access denied: insufficient role' });
    }

    next();
  };
};