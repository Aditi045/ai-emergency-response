import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Radio, AlertTriangle, ShieldCheck, Truck, Users, Activity, 
  Filter, Search, ArrowUpRight, CheckCircle, RefreshCw, Bot, AlertOctagon 
} from 'lucide-react';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { Incident, Resource, Responder } from '../types';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmergencyMap } from '../components/map/EmergencyMap';

interface Props {
  onOpenCopilot?: (incidentId?: string, incNumber?: string) => void;
}

export const DispatcherDashboard: React.FC<Props> = ({ onOpenCopilot }) => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    try {
      const [incData, resData, respData] = await Promise.all([
        api.incidents.list(),
        api.resources.list(),
        api.responders.list(),
      ]);
      setIncidents(incData);
      setResources(resData);
      setResponders(respData);
    } catch (e) {
      console.error('Error fetching dashboard telemetry:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for real-time WebSocket events to update dashboard instantly without manual refresh (Section 33)
    const unsubscribe = wsService.subscribe((event) => {
      if (
        event.event === 'NEW_REPORT_INGESTED' ||
        event.event === 'INCIDENT_VERIFIED' ||
        event.event === 'INCIDENT_STATUS_UPDATED' ||
        event.event === 'RESOURCE_DISPATCHED' ||
        event.event === 'SOS_ALERT'
      ) {
        loadData();
      }
    });

    return () => unsubscribe();
  }, []);

  // Filtered incidents
  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter && inc.status !== statusFilter) return false;
    if (severityFilter && inc.severity_class !== severityFilter) return false;
    if (typeFilter && inc.incident_type !== typeFilter) return false;
    if (searchTerm) {
      const match = `${inc.title} ${inc.incident_number} ${inc.address}`.toLowerCase();
      if (!match.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  // Key operational counts
  const activeCount = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
  const criticalCount = incidents.filter((i) => i.severity_class === 'CRITICAL' && i.status !== 'RESOLVED').length;
  const pendingVerifCount = incidents.filter((i) => i.verification_status === 'UNVERIFIED').length;
  const availableResourcesCount = resources.filter((r) => r.status === 'AVAILABLE').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
              Live Operations Command Center
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            Emergency Dispatch & Multi-Agent Intelligence
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>

          {onOpenCopilot && (
            <button
              onClick={() => onOpenCopilot()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-[0_0_12px_rgba(99,102,241,0.3)] transition-all"
            >
              <Bot className="w-4 h-4" />
              <span>Launch AI Copilot</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Operational Cards (Section 39) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Active Incidents</span>
            <Radio className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">
            {loading ? '-' : activeCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Live tracking active perimeters</div>
        </div>

        <div className="bg-slate-900 border border-red-900/60 p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-mono text-red-400 uppercase tracking-wider flex items-center justify-between">
            <span>Critical Threat</span>
            <AlertOctagon className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-400 mt-1 font-mono">
            {loading ? '-' : criticalCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Severity score &gt; 8.0/10</div>
        </div>

        <div className="bg-slate-900 border border-yellow-900/60 p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-mono text-yellow-400 uppercase tracking-wider flex items-center justify-between">
            <span>Pending Verification</span>
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-yellow-300 mt-1 font-mono">
            {loading ? '-' : pendingVerifCount}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Requires human operator review</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Fleet Available</span>
            <Truck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1 font-mono">
            {loading ? '-' : availableResourcesCount} / {resources.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Staged rescue apparatus</div>
        </div>
      </div>

      {/* Geospatial Map Overview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Operational Geospatial Situation Map
          </div>
          <Link to="/map" className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
            <span>Fullscreen Map & Layers</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <EmergencyMap
          incidents={incidents}
          resources={resources}
          responders={responders}
          height="320px"
          onIncidentClick={(inc) => navigate(`/incidents/${inc.id}`)}
        />
      </div>

      {/* Incidents Table with Search & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by incident #, title, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="ON_SCENE">On Scene</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Hazard Types</option>
              <option value="Flood">Flood</option>
              <option value="Fire">Fire</option>
              <option value="Building Collapse">Building Collapse</option>
              <option value="Road Accident">Road Accident</option>
              <option value="Medical Emergency">Medical Emergency</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
              <tr>
                <th className="p-3">Ref #</th>
                <th className="p-3">Emergency Title & Location</th>
                <th className="p-3">Hazard Type</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Status</th>
                <th className="p-3">Verification</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-sans">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {loading ? 'Querying backend incident repository...' : 'No incidents match active query parameters.'}
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-red-400 whitespace-nowrap">
                      {inc.incident_number}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{inc.title}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{inc.address}</div>
                    </td>
                    <td className="p-3 font-medium text-slate-300">
                      {inc.incident_type}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <SeverityBadge severity={inc.severity_class} score={inc.severity_score} />
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {inc.verification_status === 'VERIFIED' ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-yellow-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {onOpenCopilot && (
                          <button
                            onClick={() => onOpenCopilot(inc.id, inc.incident_number)}
                            className="p-1 hover:bg-indigo-950 text-indigo-400 rounded border border-indigo-800/40"
                            title="Query AI Copilot on this incident"
                          >
                            <Bot className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Link
                          to={`/incidents/${inc.id}`}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium border border-slate-700 transition-colors"
                        >
                          Dossier & Dispatch
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
