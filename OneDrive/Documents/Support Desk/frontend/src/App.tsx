import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import CustomerPortal from './views/CustomerPortal';
import AgentDashboard from './views/AgentDashboard';
import { Zap, Headphones, User } from 'lucide-react';

function NavBar() {
  const { pathname } = useLocation();
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-full px-2 py-1.5 shadow-xl">
      <div className="flex items-center gap-1.5 px-3 mr-1">
        <Zap className="w-3.5 h-3.5 text-teal-400" />
        <span className="text-xs font-bold text-slate-300 tracking-tight">AnomalyGuard</span>
      </div>
      <Link to="/"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${pathname === '/' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-slate-200'}`}>
        <User className="w-3 h-3" /> Customer
      </Link>
      <Link to="/agent"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${pathname === '/agent' ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-slate-200'}`}>
        <Headphones className="w-3 h-3" /> Agent
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<CustomerPortal />} />
        <Route path="/agent" element={<AgentDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
