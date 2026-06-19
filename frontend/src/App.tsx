import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import CustomerPortal from './views/CustomerPortal';
import CustomerChat from './views/CustomerChat';
import AgentDashboard from './views/AgentDashboard';
import AgentLogin from './views/AgentLogin';
import { SESSION_KEY } from './views/AgentLogin';
import { Zap, Headphones, User, LogIn, MessageSquare } from 'lucide-react';

function isLoggedIn() {
  return !!sessionStorage.getItem(SESSION_KEY);
}

function ProtectedDashboard() {
  return isLoggedIn() ? <AgentDashboard /> : <Navigate to="/agent" replace />;
}

function NavBar() {
  const { pathname } = useLocation();
  const loggedIn = isLoggedIn();
  const isChat = pathname.startsWith('/chat/');

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 bg-slate-900/90 backdrop-blur border border-slate-700/50 rounded-full px-1.5 py-1 shadow-xl max-w-[calc(100vw-24px)]">
      {/* Logo — icon only on small screens */}
      <div className="flex items-center gap-1.5 px-2.5 mr-0.5">
        <Zap className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
        <span className="text-xs font-bold text-slate-300 tracking-tight hidden sm:block">AnomalyGuard</span>
      </div>

      <Link to="/"
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${pathname === '/' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-slate-200'}`}>
        <User className="w-3 h-3 flex-shrink-0" />
        <span className="hidden xs:block">Customer</span>
      </Link>

      {isChat && (
        <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 whitespace-nowrap">
          <MessageSquare className="w-3 h-3 flex-shrink-0" />
          <span>Chat</span>
        </span>
      )}

      {loggedIn ? (
        <Link to="/agent/dashboard"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${pathname === '/agent/dashboard' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}>
          <Headphones className="w-3 h-3 flex-shrink-0" />
          <span>Dashboard</span>
        </Link>
      ) : (
        <Link to="/agent"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition border whitespace-nowrap ${
            pathname === '/agent'
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              : 'text-slate-400 hover:text-white border-slate-700/60 hover:border-indigo-500/40 hover:bg-indigo-500/10'
          }`}>
          <LogIn className="w-3 h-3 flex-shrink-0" />
          <span>Agent</span>
        </Link>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<CustomerPortal />} />
        <Route path="/chat/:ticketId" element={<CustomerChat />} />
        <Route path="/agent" element={<AgentLogin />} />
        <Route path="/agent/dashboard" element={<ProtectedDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
