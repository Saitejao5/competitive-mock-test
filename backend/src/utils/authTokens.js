import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TOKEN_DAYS = Number.parseInt(process.env.JWT_REFRESH_DAYS, 10) || 7;

function getSecret(name) {
  if (process.env[name] && process.env[name].length >= 32) return process.env[name];
  const generated = crypto.randomBytes(48).toString('hex');
  process.env[name] = generated;
  console.warn(`[AUTH] ${name} missing. Generated an in-memory secret for this process; add it to .env for stable sessions.`);
  return generated;
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    getSecret('JWT_ACCESS_SECRET'),
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), tokenVersion: user.updatedAt?.getTime?.() || Date.now() },
    getSecret('JWT_REFRESH_SECRET'),
    { expiresIn: `${REFRESH_TOKEN_DAYS}d` }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getSecret('JWT_ACCESS_SECRET'));
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, getSecret('JWT_REFRESH_SECRET'));
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshExpiryDate() {
  return new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
}

export function makeResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token) };
}

export function publicUser(user) {
  return {
    id: user._id.toString(),
    username: user.username || user.name || '',
    email: user.email,
    savedJobs: user.savedJobs || [],
    createdAt: user.createdAt
  };
}

