import jwt from 'jsonwebtoken';

import User from '../models/User.js';
import {
  getSession,
  submitAnswer,
  completeSession,
} from '../services/interviewService.js';

/**
 * Initialize Socket.IO: authenticate the handshake via JWT and register the
 * live interview event handlers.
 * @param {import('socket.io').Server} io
 */
export const initSocket = (io) => {
  // --- Handshake authentication ---
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('Unauthorized'));

      socket.user = user;
      return next();
    } catch (err) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id;
    console.info(`[SOCKET] Connected: ${socket.id} (user ${userId})`);

    const fail = (message) => socket.emit('error', { message });

    // Join a session room and return its current state.
    socket.on('join_session', async ({ sessionId } = {}) => {
      try {
        const session = await getSession(userId, sessionId);
        socket.join(sessionId);
        socket.emit('session_joined', { session });
      } catch (err) {
        fail(err.message || 'Failed to join session');
      }
    });

    // Score an answer and broadcast the result to the room.
    socket.on(
      'submit_answer',
      async ({ sessionId, questionIndex, answer, timeSpent } = {}) => {
        try {
          const result = await submitAnswer(userId, sessionId, {
            questionIndex,
            userAnswer: answer,
            timeSpent,
          });
          io.to(sessionId).emit('answer_scored', { questionIndex, ...result });
        } catch (err) {
          fail(err.message || 'Failed to score answer');
        }
      }
    );

    // Finalize the session and broadcast the summary.
    socket.on('end_session', async ({ sessionId } = {}) => {
      try {
        const session = await completeSession(userId, sessionId);
        io.to(sessionId).emit('session_complete', {
          session,
          summary: session.aiSummary,
        });
      } catch (err) {
        fail(err.message || 'Failed to complete session');
      }
    });

    // Relay typing indicator to others in the room.
    socket.on('typing', ({ sessionId } = {}) => {
      if (sessionId) {
        socket.to(sessionId).emit('user_typing', { userId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.info(`[SOCKET] Disconnected: ${socket.id} (${reason})`);
    });
  });
};

export default initSocket;
