import React from 'react';
import { IncidentStatus } from '../../types';

interface Props {
  status: IncidentStatus | string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const st = (status || 'REPORTED').toUpperCase();

  const labels: Record<string, { text: string; style: string }> = {
    REPORTED: { text: 'Reported', style: 'bg-slate-800 text-slate-300 border-slate-700' },
    AI_ANALYZING: { text: 'AI Analyzing', style: 'bg-indigo-950 text-indigo-300 border-indigo-700 animate-pulse' },
    PENDING_VERIFICATION: { text: 'Pending Human Verification', style: 'bg-yellow-950 text-yellow-300 border-yellow-700/80 font-bold' },
    VERIFIED: { text: 'Verified', style: 'bg-emerald-950 text-emerald-300 border-emerald-600' },
    PRIORITIZED: { text: 'Prioritized', style: 'bg-purple-950 text-purple-300 border-purple-600' },
    DISPATCHED: { text: 'Dispatched', style: 'bg-blue-950 text-blue-300 border-blue-600' },
    RESPONDER_EN_ROUTE: { text: 'Responder En Route', style: 'bg-cyan-950 text-cyan-300 border-cyan-600' },
    ON_SCENE: { text: 'On Scene', style: 'bg-teal-950 text-teal-300 border-teal-500' },
    RESOLVED: { text: 'Resolved', style: 'bg-slate-900 text-slate-400 border-slate-700 line-through' },
    CLOSED: { text: 'Closed', style: 'bg-slate-900 text-slate-500 border-slate-800' },
  };

  const item = labels[st] || { text: st, style: 'bg-slate-800 text-slate-300 border-slate-700' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border uppercase tracking-wider ${item.style}`}>
      {item.text}
    </span>
  );
};
