import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Headphones, Sparkles } from 'lucide-react';

export const ROLE_KEY = 'ag_user_role';

export default function RoleSelect() {
  const navigate = useNavigate();

  function pick(role: 'customer' | 'agent') {
    sessionStorage.setItem(ROLE_KEY, role);
    navigate(role === 'agent' ? '/agent' : '/portal');
  }

  return (
    <div className="min-h-screen bg-mesh bg-dot-grid flex items-center justify-center p-4">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-teal-500/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">AI-Powered</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-3">
            <span className="text-gradient-teal">help</span><span className="text-white">desk</span>
          </h1>
          <p className="text-slate-400 text-base">Intelligent support, instantly.</p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Customer */}
          <button
            onClick={() => pick('customer')}
            className="group relative animate-fade-up stagger-2 flex flex-col items-center gap-5 p-7 rounded-2xl glass-card gradient-border
                       transition-all duration-300 ease-out btn-press
                       hover:bg-teal-950/30 hover:border-teal-500/20 hover:-translate-y-1"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-[18px] bg-teal-500/10 border border-teal-500/20 flex items-center justify-center
                              transition-all duration-300 group-hover:bg-teal-500/20 group-hover:border-teal-500/35 group-hover:scale-110">
                <ShoppingBag className="w-7 h-7 text-teal-400 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#080c14] animate-pulse-slow" />
            </div>
            <div className="text-center">
              <p className="font-bold text-white text-base mb-1 group-hover:text-teal-100 transition-colors">Customer</p>
              <p className="text-xs text-slate-500 leading-relaxed">Report an issue or track your support ticket</p>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>

          {/* Agent */}
          <button
            onClick={() => pick('agent')}
            className="group relative animate-fade-up stagger-3 flex flex-col items-center gap-5 p-7 rounded-2xl glass-card gradient-border
                       transition-all duration-300 ease-out btn-press
                       hover:bg-indigo-950/30 hover:border-indigo-500/20 hover:-translate-y-1"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-[18px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center
                              transition-all duration-300 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/35 group-hover:scale-110">
                <Headphones className="w-7 h-7 text-indigo-400 transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-bold text-white text-base mb-1 group-hover:text-indigo-100 transition-colors">Support Agent</p>
              <p className="text-xs text-slate-500 leading-relaxed">Sign in to manage and resolve tickets</p>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-10 animate-fade-up stagger-4">
          Powered by Gemini 2.5 Flash · Real-time AI Triage
        </p>
      </div>
    </div>
  );
}
