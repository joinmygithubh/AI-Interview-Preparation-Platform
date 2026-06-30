import mongoose from 'mongoose';

import InterviewSession from '../models/InterviewSession.js';
import Resume from '../models/Resume.js';
import User from '../models/User.js';
import {
  generateInterviewQuestions,
  scoreAnswer,
  generateSessionSummary,
} from './aiService.js';

const VALID_CATEGORIES = ['technical', 'behavioral', 'situational'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

/** Raise an Error carrying an HTTP status code for the error handler. */
const httpError = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

/** Map a (possibly messy) AI question into the InterviewSession sub-doc shape. */
const normalizeQuestion = (q, fallbackDifficulty) => {
  const category = String(q?.category || '').toLowerCase();
  const difficulty = String(q?.difficulty || '').toLowerCase();
  return {
    questionText: q?.questionText || q?.question || '',
    category: VALID_CATEGORIES.includes(category) ? category : 'technical',
    difficulty: VALID_DIFFICULTIES.includes(difficulty)
      ? difficulty
      : fallbackDifficulty,
    userAnswer: '',
    timeSpent: 0,
  };
};

/** Average of the numeric aiScores across answered questions. */
const averageScore = (questions) => {
  const scored = questions
    .map((q) => q.aiScore)
    .filter((s) => typeof s === 'number' && !Number.isNaN(s));
  if (!scored.length) return 0;
  return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
};

/**
 * Create and start a new interview session.
 */
export const startSession = async (
  userId,
  { resumeId, jobRole, difficulty = 'medium', count = 10 }
) => {
  if (!jobRole) throw httpError(400, 'jobRole is required');

  let resume = null;
  if (resumeId) {
    resume = await Resume.findById(resumeId);
    if (!resume) throw httpError(404, 'Resume not found');
    if (resume.userId.toString() !== userId.toString()) {
      throw httpError(403, 'Forbidden');
    }
  }

  const resumeData = resume ? { skills: resume.skills } : { skills: [] };

  const aiQuestions = await generateInterviewQuestions(
    resumeData,
    jobRole,
    difficulty,
    count
  );

  const questions = (Array.isArray(aiQuestions) ? aiQuestions : [])
    .map((q) => normalizeQuestion(q, difficulty))
    .filter((q) => q.questionText);

  const session = await InterviewSession.create({
    userId,
    resumeId: resumeId || undefined,
    jobRole,
    difficulty: VALID_DIFFICULTIES.includes(difficulty) ? difficulty : 'medium',
    status: 'active',
    startedAt: new Date(),
    questions,
  });

  return session;
};

/**
 * Paginated session history for a user.
 */
export const getHistory = async (userId, { page = 1, limit = 10 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const [sessions, total] = await Promise.all([
    InterviewSession.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('resumeId', 'originalName'),
    InterviewSession.countDocuments({ userId }),
  ]);

  return {
    sessions,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 0,
  };
};

/**
 * Fetch a single session, enforcing ownership.
 */
export const getSession = async (userId, sessionId) => {
  if (!mongoose.isValidObjectId(sessionId)) {
    throw httpError(400, 'Invalid session id');
  }
  const session = await InterviewSession.findById(sessionId);
  if (!session) throw httpError(404, 'Session not found');
  if (session.userId.toString() !== userId.toString()) {
    throw httpError(403, 'Forbidden');
  }
  return session;
};

/**
 * Score a single answer, persist it, and return the evaluation.
 */
export const submitAnswer = async (
  userId,
  sessionId,
  { questionIndex, userAnswer, timeSpent }
) => {
  const session = await getSession(userId, sessionId);

  const idx = Number(questionIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= session.questions.length) {
    throw httpError(400, 'Invalid questionIndex');
  }

  const question = session.questions[idx];

  // Pull candidate skills from the linked resume (if any) for richer scoring.
  let skills = [];
  if (session.resumeId) {
    const resume = await Resume.findById(session.resumeId).select('skills');
    skills = resume?.skills || [];
  }

  const evaluation = await scoreAnswer(
    question.questionText,
    userAnswer,
    skills
  );

  question.userAnswer = userAnswer ?? '';
  question.timeSpent = Number(timeSpent) || 0;
  question.answeredAt = new Date();
  question.aiScore =
    typeof evaluation.score === 'number' ? evaluation.score : undefined;
  question.aiFeedback = evaluation.feedback || '';

  await session.save();

  return {
    aiScore: question.aiScore,
    aiFeedback: question.aiFeedback,
    strengths: evaluation.strengths || [],
    improvements: evaluation.improvements || [],
    exampleAnswer: evaluation.exampleAnswer || '',
  };
};

/**
 * Generate the summary, finalize the session, and update user aggregates.
 */
export const completeSession = async (userId, sessionId) => {
  const session = await getSession(userId, sessionId);

  if (session.status === 'completed') {
    return session;
  }

  const summary = await generateSessionSummary(
    session.questions,
    session.jobRole
  );

  const completedAt = new Date();
  const startedAt = session.startedAt || session.createdAt || completedAt;
  const durationMinutes = Math.max(
    0,
    Math.round((completedAt - startedAt) / 60000)
  );

  const overallScore =
    typeof summary.overallScore === 'number'
      ? Math.round(summary.overallScore)
      : averageScore(session.questions);

  session.status = 'completed';
  session.completedAt = completedAt;
  session.duration = durationMinutes;
  session.overallScore = overallScore;
  session.aiSummary = summary;
  await session.save();

  // Update user aggregates: increment totalSessions, recompute avgScore over
  // all completed sessions.
  const [{ avg = 0 } = {}] = await InterviewSession.aggregate([
    { $match: { userId: session.userId, status: 'completed', overallScore: { $ne: null } } },
    { $group: { _id: null, avg: { $avg: '$overallScore' } } },
  ]);

  await User.findByIdAndUpdate(session.userId, {
    $inc: { totalSessions: 1 },
    $set: { avgScore: Math.round(avg) },
  });

  return session;
};

export default {
  startSession,
  getHistory,
  getSession,
  submitAnswer,
  completeSession,
};
