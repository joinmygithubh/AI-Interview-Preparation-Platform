import { Router } from 'express';

import auth from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  startSession,
  getHistory,
  getSession,
  submitAnswer,
  completeSession,
  deleteSession,
} from '../services/interviewService.js';

const router = Router();

/**
 * POST /api/interview/start
 * Generate questions from the resume + role and start an active session.
 */
router.post(
  '/start',
  auth,
  asyncHandler(async (req, res) => {
    const { resumeId, jobRole, difficulty, count } = req.body;
    const session = await startSession(req.user._id, {
      resumeId,
      jobRole,
      difficulty,
      count,
    });
    res.status(201).json({ success: true, data: session });
  })
);

/**
 * GET /api/interview/history?page=&limit=&difficulty=&minScore=&dateFrom=&dateTo=&sort=
 * Paginated, filterable, sortable session history.
 */
router.get(
  '/history',
  auth,
  asyncHandler(async (req, res) => {
    const { page, limit, difficulty, minScore, dateFrom, dateTo, sort } = req.query;
    const result = await getHistory(req.user._id, {
      page,
      limit,
      difficulty,
      minScore,
      dateFrom,
      dateTo,
      sort,
    });
    res.json({ success: true, data: result });
  })
);

/**
 * GET /api/interview/:id
 * Full session (ownership enforced).
 */
router.get(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const session = await getSession(req.user._id, req.params.id);
    res.json({ success: true, data: session });
  })
);

/**
 * PUT /api/interview/:id/answer
 * Score and persist a single answer.
 */
router.put(
  '/:id/answer',
  auth,
  asyncHandler(async (req, res) => {
    const { questionIndex, userAnswer, timeSpent } = req.body;
    const result = await submitAnswer(req.user._id, req.params.id, {
      questionIndex,
      userAnswer,
      timeSpent,
    });
    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/interview/:id/complete
 * Finalize the session and return it with the AI summary.
 */
router.post(
  '/:id/complete',
  auth,
  asyncHandler(async (req, res) => {
    const session = await completeSession(req.user._id, req.params.id);
    res.json({ success: true, data: session });
  })
);

/**
 * DELETE /api/interview/:id
 * Delete a session (and its report). Ownership enforced.
 */
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    await deleteSession(req.user._id, req.params.id);
    res.json({ success: true, message: 'Session deleted' });
  })
);

export default router;
