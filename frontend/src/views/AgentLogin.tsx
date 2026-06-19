import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Lock, Eye, EyeOff, AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { ROLE_KEY } from './RoleSelect';

// Demo credentials — swap for a real auth endpoint in production
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

    // Simulate network delay for realism
    await new Promise(r => setTimeout(r, 600));

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 pt-16">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 mb-4">
            <Headphones className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Agent Portal</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to access the support dashboard</p>
        </div>

        {/* Demo hint */}
        <div className="flex items-start gap-2.5 bg-indigo-950/40 border border-indigo-800/30 rounded-xl p-3 mb-6">
          <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-300 leading-relaxed">
            <span className="font-semibold">Demo credentials:</span><br />
            Username: <code className="bg-slate-800 px-1 rounded">agent1</code> &nbsp;
            Password: <code className="bg-slate-800 px-1 rounded">support123</code>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 bg-red-900/30 border border-red-700/40 rounded-xl px-4 py-3 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          {/* Username */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Username
            </label>
            <div className="relative">
              <input
                required
                autoFocus
                autoComplete="username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="agent1"
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition mt-2',
              loading
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-[0.98]'
            )}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-300 rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Headphones className="w-4 h-4" />
                Sign In to Dashboard
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-8 flex items-center justify-center gap-1.5">
          <Zap className="w-3 h-3" /> Powered by AnomalyGuard AI
        </p>
      </div>
    </div>
  );
}
