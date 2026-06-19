import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Headphones, Zap } from 'lucide-react';

export const ROLE_KEY = 'ag_user_role';

export default function RoleSelect() {
  const navigate = useNavigate();

  function pick(role: 'customer' | 'agent') {
    sessionStorage.setItem(ROLE_KEY, role);
    navigate(role === 'agent' ? '/agent' : '/portal');
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 mb-5">
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs text-teal-400 font-semibold tracking-wider uppercase">AnomalyGuard AI</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Welcome</h1>
          <p className="text-slate-400 mt-2 text-sm">Tell us who you are to get started</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Customer card */}
          <button
            onClick={() => pick('customer')}
            className="group flex flex-col items-center gap-4 p-6 bg-slate-800/50 border border-slate-700/50 hover:border-teal-500/50 hover:bg-teal-950/30 rounded-2xl transition-all duration-200 active:scale-[0.97]"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-700/60 group-hover:bg-teal-500/20 border border-slate-600/50 group-hover:border-teal-500/40 flex items-center justify-center transition-all duration-200">
              <ShoppingBag className="w-7 h-7 text-slate-300 group-hover:text-teal-400 transition-colors duration-200" />
            </div>
            <div className="text-center">
              <p className="font-bold text-white text-sm">Customer</p>
              <p className="text-xs text-slate-500 mt-0.5">Report an issue or track your ticket</p>
            </div>
          </button>

          {/* Agent card */}
          <button
            onClick={() => pick('agent')}
            className="group flex flex-col items-center gap-4 p-6 bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 hover:bg-indigo-950/30 rounded-2xl transition-all duration-200 active:scale-[0.97]"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-700/60 group-hover:bg-indigo-500/20 border border-slate-600/50 group-hover:border-indigo-500/40 flex items-center justify-center transition-all duration-200">
              <Headphones className="w-7 h-7 text-slate-300 group-hover:text-indigo-400 transition-colors duration-200" />
            </div>
            <div className="text-center">
              <p className="font-bold text-white text-sm">Support Agent</p>
              <p className="text-xs text-slate-500 mt-0.5">Sign in to manage tickets</p>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-8">
          Powered by Gemini 2.5 Flash · AnomalyGuard AI
        </p>
      </div>
    </div>
  );
}
