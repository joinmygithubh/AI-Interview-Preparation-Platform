import { Router } from 'express';

import InterviewSession from '../models/InterviewSession.js';
import auth from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Normalize a date to UTC midnight (ms) so we can compare calendar days. */
const toUtcDayStart = (date) => {
  const d = new Date(date);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

/**
 * Current streak = number of consecutive calendar days, counting backwards from
 * the most recent day that has at least one session, with no gap.
 */
const computeStreak = (dates) => {
  if (!dates.length) return 0;

  const uniqueDays = [...new Set(dates.map(toUtcDayStart))].sort((a, b) => b - a);

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i += 1) {
    if (uniqueDays[i - 1] - uniqueDays[i] === MS_PER_DAY) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
};

/**
 * GET /api/user/dashboard
 * Aggregated stats for the authenticated user:
 *  - totalSessions: total interview sessions created
 *  - avgScore / bestScore: across completed sessions
 *  - streak: consecutive days with sessions
 *  - last10Sessions: { date, overallScore, jobRole } for charting (chronological)
 */
router.get(
  '/dashboard',
  auth,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const [totalSessions, statsAgg, last10Raw, sessionDates] = await Promise.all([
      // Total sessions (any status)
      InterviewSession.countDocuments({ userId }),

      // Score aggregates over completed sessions that have a score
      InterviewSession.aggregate([
        {
          $match: {
            userId,
            status: 'completed',
            overallScore: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$overallScore' },
            bestScore: { $max: '$overallScore' },
            completedCount: { $sum: 1 },
          },
        },
      ]),

      // Most recent 10 completed sessions for the chart
      InterviewSession.find({ userId, status: 'completed' })
        .sort({ completedAt: -1, createdAt: -1 })
        .limit(10)
        .select('completedAt createdAt overallScore jobRole')
        .lean(),

      // All session dates for streak calculation
      InterviewSession.find({ userId })
        .select('createdAt')
        .lean(),
    ]);

    const stats = statsAgg[0] || {};
    const avgScore = stats.avgScore != null ? Math.round(stats.avgScore * 10) / 10 : 0;
    const bestScore = stats.bestScore != null ? stats.bestScore : 0;
    const completedSessions = stats.completedCount || 0;

    const streak = computeStreak(sessionDates.map((s) => s.createdAt));

    // Return chronological (oldest -> newest) so charts read left to right.
    const last10Sessions = last10Raw
      .map((s) => ({
        date: s.completedAt || s.createdAt,
        overallScore: s.overallScore,
        jobRole: s.jobRole,
      }))
      .reverse();

    res.json({
      success: true,
      data: {
        totalSessions,
        completedSessions,
        avgScore,
        bestScore,
        streak,
        last10Sessions,
      },
    });
  })
);

export default router;
