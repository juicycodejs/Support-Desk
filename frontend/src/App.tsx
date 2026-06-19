import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import CustomerPortal from './views/CustomerPortal';
import CustomerChat from './views/CustomerChat';
import AgentDashboard from './views/AgentDashboard';
import AgentLogin from './views/AgentLogin';
import RoleSelect from './views/RoleSelect';
import { SESSION_KEY } from './views/AgentLogin';
import { ROLE_KEY } from './views/RoleSelect';
import { Sparkles, Headphones, User, LogIn, MessageSquare, RotateCcw } from 'lucide-react';

function isAgentLoggedIn() { return !!sessionStorage.getItem(SESSION_KEY); }
function getRole() { return sessionStorage.getItem(ROLE_KEY) as 'customer' | 'agent' | null; }

function RequireRole({ children }: { children: React.ReactNode }) {
  return getRole() ? <>{children}</> : <Navigate to="/" replace />;
}
function ProtectedDashboard() {
  return isAgentLoggedIn() ? <AgentDashboard /> : <Navigate to="/agent" replace />;
}

function NavBar() {
  const { pathname } = useLocation();
  const role = getRole();
  const loggedIn = isAgentLoggedIn();
  const isChat = pathname.startsWith('/chat/');
  if (pathname === '/') return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 glass border border-white/[0.08] rounded-full px-2 py-1.5 max-w-[calc(100vw-24px)] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)]">

      {/* Brand */}
      <Link to="/" onClick={() => sessionStorage.removeItem(ROLE_KEY)}
        className="flex items-center gap-1.5 px-2.5 py-1 mr-1 rounded-full hover:bg-white/5 transition-all">
        <Sparkles className="w-3 h-3 text-teal-400 flex-shrink-0" />
        <span className="text-xs font-black tracking-tight hidden sm:block">
          <span className="text-gradient-teal">help</span><span className="text-white">desk</span>
        </span>
      </Link>

      <div className="w-px h-4 bg-white/[0.08] mx-0.5" />

      {role === 'customer' && (
        <>
          <Link to="/portal"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              pathname === '/portal' ? 'bg-teal-500/15 text-teal-300' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}>
            <User className="w-3 h-3 flex-shrink-0" /> Support
          </Link>
          {isChat && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-300 whitespace-nowrap">
              <MessageSquare className="w-3 h-3 flex-shrink-0" /> Chat
            </span>
          )}
        </>
      )}

      {role === 'agent' && (
        loggedIn ? (
          <Link to="/agent/dashboard"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              pathname === '/agent/dashboard' ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}>
            <Headphones className="w-3 h-3 flex-shrink-0" /> Dashboard
          </Link>
        ) : (
          <Link to="/agent"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
              pathname === '/agent'
                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25'
                : 'text-slate-500 border-white/[0.07] hover:text-white hover:bg-indigo-500/8 hover:border-indigo-500/20'
            }`}>
            <LogIn className="w-3 h-3 flex-shrink-0" /> Agent
          </Link>
        )
      )}

      {/* Switch role */}
      <Link to="/" onClick={() => sessionStorage.removeItem(ROLE_KEY)}
        title="Switch role"
        className="flex items-center justify-center w-7 h-7 rounded-full text-slate-600 hover:text-slate-300 hover:bg-white/[0.05] transition-all duration-200 ml-0.5 flex-shrink-0">
        <RotateCcw className="w-3 h-3" />
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/portal" element={<RequireRole><CustomerPortal /></RequireRole>} />
        <Route path="/chat/:ticketId" element={<RequireRole><CustomerChat /></RequireRole>} />
        <Route path="/agent" element={<AgentLogin />} />
        <Route path="/agent/dashboard" element={<ProtectedDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
