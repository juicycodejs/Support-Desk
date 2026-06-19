import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Send, CheckCircle, AlertCircle, ImageIcon, X, Zap, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

const API = '/api';

type Step = 'form' | 'submitting' | 'success' | 'error';

export default function CustomerPortal() {
  const [step, setStep] = useState<Step>('form');
  const [ticketId, setTicketId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ customerName: '', customerEmail: '', text: '' });
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
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
      const { data } = await axios.post(`${API}/tickets`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTicketId(data.ticketId);
      setStep('success');
    } catch (err) {
      setErrorMsg(axios.isAxiosError(err) ? err.response?.data?.error || 'Server error' : 'Network error');
      setStep('error');
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 pt-16">
        <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Ticket Submitted!</h2>
            <p className="text-slate-400">Our AI is analyzing your case. Chat with a support agent below.</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Your Ticket ID</p>
            <p className="font-mono text-teal-400 text-lg font-bold">{ticketId.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400 bg-teal-950/30 border border-teal-800/30 rounded-lg p-3">
            <Zap className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>AI triage running in background. You can chat with an agent in real time.</span>
          </div>
          <Link
            to={`/chat/${ticketId}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl transition active:scale-[0.98]"
          >
            <MessageSquare className="w-4 h-4" />
            Open Live Chat
          </Link>
          <button
            onClick={() => { setStep('form'); setForm({ customerName: '', customerEmail: '', text: '' }); setImage(null); setPreview(null); }}
            className="text-sm text-slate-500 hover:text-slate-300 transition underline"
          >
            Submit another ticket instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 pt-16">
      <div className="max-w-xl w-full animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 mb-4">
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs text-teal-400 font-semibold tracking-wider uppercase">AI-Powered Support</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">How can we help?</h1>
          <p className="text-slate-400 mt-2">Describe your issue and attach a photo — our AI will triage your case instantly.</p>
        </div>

        {step === 'error' && (
          <div className="mb-4 flex items-start gap-3 bg-red-900/30 border border-red-700/40 rounded-xl p-4 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">Submission failed</p>
              <p className="text-xs text-red-400 mt-0.5">{errorMsg}</p>
            </div>
            <button onClick={() => setStep('form')} className="ml-auto text-red-400 hover:text-red-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Full Name *</label>
              <input
                required
                value={form.customerName}
                onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                placeholder="John Doe"
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/30 transition"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                value={form.customerEmail}
                onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
                placeholder="john@example.com"
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/30 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Describe your issue *</label>
            <textarea
              required
              rows={5}
              value={form.text}
              onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
              placeholder="My order arrived damaged. The outer box was completely crushed and the item inside has a large crack..."
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/30 transition resize-none"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Attach Photo (Optional)</label>
            {preview ? (
              <div className="relative inline-block">
                <img src={preview} alt="Preview" className="h-32 rounded-xl object-cover border border-slate-600/40" />
                <button
                  type="button"
                  onClick={() => { setImage(null); setPreview(null); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-400 transition"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <div
                ref={dropRef}
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-700/60 hover:border-teal-500/50 rounded-xl p-6 text-center cursor-pointer transition group"
              >
                <ImageIcon className="w-8 h-8 text-slate-600 group-hover:text-teal-500/60 mx-auto mb-2 transition" />
                <p className="text-sm text-slate-500 group-hover:text-slate-400 transition">
                  Drop image here or <span className="text-teal-400">click to browse</span>
                </p>
                <p className="text-xs text-slate-600 mt-1">JPEG, PNG, WebP up to 10MB</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          <button
            type="submit"
            disabled={step === 'submitting'}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition',
              step === 'submitting'
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-teal-500 hover:bg-teal-400 text-slate-950 active:scale-[0.98]'
            )}
          >
            {step === 'submitting' ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-300 rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Support Ticket
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-6">
          Powered by AnomalyGuard AI · Gemini-2.5-Flash Vision
        </p>
      </div>
    </div>
  );
}
