import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Map, Layers, Eye, EyeOff, RefreshCw, Radio, 
  Truck, Users, AlertTriangle, ShieldCheck, CloudRain 
} from 'lucide-react';
import { api } from '../services/api';
import { EmergencyMap } from '../components/map/EmergencyMap';

export const LiveMapPage: React.FC = () => {
  const navigate = useNavigate();
  const [layersData, setLayersData] = useState<any>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Layer Visibility Toggles (Section 40)
  const [showIncidents, setShowIncidents] = useState(true);
  const [showResources, setShowResources] = useState(true);
  const [showResponders, setShowResponders] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);

  // Incident Filtering
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchLayers = async () => {
    try {
      const data = await api.map.layers();
      setLayersData(data);
      if (data.center) {
        const wx = await api.map.weather(data.center.latitude, data.center.longitude);
        setWeatherData(wx);
      }
    } catch (e) {
      console.error('Failed to load map layers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayers();
  }, []);

  const incidents = (layersData?.incidents || []).filter((inc: any) => {
    if (severityFilter && inc.severity_class !== severityFilter) return false;
    if (typeFilter && inc.incident_type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col font-sans relative bg-slate-950">
      
      {/* Top Floating Control Bar */}
      <div className="p-3 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-10 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white uppercase tracking-wider">
            <Map className="w-4 h-4 text-blue-400" />
            <span>Geospatial Tactical Command Map</span>
          </div>

          {weatherData && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-300">
              <CloudRain className="w-3.5 h-3.5 text-blue-400" />
              <span>{weatherData.condition} ({weatherData.temperature_c}°C)</span>
              <span className="text-slate-500 font-mono">Rain: {weatherData.rainfall_mm}mm</span>
            </div>
          )}
        </div>

        {/* Filter Dropdowns & Layer Checkboxes */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical Threat</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium Severity</option>
            <option value="LOW">Low Severity</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none"
          >
            <option value="">All Disaster Types</option>
            <option value="Flood">Flood</option>
            <option value="Fire">Fire</option>
            <option value="Building Collapse">Building Collapse</option>
            <option value="Medical Emergency">Medical Emergency</option>
          </select>

          {/* Layer toggles */}
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <button
              onClick={() => setShowIncidents(!showIncidents)}
              className={`px-2 py-1 rounded border text-[11px] font-semibold transition-colors ${
                showIncidents ? 'bg-red-950/80 border-red-700 text-red-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Incidents
            </button>
            <button
              onClick={() => setShowResources(!showResources)}
              className={`px-2 py-1 rounded border text-[11px] font-semibold transition-colors ${
                showResources ? 'bg-blue-950/80 border-blue-700 text-blue-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Resources
            </button>
            <button
              onClick={() => setShowRiskZones(!showRiskZones)}
              className={`px-2 py-1 rounded border text-[11px] font-semibold transition-colors ${
                showRiskZones ? 'bg-amber-950/80 border-amber-700 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Risk Zones
            </button>
            <button
              onClick={() => setShowHospitals(!showHospitals)}
              className={`px-2 py-1 rounded border text-[11px] font-semibold transition-colors ${
                showHospitals ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              Hospitals
            </button>
          </div>

          <button
            onClick={fetchLayers}
            className="p-1 hover:bg-slate-800 text-slate-400 rounded"
            title="Reload layers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Map Element Filling Remaining Height */}
      <div className="flex-1 w-full h-full relative">
        {layersData && (
          <EmergencyMap
            center={[layersData.center.latitude, layersData.center.longitude]}
            zoom={13}
            incidents={showIncidents ? incidents : []}
            resources={showResources ? layersData.resources : []}
            responders={showResponders ? layersData.responders : []}
            hospitals={showHospitals ? layersData.hospitals : []}
            shelters={showShelters ? layersData.shelters : []}
            riskZones={showRiskZones ? layersData.risk_zones : []}
            height="100%"
            onIncidentClick={(inc) => navigate(`/incidents/${inc.id}`)}
          />
        )}
      </div>

    </div>
  );
};
