import React from 'react';
import { SeverityClass } from '../../types';

interface Props {
  severity: SeverityClass | string;
  score?: number;
  showScore?: boolean;
}

export const SeverityBadge: React.FC<Props> = ({ severity, score, showScore = true }) => {
  const sev = (severity || 'MEDIUM').toUpperCase() as SeverityClass;

  const styles = {
    CRITICAL: 'bg-red-950/80 text-red-300 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.25)]',
    HIGH: 'bg-orange-950/80 text-orange-300 border-orange-500/60 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
    MEDIUM: 'bg-amber-950/80 text-amber-300 border-amber-500/60',
    LOW: 'bg-blue-950/80 text-blue-300 border-blue-500/60',
  }[sev] || 'bg-slate-800 text-slate-300 border-slate-600';

  const dotColor = {
    CRITICAL: 'bg-red-500 animate-pulse',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-amber-400',
    LOW: 'bg-blue-400',
  }[sev] || 'bg-slate-400';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wider border ${styles}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span>{sev}</span>
      {showScore && score !== undefined && (
        <span className="opacity-80 font-mono text-[10px]">({score.toFixed(1)})</span>
      )}
    </span>
  );
};
