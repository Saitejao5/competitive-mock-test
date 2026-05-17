import { User } from '../models/User.js';
import { publicUser, verifyAccessToken } from '../utils/authTokens.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Invalid session' });

    req.user = user;
    req.authUser = publicUser(user);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Access token expired or invalid' });
  }
}

