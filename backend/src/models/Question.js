import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: options => Array.isArray(options) && options.length === 4,
      message: 'Question must have exactly 4 options'
    }
  },
  correctAnswer: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
  explanation: { type: String, default: 'No explanation provided.' },
  section: { type: String, required: true, index: true },
  topic: { type: String, default: 'general' },
  batchId: { type: String, required: true, index: true },
  source: { type: String, enum: ['db', 'llm'], default: 'db', index: true },
  difficulty: { type: String, required: true, index: true },
  hash: { type: String, required: true, unique: true, index: true }
}, {
  collection: 'questions',
  timestamps: true
});

questionSchema.index({ section: 1, difficulty: 1, batchId: 1 });
questionSchema.index({ section: 1, difficulty: 1, createdAt: 1 });
questionSchema.index({ section: 1, difficulty: 1, source: 1 });
questionSchema.index({ question: 1 });

export const Question = mongoose.models.Question || mongoose.model('Question', questionSchema, 'questions');
