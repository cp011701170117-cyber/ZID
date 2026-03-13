const jwt = require('jsonwebtoken');

// JWT_SECRET is guaranteed to exist by configuration module
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET not configured');
}

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Invalid authorization format" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token missing" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // normalize fields to avoid case-sensitivity issues
    if (decoded && typeof decoded.did === 'string') {
      decoded.did = decoded.did.toLowerCase();
    }
    if (decoded && typeof decoded.address === 'string') {
      decoded.address = decoded.address.toLowerCase();
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
