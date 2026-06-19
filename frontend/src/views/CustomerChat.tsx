import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { Send, Bot, User, Headphones, ArrowLeft, Zap, CheckCircle, Clock, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useSocket } from '../hooks/useSocket';
import type { Ticket, Message, TicketQueuedPayload } from '../types';

const API = '/api';

function ChatBubble({ message }: { message: Message }) {
  const isCustomer = message.sender === 'CUSTOMER';
  const isAI = message.sender === 'AI_SYSTEM';
  const BACKEND = 'http://localhost:4000';

  if (isAI) {
    return (
      <div className="flex gap-2.5 animate-slide-up">
        <div className="w-7 h-7 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-teal-400" />
        </div>
        <div className="max-w-xs">
          <p className="text-xs text-teal-400 font-semibold mb-1">AI System</p>
          <div className="bg-teal-950/50 border border-teal-800/40 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {message.text.replace(/\*\*(.*?)\*\*/g, '$1')}
          </div>
          <p className="text-xs text-slate-600 mt-1">{format(new Date(message.createdAt), 'HH:mm')}</p>
        </div>
      </div>
    );
  }

  if (isCustomer) {
    return (
      <div className="flex gap-2.5 justify-end animate-slide-up">
        <div className="max-w-xs">
          <div className="bg-teal-600 rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm text-white leading-relaxed">
            {message.text}
            {message.imageUrl && (
              <img
                src={message.imageUrl.startsWith('/') ? `${BACKEND}${message.imageUrl}` : message.imageUrl}
                alt="Attachment"
                className="mt-2 rounded-lg max-w-full max-h-40 object-cover cursor-pointer"
                onClick={() => window.open(`${BACKEND}${message.imageUrl}`, '_blank')}
              />
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1 text-right">{format(new Date(message.createdAt), 'HH:mm')}</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-teal-600/30 border border-teal-600/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-teal-300" />
        </div>
      </div>
    );
  }

  // Agent
  return (
    <div className="flex gap-2.5 animate-slide-up">
      <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Headphones className="w-3.5 h-3.5 text-indigo-400" />
      </div>
      <div className="max-w-xs">
        <p className="text-xs text-indigo-400 font-semibold mb-1">Support Agent</p>
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-slate-200 leading-relaxed">
          {message.text}
        </div>
        <p className="text-xs text-slate-600 mt-1">{format(new Date(message.createdAt), 'HH:mm')}</p>
      </div>
    </div>
  );
}

export default function CustomerChat() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { socket, joinRoom, leaveRoom, sendMessage } = useSocket();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [agentTyping, setAgentTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!ticketId) return;

    // Join room immediately so we catch real-time events during fetch
    joinRoom(ticketId);

    axios.get(`${API}/tickets/${ticketId}`)
      .then(({ data }) => {
        setTicket(data);
        setMessages(data.messages || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    return () => { leaveRoom(ticketId); };
  }, [ticketId, joinRoom, leaveRoom]);

  useEffect(() => {
    socket.on('message:received', (msg: Message) => {
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      setAgentTyping(false);
    });

    socket.on('ticket:updated', (updated: Ticket) => {
      if (updated.id === ticketId) setTicket(updated);
    });

    // Update ticket status when AI finishes triage
    socket.on('ticket:queued', (payload: { ticketId: string; updatedTicket: Ticket }) => {
      if (payload.ticketId === ticketId) setTicket(payload.updatedTicket);
    });

    socket.on('agent:typing', (data: { ticketId: string }) => {
      if (data.ticketId === ticketId) {
        setAgentTyping(true);
        setTimeout(() => setAgentTyping(false), 3000);
      }
    });

    return () => {
      socket.off('message:received');
      socket.off('ticket:updated');
      socket.off('ticket:queued');
      socket.off('agent:typing');
    };
  }, [socket, ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentTyping]);

  function handleSend() {
    if (!text.trim() || !ticketId) return;
    sendMessage(ticketId, text.trim(), 'CUSTOMER');
    setText('');
    inputRef.current?.focus();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (notFound || !ticket) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-400">
        <p className="text-lg font-semibold">Ticket not found</p>
        <Link to="/" className="text-teal-400 text-sm hover:underline">← Submit a new ticket</Link>
      </div>
    );
  }

  const statusColor = ticket.status === 'RESOLVED' ? 'text-emerald-400' : ticket.status === 'ASSIGNED' ? 'text-blue-400' : 'text-yellow-400';
  const StatusIcon = ticket.status === 'RESOLVED' ? CheckCircle : Clock;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* Header */}
      <div className="flex-shrink-0 bg-slate-900/80 backdrop-blur border-b border-slate-800/60 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/" className="text-slate-500 hover:text-slate-300 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white truncate">Support Ticket</p>
              <span className="text-xs font-mono text-slate-500">#{ticket.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StatusIcon className={`w-3 h-3 ${statusColor}`} />
              <span className={`text-xs font-semibold ${statusColor}`}>{ticket.status}</span>
              {ticket.category !== 'UNASSIGNED' && (
                <span className="text-xs text-slate-500">· {ticket.category}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full px-2.5 py-1">
            <Zap className="w-3 h-3 text-teal-400" />
            <span className="text-xs text-teal-400 font-semibold">AI Triage</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-5">
        <div className="max-w-lg mx-auto px-4 space-y-4">

          {/* Welcome note */}
          <div className="flex justify-center">
            <div className="text-xs text-slate-500 bg-slate-800/50 border border-slate-700/40 rounded-full px-3 py-1">
              Your ticket has been received. An agent will respond shortly.
            </div>
          </div>

          {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}

          {/* Agent typing indicator */}
          {agentTyping && (
            <div className="flex gap-2.5 animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="bg-slate-800 border border-slate-700/50 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-slate-900/80 backdrop-blur border-t border-slate-800/60 px-4 py-3">
        <div className="max-w-lg mx-auto">
          {ticket.status === 'RESOLVED' ? (
            <div className="flex items-center justify-center gap-2 py-3 text-emerald-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              This ticket has been resolved. <Link to="/" className="underline hover:text-emerald-300">Open a new ticket</Link>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message... (Enter to send)"
                rows={1}
                className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 transition resize-none max-h-32"
                style={{ minHeight: '42px' }}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition',
                  text.trim()
                    ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 active:scale-95'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
