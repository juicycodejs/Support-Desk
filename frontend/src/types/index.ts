export type TicketStatus = 'PENDING' | 'ASSIGNED' | 'RESOLVED';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SenderType = 'CUSTOMER' | 'AGENT' | 'AI_SYSTEM';

export interface Message {
  id: string;
  ticketId: string;
  sender: SenderType;
  text: string;
  imageUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  customerName: string;
  customerEmail?: string | null;
  status: TicketStatus;
  priority: PriorityLevel;
  category: string;
  visualAssessment?: string | null;
  aiDraftResponse?: string | null;
  assignedAgent?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  hasImage?: boolean;
}

export interface TicketQueuedPayload {
  ticketId: string;
  updatedTicket: Ticket;
  draft: string;
  keyIssues: string[];
  suggestedActions: string[];
  sentimentScore: number;
  latencyMs: number;
}

export interface Stats {
  total: number;
  pending: number;
  assigned: number;
  resolved: number;
  byPriority: Array<{ priority: PriorityLevel; _count: number }>;
  byCategory: Array<{ category: string; _count: number }>;
}
