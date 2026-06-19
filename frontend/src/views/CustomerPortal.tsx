import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Send, CheckCircle, AlertCircle, ImageIcon, X, Sparkles, MessageSquare, Search, ArrowRight, Upload } from 'lucide-react';
import clsx from 'clsx';

const API = '/api';
type Step = 'form' | 'submitting' | 'success' | 'error';

function ResumeChat() {
  const navigate = useNavigate();
  const [ticketInput, setTicketInput] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [looking, setLooking] = useState(false);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const raw = ticketInput.trim();
    if (!raw) return;
    setLookupError('');
    setLooking(true);
    try {
      const { data } = await axios.get(`${API}/tickets?limit=100`);
      const match = (data.tickets as Array<{ id: string }>).find(
        t => t.id === raw || t.id.slice(0, 8).toUpperCase() === raw.toUpperCase()
      );
      if (match) { navigate(`/chat/${match.id}`); }
      else { setLookupError('No ticket found. Check the ID and try again.'); }
    } catch { setLookupError('Could not reach the server. Please try again.'); }
    finally { setLooking(false); }
  }

  return (
    <div className="mt-8 pt-6 border-t border-white/[0.06]">
      <p className="text-center text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3">Already have a ticket?</p>
      <form onSubmit={handleLookup} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
          <input
            value={ticketInput}
            onChange={e => { setTicketInput(e.target.value); setLookupError(''); }}
            placeholder="Ticket ID (e.g. 3954C7E6)"
            className="input-field pl-9 tabular"
          />
        </div>
        <button
          type="submit"
          disabled={!ticketInput.trim() || looking}
          className="btn-press flex items-center gap-1.5 px-4 py-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {looking ? <span className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /> : <><ArrowRight className="w-3.5 h-3.5" />Resume</>}
        </button>
      </form>
      {lookupError && (
        <p className="text-xs text-red-400/80 mt-2 flex items-center gap-1.5 animate-fade-in">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />{lookupError}
        </p>
      )}
    </div>
  );
}

export default function CustomerPortal() {
  const [step, setStep] = useState<Step>('form');
  const [ticketId, setTicketId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ customerName: '', customerEmail: '', text: '' });
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerName.trim() || !form.text.trim()) return;
    setStep('submitting');
    const fd = new FormData();
    fd.append('customerName', form.customerName.trim());
    fd.append('customerEmail', form.customerEmail.trim());
    fd.append('text', form.text.trim());
    if (image) fd.append('image', image);
    try {
      const { data } = await axios.post(`${API}/tickets`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTicketId(data.ticketId);
      setStep('success');
    } catch (err) {
      setErrorMsg(axios.isAxiosError(err) ? err.response?.data?.error || 'Server error' : 'Network error');
      setStep('error');
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-mesh bg-dot-grid flex items-center justify-center p-4 pt-16">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-teal-500/8 blur-3xl" />
        </div>
        <div className="relative w-full max-w-md text-center animate-scale-in">
          <div className="glass-card gradient-border rounded-2xl p-10">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 animate-float">
              <CheckCircle className="w-9 h-9 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Ticket Created!</h2>
            <p className="text-slate-400 text-sm mb-7">Our AI is triaging your case. An agent will respond shortly.</p>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-6">
              <p className="text-xs text-slate-600 uppercase tracking-widest mb-1.5">Your Ticket ID</p>
              <p className="font-mono font-bold text-teal-400 text-xl tabular tracking-widest">{ticketId.slice(0, 8).toUpperCase()}</p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 bg-teal-500/5 border border-teal-500/10 rounded-xl p-3 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              AI triage running — you can chat with a live agent right now.
            </div>

            <Link to={`/chat/${ticketId}`}
              className="btn-press flex items-center justify-center gap-2 w-full py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl transition-all duration-200 shadow-glow-teal hover:shadow-[0_0_32px_-4px_rgba(20,184,166,0.7)] text-sm">
              <MessageSquare className="w-4 h-4" /> Open Live Chat
            </Link>
            <button onClick={() => { setStep('form'); setForm({ customerName:'', customerEmail:'', text:'' }); setImage(null); setPreview(null); }}
              className="mt-4 text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Submit another ticket
            </button>
            <ResumeChat />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh bg-dot-grid flex items-center justify-center p-4 pt-16">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 right-1/4 w-72 h-72 rounded-full bg-teal-500/6 blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">AI Support</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">
            <span className="text-gradient-teal">help</span><span className="text-white">desk</span>
          </h1>
          <p className="text-slate-500 text-sm">Describe your issue — our AI will triage it instantly.</p>
        </div>

        <div className="glass-card gradient-border rounded-2xl p-7 animate-fade-up stagger-1">
          {step === 'error' && (
            <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/15 rounded-xl p-3.5 mb-5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-300">Submission failed</p>
                <p className="text-xs text-red-400/70 mt-0.5">{errorMsg}</p>
              </div>
              <button onClick={() => setStep('form')} className="ml-auto text-red-500 hover:text-red-300 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Full Name *</label>
                <input required value={form.customerName}
                  onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                  placeholder="John Doe" className="input-field" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Email</label>
                <input type="email" value={form.customerEmail}
                  onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
                  placeholder="john@example.com" className="input-field" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Describe your issue *</label>
              <textarea required rows={4} value={form.text}
                onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                placeholder="My order arrived damaged. The outer box was crushed and the item has a large crack..."
                className="input-field resize-none" />
            </div>

            {/* Drop zone */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Attach Photo (Optional)</label>
              {preview ? (
                <div className="relative inline-block group">
                  <img src={preview} alt="Preview" className="h-28 rounded-xl object-cover border border-white/[0.08] outline outline-1 outline-white/5" />
                  <button type="button" onClick={() => { setImage(null); setPreview(null); }}
                    className="btn-press absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center shadow-lg transition-colors">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <div
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                  className={clsx(
                    'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
                    dragOver
                      ? 'border-teal-500/60 bg-teal-500/5'
                      : 'border-white/[0.08] hover:border-teal-500/30 hover:bg-white/[0.02]'
                  )}
                >
                  <Upload className={clsx('w-6 h-6 mx-auto mb-2 transition-colors duration-200', dragOver ? 'text-teal-400' : 'text-slate-600')} />
                  <p className="text-sm text-slate-500">Drop image here or <span className="text-teal-400">click to browse</span></p>
                  <p className="text-xs text-slate-700 mt-1">JPEG, PNG, WebP up to 10MB</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            <button type="submit" disabled={step === 'submitting'}
              className={clsx(
                'btn-press w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 mt-1',
                step === 'submitting'
                  ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                  : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-glow-teal hover:shadow-[0_0_32px_-4px_rgba(20,184,166,0.7)]'
              )}>
              {step === 'submitting'
                ? <><span className="w-4 h-4 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />Submitting...</>
                : <><Send className="w-4 h-4" />Submit Ticket</>}
            </button>
          </form>

          <ResumeChat />
        </div>
      </div>
    </div>
  );
}
