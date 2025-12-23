
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
  audio_data: string; // تم التغيير من audio_url لتخزين Base64
  duration: number;
  status: 'success' | 'error';
  engine: string;
}

export interface SessionLog {
  id: string;
  user_id: string;
  start_time: number;
  last_active: number;
  country: string;
  country_code: string;
  referrer: string;
  browser: string;
  device: string;
}

export interface GlobalStats {
  total_users: number;
  total_records: number;
  total_duration: number;
  success_rate: number;
  avg_voices_per_user: number;
  avg_session_duration: number; 
  top_countries: { name: string, count: number }[];
  top_sources: { url: string, count: number }[];
  device_stats: Record<string, number>;
}
