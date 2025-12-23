
export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr'
}

export interface VoiceControls {
  temp: string;
  emotion: string;
  speed: string;
  depth: string;
  pitch: string;
  drama: string;
}

export interface VoiceSelection {
  dialect: string;
  type: string;
  field: string;
  controls: VoiceControls;
}

export interface GenerationRecord {
  id: string;
  user_id: string;
  text: string;
  selection: VoiceSelection;
  timestamp: number;
  audio_url: string; // Server storage URL or Base64
  duration: number;
  status: 'success' | 'error';
  engine: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  role: 'admin' | 'user';
  created_at: number;
  last_active: number;
}

export interface GlobalStats {
  total_users: number;
  total_records: number;
  total_duration: number; // in seconds
  success_rate: number;
  records_by_day: Record<string, number>;
  top_dialects: Record<string, number>;
}

export type AnalyticsEvent = 
  | 'session_start'
  | 'record_created'
  | 'record_played'
  | 'record_deleted'
  | 'admin_login'
  | 'error_occurred';
