import { publicUser } from '../utils/authTokens.js';

export async function getProfile(req, res) {
  res.json({ user: publicUser(req.user) });
}

export async function getDashboard(req, res) {
  const completedSections = req.user.examProgress?.length || 0;
  res.json({
    user: publicUser(req.user),
    stats: {
      savedJobs: req.user.savedJobs?.length || 0,
      completedSections,
      seenQuestions: req.user.seenQuestionIds?.length || 0,
      seenBatches: req.user.seenBatchIds?.length || 0
    }
  });
}

export async function getSavedJobs(req, res) {
  res.json({ savedJobs: req.user.savedJobs || [] });
}

export async function saveJob(req, res) {
  const jobId = String(req.body.jobId || '').trim();
  if (!jobId) return res.status(400).json({ error: 'jobId is required.' });

  const existing = req.user.savedJobs?.some(job => job.jobId === jobId);
  if (!existing) {
    req.user.savedJobs.push({
      jobId,
      title: String(req.body.title || '').trim(),
      department: String(req.body.department || '').trim()
    });
    await req.user.save();
  }

  return res.status(existing ? 200 : 201).json({ savedJobs: req.user.savedJobs });
}

export async function removeSavedJob(req, res) {
  req.user.savedJobs = (req.user.savedJobs || []).filter(job => job.jobId !== req.params.jobId);
  await req.user.save();
  res.json({ savedJobs: req.user.savedJobs });
}

