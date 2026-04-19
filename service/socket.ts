
import { io } from 'socket.io-client';
import { BACKEND_URL } from '../constants';

console.log('[SYSTEM] Initializing Socket.IO connection to:', BACKEND_URL);

// Initialize the single shared socket connection
const options: any = {
  // Prioritize websocket to avoid XHR issues, fall back to polling if needed
  transports: ['websocket', 'polling'], 
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 30000,
  autoConnect: true,
  withCredentials: false,
};

export const socket: any = io(BACKEND_URL, options);

// Global error logger for socket
socket.on('connect_error', (err: any) => {
  const msg = err.message ? err.message.toLowerCase() : '';
  
  // Suppress common transport errors during connection attempts/retries
  // Catches 'websocket error', 'xhr poll error', 'transport error', 'network request failed'
  if (
    !msg.includes('xhr poll error') && 
    !msg.includes('websocket error') && 
    !msg.includes('transport error') &&
    !msg.includes('network request failed')
  ) {
    console.warn('[SOCKET] Connection Issue:', err.message);
  }
});

socket.on('connect', () => {
  console.log('[SOCKET] ✅ Connected via ' + (socket.io.engine?.transport?.name || 'unknown'));
});

socket.on('disconnect', (reason: any) => {
  console.log('[SOCKET] ❌ Disconnected:', reason);
  if (reason === 'io server disconnect') {
    socket.connect();
  }
});

// Keep-alive heartbeat
setInterval(() => {
  if (socket.connected) {
    socket.emit('ping', 1);
  }
}, 25000);

export default socket;
