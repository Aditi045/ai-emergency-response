import React, { useState } from 'react';
import { Bot, Send, X, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeIncidentId?: string;
  activeIncidentNumber?: string;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  confidence?: number;
  timestamp: string;
}

export const CopilotDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  activeIncidentId,
  activeIncidentNumber,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: `Hello Operator. I am the ResQIntel Decision-Support Copilot. I analyze live telemetry, conflicting signals, missing items, and resources. How can I assist with Incident #${activeIncidentNumber || 'Active'}?`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [loading, setLoading] = useState(false);

  const suggestedQueries = [
    'Why is this incident high priority?',
    'Are there conflicting reports?',
    'What information is missing?',
    'What evidence supports the classification?',
    'Which resources are nearby?',
    'Generate a SITREP.',
  ];

  const handleSend = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q.trim()) return;

    const userMsg: Message = {
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await api.ai.copilot({
        query: q,
        incident_id: activeIncidentId,
      });

      const botMsg: Message = {
        sender: 'assistant',
        text: res.answer,
        confidence: res.confidence,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Error retrieving grounded intelligence: ${err.message || 'Operation failed'}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <span>Operational AI Copilot</span>
              <span className="text-[10px] bg-indigo-900 text-indigo-200 px-1 rounded font-mono">
                Grounded
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Context: #{activeIncidentNumber || 'Global Sector'}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Suggested Quick Queries */}
      <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-800 flex flex-wrap gap-1.5">
        {suggestedQueries.slice(0, 4).map((sq) => (
          <button
            key={sq}
            onClick={() => handleSend(sq)}
            className="text-[11px] px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/60 transition-colors text-left"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] p-3 rounded-xl whitespace-pre-wrap leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-red-600 text-white rounded-br-none'
                  : 'bg-slate-800/90 text-slate-200 border border-slate-700 rounded-bl-none shadow-sm'
              }`}
            >
              {m.text}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
              <span>{m.timestamp}</span>
              {m.confidence !== undefined && (
                <span className="font-mono text-indigo-400 font-semibold">
                  Confidence: {Math.round(m.confidence * 100)}%
                </span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-indigo-400 text-xs py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Consulting multi-agent telemetry...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI Copilot about this incident..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !inputQuery.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-1 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Responses strictly grounded in live database state.</span>
        </div>
      </div>
    </div>
  );
};
