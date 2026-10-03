import { openDB, DBSchema } from 'idb';

interface ResQIntelDB extends DBSchema {
  offline_queue: {
    key: string;
    value: {
      operation_id: string;
      operation_type: 'CREATE_REPORT' | 'SOS' | 'UPDATE_STATUS' | 'ADD_NOTE';
      entity_type: string;
      payload: any;
      created_at: string;
      retry_count: number;
      sync_status: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
      error_message?: string;
    };
    indexes: { 'by-status': string };
  };
  cached_incidents: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'resqintel_offline_db';
const DB_VERSION = 1;

export async function getDB() {
  return openDB<ResQIntelDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('offline_queue')) {
        const store = db.createObjectStore('offline_queue', { keyPath: 'operation_id' });
        store.createIndex('by-status', 'sync_status');
      }
      if (!db.objectStoreNames.contains('cached_incidents')) {
        db.createObjectStore('cached_incidents', { keyPath: 'id' });
      }
    },
  });
}

export async function enqueueOfflineOperation(
  operation_type: 'CREATE_REPORT' | 'SOS' | 'UPDATE_STATUS' | 'ADD_NOTE',
  entity_type: string,
  payload: any
) {
  const db = await getDB();
  const operation_id = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const item = {
    operation_id,
    operation_type,
    entity_type,
    payload,
    created_at: new Date().toISOString(),
    retry_count: 0,
    sync_status: 'PENDING' as const,
  };
  await db.put('offline_queue', item);
  return item;
}

export async function getPendingOfflineQueue() {
  const db = await getDB();
  return db.getAllFromIndex('offline_queue', 'by-status', 'PENDING');
}

export async function getAllOfflineItems() {
  const db = await getDB();
  return db.getAll('offline_queue');
}

export async function markOfflineItemSynced(operation_id: string) {
  const db = await getDB();
  const item = await db.get('offline_queue', operation_id);
  if (item) {
    item.sync_status = 'SYNCED';
    await db.put('offline_queue', item);
  }
}

export async function markOfflineItemFailed(operation_id: string, error: string) {
  const db = await getDB();
  const item = await db.get('offline_queue', operation_id);
  if (item) {
    item.sync_status = 'FAILED';
    item.error_message = error;
    item.retry_count += 1;
    await db.put('offline_queue', item);
  }
}

export async function triggerOfflineBatchSync(): Promise<{
  success: boolean;
  synced: number;
  failed: number;
}> {
  const pending = await getPendingOfflineQueue();
  if (!pending || pending.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

  try {
    const token = localStorage.getItem('resqintel_token');
    const response = await fetch('/api/sync/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ items: pending }),
    });

    if (response.ok) {
      const data = await response.json();
      for (const resItem of data.items || []) {
        if (resItem.status === 'SYNCED' || resItem.status === 'DUPLICATE_IGNORED') {
          await markOfflineItemSynced(resItem.operation_id);
        } else {
          await markOfflineItemFailed(resItem.operation_id, resItem.error || 'Server rejected');
        }
      }
      return { success: true, synced: data.synced, failed: data.failed };
    } else {
      return { success: false, synced: 0, failed: pending.length };
    }
  } catch (err: any) {
    return { success: false, synced: 0, failed: pending.length };
  }
}
