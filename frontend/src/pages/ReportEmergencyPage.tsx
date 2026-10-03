import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, Mic, MicOff, Camera, MapPin, Upload, 
  CheckCircle, AlertCircle, Loader2, Sparkles, Navigation 
} from 'lucide-react';
import { api } from '../services/api';
import { EmergencyMap } from '../components/map/EmergencyMap';

export const ReportEmergencyPage: React.FC = () => {
  const navigate = useNavigate();

  // Form states
  const [incidentType, setIncidentType] = useState('Flood');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<number>(13.0827);
  const [longitude, setLongitude] = useState<number>(80.2707);
  const [address, setAddress] = useState('River Road near Central Bridge Crossing');
  const [injuries, setInjuries] = useState<number>(0);
  const [peopleAffected, setPeopleAffected] = useState<number>(5);
  const [hazards, setHazards] = useState('');
  const [damage, setDamage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitterName, setSubmitterName] = useState('');
  const [submitterPhone, setSubmitterPhone] = useState('');

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Media upload
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Submission state & AI result
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [error, setError] = useState('');

  // GPS auto-capture
  const handleCaptureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          try {
            const geo = await api.map.reverseGeocode(lat, lng);
            if (geo && geo.address) setAddress(geo.address);
          } catch {
            setAddress(`Coordinates [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);
          }
        },
        () => {
          setError('Unable to retrieve device GPS. Please pinpoint your location on the map.');
        }
      );
    }
  };

  // Map pin select
  const handleMapPin = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    try {
      const geo = await api.map.reverseGeocode(lat, lng);
      if (geo && geo.address) setAddress(geo.address);
    } catch {
      setAddress(`Coordinates [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);
    }
  };

  // Voice recording toggle with Browser Web Speech API fallback
  const recognitionRef = React.useRef<any>(null);
  const [voiceStatus, setVoiceStatus] = useState<string>('');

  const startRecording = async () => {
    setVoiceStatus('');
    try {
      // 1. Try Browser SpeechRecognition for immediate client-side real-time capture
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript.trim()) {
            setVoiceTranscript(currentTranscript.trim());
            setDescription((prev) => (prev ? `${prev} ${currentTranscript.trim()}` : currentTranscript.trim()));
            setVoiceStatus('Captured via Browser Speech Recognition (Client-side)');
          }
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }

      // 2. Stream audio bytes for server-side ingestion
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        try {
          const res = await api.reports.transcribe(audioBlob);
          if (res && (res.status === 'REAL_TRANSCRIPTION' || res.status === 'REAL_INFERENCE') && res.transcript) {
            setVoiceTranscript(res.transcript);
            setDescription((prev) => (prev ? `${prev} ${res.transcript}` : res.transcript));
            setVoiceStatus(`Transcribed via ${res.provider || 'faster-whisper'}`);
          } else if (res && res.status === 'CONFIGURATION_REQUIRED') {
            setVoiceStatus('Audio recording attached. Server-side Whisper transcription requires local model or speech provider.');
          }
        } catch (err: any) {
          setVoiceStatus('Audio recorded. Automated server transcription requires configured speech provider.');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setVoiceStatus('Microphone access denied or unavailable in this browser session. Please enter distress report text manually.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  // Photo upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    setError('');
    try {
      const res = await api.reports.upload(file);
      setMediaUrls((prev) => [...prev, res.file_url]);
    } catch (err: any) {
      setError(`Failed to upload media: ${err.message || 'Server error'}`);
    } finally {
      setUploadingMedia(false);
    }
  };

  // Submit report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a description or voice note of the emergency.');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      incident_type: incidentType,
      description,
      latitude,
      longitude,
      address,
      injuries_reported: Number(injuries),
      people_affected: Number(peopleAffected),
      hazards,
      damage,
      is_anonymous: isAnonymous,
      submitter_name: submitterName,
      submitter_phone: submitterPhone,
      voice_transcript: voiceTranscript,
      media_urls: mediaUrls,
    };

    try {
      const result = await api.reports.submit(payload);
      setAiResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to submit emergency report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 font-sans">
      
      {/* Title */}
      <div className="mb-6">
        <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
          Citizen Reporting Portal
        </span>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2 mt-1">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          Report an Emergency Incident
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Multimodal signals (text, speech, image, GPS) are immediately correlated by the Multi-Agent AI pipeline.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/80 border border-red-700 rounded-xl text-xs text-red-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* AI Processing Success Modal / Card */}
      {aiResult ? (
        <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle className="w-8 h-8" />
            <div>
              <h2 className="text-lg font-bold text-white">Emergency Report Received & Analyzed</h2>
              <p className="text-xs text-slate-400">
                Incident Number: <span className="font-mono text-white font-bold">{aiResult.incident_number}</span>
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 font-mono">OPERATIONAL STATUS:</span>
              <span className="px-2 py-0.5 rounded bg-yellow-950 text-yellow-300 border border-yellow-700 font-bold uppercase tracking-wider">
                PENDING HUMAN VERIFICATION
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500">AI Classification:</span>
                <div className="text-sm font-bold text-white">
                  {aiResult.orchestration_summary?.classification?.prediction}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Assessed Severity:</span>
                <div className="text-sm font-bold text-red-400">
                  {aiResult.orchestration_summary?.severity?.severity_class} ({aiResult.orchestration_summary?.severity?.severity_score}/10)
                </div>
              </div>
            </div>

            <div className="text-slate-400 pt-2 border-t border-slate-800/80">
              Clustering Correlation: <strong className="text-slate-200">{aiResult.clustering_decision}</strong>. 
              Pipeline processed in {aiResult.orchestration_summary?.pipeline_time_ms} ms.
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/incidents/${aiResult.incident_id}`)}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs shadow-lg transition-colors"
            >
              View Full Incident Dossier & Map
            </button>
            <button
              onClick={() => {
                setAiResult(null);
                setDescription('');
                setVoiceTranscript('');
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
            >
              File Another Report
            </button>
          </div>
        </div>
      ) : (
        /* Report Submission Form */
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          
          {/* Emergency Type */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Emergency Disaster Type
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            >
              <option value="Flood">Flood / Water Inundation</option>
              <option value="Fire">Fire & Smoke Plume</option>
              <option value="Building Collapse">Building Collapse / Structural Debris</option>
              <option value="Road Accident">Road Accident / Highway Collision</option>
              <option value="Landslide">Landslide & Mudflow</option>
              <option value="Earthquake">Earthquake Tremors & Structural Damage</option>
              <option value="Cyclone">Cyclone / Severe Gale Storm</option>
              <option value="Medical Emergency">Acute Medical Emergency / Mass Casualty</option>
              <option value="Industrial Accident">Industrial Hazard / Chemical Leak</option>
              <option value="Road Blockage">Road Blockage / Obstruction</option>
              <option value="Other">Other Urgent Emergency</option>
            </select>
          </div>

          {/* Text Description + Voice Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Emergency Situation Description
              </label>
              
              {/* Voice Record Button */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  isRecording 
                    ? 'bg-red-950 text-red-400 border-red-500 animate-pulse' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5 text-red-500" /> : <Mic className="w-3.5 h-3.5 text-blue-400" />}
                <span>{isRecording ? 'Stop Recording' : 'Voice Report (Speech-to-Text)'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State what occurred, visible hazards, trapped people, and landmark references..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500 font-sans leading-relaxed"
            />

            {voiceTranscript && (
              <div className="mt-2 p-2 bg-indigo-950/40 border border-indigo-800/40 rounded-lg text-xs text-indigo-200">
                <span className="font-bold text-[10px] text-indigo-400 block font-mono">TRANSCRIBED VOICE TELEMETRY:</span>
                "{voiceTranscript}"
              </div>
            )}

            {voiceStatus && (
              <div className="mt-1.5 p-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-400 font-mono">
                ℹ️ {voiceStatus}
              </div>
            )}
          </div>

          {/* Location Capture & Interactive Pin Map */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-red-400" />
                Incident Location Pin
              </label>

              <button
                type="button"
                onClick={handleCaptureGPS}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Capture GPS</span>
              </button>
            </div>

            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address or click map below to position marker"
              className="w-full mb-3 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
            />

            <EmergencyMap
              center={[latitude, longitude]}
              zoom={14}
              selectableLocation={true}
              selectedLocation={[latitude, longitude]}
              onSelectLocation={handleMapPin}
              height="240px"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Tip: Click anywhere on the map to pin the exact emergency site.
            </span>
          </div>

          {/* Impact Estimates & Casualties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Estimated People Affected / Trapped
              </label>
              <input
                type="number"
                min="0"
                value={peopleAffected}
                onChange={(e) => setPeopleAffected(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reported Casualties / Injuries
              </label>
              <input
                type="number"
                min="0"
                value={injuries}
                onChange={(e) => setInjuries(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Secondary Hazards & Damage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Secondary Hazards (e.g. live wire, gas leak)
              </label>
              <input
                type="text"
                value={hazards}
                onChange={(e) => setHazards(e.target.value)}
                placeholder="Downed live wires, rapid current..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Infrastructure Damage (e.g. road blocked)
              </label>
              <input
                type="text"
                value={damage}
                onChange={(e) => setDamage(e.target.value)}
                placeholder="Bridge approach washed away..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Attach Photographic / Video Evidence
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-2 transition-colors">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Upload Media</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {uploadingMedia && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              {mediaUrls.length > 0 && (
                <span className="text-xs text-emerald-400 font-mono">
                  {mediaUrls.length} file attached
                </span>
              )}
            </div>
          </div>

          {/* Submitter Info & Anonymous Option */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="anon"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-red-600 focus:ring-0"
              />
              <label htmlFor="anon" className="text-xs text-slate-300">
                Submit this emergency report anonymously
              </label>
            </div>

            {!isAnonymous && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Your Name (Optional)"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                />
                <input
                  type="tel"
                  placeholder="Callback Phone Number"
                  value={submitterPhone}
                  onChange={(e) => setSubmitterPhone(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                />
              </div>
            )}
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Multi-Agent AI Analysis Pipeline...</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5" />
                <span>Submit Emergency Distress Report</span>
              </>
            )}
          </button>
        </form>
      )}

    </div>
  );
};
