import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FileText, Download, Printer, RefreshCw, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';
import { api } from '../services/api';

export const SitrepPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const incidentIdParam = searchParams.get('incident_id');

  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(incidentIdParam || '');
  const [sitrep, setSitrep] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadIncidents = async () => {
      try {
        const data = await api.incidents.list();
        setIncidents(data);
        if (!selectedIncidentId && data.length > 0) {
          setSelectedIncidentId(data[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadIncidents();
  }, []);

  const handleGenerateSitrep = async (incId?: string) => {
    const idToUse = incId || selectedIncidentId;
    if (!idToUse) return;
    setLoading(true);
    try {
      const res = await api.ai.generateSitrep({
        incident_id: idToUse,
        title: 'OFFICIAL INCIDENT SITUATION REPORT',
      });
      setSitrep(res.sitrep);
    } catch (err: any) {
      alert(err.message || 'Failed to generate SITREP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedIncidentId) {
      handleGenerateSitrep(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
            Factual Operations Documentation (Section 31)
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            Situation Report (SITREP) Generator
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generated strictly from verified stored database records. Zero hallucinated events, casualties, or units.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none"
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                #{inc.incident_number} — {inc.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => handleGenerateSitrep()}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs"
            title="Regenerate"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Printable SITREP Document Preview */}
      {sitrep ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl text-slate-200 space-y-6 print:bg-white print:text-black print:border-none">
          
          {/* Document Header */}
          <div className="border-b border-slate-800 pb-4 flex items-start justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-red-500 uppercase tracking-widest block">
                OFFICIAL SITUATION REPORT (SITREP)
              </span>
              <h2 className="text-xl font-extrabold text-white mt-1">
                {sitrep.title}
              </h2>
              <div className="text-xs text-slate-400 font-mono mt-1">
                Document Ref: <strong className="text-white">{sitrep.sitrep_number}</strong>
              </div>
            </div>

            <div className="text-right text-xs font-mono text-slate-400">
              <div>Generated: {new Date(sitrep.generated_at).toLocaleString()} UTC</div>
              <div className="text-emerald-400 font-semibold mt-1">STATUS: {sitrep.incident_status}</div>
            </div>
          </div>

          {/* Section: Operational Narrative */}
          <div className="space-y-2 text-xs">
            <h3 className="font-mono font-bold text-white uppercase tracking-wider text-xs border-b border-slate-800/80 pb-1">
              1. Executive Operational Summary
            </h3>
            <p className="text-slate-300 leading-relaxed font-sans text-xs">
              {sitrep.summary}
            </p>
          </div>

          {/* Section: Casualties & Impact */}
          <div className="space-y-2 text-xs">
            <h3 className="font-mono font-bold text-white uppercase tracking-wider text-xs border-b border-slate-800/80 pb-1">
              2. Casualties, Demographics & Impact Extent
            </h3>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs font-mono text-red-300">
              {sitrep.casualties_summary}
            </div>
          </div>

          {/* Section: Assigned Resources & Weather */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <span className="font-mono font-bold text-white block">3. Response Assets & Responders</span>
              <p className="text-slate-300">{sitrep.resources_summary}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <span className="font-mono font-bold text-white block">4. Meteorological Context</span>
              <p className="text-slate-300">{sitrep.weather_summary}</p>
            </div>
          </div>

          {/* Section: Outstanding Issues & Conflicts */}
          <div className="space-y-2 text-xs">
            <h3 className="font-mono font-bold text-white uppercase tracking-wider text-xs border-b border-slate-800/80 pb-1">
              5. Outstanding Operational Contradictions & Conflicts
            </h3>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-slate-300">
              {sitrep.outstanding_issues}
            </div>
          </div>

          {/* Section: Missing Information Required */}
          <div className="space-y-2 text-xs">
            <h3 className="font-mono font-bold text-white uppercase tracking-wider text-xs border-b border-slate-800/80 pb-1">
              6. Critical Field Information Pending Verification
            </h3>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-slate-300">
              {sitrep.missing_info_summary}
            </div>
          </div>

          {/* Document Footer */}
          <div className="pt-6 border-t border-slate-800 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span>ResQIntel AI Crisis Decision-Support System</span>
            <span>Authoritative Ground Truth • Human In The Loop Required</span>
          </div>

        </div>
      ) : (
        <div className="py-16 text-center text-xs text-slate-500">
          Generating situation report...
        </div>
      )}

    </div>
  );
};
