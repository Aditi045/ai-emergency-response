export type UserRole = 'ADMIN' | 'DISPATCHER' | 'ANALYST' | 'RESPONDER' | 'CITIZEN';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  organization?: string;
  avatar_url?: string;
  is_active: boolean;
}

export type IncidentStatus = 
  | 'REPORTED'
  | 'AI_ANALYZING'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'PRIORITIZED'
  | 'DISPATCHED'
  | 'RESPONDER_EN_ROUTE'
  | 'ON_SCENE'
  | 'RESOLVED'
  | 'CLOSED';

export type SeverityClass = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Incident {
  id: string;
  incident_number: string;
  title: string;
  description: string;
  incident_type: string;
  status: IncidentStatus;
  severity_score: number;
  severity_class: SeverityClass;
  priority_score: number;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  radius_meters?: number;
  affected_people_estimate?: number;
  injuries_count?: number;
  fatalities_count?: number;
  hazards_description?: string;
  infrastructure_damage?: string;
  verification_status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  verified_at?: string;
  verification_notes?: string;
  cluster_id?: string;
  is_demo?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface IncidentReport {
  id: string;
  incident_id?: string;
  report_type: string;
  raw_text?: string;
  transcript?: string;
  latitude: number;
  longitude: number;
  address?: string;
  injuries_reported?: number;
  people_affected?: number;
  hazards?: string;
  damage?: string;
  submitter_name?: string;
  submitter_phone?: string;
  is_anonymous?: boolean;
  is_offline_synced?: boolean;
  created_at: string;
}

export interface IncidentTimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description?: string;
  previous_status?: string;
  new_status?: string;
  actor_name?: string;
  actor_role?: string;
  created_at: string;
}

export interface AIEvidenceItem {
  id: string;
  evidence_type: string;
  source: string;
  snippet: string;
  confidence: number;
  relationship: string;
}

export interface AIAnalysisSummary {
  classification: string;
  confidence: number;
  severity_score: number;
  severity_class: SeverityClass;
  contributing_factors: Array<{
    factor: string;
    weight: number;
    score_contribution: number;
    rationale: string;
    raw_value?: string;
  }>;
  conflicts: {
    has_conflict: boolean;
    conflict_count: number;
    conflicts: Array<{
      type: string;
      severity: string;
      detected_contradiction: string;
      human_action_required: string;
    }>;
  };
  missing_information: {
    completeness_score_pct: number;
    has_missing_critical_info: boolean;
    missing_items: string[];
    verification_recommendations: string[];
  };
  agent_executions: Array<{
    agent_name: string;
    status: string;
    execution_ms: number;
  }>;
  model_version: string;
}

export interface AIRecommendationItem {
  id: string;
  recommendation_type: string;
  title: string;
  action: string;
  rationale: string;
  recommended_resource_ids?: string[];
  priority: string;
  is_approved: boolean;
  created_at: string;
}

export interface Resource {
  id: string;
  resource_name: string;
  resource_type: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'EN_ROUTE' | 'ON_SCENE' | 'MAINTENANCE' | 'OFFLINE';
  latitude: number;
  longitude: number;
  address?: string;
  capacity?: number;
  station_name?: string;
  contact_number?: string;
}

export interface Responder {
  id: string;
  user_id: string;
  responder_name: string;
  badge_number: string;
  specialization: string;
  status: 'ON_DUTY' | 'OFF_DUTY' | 'EN_ROUTE' | 'ON_SCENE';
  latitude?: number;
  longitude?: number;
  phone?: string;
}

export interface Hospital {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  total_beds: number;
  available_beds: number;
  trauma_center_level: string;
  phone?: string;
}

export interface Shelter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current_occupancy: number;
  phone?: string;
}

export interface RiskZone {
  id: string;
  zone_name: string;
  hazard_type: string;
  risk_level: string;
  coordinates_geojson: any;
  population_estimate: number;
  description?: string;
}

export interface SystemHealthData {
  system_status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  environment: string;
  services: Record<string, {
    name: string;
    status: string;
    latency_ms?: number;
    error?: string;
    note?: string;
  }>;
}

export interface SituationReport {
  id: string;
  sitrep_number: string;
  incident_id: string;
  title: string;
  summary: string;
  incident_status: string;
  severity: string;
  location_text: string;
  casualties_summary: string;
  resources_summary: string;
  timeline_summary: string;
  weather_summary: string;
  outstanding_issues: string;
  missing_info_summary: string;
  ai_recommendations_summary: string;
  author_name: string;
  created_at: string;
}

export interface OfflineSyncQueueItem {
  id: string;
  operation_id: string;
  operation_type: string;
  entity_type: string;
  payload: any;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  created_at: string;
  error_message?: string;
}
