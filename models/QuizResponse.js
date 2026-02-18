/**
 * @model QuizResponse
 * @description Stores user quiz submissions with answers and scores
 */
import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema({
  questionIndex: {
    type: Number,
    required: true,
  },
  selectedOption: {
    type: Number, // -1 means unanswered (timed out)
    default: -1,
  },
  timeTaken: {
    type: Number, // seconds taken to answer
    default: 0,
  },
}, { _id: false });

const QuizResponseSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  answers: {
    type: [AnswerSchema],
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Prevent duplicate submissions
QuizResponseSchema.index({ quizId: 1, userEmail: 1 }, { unique: true });

export default mongoose.models.QuizResponse || mongoose.model('QuizResponse', QuizResponseSchema);
