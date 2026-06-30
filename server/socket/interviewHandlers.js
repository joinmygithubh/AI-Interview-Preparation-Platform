/**
 * Register interview-related Socket.IO event handlers for a connected socket.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
const registerInterviewHandlers = (io, socket) => {
  // TODO: 'interview:join'  -> join a session room
  // TODO: 'interview:answer' -> stream/evaluate an answer, emit ai feedback
  // TODO: 'interview:next'   -> emit next question
  // TODO: 'interview:end'    -> finalize session, emit summary
};

export default registerInterviewHandlers;
