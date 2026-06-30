import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication middleware.
 * - Extracts a Bearer token from the Authorization header
 * - Verifies it against JWT_SECRET
 * - Loads the user and attaches it to req.user
 * Responds 401 { success: false, message: 'Unauthorized' } when the token is
 * missing, malformed, expired, or the user no longer exists.
 */
const auth = async (req, res, next) => {
  const unauthorized = () =>
    res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return unauthorized();
    }

    const token = header.slice(7).trim();
    if (!token) {
      return unauthorized();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load the current user (password is select:false so it is excluded).
    const user = await User.findById(decoded.id);
    if (!user) {
      return unauthorized();
    }

    req.user = user;
    req.token = token;
    return next();
  } catch (err) {
    // Invalid signature / expired token / malformed token all map to 401.
    return unauthorized();
  }
};

export default auth;
