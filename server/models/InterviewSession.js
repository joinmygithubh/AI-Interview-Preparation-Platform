import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['technical', 'behavioral', 'situational'],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
    },
    userAnswer: {
      type: String,
      default: '',
    },
    aiScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    aiFeedback: {
      type: String,
      default: '',
    },
    timeSpent: {
      type: Number, // seconds
      default: 0,
    },
    answeredAt: {
      type: Date,
    },
  },
  { _id: true }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
    },
    jobRole: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    duration: {
      type: Number, // minutes
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    aiSummary: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

const InterviewSession = mongoose.model(
  'InterviewSession',
  interviewSessionSchema
);

export default InterviewSession;
