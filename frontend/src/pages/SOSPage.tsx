import React, { useState, useEffect } from 'react';
import { AlertOctagon, Radio, CheckCircle, Navigation, Clock, ShieldCheck, MapPin } from 'lucide-react';
import { api } from '../services/api';

export const SOSPage: React.FC = () => {
  const [sosStatus, setSosStatus] = useState<'IDLE' | 'SENDING' | 'SENT'>('IDLE');
  const [lat, setLat] = useState<number>(13.0827);
  const [lng, setLng] = useState<number>(80.2707);
  const [sosResult, setSosResult] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Auto locate
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        () => {}
      );
    }
  }, []);

  const handleTriggerSOS = async () => {
    setSosStatus('SENDING');
    setError('');
    try {
      const res = await api.reports.sos({
        latitude: lat,
        longitude: lng,
        notes: notes || 'CRITICAL SOS BROADCAST: IMMEDIATE CIVILIAN LIFE SAFETY ASSISTANCE REQUIRED',
      });
      setSosResult(res);
      setSosStatus('SENT');
    } catch (err: any) {
      setError(err.message || 'Failed to transmit SOS.');
      setSosStatus('IDLE');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12 font-sans text-center">
      
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-400 font-mono text-xs uppercase tracking-wider mb-6">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
        High-Priority Emergency Distress Channel
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
        Emergency SOS Beacon
      </h1>
      <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-8">
        Pressing SOS immediately transmits high-precision coordinates to the central command center and alerts available responders.
      </p>

      {error && (
        <div className="mb-6 p-3 bg-red-950/80 border border-red-700 rounded-xl text-xs text-red-300">
          {error}
        </div>
      )}

      {sosStatus === 'SENT' && sosResult ? (
        <div className="bg-slate-900 border border-red-600/60 rounded-2xl p-6 sm:p-8 shadow-2xl text-left space-y-6">
          <div className="flex items-center gap-3 text-red-400">
            <Radio className="w-8 h-8 animate-pulse text-red-500" />
            <div>
              <h2 className="text-lg font-bold text-white">Emergency SOS Active & Monitored</h2>
              <p className="text-xs text-slate-400 font-mono">
                Incident Ref: <span className="text-white font-bold">{sosResult.incident_number}</span>
              </p>
            </div>
          </div>

          {/* Section 9 SOS Lifecycle Tracking */}
          <div className="space-y-4 pt-2">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
              Live Operational Progression:
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <div>
                  <span className="font-bold">1. SOS SENT</span>
                  <div className="text-[11px] text-slate-400">Beacon transmitted from device</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-emerald-400">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <div>
                  <span className="font-bold">2. SOS RECEIVED</span>
                  <div className="text-[11px] text-slate-400">Logged in central command center</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-yellow-400">
                <Clock className="w-4 h-4 flex-shrink-0 animate-spin" />
                <div>
                  <span className="font-bold">3. DISPATCHER VERIFICATION IN PROGRESS</span>
                  <div className="text-[11px] text-slate-400">Senior operator reviewing sector telemetry & coordinating fleet</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-4 h-4 rounded-full border border-slate-700 flex-shrink-0" />
                <div>
                  <span>4. UNIT DISPATCH</span>
                  <div className="text-[11px] text-slate-600">Awaiting human dispatcher authorization</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-4 h-4 rounded-full border border-slate-700 flex-shrink-0" />
                <div>
                  <span>5. RESOLUTION</span>
                  <div className="text-[11px] text-slate-600">On-scene rescue completion</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>Active Beacon Coords: [{lat.toFixed(5)}, {lng.toFixed(5)}]</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Big SOS Circle Button */}
          <div className="flex justify-center">
            <button
              onClick={handleTriggerSOS}
              disabled={sosStatus === 'SENDING'}
              className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-tr from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 active:scale-95 text-white font-extrabold text-2xl shadow-[0_0_50px_rgba(239,68,68,0.6)] border-4 border-red-400/40 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <AlertOctagon className="w-16 h-16 animate-bounce" />
              <span>{sosStatus === 'SENDING' ? 'TRANSMITTING...' : 'ACTIVATE SOS'}</span>
              <span className="text-[10px] font-mono opacity-80 font-normal">TAP TO BROADCAST</span>
            </button>
          </div>

          {/* Optional Message */}
          <div className="max-w-md mx-auto">
            <input
              type="text"
              placeholder="Brief emergency note (e.g. 2 trapped in vehicle, rising water)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-center gap-2">
            <Navigation className="w-3.5 h-3.5 text-slate-400" />
            <span>GPS Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}</span>
          </div>
        </div>
      )}

    </div>
  );
};
