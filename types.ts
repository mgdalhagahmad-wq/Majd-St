
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
  audio_url: string; 
  audio_data: string; 
  duration: number;
  status: 'success' | 'error';
  engine: string;
  rating: number; 
}

export interface SessionLog {
  id: string;
  user_id: string;
  start_time: number;
  last_active: number;
  country: string;
  country_code: string;
  city: string;
  region: string;
  browser: string;
  os: string;
  device: string;
  ip: string;
  referrer: string;
}

export interface GlobalStats {
  total_users: number;
  total_records: number;
  total_visits: number;
  total_duration: number;
  avg_rating: number;
  live_now: number; // الزوار الحاليون
  top_countries: { name: string, count: number, code: string }[];
  top_browsers: { name: string, count: number }[];
  top_os: { name: string, count: number }[];
  top_cities: { name: string, count: number }[];
}
