import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import CustomerPortal from './views/CustomerPortal';
import CustomerChat from './views/CustomerChat';
import AgentDashboard from './views/AgentDashboard';
import AgentLogin from './views/AgentLogin';
import RoleSelect from './views/RoleSelect';
import { SESSION_KEY } from './views/AgentLogin';
import { ROLE_KEY } from './views/RoleSelect';
import { Zap, Headphones, User, LogIn, MessageSquare, ArrowLeft } from 'lucide-react';

function isAgentLoggedIn() {
  return !!sessionStorage.getItem(SESSION_KEY);
}

function getRole() {
  return sessionStorage.getItem(ROLE_KEY) as 'customer' | 'agent' | null;
}

/** Redirect to role select if no role chosen yet */
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

  // No nav on the role select screen
  if (pathname === '/') return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 bg-slate-900/90 backdrop-blur border border-slate-700/50 rounded-full px-1.5 py-1 shadow-xl max-w-[calc(100vw-24px)]">

      {/* Logo */}
      <div className="flex items-center gap-1.5 px-2.5 mr-0.5">
        <Zap className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
        <span className="text-xs font-bold text-slate-300 tracking-tight hidden sm:block">AnomalyGuard</span>
      </div>

      {/* Customer links */}
      {role === 'customer' && (
        <>
          <Link to="/portal"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${pathname === '/portal' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-slate-200'}`}>
            <User className="w-3 h-3 flex-shrink-0" /> Support
          </Link>
          {isChat && (
            <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 whitespace-nowrap">
              <MessageSquare className="w-3 h-3 flex-shrink-0" /> Chat
            </span>
          )}
        </>
      )}

      {/* Agent links */}
      {role === 'agent' && (
        loggedIn ? (
          <Link to="/agent/dashboard"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${pathname === '/agent/dashboard' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}>
            <Headphones className="w-3 h-3 flex-shrink-0" /> Dashboard
          </Link>
        ) : (
          <Link to="/agent"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition border whitespace-nowrap ${
              pathname === '/agent'
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                : 'text-slate-400 hover:text-white border-slate-700/60 hover:border-indigo-500/40 hover:bg-indigo-500/10'
            }`}>
            <LogIn className="w-3 h-3 flex-shrink-0" /> Agent Login
          </Link>
        )
      )}

      {/* Switch role */}
      <Link to="/"
        onClick={() => sessionStorage.removeItem(ROLE_KEY)}
        title="Switch role"
        className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs text-slate-500 hover:text-slate-300 transition whitespace-nowrap ml-0.5">
        <ArrowLeft className="w-3 h-3 flex-shrink-0" />
        <span className="hidden sm:block">Switch</span>
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        {/* Role gate — landing page */}
        <Route path="/" element={<RoleSelect />} />

        {/* Customer routes */}
        <Route path="/portal" element={<RequireRole><CustomerPortal /></RequireRole>} />
        <Route path="/chat/:ticketId" element={<RequireRole><CustomerChat /></RequireRole>} />

        {/* Agent routes */}
        <Route path="/agent" element={<AgentLogin />} />
        <Route path="/agent/dashboard" element={<ProtectedDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
