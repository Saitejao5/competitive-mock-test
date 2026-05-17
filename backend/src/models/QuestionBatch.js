import mongoose from 'mongoose';

const questionBatchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true, index: true },
  section: { type: String, required: true, index: true },
  questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true }],
  source: { type: String, enum: ['db', 'llm'], default: 'db', index: true },
  difficulty: { type: String, required: true, index: true },
  isGenerating: { type: Boolean, default: false, index: true }
}, {
  collection: 'questionbatches',
  timestamps: { createdAt: true, updatedAt: false }
});

questionBatchSchema.index({ section: 1, difficulty: 1, createdAt: 1 });

export const QuestionBatch = mongoose.models.QuestionBatch || mongoose.model('QuestionBatch', questionBatchSchema, 'questionbatches');
