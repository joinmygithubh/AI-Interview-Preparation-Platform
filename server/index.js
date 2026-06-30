import http from 'http';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';

import connectDB from './config/db.js';
import { initSocket } from './socket/interviewSocket.js';
import errorHandler from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import resumeRoutes from './routes/resume.js';
import interviewRoutes from './routes/interview.js';
import reportRoutes from './routes/report.js';
import userRoutes from './routes/user.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();

// --- Core middleware ---
app.use(helmet());
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/user', userRoutes);

// --- 404 fallback ---
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    data: {},
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// --- Global error handler (must be last) ---
app.use(errorHandler);

// --- HTTP + Socket.IO server ---
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Expose io to the app for use inside route handlers (req.app.get('io')).
app.set('io', io);
initSocket(io);

// --- Bootstrap ---
const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.info(`[SERVER] Listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
};

start();

// --- Process-level safety nets ---
process.on('unhandledRejection', (reason) => {
  console.error('[SERVER] Unhandled promise rejection:', reason);
});

export { app, server, io };
