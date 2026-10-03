import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, PieChart as PieIcon, Activity, FileText, 
  RefreshCw, TrendingUp, Users, AlertTriangle, Shield 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { api } from '../services/api';

export const AnalystDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const data = await api.admin.analytics();
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981', '#8b5cf6'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-widest">
            Crisis Intelligence & Post-Incident Telemetry
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            Operational Intelligence Analytics
          </h1>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          Aggregating telemetry from database records...
        </div>
      ) : !analytics || !analytics.has_data ? (
        <div className="py-16 text-center text-xs text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
          No current data available in incident repository.
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Top Casualty & Population Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Total Documented Incidents
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">
                {analytics.total_incidents}
              </div>
            </div>

            <div className="bg-slate-900 border border-red-900/60 p-4 rounded-xl shadow-sm">
              <span className="text-[11px] font-mono text-red-400 uppercase tracking-wider block">
                Total Reported Injuries
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-red-400 mt-1 font-mono">
                {analytics.total_injuries}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Recorded Fatalities
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-200 mt-1 font-mono">
                {analytics.total_fatalities}
              </div>
            </div>

            <div className="bg-slate-900 border border-blue-900/60 p-4 rounded-xl shadow-sm">
              <span className="text-[11px] font-mono text-blue-400 uppercase tracking-wider block">
                Exposed / Displaced Persons
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-300 mt-1 font-mono">
                {analytics.total_affected}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Incident Types Distribution Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-white font-mono flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                Incident Distribution by Disaster Classification
              </h3>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.type_distribution || []}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ color: '#ffffff' }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Severity Distribution Pie Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-white font-mono flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-red-400" />
                Incident Severity Classification Spread
              </h3>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.severity_distribution || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {(analytics.severity_distribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
