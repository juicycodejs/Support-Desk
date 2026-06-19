import { Request, Response } from 'express';
import { Server } from 'socket.io';
import path from 'path';
import { prisma } from '../config/database';
import { processMultimodalTicket, generateAgentReply } from '../services/ai.service';

export function createTicketHandler(io: Server) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { customerName, customerEmail, text } = req.body;

      if (!customerName?.trim() || !text?.trim()) {
        res.status(400).json({ error: 'customerName and text are required' });
        return;
      }

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const ticket = await prisma.ticket.create({
        data: {
          customerName: customerName.trim(),
          customerEmail: customerEmail?.trim() || null,
          status: 'PENDING',
        },
      });

      await prisma.message.create({
        data: { ticketId: ticket.id, text: text.trim(), imageUrl, sender: 'CUSTOMER' },
      });

      io.emit('ticket:created', { ...ticket, hasImage: !!imageUrl });

      const imagePath = req.file ? path.join(process.cwd(), 'uploads', req.file.filename) : null;
      processMultimodalTicket(ticket.id, text.trim(), imagePath, io);

      res.status(201).json({ success: true, ticketId: ticket.id });
    } catch (err) {
      console.error('Create ticket error:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  };
}

export async function getTicketsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { status, priority, category, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: parseInt(limit as string),
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({ tickets, total, page: parseInt(page as string), pages: Math.ceil(total / parseInt(limit as string)) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export async function getTicketByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export function updateTicketHandler(io: Server) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, priority, assignedAgent } = req.body;

      const ticket = await prisma.ticket.update({
        where: { id: req.params.id },
        data: {
          ...(status && { status }),
          ...(priority && { priority }),
          ...(assignedAgent !== undefined && { assignedAgent }),
          ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
        },
      });

      io.emit('ticket:updated', ticket);
      res.json(ticket);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
}

export function improveReplyHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { agentInput } = req.body;
      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 10 } },
      });

      if (!ticket) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }

      const improved = await generateAgentReply(ticket.id, agentInput, ticket.messages);
      res.json({ improved });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  };
}

export async function getStatsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const [total, pending, assigned, resolved, byPriority, byCategory] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'PENDING' } }),
      prisma.ticket.count({ where: { status: 'ASSIGNED' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.groupBy({ by: ['priority'], _count: true }),
      prisma.ticket.groupBy({ by: ['category'], _count: true }),
    ]);

    res.json({ total, pending, assigned, resolved, byPriority, byCategory });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
