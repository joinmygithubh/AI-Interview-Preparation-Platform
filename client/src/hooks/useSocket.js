import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * Derive the Socket.IO server origin from the API base URL.
 * VITE_API_URL is typically ".../api"; sockets connect to the server root.
 */
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

/**
 * Establish an authenticated Socket.IO connection.
 * @returns {{ socket: import('socket.io-client').Socket | null, connected: boolean }}
 */
const useSocket = () => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { socket: socketRef.current, connected };
};

export default useSocket;
