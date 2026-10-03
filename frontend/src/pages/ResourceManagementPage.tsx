import React, { useState, useEffect } from 'react';
import { Truck, Plus, RefreshCw, CheckCircle, Clock, MapPin, Shield } from 'lucide-react';
import { api } from '../services/api';
import { Resource } from '../types';

export const ResourceManagementPage: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New resource form
  const [name, setName] = useState('');
  const [type, setType] = useState('AMBULANCE');
  const [station, setStation] = useState('Central District Staging HQ');
  const [capacity, setCapacity] = useState(4);
  const [lat, setLat] = useState(13.082);
  const [lng, setLng] = useState(80.27);

  const fetchResources = async () => {
    try {
      const data = await api.resources.list();
      setResources(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.resources.create({
        resource_name: name,
        resource_type: type,
        station_name: station,
        capacity: Number(capacity),
        latitude: lat,
        longitude: lng,
        status: 'AVAILABLE',
      });
      setShowAddModal(false);
      setName('');
      fetchResources();
    } catch (err: any) {
      alert(err.message || 'Failed to register emergency asset');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest">
            Fleet Optimization & Asset Logistics
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            Emergency Fleet & Rescue Units
          </h1>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-[0_0_12px_rgba(239,68,68,0.3)]"
        >
          <Plus className="w-4 h-4" />
          <span>Register Response Unit</span>
        </button>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((res) => (
          <div key={res.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {res.resource_type}
                </span>
                <h3 className="font-bold text-base text-white mt-1.5">{res.resource_name}</h3>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>{res.station_name || 'Operational Depot'}</span>
                </div>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase ${
                res.status === 'AVAILABLE'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : res.status === 'ASSIGNED'
                  ? 'bg-blue-950 text-blue-300 border-blue-700'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {res.status}
              </span>
            </div>

            <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono">
              <span>Unit Capacity: {res.capacity || 4} personnel</span>
              <span>Coords: [{res.latitude.toFixed(3)}, {res.longitude.toFixed(3)}]</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="font-bold text-lg text-white mb-4">Register Emergency Unit</h2>
            <form onSubmit={handleCreateResource} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Unit Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Swift Rescue Boat Charlie"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Asset Specialization</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                >
                  <option value="AMBULANCE">Ambulance Unit</option>
                  <option value="FIRE_TRUCK">Fire Pumper Tender</option>
                  <option value="RESCUE_BOAT">Flood Rescue Watercraft</option>
                  <option value="POLICE_CAR">Tactical Police Vehicle</option>
                  <option value="HAZMAT_UNIT">Hazmat Chemical Unit</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Station Base Name</label>
                <input
                  type="text"
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
