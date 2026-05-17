import mongoose from 'mongoose';

const examProgressSchema = new mongoose.Schema({
  section: { type: String, required: true },
  batchId: { type: String, default: null },
  questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: { type: String, trim: true, minlength: 3, maxlength: 40 },
  name: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
  passwordHash: { type: String, select: false },
  password: { type: String, select: false },
  userKey: { type: String, unique: true, sparse: true, index: true },
  refreshTokens: [{
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  savedJobs: [{
    jobId: { type: String, required: true },
    title: { type: String, trim: true },
    department: { type: String, trim: true },
    savedAt: { type: Date, default: Date.now }
  }],
  seenQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  seenBatchIds: [{ type: String }],
  examProgress: [examProgressSchema]
}, {
  collection: 'users',
  timestamps: true
});

userSchema.index({ seenQuestionIds: 1 });
userSchema.index({ seenBatchIds: 1 });
userSchema.index({ passwordResetExpiresAt: 1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');
