const supabase = require('../utils/supabaseClient');

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
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Authentication error:', error);
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
    
    // Attach the user object to the request for use in subsequent controllers
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Catch block authentication error:', error);
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

module.exports = { authenticateParent };
