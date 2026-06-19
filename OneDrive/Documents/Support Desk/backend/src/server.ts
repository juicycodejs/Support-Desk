import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { prisma } from './config/database';
import { upload } from './middleware/upload';
import {
  createTicketHandler,
  getTicketsHandler,
  getTicketByIdHandler,
  updateTicketHandler,
  improveReplyHandler,
  getStatsHandler,
} from './controllers/ticket.controller';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] },
  pingTimeout: 60000,
});

const PORT = parseInt(process.env.PORT || '4000');

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── REST Routes ─────────────────────────────────────────────────────────────
app.post('/api/tickets', upload.single('image'), createTicketHandler(io));
app.get('/api/tickets', getTicketsHandler);
app.get('/api/tickets/stats', getStatsHandler);
app.get('/api/tickets/:id', getTicketByIdHandler);
app.patch('/api/tickets/:id', updateTicketHandler(io));
app.post('/api/tickets/:id/improve-reply', improveReplyHandler());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ── WebSocket Hub ────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('room:join', (ticketId: string) => {
    socket.join(`room_${ticketId}`);
    console.log(`[Socket] ${socket.id} joined room_${ticketId}`);
  });

  socket.on('room:leave', (ticketId: string) => {
    socket.leave(`room_${ticketId}`);
  });

  socket.on('message:send', async (data: { ticketId: string; text: string; sender: string }) => {
    try {
      const newMessage = await prisma.message.create({
        data: { ticketId: data.ticketId, text: data.text, sender: data.sender },
      });
      io.to(`room_${data.ticketId}`).emit('message:received', newMessage);

      // If agent replies, update ticket status to ASSIGNED
      if (data.sender === 'AGENT') {
        const updated = await prisma.ticket.update({
          where: { id: data.ticketId },
          data: { status: 'ASSIGNED' },
        });
        io.emit('ticket:updated', updated);
      }
    } catch (err) {
      console.error('[Socket] message:send error:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('ticket:resolve', async (ticketId: string) => {
    try {
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
      io.emit('ticket:updated', updated);
    } catch (err) {
      console.error('[Socket] ticket:resolve error:', err);
    }
  });

  socket.on('agent:typing', (data: { ticketId: string; agentName: string }) => {
    socket.to(`room_${data.ticketId}`).emit('agent:typing', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('[DB] PostgreSQL connected via Prisma');

    httpServer.listen(PORT, () => {
      console.log(`[Server] AnomalyGuard AI running on http://localhost:${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('[Server] Bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap();
