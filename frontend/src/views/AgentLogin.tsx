import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Lock, Eye, EyeOff, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { ROLE_KEY } from './RoleSelect';

const DEMO_AGENTS = [
  { username: 'agent1', password: 'support123', name: 'Alex Rivera' },
  { username: 'agent2', password: 'support123', name: 'Jordan Kim' },
  { username: 'admin',  password: 'admin123',   name: 'Admin' },
];

export const SESSION_KEY = 'ag_agent_session';

export default function AgentLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));

    const agent = DEMO_AGENTS.find(
      a => a.username === form.username.trim().toLowerCase() && a.password === form.password
    );

    if (agent) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name: agent.name, username: agent.username, loginAt: Date.now() }));
      sessionStorage.setItem(ROLE_KEY, 'agent');
      navigate('/agent/dashboard');
    } else {
      setError('Invalid username or password.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-mesh bg-dot-grid flex items-center justify-center p-4 pt-16">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-40 w-80 h-80 rounded-full bg-indigo-600/8 blur-3xl" />
        <div className="absolute bottom-1/4 -right-40 w-80 h-80 rounded-full bg-violet-600/6 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-scale-in">
        <div className="glass-card gradient-border rounded-2xl p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 animate-float">
              <Headphones className="w-6 h-6 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">
              <span className="text-gradient-teal">help</span>desk · Agent
            </h1>
            <p className="text-sm text-slate-500">Sign in to your support workspace</p>
          </div>

          {/* Demo hint */}
          <div className="flex items-start gap-2.5 bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3 mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-300/80 leading-relaxed">
              Demo: <code className="bg-white/5 px-1 rounded text-indigo-300">agent1</code> / <code className="bg-white/5 px-1 rounded text-indigo-300">support123</code>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/8 border border-red-500/20 rounded-xl px-3.5 py-2.5 mb-5 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <span className="text-xs text-red-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Username</label>
              <input
                required autoFocus autoComplete="username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="agent1"
                className="input-field"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="input-field pl-10 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-slate-300 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'btn-press w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm mt-2 transition-all duration-200',
                loading
                  ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-glow-indigo hover:shadow-[0_0_32px_-4px_rgba(99,102,241,0.6)]'
              )}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
              ) : (
                <><ArrowRight className="w-4 h-4" /> Sign In</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">helpdesk · Powered by Gemini 2.5 Flash</p>
      </div>
    </div>
  );
}
