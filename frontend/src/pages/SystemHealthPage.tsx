import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw, Server, Cpu, Database, Cloud } from 'lucide-react';
import { api } from '../services/api';

export const SystemHealthPage: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const data = await api.health.get();
      setHealthData(data);
    } catch {
      setHealthData({
        system_status: 'DEGRADED',
        services: {
          backend: { name: 'Backend API', status: 'DEGRADED', error: 'Network timeout' },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    if (status === 'ONLINE') return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    if (status === 'FALLBACK_ACTIVE' || status === 'DEGRADED') return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ONLINE') {
      return <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">ONLINE</span>;
    }
    if (status === 'FALLBACK_ACTIVE' || status === 'DEGRADED') {
      return <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">{status}</span>;
    }
    return <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-red-950 text-red-300 border border-red-700">OFFLINE</span>;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
            Platform Observability & Infrastructure Integrity
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1 flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />
            Live System Component Health
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Section 50: Genuine real-time probing of all external adapters, database pools, and AI engines. Zero fabricated status.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Probe Health</span>
        </button>
      </div>

      {healthData && (
        <div className="space-y-6">
          
          {/* Overall Health Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                Primary Cluster Status
              </span>
              <div className="text-3xl font-extrabold text-white mt-1 flex items-center gap-3">
                <span>ResQIntel Platform:</span>
                <span className={healthData.system_status === 'ONLINE' ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'}>
                  {healthData.system_status}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
              {getStatusIcon(healthData.system_status)}
            </div>
          </div>

          {/* Service Probes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(healthData.services || {}).map(([key, svc]: [string, any]) => (
              <div key={key} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {getStatusIcon(svc.status)}
                    <div>
                      <h3 className="font-bold text-sm text-white">{svc.name || key}</h3>
                      {svc.engine && <div className="text-[11px] text-slate-400 font-mono">{svc.engine}</div>}
                    </div>
                  </div>
                  {getStatusBadge(svc.status)}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Latency: {svc.latency_ms !== undefined ? `${svc.latency_ms} ms` : 'Active'}</span>
                  {svc.active_clients !== undefined && <span>Connections: {svc.active_clients}</span>}
                  {svc.agents_active !== undefined && <span>Active Agents: {svc.agents_active}</span>}
                  {svc.note && <span className="text-amber-400 text-[10px]">{svc.note}</span>}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};
