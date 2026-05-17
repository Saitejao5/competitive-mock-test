import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { clearRefreshCookie, refreshCookieName, setRefreshCookie } from '../utils/cookies.js';
import { hashToken, makeResetToken, publicUser, refreshExpiryDate, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/authTokens.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import { cleanString, isEmail, normalizeEmail, validatePassword } from '../utils/validation.js';

const PASSWORD_RESET_MINUTES = Number.parseInt(process.env.PASSWORD_RESET_MINUTES, 10) || 20;
const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = refreshExpiryDate();

  user.refreshTokens = [
    ...(user.refreshTokens || []).filter(token => token.expiresAt > new Date()).slice(-4),
    { tokenHash, expiresAt }
  ];
  setRefreshCookie(res, refreshToken);
  return { accessToken };
}

export async function signup(req, res, next) {
  try {
    const username = cleanString(req.body.username || req.body.name);
    const email = normalizeEmail(req.body.email);
    const { password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Username, email, password, and confirm password are required.' });
    }
    if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' });

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length) return res.status(400).json({ error: passwordErrors[0], details: passwordErrors });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = new User({ username, name: username, email, passwordHash });
    const { accessToken } = issueSession(res, user);
    await user.save();

    return res.status(201).json({ user: publicUser(user), accessToken });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    return next(err);
  }
}

export async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });

    const user = await User.findOne({ email }).select('+passwordHash +password');
    const storedHash = user?.passwordHash || user?.password;
    const matches = storedHash ? await bcrypt.compare(password, storedHash) : false;
    if (!user || !matches) return res.status(401).json({ error: 'Invalid email or password.' });

    if (!user.passwordHash && user.password) {
      user.passwordHash = user.password;
      user.password = undefined;
    }

    const { accessToken } = issueSession(res, user);
    await user.save();

    return res.json({ user: publicUser(user), accessToken });
  } catch (err) {
    return next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.[refreshCookieName];
    if (!refreshToken) return res.status(401).json({ error: 'Refresh session missing.' });

    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);
    const user = await User.findById(payload.sub);
    const storedToken = user?.refreshTokens?.find(token => token.tokenHash === tokenHash && token.expiresAt > new Date());

    if (!user || !storedToken) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Refresh session expired or invalid.' });
    }

    user.refreshTokens = user.refreshTokens.filter(token => token.tokenHash !== tokenHash && token.expiresAt > new Date());
    const { accessToken } = issueSession(res, user);
    await user.save();

    return res.json({ user: publicUser(user), accessToken });
  } catch (err) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: 'Refresh session expired or invalid.' });
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.[refreshCookieName];
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await User.updateOne({ 'refreshTokens.tokenHash': tokenHash }, { $pull: { refreshTokens: { tokenHash } } });
    }
    clearRefreshCookie(res);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });

    const user = await User.findOne({ email }).select('+passwordResetTokenHash +passwordResetExpiresAt');
    if (user) {
      const { token, tokenHash } = makeResetToken();
      user.passwordResetTokenHash = tokenHash;
      user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000);
      await user.save();
      await sendPasswordResetEmail({ to: user.email, token });
    }

    return res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });
  } catch (err) {
    return next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Reset token, password, and confirm password are required.' });
    }
    if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' });

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length) return res.status(400).json({ error: passwordErrors[0], details: passwordErrors });

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) return res.status(400).json({ error: 'Reset link is invalid or expired.' });

    user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.password = undefined;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.refreshTokens = [];
    await user.save();
    clearRefreshCookie(res);

    return res.json({ message: 'Password reset successful. Please sign in with your new password.' });
  } catch (err) {
    return next(err);
  }
}

export async function me(req, res) {
  return res.json({ user: req.authUser });
}

