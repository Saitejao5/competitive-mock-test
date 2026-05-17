import express from 'express';
import { forgotPassword, login, logout, me, refresh, resetPassword, signup } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, loginLimiter, passwordResetLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.post('/signup', authLimiter, signup);
router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.get('/me', requireAuth, me);

export default router;

