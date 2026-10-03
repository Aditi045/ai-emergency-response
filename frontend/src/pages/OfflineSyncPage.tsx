import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAllOfflineItems, triggerOfflineBatchSync } from '../services/offlineQueue';

export const OfflineSyncPage: React.FC = () => {
  const { isOnline, syncOfflineQueue } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  const loadQueue = async () => {
    try {
      const all = await getAllOfflineItems();
      setItems(all.reverse());
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleSyncNow = async () => {
    if (!isOnline) {
      alert('Cannot sync while offline. Reconnect to internet first.');
      return;
    }
    setSyncing(true);
    setMessage('');
    try {
      const res = await syncOfflineQueue();
      setMessage(`Synchronization completed: ${res.synced} operation(s) pushed, ${res.failed} failed.`);
      loadQueue();
    } catch (err: any) {
      setMessage(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 font-sans">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
            Offline-First Local Storage & Synchronization (Section 34)
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1 flex items-center gap-2">
            {!isOnline ? <WifiOff className="w-6 h-6 text-amber-400" /> : <Wifi className="w-6 h-6 text-emerald-400" />}
            Offline Operation Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browser IndexedDB queue caches all emergency distress calls and field updates when disconnected.
          </p>
        </div>

        <button
          onClick={handleSyncNow}
          disabled={syncing || !isOnline}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold disabled:opacity-40 shadow-lg"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Pushing Queue...' : 'Synchronize Server'}</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-blue-950/80 border border-blue-800 rounded-lg text-xs text-blue-200">
          {message}
        </div>
      )}

      {/* Queue items */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
          Cached IndexedDB Operations ({items.length})
        </h2>

        {items.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Local queue is clear. All emergency operations are synchronized.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {items.map((item) => (
              <div key={item.operation_id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-white">{item.operation_type}</span>
                    <span className="text-[10px] text-slate-500">{item.operation_id}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {item.payload?.description || item.payload?.notes || JSON.stringify(item.payload)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    Queued: {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>

                <div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    item.sync_status === 'SYNCED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : item.sync_status === 'FAILED'
                      ? 'bg-red-950 text-red-300 border border-red-700'
                      : 'bg-amber-950 text-amber-300 border border-amber-700 animate-pulse'
                  }`}>
                    {item.sync_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
