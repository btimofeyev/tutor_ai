const jwt = require('jsonwebtoken');
const logger = require('../utils/logger')('childAuth');

// Ensure JWT_SECRET is set in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error('JWT_SECRET is not set in environment variables');
  throw new Error('JWT_SECRET must be set in environment variables');
}

// Middleware to verify child access token
exports.verifyChildToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'No token provided',
      code: 'MISSING_TOKEN'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Ensure it's a child access token
    if (decoded.type !== 'child_access') {
      throw new Error('Invalid token type');
    }

    // Add child info to request
    req.child = {
      child_id: decoded.child_id,
      name: decoded.name
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug('Token expired for child access');
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    logger.debug('Invalid token attempt', { error: error.message });
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
};
