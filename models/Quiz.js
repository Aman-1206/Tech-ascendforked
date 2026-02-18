/**
 * @model Quiz
 * @description Stores MCQ quizzes created by admins with per-question time limits
 */
import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (v) => v.length === 4,
      message: 'Each question must have exactly 4 options',
    },
  },
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },
  timeLimit: {
    type: Number,
    required: true,
    default: 30, // seconds
    min: 5,
    max: 300,
  },
}, { _id: false });

const QuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    maxlength: 200,
  },
  eventId: {
    type: Number, // Links to Event.id (numeric)
    default: null,
  },
  startTime: {
    type: Date, // Quiz becomes available after this time
    default: null,
  },
  endTime: {
    type: Date, // Quiz is locked after this time
    default: null,
  },
  questions: {
    type: [QuestionSchema],
    required: true,
    validate: {
      validator: (v) => v.length > 0,
      message: 'Quiz must have at least one question',
    },
  },
  feedbackLink: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);
