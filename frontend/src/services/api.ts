import { enqueueOfflineOperation } from './offlineQueue';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('resqintel_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('resqintel_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('resqintel_token');
  localStorage.removeItem('resqintel_user');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      // Clear token on unauthorized
      clearAuthToken();
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errBody.detail || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (error: any) {
    // If network offline error and write operation, queue offline
    if (!navigator.onLine && options.method && ['POST', 'PUT'].includes(options.method)) {
      if (endpoint === '/reports/submit') {
        const payload = JSON.parse(options.body as string);
        await enqueueOfflineOperation('CREATE_REPORT', 'REPORT', payload);
        return {
          status: 'OFFLINE_QUEUED',
          message: 'Saved to local offline queue. Will sync when connection is restored.',
          offline: true,
        } as any;
      } else if (endpoint === '/reports/sos') {
        const payload = JSON.parse(options.body as string);
        await enqueueOfflineOperation('SOS', 'SOS', payload);
        return {
          status: 'SOS_OFFLINE_QUEUED',
          message: 'SOS cached in emergency offline buffer. Will broadcast on re-connect.',
          offline: true,
        } as any;
      }
    }
    throw error;
  }
}

export const api = {
  auth: {
    login: (credentials: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (userData: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    google: (authData: any) => request<any>('/auth/google', { method: 'POST', body: JSON.stringify(authData) }),
    me: () => request<any>('/auth/me'),
  },

  incidents: {
    list: (params?: { status?: string; severity?: string; incident_type?: string; verification?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<any[]>(`/incidents/?${q}`);
    },
    get: (id: string) => request<any>(`/incidents/${id}`),
    verify: (id: string, verif: { verification_status: string; verification_notes?: string; confirmed_type?: string; confirmed_severity?: string }) =>
      request<any>(`/incidents/${id}/verify`, { method: 'POST', body: JSON.stringify(verif) }),
    updateStatus: (id: string, status: string, notes?: string) =>
      request<any>(`/incidents/${id}/status`, { method: 'POST', body: JSON.stringify({ status, notes }) }),
  },

  reports: {
    submit: (reportData: any) => request<any>('/reports/submit', { method: 'POST', body: JSON.stringify(reportData) }),
    sos: (sosData: any) => request<any>('/reports/sos', { method: 'POST', body: JSON.stringify(sosData) }),
    myReports: () => request<any[]>('/reports/my-reports'),
    upload: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return request<any>('/reports/upload', { method: 'POST', body: fd });
    },
    transcribe: (audioFile: Blob) => {
      const fd = new FormData();
      fd.append('audio', audioFile, 'voice_report.wav');
      return request<any>('/reports/transcribe', { method: 'POST', body: fd });
    },
  },

  ai: {
    reevaluate: (incidentId: string) => request<any>(`/ai/re-evaluate/${incidentId}`, { method: 'POST' }),
    copilot: (data: { query: string; incident_id?: string }) => request<any>('/ai/copilot', { method: 'POST', body: JSON.stringify(data) }),
    generateSitrep: (data: { incident_id: string; title?: string }) => request<any>('/ai/sitrep', { method: 'POST', body: JSON.stringify(data) }),
    getSitreps: (incidentId: string) => request<any[]>(`/ai/sitreps/${incidentId}`),
    getClusters: () => request<any[]>('/ai/clusters'),
  },

  resources: {
    list: (params?: { resource_type?: string; status?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<any[]>(`/resources/?${q}`);
    },
    create: (data: any) => request<any>('/resources/', { method: 'POST', body: JSON.stringify(data) }),
    assign: (data: { incident_id: string; resource_id?: string; notes?: string }) =>
      request<any>('/resources/assign', { method: 'POST', body: JSON.stringify(data) }),
    updateAssignmentStatus: (assignmentId: string, status: string, notes?: string) =>
      request<any>(`/resources/assignments/${assignmentId}/status`, { method: 'PUT', body: JSON.stringify({ status, notes }) }),
  },

  responders: {
    list: (params?: { status?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return request<any[]>(`/responders/?${q}`);
    },
    myAssignment: () => request<any>('/responders/my-assignment'),
    heartbeat: (data: { status: string; latitude?: number; longitude?: number }) =>
      request<any>('/responders/heartbeat', { method: 'POST', body: JSON.stringify(data) }),
  },

  map: {
    layers: () => request<any>('/map/layers'),
    weather: (lat: number, lng: number) => request<any>(`/map/weather?lat=${lat}&lng=${lng}`),
    reverseGeocode: (lat: number, lng: number) => request<any>(`/map/reverse-geocode?lat=${lat}&lng=${lng}`),
    forwardGeocode: (query: string) => request<any>(`/map/forward-geocode?query=${encodeURIComponent(query)}`),
    route: (startLat: number, startLng: number, endLat: number, endLng: number) =>
      request<any>(`/map/route?start_lat=${startLat}&start_lng=${startLng}&end_lat=${endLat}&end_lng=${endLng}`),
  },

  notifications: {
    list: () => request<any[]>('/notifications/'),
    markRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PUT' }),
    geofencedAlert: (data: any) => request<any>('/notifications/geofenced-alert', { method: 'POST', body: JSON.stringify(data) }),
  },

  datasets: {
    list: () => request<any[]>('/datasets/'),
    models: () => request<any[]>('/datasets/models'),
  },

  admin: {
    users: () => request<any[]>('/admin/users'),
    changeRole: (userId: string, newRole: string) =>
      request<any>(`/admin/users/${userId}/role?new_role=${newRole}`, { method: 'PUT' }),
    auditLogs: (action?: string) => request<any[]>(`/admin/audit-logs${action ? `?action=${action}` : ''}`),
    analytics: () => request<any>('/admin/analytics'),
  },

  health: {
    get: () => request<any>('/health/'),
  },
};
