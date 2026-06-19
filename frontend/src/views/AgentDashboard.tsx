import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Inbox, CheckCircle, Clock, AlertTriangle, BarChart2, Send,
  Sparkles, ChevronRight, RefreshCw, Eye, Activity,
  MessageSquare, User, Search, LogOut, Zap,
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

const PRIORITY_DOT: Record<string, string> = {
  URGENT: 'bg-red-400',
  HIGH: 'bg-orange-400',
  MEDIUM: 'bg-yellow-400',
  LOW: 'bg-slate-500',
};

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

  const filteredTickets = tickets.filter(t => {
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchSearch = !search || t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search);
    return matchStatus && matchSearch;
  });

  return (
    <div className="flex h-screen bg-[#080c14] text-white font-sans overflow-hidden pt-12">

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/4 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/4 blur-3xl rounded-full translate-x-1/3 translate-y-1/3" />
      </div>

      {/* ── Left Rail ─────────────────────────────────────────────────────────── */}
      <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-white/[0.06] relative z-10">

        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500/20 to-indigo-500/10 border border-white/[0.08] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <h1 className="font-black text-sm tracking-tight">
                  <span className="text-gradient-teal">help</span><span className="text-white">desk</span>
                </h1>
                {agentSession.name && (
                  <p className="text-xs text-slate-500 leading-none mt-0.5">{agentSession.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {liveCount > 0 && (
                <span className="px-2 py-0.5 bg-teal-500/15 text-teal-400 text-xs rounded-full border border-teal-500/25 font-mono animate-pulse">
                  +{liveCount}
                </span>
              )}
              <button onClick={() => { fetchTickets(); fetchStats(); setLiveCount(0); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-all duration-200">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleSignOut} title="Sign out"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/8 transition-all duration-200">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 mb-3">
            {(['queue', 'stats'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={clsx(
                  'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5',
                  tab === t
                    ? 'bg-white/[0.08] text-white shadow-[0_1px_3px_rgba(0,0,0,0.4)]'
                    : 'text-slate-500 hover:text-slate-300'
                )}>
                {t === 'queue' ? <Inbox className="w-3.5 h-3.5" /> : <BarChart2 className="w-3.5 h-3.5" />}
                {t === 'queue' ? `Queue (${filteredTickets.length})` : 'Stats'}
              </button>
            ))}
          </div>

          {tab === 'queue' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search tickets..."
                  className="input-field pl-9 text-xs" />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {['ALL', 'PENDING', 'ASSIGNED', 'RESOLVED'].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={clsx(
                      'btn-press px-2.5 py-1 text-xs rounded-lg font-semibold whitespace-nowrap transition-all duration-200 border',
                      filterStatus === s
                        ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                        : 'bg-white/[0.03] text-slate-500 border-white/[0.06] hover:text-slate-300 hover:bg-white/[0.05]'
                    )}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Queue / Stats */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'queue' ? (
            loading ? (
              <div className="flex items-center justify-center h-32 text-slate-600 text-xs gap-2">
                <span className="w-4 h-4 border-2 border-white/10 border-t-teal-400 rounded-full animate-spin" />
                Loading tickets...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-2">
                <Inbox className="w-6 h-6 opacity-30" />
                <span className="text-xs">No tickets found</span>
              </div>
            ) : (
              <div className="p-3 space-y-1.5">
                {filteredTickets.map(ticket => (
                  <button key={ticket.id} onClick={() => loadTicket(ticket)}
                    className={clsx(
                      'w-full text-left p-3.5 rounded-xl border transition-all duration-200 group relative overflow-hidden',
                      selected?.id === ticket.id
                        ? 'bg-teal-950/40 border-teal-700/40 shadow-[inset_0_0_0_1px_rgba(20,184,166,0.1)]'
                        : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1]'
                    )}>
                    {/* Priority stripe */}
                    <span className={clsx(
                      'absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full',
                      PRIORITY_DOT[ticket.priority] || 'bg-slate-600'
                    )} />

                    <div className="pl-2.5">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/[0.07] flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-300">
                            {ticket.customerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate leading-tight">{ticket.customerName}</p>
                            <p className="text-[10px] text-slate-600 font-mono tabular">#{ticket.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded font-mono border border-white/[0.05]">
                          {ticket.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={ticket.status} />
                          <ChevronRight className={clsx(
                            'w-3 h-3 transition-all duration-200',
                            selected?.id === ticket.id ? 'text-teal-400 translate-x-0.5' : 'text-slate-700 group-hover:text-slate-500'
                          )} />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1.5 tabular">
                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            <StatsPanel stats={stats} />
          )}
        </div>
      </div>

      {/* ── Main Workspace ────────────────────────────────────────────────────── */}
      {selected ? (
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">

          {/* Workspace Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.08] flex items-center justify-center text-sm font-bold text-slate-300 flex-shrink-0">
                {selected.customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-white text-sm">{selected.customerName}</h2>
                  <PriorityBadge priority={selected.priority} />
                  <StatusBadge status={selected.status} />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 tabular">
                  #{selected.id.slice(0, 8).toUpperCase()} · {selected.category} · {format(new Date(selected.createdAt), 'MMM d, HH:mm')}
                  {selected.customerEmail && ` · ${selected.customerEmail}`}
                </p>
              </div>
            </div>
            {selected.status !== 'RESOLVED' && (
              <button onClick={handleResolve}
                className="btn-press flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all duration-200">
                <CheckCircle className="w-3.5 h-3.5" />
                Mark Resolved
              </button>
            )}
          </div>

          <div className="flex flex-1 overflow-hidden">

            {/* Messages */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-slate-600 text-xs gap-2">
                    <span className="w-4 h-4 border-2 border-white/10 border-t-teal-400 rounded-full animate-spin" />
                    Loading conversation...
                  </div>
                ) : (
                  messages.map(msg => <MessageBubble key={msg.id} message={msg} />)
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Box */}
              {selected.status !== 'RESOLVED' && (
                <div className="border-t border-white/[0.06] p-4 bg-white/[0.01]">
                  <textarea
                    ref={replyRef}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSend(); }}
                    rows={3}
                    placeholder="Type your reply… (⌘+Enter to send)"
                    className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/40 focus:bg-white/[0.06] transition-all duration-200 resize-none mb-3"
                  />
                  <div className="flex items-center justify-between">
                    <button onClick={handleImproveReply} disabled={improving || !replyText.trim()}
                      className="btn-press flex items-center gap-1.5 px-3.5 py-2 bg-violet-500/8 border border-violet-500/15 text-violet-400 rounded-xl text-xs font-semibold hover:bg-violet-500/15 hover:border-violet-500/25 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed">
                      {improving
                        ? <span className="w-3.5 h-3.5 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
                        : <Sparkles className="w-3.5 h-3.5" />}
                      {improving ? 'Improving…' : 'AI Improve Reply'}
                    </button>
                    <button onClick={handleSend} disabled={!replyText.trim()}
                      className="btn-press flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-glow-teal">
                      <Send className="w-3.5 h-3.5" />
                      Send Reply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── AI Sidebar ──────────────────────────────────────────────────── */}
            <div className="w-72 flex-shrink-0 border-l border-white/[0.06] overflow-y-auto bg-white/[0.005]">
              <div className="p-4 space-y-3">

                {/* Vision Analysis */}
                {selected.visualAssessment && (
                  <div className="bg-teal-950/30 border border-teal-800/25 rounded-xl p-4 animate-fade-up">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-5 h-5 rounded-md bg-teal-500/15 border border-teal-500/20 flex items-center justify-center">
                        <Eye className="w-3 h-3 text-teal-400" />
                      </div>
                      <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">Vision Analysis</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{selected.visualAssessment}</p>
                  </div>
                )}

                {/* Sentiment */}
                {aiMeta.sentimentScore !== undefined && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                    <SentimentMeter score={aiMeta.sentimentScore} />
                  </div>
                )}

                {/* Key Issues */}
                {aiMeta.keyIssues && aiMeta.keyIssues.length > 0 && (
                  <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-4 animate-fade-up">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-5 h-5 rounded-md bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                      </div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Key Issues</span>
                    </div>
                    <ul className="space-y-2">
                      {aiMeta.keyIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className="w-1 h-1 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Actions */}
                {aiMeta.suggestedActions && aiMeta.suggestedActions.length > 0 && (
                  <div className="bg-blue-950/20 border border-blue-800/20 rounded-xl p-4 animate-fade-up">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-5 h-5 rounded-md bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                        <Activity className="w-3 h-3 text-blue-400" />
                      </div>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Suggested Actions</span>
                    </div>
                    <ul className="space-y-2">
                      {aiMeta.suggestedActions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className="text-blue-500 mt-0.5 flex-shrink-0">→</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Latency */}
                {aiMeta.latencyMs !== undefined && (
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <Zap className="w-3 h-3" /> AI latency
                      </span>
                      <span className="font-mono text-emerald-400 tabular">{aiMeta.latencyMs}ms</span>
                    </div>
                  </div>
                )}

                {/* AI Draft */}
                {selected.aiDraftResponse && !aiMeta.draft && (
                  <div className="bg-violet-950/20 border border-violet-800/20 rounded-xl p-4 animate-fade-up">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-5 h-5 rounded-md bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                        <MessageSquare className="w-3 h-3 text-violet-400" />
                      </div>
                      <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">AI Draft</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">{selected.aiDraftResponse}</p>
                    <button onClick={() => setReplyText(selected.aiDraftResponse || '')}
                      className="btn-press mt-3 w-full py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg text-xs font-semibold hover:bg-violet-500/15 transition-all duration-200">
                      Use This Draft
                    </button>
                  </div>
                )}

                {!selected.visualAssessment && !aiMeta.sentimentScore && !aiMeta.keyIssues && (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-700 gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                      <Sparkles className="w-5 h-5 opacity-40" />
                    </div>
                    <span className="text-xs text-center text-slate-600 leading-relaxed">AI analysis appears here once processing completes</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center animate-float">
            <Inbox className="w-7 h-7 text-slate-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-400">Select a ticket</p>
            <p className="text-xs text-slate-600 mt-1">Choose a case from the queue to open the workspace</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsPanel({ stats }: { stats: Stats | null }) {
  if (!stats) return (
    <div className="flex items-center justify-center h-32 text-slate-600 text-xs gap-2">
      <span className="w-4 h-4 border-2 border-white/10 border-t-teal-400 rounded-full animate-spin" />Loading...
    </div>
  );

  const cards = [
    { label: 'Total', value: stats.total, icon: <Inbox className="w-4 h-4" />, color: 'text-slate-300', accent: 'border-white/[0.07]', bg: 'bg-white/[0.03]' },
    { label: 'Pending', value: stats.pending, icon: <Clock className="w-4 h-4" />, color: 'text-yellow-400', accent: 'border-yellow-500/20', bg: 'bg-yellow-500/8' },
    { label: 'Assigned', value: stats.assigned, icon: <Activity className="w-4 h-4" />, color: 'text-blue-400', accent: 'border-blue-500/20', bg: 'bg-blue-500/8' },
    { label: 'Resolved', value: stats.resolved, icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-400', accent: 'border-emerald-500/20', bg: 'bg-emerald-500/8' },
  ];

  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {cards.map(c => (
          <div key={c.label} className={`${c.bg} border ${c.accent} rounded-xl p-3.5`}>
            <div className={`${c.color} mb-1.5`}>{c.icon}</div>
            <p className={`text-2xl font-bold ${c.color} tabular`}>{c.value}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {stats.byCategory.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">By Category</p>
          <div className="space-y-2">
            {stats.byCategory.sort((a, b) => b._count - a._count).map(c => (
              <div key={c.category} className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">{c.category}</span>
                <span className="text-xs text-teal-400 font-bold tabular">{c._count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.byPriority.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">By Priority</p>
          <div className="space-y-2">
            {stats.byPriority.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)).map(c => (
              <div key={c.priority} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[c.priority] || 'bg-slate-600')} />
                  <span className="text-xs text-slate-400 font-mono">{c.priority}</span>
                </div>
                <span className="text-xs text-teal-400 font-bold tabular">{c._count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
