import express from 'express';
import { getDashboard, getProfile, getSavedJobs, removeSavedJob, saveJob } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/profile', getProfile);
router.get('/dashboard', getDashboard);
router.get('/saved-jobs', getSavedJobs);
router.post('/saved-jobs', saveJob);
router.delete('/saved-jobs/:jobId', removeSavedJob);

export default router;

