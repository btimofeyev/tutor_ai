// backend/src/controllers/childAuthController.js
const supabase = require('../utils/supabaseClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger')('childAuthController');

// Ensure JWT_SECRET is set in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error('JWT_SECRET is not set in environment variables');
  throw new Error('JWT_SECRET must be set in environment variables');
}
const JWT_EXPIRES_IN = '2h'; // 2 hour sessions for children
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// Generate tokens
const generateTokens = (childId, childName) => {
  const accessToken = jwt.sign(
    {
      child_id: childId,
      name: childName,
      type: 'child_access'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    {
      child_id: childId,
      type: 'child_refresh'
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
};

// Child Login
exports.childLogin = async (req, res) => {
  const { username, pin } = req.body;

  if (!username || !pin) {
    return res.status(400).json({
      error: 'Username and PIN are required',
      code: 'MISSING_CREDENTIALS'
    });
  }

  // Validate PIN format (4-6 digits)
  if (!/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({
      error: 'Invalid PIN format',
      code: 'INVALID_PIN_FORMAT'
    });
  }

  try {
    // Find child by username
    const { data: child, error } = await supabase
      .from('children')
      .select('id, name, grade, child_username, access_pin_hash, parent_id')
      .eq('child_username', username.trim().toLowerCase())
      .single();

    if (error || !child) {
      // Don't reveal if username exists
      return res.status(401).json({
        error: 'Invalid username or PIN',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if PIN is set
    if (!child.access_pin_hash) {
      return res.status(401).json({
        error: 'Account not activated. Please ask your parent to set up your PIN.',
        code: 'ACCOUNT_NOT_ACTIVATED'
      });
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, child.access_pin_hash);
    if (!isPinValid) {
      // Log failed attempt (optional - for parent visibility)
      await supabase
        .from('login_attempts')
        .insert([{
          child_id: child.id,
          success: false,
          attempted_at: new Date().toISOString()
        }])
        .select(); // Ignore errors for failed attempt logging

      return res.status(401).json({
        error: 'Invalid username or PIN',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(child.id, child.name);

    // Log successful login
    await supabase
      .from('login_attempts')
      .insert([{
        child_id: child.id,
        success: true,
        attempted_at: new Date().toISOString()
      }])
      .select();

    // Create session record
    const { data: session } = await supabase
      .from('child_sessions')
      .insert([{
        child_id: child.id,
        refresh_token_hash: await bcrypt.hash(refreshToken, 10),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    res.json({
      success: true,
      child: {
        id: child.id,
        name: child.name,
        grade: child.grade
      },
      tokens: {
        accessToken,
        refreshToken
      },
      sessionId: session?.id
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed. Please try again.',
      code: 'SERVER_ERROR'
    });
  }
};

// Refresh Token
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      error: 'Refresh token required',
      code: 'MISSING_TOKEN'
    });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    if (decoded.type !== 'child_refresh') {
      throw new Error('Invalid token type');
    }

    // Check if session exists and is valid
    const { data: sessions } = await supabase
      .from('child_sessions')
      .select('*')
      .eq('child_id', decoded.child_id)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (!sessions || sessions.length === 0) {
      return res.status(401).json({
        error: 'Session expired. Please login again.',
        code: 'SESSION_EXPIRED'
      });
    }

    // Verify refresh token matches session (optional extra security)
    const session = sessions[0];
    const isValidRefreshToken = await bcrypt.compare(refreshToken, session.refresh_token_hash);

    if (!isValidRefreshToken) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_TOKEN'
      });
    }

    // Get child info
    const { data: child } = await supabase
      .from('children')
      .select('id, name, grade')
      .eq('id', decoded.child_id)
      .single();

    if (!child) {
      return res.status(404).json({
        error: 'Account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    // Generate new tokens
    const newTokens = generateTokens(child.id, child.name);

    // Update session with new refresh token
    await supabase
      .from('child_sessions')
      .update({
        refresh_token_hash: await bcrypt.hash(newTokens.refreshToken, 10),
        updated_at: new Date().toISOString()
      })
      .eq('id', session.id);

    res.json({
      success: true,
      tokens: newTokens
    });

  } catch (error) {
    console.error('Token refresh error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    res.status(500).json({
      error: 'Token refresh failed',
      code: 'SERVER_ERROR'
    });
  }
};

// Logout
exports.childLogout = async (req, res) => {
  const childId = req.child?.child_id; // From auth middleware
  const { sessionId } = req.body;

  try {
    if (sessionId && childId) {
      // Invalidate specific session
      await supabase
        .from('child_sessions')
        .update({
          expires_at: new Date().toISOString(),
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('child_id', childId);
    } else if (childId) {
      // Invalidate all sessions for this child
      await supabase
        .from('child_sessions')
        .update({
          expires_at: new Date().toISOString(),
          ended_at: new Date().toISOString()
        })
        .eq('child_id', childId)
        .gte('expires_at', new Date().toISOString());
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    // Still return success to client
    res.json({
      success: true,
      message: 'Logged out'
    });
  }
};

// Validate Session
exports.validateSession = async (req, res) => {
  // This endpoint is called after passing through auth middleware
  // So if we reach here, the session is valid
  const child = req.child;

  res.json({
    valid: true,
    child: {
      id: child.child_id,
      name: child.name,
      grade: child.grade
    }
  });
};

// Get Login Hints (for username reminder)
exports.getLoginHints = async (req, res) => {
  const { parentEmail } = req.query;

  if (!parentEmail) {
    return res.status(400).json({
      error: 'Parent email required',
      code: 'MISSING_EMAIL'
    });
  }

  try {
    // First, find parent by email (assuming you have parent emails)
    // This is a simplified version - adjust based on your parent auth system
    const { data: parent } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', parentEmail.toLowerCase())
      .single();

    if (!parent) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        hints: []
      });
    }

    // Get children for this parent
    const { data: children } = await supabase
      .from('children')
      .select('name, child_username')
      .eq('parent_id', parent.id)
      .not('child_username', 'is', null);

    // Return hints (first letter + asterisks)
    const hints = (children || []).map(child => ({
      name: child.name,
      usernameHint: child.child_username
        ? child.child_username[0] + '*'.repeat(child.child_username.length - 1)
        : null
    }));

    res.json({
      success: true,
      hints
    });

  } catch (error) {
    console.error('Get hints error:', error);
    res.json({
      success: true,
      hints: []
    });
  }
};
