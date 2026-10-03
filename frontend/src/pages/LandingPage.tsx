import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, Radio, Brain, MapPin, WifiOff, Users2, CheckCircle2, 
  ArrowRight, Activity, Eye, Zap, Flame, Droplets, Truck, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const LandingPage: React.FC = () => {
  const { loginDemo } = useAuth();
  const navigate = useNavigate();

  const handleFastDemo = async (role: UserRole, targetPath: string) => {
    await loginDemo(role);
    navigate(targetPath);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-950 py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-red-400 text-xs font-mono font-semibold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            Decision-Support Intelligence Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
            ResQIntel <span className="text-red-500">AI</span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-300 font-light max-w-3xl mx-auto mb-4 italic">
            "From scattered emergency signals to coordinated action."
          </p>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            An offline-first, multimodal, multi-agent emergency intelligence platform transforming citizen distress calls, voice audio, imagery, weather telemetry, and geospatial layers into verified and explainable operational response intelligence.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/report"
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center gap-2 transition-all text-sm"
            >
              <ShieldAlert className="w-5 h-5" />
              Report an Emergency
            </Link>

            <button
              onClick={() => handleFastDemo('DISPATCHER', '/dispatcher')}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold rounded-lg flex items-center gap-2 transition-all text-sm"
            >
              <Radio className="w-5 h-5 text-red-400" />
              Launch Command Center Demo
            </button>
          </div>

          {/* Quick Fast-Demo Role Picker */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 max-w-2xl mx-auto">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-3">
              Fast Demonstration Access (Instant Authenticated Role Simulation):
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => handleFastDemo('DISPATCHER', '/dispatcher')}
                className="px-3 py-1 bg-red-950/60 hover:bg-red-900 border border-red-700/60 rounded text-xs text-red-300 font-mono"
              >
                Dispatcher Portal
              </button>
              <button
                onClick={() => handleFastDemo('RESPONDER', '/responder')}
                className="px-3 py-1 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-700/60 rounded text-xs text-cyan-300 font-mono"
              >
                Responder Field App
              </button>
              <button
                onClick={() => handleFastDemo('ANALYST', '/analyst')}
                className="px-3 py-1 bg-purple-950/60 hover:bg-purple-900 border border-purple-700/60 rounded text-xs text-purple-300 font-mono"
              >
                Analyst Dashboard
              </button>
              <button
                onClick={() => handleFastDemo('ADMIN', '/admin')}
                className="px-3 py-1 bg-amber-950/60 hover:bg-amber-900 border border-amber-700/60 rounded text-xs text-amber-300 font-mono"
              >
                Admin & Audit
              </button>
              <button
                onClick={() => handleFastDemo('CITIZEN', '/citizen')}
                className="px-3 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 rounded text-xs text-emerald-300 font-mono"
              >
                Citizen Portal
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Multimodal Intelligence Pipeline */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Core Multimodal Intelligence Pipeline
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            12 specialized AI agents process raw distress signals into structured, explainable decision support with strict human-in-the-loop oversight.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-blue-950 border border-blue-700 flex items-center justify-center text-blue-400 mb-4">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white mb-2">Multimodal Ingestion</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standardizes raw text, voice speech transcripts, camera imagery, and GPS coordinates into normalized field signals.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-700 flex items-center justify-center text-indigo-400 mb-4">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white mb-2">Clustering & Fusion</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Combines semantic similarity, spatial proximity, and temporal density to detect duplicate reports and construct incident clusters.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-red-950 border border-red-700 flex items-center justify-center text-red-400 mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white mb-2">Severity & Conflict</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scores multi-factor risks (casualties, weather, infrastructure) and automatically flags contradictory field reports.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400 mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white mb-2">Human Verification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Maintains consequential human oversight. Dispatchers review evidence, approve resource assignments, and authorize dispatch.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-slate-800/80">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex gap-4">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 h-fit text-red-400">
              <WifiOff className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white mb-1">Offline-First Resilience</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Persistent IndexedDB operations queue. Citizens and responders can file reports with zero connectivity; signals sync automatically on reconnect.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 h-fit text-blue-400">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white mb-1">Geospatial Intelligence</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                PostGIS spatial queries, OSRM routing with road distance and ETAs, population exposure estimation, and live Open-Meteo weather overlays.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 h-fit text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white mb-1">Immutable Audit Trail</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every state transition, human verification event, and resource dispatch authorization is recorded permanently in the system audit log.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 py-6 px-4 text-center text-xs text-slate-500">
        <p>ResQIntel AI — Decision-Support Emergency Response Intelligence Platform (National Hackathon 2026)</p>
        <p className="mt-1">Human operators remain in full control of all consequential emergency response actions.</p>
      </footer>
    </div>
  );
};
