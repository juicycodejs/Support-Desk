import { format } from 'date-fns';
import { Bot, User, Headphones } from 'lucide-react';
import { type Message } from '../types';

const BACKEND = 'http://localhost:4000';

function renderText(text: string) {
  return text.split('\n').map((line, i) => {
    const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: bold || '&nbsp;' }} />;
  });
}

export function MessageBubble({ message }: { message: Message }) {
  const isCustomer = message.sender === 'CUSTOMER';
  const isAI = message.sender === 'AI_SYSTEM';
  const isAgent = message.sender === 'AGENT';

  if (isAI) {
    return (
      <div className="flex gap-3 animate-slide-up">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
          <Bot className="w-4 h-4 text-teal-400" />
        </div>
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">AI Triage System</span>
            <span className="text-xs text-slate-500">{format(new Date(message.createdAt), 'HH:mm')}</span>
          </div>
          <div className="bg-teal-950/50 border border-teal-800/40 rounded-xl rounded-tl-sm p-4 text-sm text-slate-200 space-y-1">
            {renderText(message.text)}
          </div>
        </div>
      </div>
    );
  }

  if (isCustomer) {
    return (
      <div className="flex gap-3 animate-slide-up">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-600/40 border border-slate-600/40 flex items-center justify-center">
          <User className="w-4 h-4 text-slate-300" />
        </div>
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Customer</span>
            <span className="text-xs text-slate-500">{format(new Date(message.createdAt), 'HH:mm')}</span>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl rounded-tl-sm p-3 text-sm text-slate-200 space-y-1">
            {renderText(message.text)}
            {message.imageUrl && (
              <img
                src={message.imageUrl.startsWith('/') ? `${BACKEND}${message.imageUrl}` : message.imageUrl}
                alt="Customer attachment"
                className="mt-2 rounded-lg max-w-xs max-h-48 object-cover border border-slate-600/40 cursor-pointer hover:opacity-90 transition"
                onClick={() => window.open(`${BACKEND}${message.imageUrl}`, '_blank')}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Agent message — right aligned
  return (
    <div className="flex gap-3 justify-end animate-slide-up">
      <div className="flex-1 max-w-2xl flex flex-col items-end">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs text-slate-500">{format(new Date(message.createdAt), 'HH:mm')}</span>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Agent</span>
        </div>
        <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-xl rounded-tr-sm p-3 text-sm text-slate-200 space-y-1">
          {renderText(message.text)}
        </div>
      </div>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
        <Headphones className="w-4 h-4 text-indigo-400" />
      </div>
    </div>
  );
}
