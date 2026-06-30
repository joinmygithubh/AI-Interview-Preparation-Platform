import registerInterviewHandlers from './interviewHandlers.js';

/**
 * Initialize Socket.IO connection handling.
 * @param {import('socket.io').Server} io
 */
const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.info(`[SOCKET] Client connected: ${socket.id}`);

    // TODO: authenticate socket via JWT handshake before registering handlers
    registerInterviewHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.info(`[SOCKET] Client disconnected: ${socket.id} (${reason})`);
    });
  });
};

export default initSocket;
