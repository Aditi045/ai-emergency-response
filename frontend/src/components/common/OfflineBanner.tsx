import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPendingOfflineQueue } from '../../services/offlineQueue';

export const OfflineBanner: React.FC = () => {
  const { isOnline, syncOfflineQueue } = useAuth();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SYNCED' | 'FAILED'>('IDLE');

  const checkQueue = async () => {
    try {
      const pending = await getPendingOfflineQueue();
      setPendingCount(pending.length);
    } catch {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    checkQueue();
    const interval = setInterval(checkQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) return;
    setSyncStatus('SYNCING');
    const result = await syncOfflineQueue();
    if (result.success) {
      setSyncStatus('SYNCED');
      setTimeout(() => setSyncStatus('IDLE'), 4000);
    } else {
      setSyncStatus('FAILED');
    }
    await checkQueue();
  };

  if (isOnline && pendingCount === 0 && syncStatus === 'IDLE') {
    return null;
  }

  return (
    <div className={`px-4 py-2 border-b text-xs flex items-center justify-between transition-colors ${
      !isOnline 
        ? 'bg-amber-950/90 text-amber-200 border-amber-800' 
        : syncStatus === 'SYNCING'
        ? 'bg-blue-950/90 text-blue-200 border-blue-800'
        : syncStatus === 'FAILED'
        ? 'bg-red-950/90 text-red-200 border-red-800'
        : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
    }`}>
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 text-amber-400" />
            <span className="font-semibold tracking-wide">OFFLINE MODE ACTIVE:</span>
            <span>Reports and distress signals are saved locally to IndexedDB queue.</span>
          </>
        ) : syncStatus === 'SYNCING' ? (
          <>
            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
            <span className="font-semibold">SYNCING:</span>
            <span>Transmitting local offline queue items to server...</span>
          </>
        ) : syncStatus === 'FAILED' ? (
          <>
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="font-semibold">SYNC FAILED:</span>
            <span>Server rejected one or more cached offline items. Retrying shortly.</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">ONLINE & SYNCHRONIZED:</span>
            <span>All local queues clear. Telemetry stream active.</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {pendingCount > 0 && (
          <span className="bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded font-mono font-bold">
            {pendingCount} Pending Operation{pendingCount > 1 ? 's' : ''}
          </span>
        )}
        {isOnline && pendingCount > 0 && (
          <button
            onClick={handleManualSync}
            disabled={syncStatus === 'SYNCING'}
            className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
            Sync Now
          </button>
        )}
      </div>
    </div>
  );
};
