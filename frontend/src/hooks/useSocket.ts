import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:4000';

let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket || !globalSocket.connected) {
    globalSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });
  }
  return globalSocket;
}

export function useSocket() {
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();
    return () => { /* keep alive across components */ };
  }, []);

  const joinRoom = useCallback((ticketId: string) => {
    socketRef.current.emit('room:join', ticketId);
  }, []);

  const leaveRoom = useCallback((ticketId: string) => {
    socketRef.current.emit('room:leave', ticketId);
  }, []);

  const sendMessage = useCallback((ticketId: string, text: string, sender: string) => {
    socketRef.current.emit('message:send', { ticketId, text, sender });
  }, []);

  const resolveTicket = useCallback((ticketId: string) => {
    socketRef.current.emit('ticket:resolve', ticketId);
  }, []);

  const emitTyping = useCallback((ticketId: string, agentName: string) => {
    socketRef.current.emit('agent:typing', { ticketId, agentName });
  }, []);

  return { socket: socketRef.current, joinRoom, leaveRoom, sendMessage, resolveTicket, emitTyping };
}
