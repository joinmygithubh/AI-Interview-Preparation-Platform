import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  pdfUrl: {
    type: String,
    default: '',
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  strengths: {
    type: [String],
    default: [],
  },
  weaknesses: {
    type: [String],
    default: [],
  },
  recommendations: {
    type: [String],
    default: [],
  },
  scoreBreakdown: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

const Report = mongoose.model('Report', reportSchema);

export default Report;
