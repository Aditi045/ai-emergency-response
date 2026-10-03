import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Radio, MapPin, Navigation, CheckCircle, Clock, 
  Send, AlertTriangle, Shield, Truck, PhoneCall 
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';

export const ResponderDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dutyStatus, setDutyStatus] = useState<'ON_DUTY' | 'EN_ROUTE' | 'ON_SCENE' | 'OFF_DUTY'>('ON_DUTY');
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fieldNote, setFieldNote] = useState('');
  const [reporting, setReporting] = useState(false);

  const fetchDutyData = async () => {
    try {
      const data = await api.responders.myAssignment();
      if (data.assigned) {
        setAssignment(data.incident);
        if (data.responder?.status) setDutyStatus(data.responder.status);
      }
    } catch {
      setAssignment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDutyData();
  }, []);

  const handleUpdateStatus = async (status: 'ON_DUTY' | 'EN_ROUTE' | 'ON_SCENE' | 'OFF_DUTY') => {
    setDutyStatus(status);
    try {
      await api.responders.heartbeat({
        status,
        latitude: 13.0845,
        longitude: 80.2720,
      });
      if (assignment) {
        if (status === 'ON_SCENE') {
          await api.incidents.updateStatus(assignment.id, 'ON_SCENE', `Responder arrived on scene`);
        } else if (status === 'EN_ROUTE') {
          await api.incidents.updateStatus(assignment.id, 'RESPONDER_EN_ROUTE', `Responder en route`);
        }
        await fetchDutyData();
      }
    } catch (err: any) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSendFieldNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldNote.trim() || !assignment) return;
    setReporting(true);
    try {
      await api.reports.submit({
        incident_type: assignment.incident_type,
        description: `Responder Field SITREP: ${fieldNote}`,
        latitude: assignment.latitude,
        longitude: assignment.longitude,
        address: assignment.address,
        submitter_name: user?.full_name || 'Field Responder',
      });
      setFieldNote('');
      alert('Field note transmitted to central command');
      await fetchDutyData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit field report');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-sans">
      
      {/* Top Profile & Duty Toggle */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
            Tactical Responder Field Terminal
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            {user?.full_name || 'Field Operative'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Unit Badge: <span className="font-mono text-slate-200">SWR-042 (Swift Water Rescue Battalion 4)</span>
          </p>
        </div>

        {/* Duty Status Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(['ON_DUTY', 'EN_ROUTE', 'ON_SCENE', 'OFF_DUTY'] as const).map((st) => (
            <button
              key={st}
              onClick={() => handleUpdateStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                dutyStatus === st
                  ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Active Assignment Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2 border-b border-slate-800 pb-3">
          <Truck className="w-4 h-4 text-cyan-400" />
          Active Dispatched Mission
        </h2>

        {assignment ? (
          <div className="space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-mono font-bold text-red-400">#{assignment.incident_number}</span>
                <h3 className="text-base font-extrabold text-white mt-0.5">{assignment.title}</h3>
                <div className="text-slate-400 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{assignment.address}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={assignment.severity_class} score={assignment.severity_score} />
                <StatusBadge status={assignment.status} />
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-slate-400 block font-mono text-[10px]">OPERATIONAL SUMMARY:</span>
              <p className="text-slate-300 leading-relaxed">{assignment.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={`/incidents/${assignment.id}`}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors"
              >
                Open Full Tactical Dossier
              </Link>
              <Link
                to="/map"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold border border-slate-700 transition-colors"
              >
                View Route & Hazards on Map
              </Link>
            </div>

            {/* Field Situation Report Form */}
            <form onSubmit={handleSendFieldNote} className="pt-4 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Transmit On-Scene Field Report / SITREP Update
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={fieldNote}
                  onChange={(e) => setFieldNote(e.target.value)}
                  placeholder="e.g. Arrived at bridge. 2 victims extracted, road completely impassable..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={reporting || !fieldNote.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            No active emergency mission currently assigned to this unit. Maintain standby readiness.
          </div>
        )}
      </div>

    </div>
  );
};
