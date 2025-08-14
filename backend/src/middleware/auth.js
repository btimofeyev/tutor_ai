const { supabaseAdmin } = require('../utils/supabaseClient');
const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate a parent user.
 * It checks for a Bearer token in the Authorization header,
 * and verifies it with Supabase.
 * If the token is valid, the user object is attached to the request.
 */
const authenticateParent = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token is required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // First, verify the JWT structure and expiry
    let decodedToken;
    try {
      // Decode without verification first to check expiry
      decodedToken = jwt.decode(token);
      
      if (!decodedToken) {
        return res.status(401).json({ message: 'Invalid token format.' });
      }
      
      // Check if token is expired
      const currentTime = Math.floor(Date.now() / 1000);
      if (decodedToken.exp && decodedToken.exp < currentTime) {
        return res.status(401).json({ message: 'Token has expired. Please refresh your session.' });
      }
    } catch (jwtError) {
      console.error('JWT decode error:', jwtError);
      return res.status(401).json({ message: 'Invalid token format.' });
    }

    // Use admin client to verify the user from the JWT
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(
      decodedToken.sub
    );

    if (error || !user) {
      console.error('Authentication error:', error);
      return res.status(401).json({ message: 'User not found or inactive.' });
    }

    // Attach the user object to the request for use in subsequent controllers
    req.user = user;
    req.token = token; // Also attach token for potential refresh needs

    next();
  } catch (error) {
    console.error('Catch block authentication error:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('session')) {
      res.status(401).json({ message: 'Session expired. Please login again.', code: 'SESSION_EXPIRED' });
    } else {
      res.status(401).json({ message: 'Authentication failed', error: error.message });
    }
  }
};

module.exports = { authenticateParent };
