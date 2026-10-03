import React, { useState, useEffect } from 'react';
import { Bell, Radio, AlertTriangle, Send, CheckCircle, MapPin, Clock } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Geofence alert form state (Section 36)
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [hazardType, setHazardType] = useState('FLOOD');
  const [severity, setSeverity] = useState('URGENT');
  const [lat, setLat] = useState<number>(13.0827);
  const [lng, setLng] = useState<number>(80.2707);
  const [radiusKm, setRadiusKm] = useState<number>(5.0);
  const [channel, setChannel] = useState('IN_APP');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  const fetchNotifs = async () => {
    try {
      const data = await api.notifications.list();
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleBroadcastAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    setBroadcasting(true);
    setBroadcastSuccess('');

    try {
      await api.notifications.geofencedAlert({
        title,
        message,
        hazard_type: hazardType,
        severity,
        latitude: lat,
        longitude: lng,
        radius_km: Number(radiusKm),
        channel,
      });
      setBroadcastSuccess(`Geofenced emergency warning broadcasted across ${radiusKm}km radius.`);
      setTitle('');
      setMessage('');
      fetchNotifs();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch geofenced alert');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    await api.notifications.markRead(id);
    fetchNotifs();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
          Public Safety Alerts & Geofenced Warnings
        </span>
        <h1 className="text-2xl font-extrabold text-white mt-1">
          Notification Center & Crisis Broadcasting
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols): Live Notifications Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-400" />
              Operational Alert Feed ({notifications.length})
            </h2>
          </div>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
                No active broadcast notifications recorded.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl border transition-all ${
                    n.is_read
                      ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                      : 'bg-slate-900 border-red-900/60 text-slate-200 shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          n.severity === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-yellow-950 text-yellow-300 border border-yellow-700'
                        }`}>
                          {n.severity}
                        </span>
                        <span className="font-bold text-xs text-white">{n.title}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 pt-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                        <span>• Channel: {n.channel}</span>
                      </div>
                    </div>

                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 whitespace-nowrap"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Broadcast Geofenced Alert (Dispatcher / Admin only) */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-red-500" />
                Define Geofenced Warning Zone
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Section 36: Transmits alerts to all civilians and assets situated within perimeter.
              </p>
            </div>

            {broadcastSuccess && (
              <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-lg text-xs text-emerald-200">
                {broadcastSuccess}
              </div>
            )}

            <form onSubmit={handleBroadcastAlert} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Alert Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. FLASH FLOOD EVACUATION ORDER"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Advisory Message</label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Mandatory evacuation for residents within 5km of River basin..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Hazard Type</label>
                  <select
                    value={hazardType}
                    onChange={(e) => setHazardType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="FLOOD">Flood</option>
                    <option value="FIRE">Wildfire</option>
                    <option value="CYCLONE">Cyclone</option>
                    <option value="HAZMAT">Hazmat Gas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Radius (km)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={broadcasting}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50"
              >
                <Radio className="w-4 h-4" />
                <span>{broadcasting ? 'Broadcasting...' : 'Broadcast Emergency Advisory'}</span>
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
};
