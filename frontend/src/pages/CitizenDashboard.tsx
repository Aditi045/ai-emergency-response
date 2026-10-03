import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, AlertOctagon, FileText, MapPin, Radio, 
  Clock, CheckCircle, AlertTriangle, ArrowRight, PhoneCall 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';

export const CitizenDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myReports, setMyReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await api.reports.myReports();
        setMyReports(data);
      } catch {
        setMyReports([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 font-sans">
      
      {/* Citizen Welcome Banner */}
      <div className="bg-gradient-to-r from-red-950/60 to-slate-900 border border-red-900/60 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div>
          <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
            Civilian Emergency Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Emergency Response & Safety
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl">
            Welcome, {user?.full_name || 'Citizen'}. If you are in immediate life-threatening danger, trigger the SOS button below to transmit your coordinates instantly.
          </p>
        </div>

        {/* SOS Button */}
        <Link
          to="/sos"
          className="w-full sm:w-auto px-8 py-5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-lg rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.5)] flex items-center justify-center gap-3 transition-all animate-pulse"
        >
          <AlertOctagon className="w-7 h-7" />
          <span>TRIGGER SOS</span>
        </Link>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/report"
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-6 rounded-xl shadow-lg transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-red-950/80 border border-red-700 text-red-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">File Multimodal Report</h3>
            <p className="text-xs text-slate-400 mt-1">
              Submit description, GPS location, voice audio recording, and photographic evidence for AI verification.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-red-400 group-hover:translate-x-1 transition-transform">
            <span>Open Report Form</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          to="/map"
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-6 rounded-xl shadow-lg transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-950/80 border border-blue-700 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Live Hazard Map</h3>
            <p className="text-xs text-slate-400 mt-1">
              View verified disaster perimeters, shelters, hospital bed capacities, and flood/fire risk zones nearby.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform">
            <span>Explore Map</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* My Submitted Reports */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-red-400" />
          My Distress Reports ({myReports.length})
        </h2>

        {loading ? (
          <div className="py-6 text-center text-xs text-slate-500">Loading submitted reports...</div>
        ) : myReports.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No distress reports filed yet from this account.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {myReports.map((rpt) => (
              <div key={rpt.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-200">{rpt.raw_text}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{rpt.address || 'Sector Coordinates'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(rpt.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {rpt.incident_id && (
                  <Link
                    to={`/incidents/${rpt.incident_id}`}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded border border-slate-700 transition-colors whitespace-nowrap"
                  >
                    View Status
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
