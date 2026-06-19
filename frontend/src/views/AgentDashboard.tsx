import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Inbox, CheckCircle, Clock, AlertTriangle, BarChart2, Send,
  Sparkles, ChevronRight, RefreshCw, Eye, Zap, Activity,
  MessageSquare, User, Filter, Search, LogOut,
} from 'lucide-react';
import clsx from 'clsx';
import { useSocket } from '../hooks/useSocket';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { MessageBubble } from '../components/MessageBubble';
import { SentimentMeter } from '../components/SentimentMeter';
import { SESSION_KEY } from './AgentLogin';
import type { Ticket, Message, TicketQueuedPayload, Stats } from '../types';
import { ROLE_KEY } from './RoleSelect';

const API = '/api';

type Tab = 'queue' | 'stats';

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default function AgentDashboard() {
  const { socket, joinRoom, leaveRoom, sendMessage, resolveTicket } = useSocket();
  const navigate = useNavigate();
  const agentSession = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}') as { name?: string };

  function handleSignOut() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    navigate('/');
  }

  const [tab, setTab] = useState<Tab>('queue');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [aiMeta, setAiMeta] = useState<Partial<TicketQueuedPayload>>({});
  const [replyText, setReplyText] = useState('');
  const [improving, setImproving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const fetchTickets = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/tickets?limit=50`);
      setTickets(prev => {
        const merged = [...data.tickets];
        prev.forEach(p => { if (!merged.find(m => m.id === p.id)) merged.push(p); });
        return merged.sort((a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/tickets/stats`);
      setStats(data);
    } catch { /* silently fail */ }
  }, []);

  const loadTicket = useCallback(async (ticket: Ticket) => {
    if (selected?.id) leaveRoom(selected.id);
    setSelected(ticket);
    setMessages([]);
    joinRoom(ticket.id);
    try {
      const { data } = await axios.get(`${API}/tickets/${ticket.id}`);
      setMessages(data.messages || []);
      setSelected(data);
    } catch { /* silently fail */ }
  }, [selected?.id, joinRoom, leaveRoom]);

  useEffect(() => { fetchTickets(); fetchStats(); }, [fetchTickets, fetchStats]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Socket Listeners ────────────────────────────────────────────────────────

  useEffect(() => {
    socket.on('ticket:created', (ticket: Ticket) => {
      setTickets(prev => {
        if (prev.find(t => t.id === ticket.id)) return prev;
        setLiveCount(c => c + 1);
        return [ticket, ...prev];
      });
    });

    socket.on('ticket:queued', (payload: TicketQueuedPayload) => {
      const { ticketId, updatedTicket, ...meta } = payload;
      setTickets(prev =>
        prev.map(t => t.id === ticketId ? updatedTicket : t)
           .sort((a, b) =>
             (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3) ||
             new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
           )
      );
      if (selected?.id === ticketId) {
        setSelected(updatedTicket);
        setAiMeta(meta);
        setReplyText(meta.draft || '');
      }
      fetchStats();
    });

    socket.on('ticket:updated', (ticket: Ticket) => {
      setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t));
      if (selected?.id === ticket.id) setSelected(ticket);
      fetchStats();
    });

    socket.on('message:received', (msg: Message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.off('ticket:created');
      socket.off('ticket:queued');
      socket.off('ticket:updated');
      socket.off('message:received');
    };
  }, [socket, selected?.id, fetchStats]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleSend() {
    if (!replyText.trim() || !selected) return;
    sendMessage(selected.id, replyText.trim(), 'AGENT');
    setReplyText('');
    replyRef.current?.focus();
  }

  async function handleImproveReply() {
    if (!replyText.trim() || !selected) return;
    setImproving(true);
    try {
      const { data } = await axios.post(`${API}/tickets/${selected.id}/improve-reply`, { agentInput: replyText });
      setReplyText(data.improved);
    } finally { setImproving(false); }
  }

  async function handleResolve() {
    if (!selected) return;
    resolveTicket(selected.id);
  }

  // ── Filtered Tickets ─────────────────────────────────────────────────────────

  const filteredTickets = tickets.filter(t => {
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchSearch = !search || t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search);
    return matchStatus && matchSearch;
  });

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-slate-950 text-white font-sans overflow-hidden pt-12">

      {/* ── Left Rail: Ticket Queue ─────────────────────────────────────────── */}
      <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-slate-800/60">

        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-slate-800/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div>
                <h1 className="font-bold text-slate-100 text-sm tracking-tight">AnomalyGuard AI</h1>
                {agentSession.name && (
                  <p className="text-xs text-slate-500 leading-none mt-0.5">{agentSession.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {liveCount > 0 && (
                <span className="px-2 py-0.5 bg-teal-500/20 text-teal-400 text-xs rounded-full border border-teal-500/30 font-mono animate-pulse-slow">
                  +{liveCount} live
                </span>
              )}
              <button onClick={() => { fetchTickets(); fetchStats(); setLiveCount(0); }}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 hover:bg-red-900/30 rounded-lg transition text-slate-500 hover:text-red-400">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 mb-3">
            {(['queue', 'stats'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={clsx('flex-1 py-1.5 text-xs font-semibold rounded-md transition capitalize flex items-center justify-center gap-1.5',
                  tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200')}>
                {t === 'queue' ? <Inbox className="w-3.5 h-3.5" /> : <BarChart2 className="w-3.5 h-3.5" />}
                {t === 'queue' ? `Queue (${filteredTickets.length})` : 'Stats'}
              </button>
            ))}
          </div>

          {tab === 'queue' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search tickets..."
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/40 transition" />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {['ALL', 'PENDING', 'ASSIGNED', 'RESOLVED'].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={clsx('px-2.5 py-1 text-xs rounded-md font-semibold whitespace-nowrap transition border',
                      filterStatus === s
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                        : 'bg-slate-800/40 text-slate-500 border-slate-700/40 hover:text-slate-300')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Queue / Stats Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'queue' ? (
            loading ? (
              <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                <span className="w-5 h-5 border-2 border-slate-600 border-t-teal-400 rounded-full animate-spin mr-2" />
                Loading...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-500 gap-2">
                <Inbox className="w-6 h-6 opacity-40" />
                <span className="text-sm">No tickets found</span>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {filteredTickets.map(ticket => (
                  <button key={ticket.id} onClick={() => loadTicket(ticket)}
                    className={clsx(
                      'w-full text-left p-3.5 rounded-xl border transition group',
                      selected?.id === ticket.id
                        ? 'bg-teal-950/50 border-teal-700/50'
                        : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/70 hover:border-slate-600/50'
                    )}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-300">
                          {ticket.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate">{ticket.customerName}</p>
                          <p className="text-xs text-slate-500 font-mono">#{ticket.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 bg-slate-700/40 px-2 py-0.5 rounded font-mono">
                        {ticket.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={ticket.status} />
                        <ChevronRight className={clsx('w-3.5 h-3.5 transition', selected?.id === ticket.id ? 'text-teal-400' : 'text-slate-600 group-hover:text-slate-400')} />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">
                      {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                    </p>
                  </button>
                ))}
              </div>
            )
          ) : (
            <StatsPanel stats={stats} />
          )}
        </div>
      </div>

      {/* ── Main Workspace ──────────────────────────────────────────────────── */}
      {selected ? (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Workspace Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-900/30">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-white">{selected.customerName}</h2>
                  <PriorityBadge priority={selected.priority} />
                  <StatusBadge status={selected.status} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  #{selected.id.slice(0, 8)} · {selected.category} · {format(new Date(selected.createdAt), 'MMM d, HH:mm')}
                  {selected.customerEmail && ` · ${selected.customerEmail}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selected.status !== 'RESOLVED' && (
                <button onClick={handleResolve}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-500/30 transition">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Resolve
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">

            {/* Messages */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-slate-500 text-sm">Loading conversation...</div>
                ) : (
                  messages.map(msg => <MessageBubble key={msg.id} message={msg} />)
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Box */}
              {selected.status !== 'RESOLVED' && (
                <div className="border-t border-slate-800/60 p-4">
                  <textarea
                    ref={replyRef}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSend(); }}
                    rows={3}
                    placeholder="Type your reply... (⌘+Enter to send)"
                    className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 transition resize-none mb-3"
                  />
                  <div className="flex items-center justify-between">
                    <button onClick={handleImproveReply} disabled={improving || !replyText.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg text-xs font-semibold hover:bg-violet-500/20 transition disabled:opacity-40">
                      {improving ? (
                        <span className="w-3.5 h-3.5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      {improving ? 'Improving...' : 'AI Improve Reply'}
                    </button>
                    <button onClick={handleSend} disabled={!replyText.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]">
                      <Send className="w-3.5 h-3.5" />
                      Send Reply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar: AI Analysis */}
            <div className="w-72 flex-shrink-0 border-l border-slate-800/60 overflow-y-auto">
              <div className="p-4 space-y-4">

                {/* AI Vision Assessment */}
                {selected.visualAssessment && (
                  <div className="bg-teal-950/40 border border-teal-800/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-3.5 h-3.5 text-teal-400" />
                      <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Vision Analysis</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{selected.visualAssessment}</p>
                  </div>
                )}

                {/* Sentiment */}
                {aiMeta.sentimentScore !== undefined && (
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                    <SentimentMeter score={aiMeta.sentimentScore} />
                  </div>
                )}

                {/* Key Issues */}
                {aiMeta.keyIssues && aiMeta.keyIssues.length > 0 && (
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Key Issues</span>
                    </div>
                    <ul className="space-y-1.5">
                      {aiMeta.keyIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                          <span className="text-amber-500 mt-0.5">•</span>{issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Actions */}
                {aiMeta.suggestedActions && aiMeta.suggestedActions.length > 0 && (
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Suggested Actions</span>
                    </div>
                    <ul className="space-y-1.5">
                      {aiMeta.suggestedActions.map((action, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                          <span className="text-blue-500 mt-0.5">→</span>{action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Latency */}
                {aiMeta.latencyMs !== undefined && (
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Zap className="w-3 h-3" /> AI latency
                      </span>
                      <span className="font-mono text-emerald-400">{aiMeta.latencyMs}ms</span>
                    </div>
                  </div>
                )}

                {/* Use AI Draft */}
                {selected.aiDraftResponse && !aiMeta.draft && (
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">AI Draft</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">{selected.aiDraftResponse}</p>
                    <button onClick={() => setReplyText(selected.aiDraftResponse || '')}
                      className="mt-2 w-full py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg text-xs font-semibold hover:bg-violet-500/20 transition">
                      Use This Draft
                    </button>
                  </div>
                )}

                {!selected.visualAssessment && (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-600 gap-2">
                    <User className="w-6 h-6 opacity-40" />
                    <span className="text-xs text-center">AI analysis will appear here once processing completes</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center mb-2">
            <Inbox className="w-7 h-7 opacity-50" />
          </div>
          <p className="text-base font-semibold text-slate-400">Select a ticket to begin</p>
          <p className="text-sm text-slate-600">Choose a case from the queue to open the workspace</p>
        </div>
      )}
    </div>
  );
}

function StatsPanel({ stats }: { stats: Stats | null }) {
  if (!stats) return (
    <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
      <span className="w-4 h-4 border-2 border-slate-600 border-t-teal-400 rounded-full animate-spin mr-2" />Loading...
    </div>
  );

  const cards = [
    { label: 'Total', value: stats.total, icon: <Inbox className="w-4 h-4" />, color: 'text-slate-300', bg: 'bg-slate-800/60' },
    { label: 'Pending', value: stats.pending, icon: <Clock className="w-4 h-4" />, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Assigned', value: stats.assigned, icon: <Activity className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Resolved', value: stats.resolved, icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {cards.map(c => (
          <div key={c.label} className={`${c.bg} border border-slate-700/40 rounded-xl p-3`}>
            <div className={`${c.color} mb-1`}>{c.icon}</div>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      {stats.byCategory.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">By Category</p>
          <div className="space-y-1.5">
            {stats.byCategory.sort((a, b) => b._count - a._count).map(c => (
              <div key={c.category} className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">{c.category}</span>
                <span className="text-teal-400 font-bold">{c._count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.byPriority.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">By Priority</p>
          <div className="space-y-1.5">
            {stats.byPriority.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)).map(c => (
              <div key={c.priority} className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">{c.priority}</span>
                <span className="text-teal-400 font-bold">{c._count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
