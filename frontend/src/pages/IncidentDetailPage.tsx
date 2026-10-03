import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldAlert, CheckCircle, AlertTriangle, AlertOctagon, MapPin, 
  Clock, Truck, Users, Activity, Bot, RefreshCw, Send, Plus, 
  FileText, ShieldCheck, CornerDownRight, Navigation, CloudRain, Camera
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmergencyMap } from '../components/map/EmergencyMap';

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Verification action modal state
  const [verifying, setVerifying] = useState(false);
  const [verifNotes, setVerifNotes] = useState('');

  // Dispatch action state
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [dispatching, setDispatching] = useState(false);

  // Status transition state
  const [newStatus, setNewStatus] = useState('');

  // AI Re-evaluation
  const [reevaluating, setReevaluating] = useState(false);

  const fetchIncidentData = async () => {
    if (!id) return;
    try {
      const data = await api.incidents.get(id);
      setIncident(data);
      const resList = await api.resources.list();
      setResources(resList);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch incident details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentData();
  }, [id]);

  // Handle Human Verification (Section 8)
  const handleVerify = async (status: 'VERIFIED' | 'REJECTED') => {
    if (!id) return;
    setVerifying(true);
    try {
      await api.incidents.verify(id, {
        verification_status: status,
        verification_notes: verifNotes || `Official human operator confirmation by ${user?.full_name}`,
      });
      await fetchIncidentData();
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  // Handle Resource Dispatch Authorization (Section 1 & 25)
  const handleDispatchResource = async (resourceId?: string) => {
    if (!id) return;
    const resId = resourceId || selectedResourceId;
    if (!resId) {
      alert('Please select an emergency asset to deploy.');
      return;
    }

    setDispatching(true);
    try {
      await api.resources.assign({
        incident_id: id,
        resource_id: resId,
        notes: `Deployment approved by Dispatcher ${user?.full_name}`,
      });
      await fetchIncidentData();
    } catch (err: any) {
      alert(err.message || 'Dispatch deployment failed');
    } finally {
      setDispatching(false);
    }
  };

  // Handle Status Update
  const handleStatusChange = async (targetStatus: string) => {
    if (!id) return;
    try {
      await api.incidents.updateStatus(id, targetStatus, `Advanced by ${user?.full_name}`);
      await fetchIncidentData();
    } catch (err: any) {
      alert(err.message || 'Status transition failed');
    }
  };

  // Trigger continuous re-evaluation (Section 61)
  const handleReevaluate = async () => {
    if (!id) return;
    setReevaluating(true);
    try {
      await api.ai.reevaluate(id);
      await fetchIncidentData();
    } catch (err: any) {
      alert(err.message || 'Re-evaluation failed');
    } finally {
      setReevaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-red-500 mb-3" />
        <p className="text-sm">Synthesizing incident intelligence dossier...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-red-400">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">{error || 'Incident record not found.'}</p>
        <Link to="/dispatcher" className="mt-4 inline-block px-4 py-2 bg-slate-800 text-white rounded text-xs">
          Return to Command Center
        </Link>
      </div>
    );
  }

  const aiAnalysis = incident.ai_analysis;
  const conflicts = aiAnalysis?.conflicts?.conflicts || [];
  const missingItems = aiAnalysis?.missing_information?.missing_items || [];
  const factors = aiAnalysis?.contributing_factors || [];
  const assignedUnits = incident.assignments || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      
      {/* Incident Header & Verification Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-red-400">
                #{incident.incident_number}
              </span>
              <SeverityBadge severity={incident.severity_class} score={incident.severity_score} />
              <StatusBadge status={incident.status} />
              {incident.is_demo && (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                  DEMO SCENARIO
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {incident.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{incident.address || `Coordinates [${incident.latitude}, ${incident.longitude}]`}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleReevaluate}
              disabled={reevaluating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 disabled:opacity-50"
              title="Continuous Multi-Agent Re-evaluation"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reevaluating ? 'animate-spin text-red-400' : ''}`} />
              <span>Re-Evaluate AI</span>
            </button>

            <Link
              to={`/sitrep?incident_id=${incident.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-800"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generate SITREP</span>
            </Link>
          </div>
        </div>

        {/* HUMAN VERIFICATION CONTROL (Section 8 & Section 1) */}
        {incident.verification_status === 'UNVERIFIED' && (
          <div className="bg-yellow-950/70 border border-yellow-700/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold text-xs text-yellow-300 uppercase tracking-wider block">
                  HUMAN VERIFICATION REQUIRED (Decision-Support Policy)
                </span>
                <span className="text-xs text-yellow-200/80">
                  AI analysis suggests {incident.severity_class} {incident.incident_type}. An authorized dispatcher must verify on-scene evidence before fleet dispatch.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleVerify('VERIFIED')}
                disabled={verifying}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md transition-colors flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Verify Incident</span>
              </button>
              <button
                onClick={() => handleVerify('REJECTED')}
                disabled={verifying}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 text-xs rounded-lg border border-slate-700 font-semibold transition-colors"
              >
                Reject & Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONFLICT DETECTION WARNING BANNER (Section 27) */}
      {conflicts.length > 0 && (
        <div className="bg-red-950/90 border-2 border-red-600 rounded-2xl p-5 shadow-2xl flex items-start gap-4 animate-pulse">
          <AlertOctagon className="w-7 h-7 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-extrabold text-sm text-red-200 uppercase tracking-wider flex items-center gap-2">
              <span>⚠️ CONFLICT DETECTED IN FIELD REPORTS</span>
              <span className="text-[10px] bg-red-900 px-1.5 py-0.5 rounded text-white font-mono">
                {conflicts.length} Contradiction{conflicts.length > 1 ? 's' : ''}
              </span>
            </div>
            {conflicts.map((c: any, idx: number) => (
              <div key={idx} className="text-red-200/90 leading-relaxed">
                • {c.detected_contradiction} — <strong className="text-white">Required Human Action:</strong> {c.human_action_required}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 2-Column Intelligence Dossier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Explainability, Evidence, Missing Info, Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 29 & 38: "Why this incident is prioritized" Explainability Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-indigo-400" />
                Why this incident is prioritized (AI Explainability)
              </span>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                Score: {incident.severity_score}/10
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {factors.length > 0 ? (
                factors.map((f: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        <span>{f.factor}</span>
                        {f.raw_value && <span className="text-[10px] font-mono text-slate-500">[{f.raw_value}]</span>}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{f.rationale}</div>
                    </div>
                    <div className="font-mono font-bold text-red-400 text-xs whitespace-nowrap">
                      +{f.score_contribution} pts
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 py-2">Baseline multi-criteria evaluation in effect.</div>
              )}
            </div>

            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
              Explainable Multi-Factor Severity Engine v2.1 • Calculated deterministically from multi-signal weights • Consequential dispatch requires human operator verification.
            </div>
          </div>

          {/* Section 28: MISSING INFORMATION CHECKLIST */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Operational Completeness & Missing Information Checklist
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {missingItems.length === 0 ? '100% COMPLETE' : `${missingItems.length} ITEM(S) PENDING`}
              </span>
            </div>

            {missingItems.length > 0 ? (
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-lg text-amber-200">
                  <span className="font-bold block mb-1">Verify with Field Scout or Responders:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {missingItems.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-xs text-emerald-400 flex items-center gap-2 p-2 bg-emerald-950/30 rounded-lg border border-emerald-900/40">
                <CheckCircle className="w-4 h-4" />
                <span>All essential operational parameters (GPS, casualties, hazards, access) have been recorded.</span>
              </div>
            )}
          </div>

          {/* Section 26: MULTIMODAL EVIDENCE FUSION */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-400" />
                Multimodal Corroborating Evidence Dossier ({incident.reports?.length || 0} Reports)
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {incident.reports?.map((rpt: any) => (
                <div key={rpt.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">
                      {rpt.report_type} ({rpt.submitter_name || 'Anonymous'})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(rpt.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{rpt.raw_text}</p>
                  {rpt.transcript && (
                    <div className="text-[11px] text-indigo-300 italic pt-1">
                      Voice Transcription: "{rpt.transcript}"
                    </div>
                  )}
                  {rpt.injuries_reported > 0 && (
                    <div className="text-[11px] text-red-400 font-semibold font-mono">
                      ⚠️ {rpt.injuries_reported} injuries cited by submitter
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Visual Media & Computer Vision Pipeline */}
          {incident.media && incident.media.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  Visual Media & Computer Vision Pipeline ({incident.media.length} Attachments)
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {incident.media.map((med: any) => {
                  const cv = med.cv_analysis_json || {};
                  const isReal = cv.status === 'REAL_INFERENCE';
                  const isUnavail = cv.status === 'MODEL_UNAVAILABLE' || cv.status === 'CONFIGURATION_REQUIRED';
                  return (
                    <div key={med.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 font-mono">
                          {med.file_name} ({med.media_type})
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                          isReal 
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                            : isUnavail 
                            ? 'bg-amber-950 text-amber-300 border-amber-800' 
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          {cv.status || 'UNPROCESSED'}
                        </span>
                      </div>

                      {cv.image_metadata && (
                        <div className="text-[11px] font-mono text-slate-400 flex flex-wrap gap-x-4 gap-y-1 bg-slate-900/60 p-2 rounded border border-slate-800/80">
                          <span>Format: {cv.image_metadata.format}</span>
                          {cv.image_metadata.width && <span>Resolution: {cv.image_metadata.width}x{cv.image_metadata.height}px</span>}
                          <span>Size: {((cv.image_metadata.file_size_bytes || 0) / 1024).toFixed(1)} KB</span>
                          <span className="truncate max-w-[200px]" title={cv.image_metadata.sha256}>SHA-256: {cv.image_metadata.sha256?.substring(0, 12)}...</span>
                        </div>
                      )}

                      {isReal && (
                        <div className="space-y-1">
                          <div className="text-emerald-300 font-semibold">
                            Primary Hazard: {cv.primary_hazard} ({Math.round((cv.overall_confidence || 0) * 100)}% confidence)
                          </div>
                          {cv.detections && cv.detections.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {cv.detections.map((d: any, idx: number) => (
                                <span key={idx} className="bg-slate-900 border border-slate-800 text-[11px] px-2 py-0.5 rounded text-slate-300">
                                  {d.label} {d.confidence && `(${Math.round(d.confidence * 100)}%)`}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {isUnavail && (
                        <div className="text-[11px] text-amber-300/90 bg-amber-950/30 p-2 rounded border border-amber-900/40">
                          ℹ️ {cv.message || 'Automated visual inference requires local model weights or GEMINI_API_KEY. Binary validated for manual review.'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 30: AI RESPONSE RECOMMENDATIONS */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-400" />
                AI Tactical Response Recommendations (Human Verification Required)
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {incident.recommendations?.map((rec: any) => (
                <div key={rec.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white text-sm">{rec.title}</div>
                    <span className="text-[10px] bg-red-950 text-red-300 px-2 py-0.5 rounded font-mono font-bold">
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-slate-300">{rec.action}</p>
                  <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                    <strong className="text-slate-300">Rationale:</strong> {rec.rationale}
                  </div>
                  
                  {/* Dispatch Authorization Button */}
                  {user?.role === 'DISPATCHER' || user?.role === 'ADMIN' ? (
                    rec.recommended_resource_ids && rec.recommended_resource_ids.length > 0 && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => handleDispatchResource(rec.recommended_resource_ids[0])}
                          disabled={dispatching}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Authorize & Dispatch Strike Unit</span>
                        </button>
                      </div>
                    )
                  ) : null}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (1 Col): Geospatial Map, Live Routing, Fleet Deployment, Timeline */}
        <div className="space-y-6">
          
          {/* Geospatial Map Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-2">
            <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Perimeter & Ingress Map
            </div>
            <EmergencyMap
              center={[incident.latitude, incident.longitude]}
              zoom={14}
              incidents={[incident]}
              resources={resources}
              height="260px"
            />
          </div>

          {/* Active Assigned Resources */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Deployed Emergency Units</span>
              <span className="font-mono text-red-400">{assignedUnits.length} Deployed</span>
            </div>

            {assignedUnits.length === 0 ? (
              <div className="text-xs text-slate-500 py-3 text-center">
                No units dispatched yet. Select an available asset below.
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {assignedUnits.map((a: any) => (
                  <div key={a.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span>Unit Assignment #{a.id.substring(0, 6)}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">{a.status}</span>
                    </div>
                    {a.route_distance_km && (
                      <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
                        <span>Road Route: {a.route_distance_km} km</span>
                        <span>ETA: ~{a.route_eta_minutes} min</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Manual Resource Assignment Selector (Section 25) */}
            {(user?.role === 'DISPATCHER' || user?.role === 'ADMIN') && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Deploy Additional Fleet Asset:
                </label>
                <select
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none"
                >
                  <option value="">Select available unit...</option>
                  {resources.filter((r) => r.status === 'AVAILABLE').map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.resource_name} ({r.resource_type})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleDispatchResource()}
                  disabled={dispatching || !selectedResourceId}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
                >
                  Confirm Dispatch Order
                </button>
              </div>
            )}
          </div>

          {/* Section 7 & 37: Chronological Incident Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Operational Timeline</span>
              <Clock className="w-3.5 h-3.5 text-slate-500" />
            </div>

            <div className="space-y-3 text-xs max-h-80 overflow-y-auto pr-1">
              {incident.timeline?.map((evt: any) => (
                <div key={evt.id} className="relative pl-4 border-l-2 border-slate-800 space-y-0.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 absolute -left-[5px] top-1" />
                  <div className="font-bold text-slate-200">{evt.title}</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{evt.description}</p>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {new Date(evt.created_at).toLocaleTimeString()} by {evt.actor_name || 'System'}
                  </div>
                </div>
              ))}
            </div>

            {/* Lifecycle Quick Status Change */}
            {(user?.role === 'DISPATCHER' || user?.role === 'ADMIN' || user?.role === 'RESPONDER') && (
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 flex-1"
                >
                  <option value="">Advance state...</option>
                  <option value="DISPATCHED">Dispatched</option>
                  <option value="RESPONDER_EN_ROUTE">Responder En Route</option>
                  <option value="ON_SCENE">On Scene</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
                <button
                  onClick={() => newStatus && handleStatusChange(newStatus)}
                  disabled={!newStatus}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
