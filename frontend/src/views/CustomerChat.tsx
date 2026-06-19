import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { Send, Bot, User, Headphones, ArrowLeft, Sparkles, CheckCircle, Clock, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useSocket } from '../hooks/useSocket';
import type { Ticket, Message, TicketQueuedPayload } from '../types';

const API = '/api';
const BACKEND = 'http://localhost:4000';

function ChatBubble({ message }: { message: Message }) {
  const isCustomer = message.sender === 'CUSTOMER';
  const isAI = message.sender === 'AI_SYSTEM';

  if (isAI) {
    return (
      <div className="flex gap-3 animate-slide-up">
        <div className="w-8 h-8 rounded-[10px] bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-teal-400" />
        </div>
        <div className="max-w-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-teal-400">AI Triage</span>
            <span className="text-xs text-slate-600 tabular">{format(new Date(message.createdAt), 'HH:mm')}</span>
          </div>
          <div className="bg-teal-950/50 border border-teal-800/30 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-300 leading-relaxed space-y-0.5">
            {message.text.replace(/\*\*(.*?)\*\*/g, '$1').split('\n').map((l, i) => (
              <p key={i} className={clsx(l === '' && 'h-1', 'text-sm leading-relaxed')}>{l || ' '}</p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isCustomer) {
    return (
      <div className="flex gap-3 justify-end animate-slide-up">
        <div className="max-w-sm">
          <div className="flex items-center justify-end gap-2 mb-1.5">
            <span className="text-xs text-slate-600 tabular">{format(new Date(message.createdAt), 'HH:mm')}</span>
            <span className="text-xs font-semibold text-slate-400">You</span>
          </div>
          <div className="bg-teal-600/90 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white leading-relaxed">
            {message.text}
            {message.imageUrl && (
              <img
                src={message.imageUrl.startsWith('/') ? `${BACKEND}${message.imageUrl}` : message.imageUrl}
                alt="Attachment"
                className="mt-2.5 rounded-xl max-w-full max-h-44 object-cover cursor-pointer outline outline-1 outline-white/10 hover:opacity-90 transition-opacity"
                onClick={() => window.open(`${BACKEND}${message.imageUrl}`, '_blank')}
              />
            )}
          </div>
        </div>
        <div className="w-8 h-8 rounded-[10px] bg-teal-600/20 border border-teal-600/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-4 h-4 text-teal-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-[10px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Headphones className="w-4 h-4 text-indigo-400" />
      </div>
      <div className="max-w-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-indigo-400">Support Agent</span>
          <span className="text-xs text-slate-600 tabular">{format(new Date(message.createdAt), 'HH:mm')}</span>
        </div>
        <div className="bg-white/[0.05] border border-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-200 leading-relaxed">
          {message.text}
        </div>
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
    joinRoom(ticketId);
    axios.get(`${API}/tickets/${ticketId}`)
      .then(({ data }) => { setTicket(data); setMessages(data.messages || []); })
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
    socket.on('ticket:queued', (payload: TicketQueuedPayload) => {
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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, agentTyping]);

  function handleSend() {
    if (!text.trim() || !ticketId) return;
    sendMessage(ticketId, text.trim(), 'CUSTOMER');
    setText('');
    inputRef.current?.focus();
  }

  if (loading) return (
    <div className="min-h-screen bg-mesh flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
    </div>
  );

  if (notFound || !ticket) return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center gap-4 text-slate-500">
      <p className="font-semibold">Ticket not found</p>
      <Link to="/portal" className="text-teal-400 text-sm hover:underline">← Submit a new ticket</Link>
    </div>
  );

  const isResolved = ticket.status === 'RESOLVED';

  return (
    <div className="min-h-screen bg-mesh bg-dot-grid flex flex-col pt-12">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-teal-500/5 blur-3xl rounded-full" />
      </div>

      {/* Header */}
      <div className="flex-shrink-0 glass border-b border-white/[0.06] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to="/portal" className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white">Support Ticket</p>
              <code className="text-xs font-mono text-slate-500 tabular">#{ticket.id.slice(0, 8).toUpperCase()}</code>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {isResolved
                ? <><CheckCircle className="w-3 h-3 text-emerald-400" /><span className="text-xs text-emerald-400 font-semibold">Resolved</span></>
                : <><Clock className="w-3 h-3 text-blue-400" /><span className="text-xs text-blue-400 font-semibold">{ticket.status}</span></>}
              {ticket.category !== 'UNASSIGNED' && <span className="text-xs text-slate-600">· {ticket.category}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-teal-500/8 border border-teal-500/15">
            <Sparkles className="w-3 h-3 text-teal-400" />
            <span className="text-xs text-teal-400 font-semibold">AI Triage</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-2xl mx-auto px-4 space-y-5">
          <div className="flex justify-center">
            <span className="text-xs text-slate-600 bg-white/[0.03] border border-white/[0.05] rounded-full px-3 py-1">
              Ticket received · AI analysis running
            </span>
          </div>

          {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}

          {agentTyping && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-[10px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="bg-white/[0.05] border border-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full bounce-dot" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full bounce-dot" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full bounce-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 glass border-t border-white/[0.06] px-4 py-3">
        <div className="max-w-2xl mx-auto">
          {isResolved ? (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              Ticket resolved.{' '}
              <Link to="/portal" className="underline hover:text-emerald-300 transition-colors">Open a new ticket</Link>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message… (Enter to send)"
                rows={1}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-sm text-white placeholder-slate-600 resize-none max-h-32 outline-none focus:border-teal-500/40 focus:bg-white/[0.06] transition-all duration-200"
                style={{ minHeight: '44px' }}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className={clsx(
                  'btn-press w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200',
                  text.trim()
                    ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-glow-teal'
                    : 'bg-white/[0.04] text-slate-700 cursor-not-allowed border border-white/[0.06]'
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
