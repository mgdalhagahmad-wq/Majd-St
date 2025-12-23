
import { GenerationRecord, UserProfile, GlobalStats, AnalyticsEvent, VoiceSelection } from '../types';

/**
 * Helper to generate unique IDs even in non-secure contexts (http)
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

class MajdApiService {
  private USER_KEY = 'majd_user_profile_new';
  private SESSION_KEY = 'majd_session_id_new';

  constructor() {
    this.initSession();
  }

  private initSession() {
    if (!localStorage.getItem(this.SESSION_KEY)) {
      localStorage.setItem(this.SESSION_KEY, generateId());
    }
  }

  getCurrentUserId(): string {
    return localStorage.getItem(this.SESSION_KEY) || 'anonymous';
  }

  async getProfile(): Promise<UserProfile> {
    const userId = this.getCurrentUserId();
    const stored = localStorage.getItem(`${this.USER_KEY}_${userId}`);
    if (stored) return JSON.parse(stored);
    
    const newProfile: UserProfile = {
      id: userId,
      role: 'user',
      created_at: Date.now(),
      last_active: Date.now()
    };
    this.saveProfile(newProfile);
    return newProfile;
  }

  private saveProfile(profile: UserProfile) {
    localStorage.setItem(`${this.USER_KEY}_${profile.id}`, JSON.stringify(profile));
  }

  async saveRecord(record: Omit<GenerationRecord, 'user_id' | 'id' | 'timestamp' | 'status' | 'engine'>): Promise<GenerationRecord> {
    const userId = this.getCurrentUserId();
    const fullRecord: GenerationRecord = {
      ...record,
      id: generateId(),
      user_id: userId,
      timestamp: Date.now(),
      status: 'success',
      engine: 'Gemini 2.5 Flash TTS'
    };

    const globalRecords = this.getGlobalRecordsRaw();
    globalRecords.push(fullRecord);
    localStorage.setItem('majd_global_db_records', JSON.stringify(globalRecords));

    await this.trackEvent('record_created', { record_id: fullRecord.id });
    return fullRecord;
  }

  async getUserRecords(): Promise<GenerationRecord[]> {
    const userId = this.getCurrentUserId();
    const all = this.getGlobalRecordsRaw();
    return all.filter(r => r.user_id === userId).sort((a, b) => b.timestamp - a.timestamp);
  }

  async getAllRecordsAdmin(): Promise<GenerationRecord[]> {
    return this.getGlobalRecordsRaw().sort((a, b) => b.timestamp - a.timestamp);
  }

  private getGlobalRecordsRaw(): GenerationRecord[] {
    const data = localStorage.getItem('majd_global_db_records');
    return data ? JSON.parse(data) : [];
  }

  async trackEvent(event: AnalyticsEvent, metadata: any = {}) {
    const userId = this.getCurrentUserId();
    const events = this.getGlobalEventsRaw();
    events.push({
      id: generateId(),
      event,
      user_id: userId,
      metadata,
      timestamp: Date.now()
    });
    localStorage.setItem('majd_global_db_events', JSON.stringify(events));
  }

  private getGlobalEventsRaw() {
    const data = localStorage.getItem('majd_global_db_events');
    return data ? JSON.parse(data) : [];
  }

  async getGlobalStats(): Promise<GlobalStats> {
    const records = this.getGlobalRecordsRaw();
    const users = new Set(records.map(r => r.user_id));
    
    const byDay: Record<string, number> = {};
    const dialects: Record<string, number> = {};
    let totalDur = 0;

    records.forEach(r => {
      const day = new Date(r.timestamp).toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
      dialects[r.selection.dialect] = (dialects[r.selection.dialect] || 0) + 1;
      totalDur += r.duration;
    });

    return {
      total_users: users.size || 1,
      total_records: records.length,
      total_duration: totalDur,
      success_rate: 100,
      records_by_day: byDay,
      top_dialects: dialects
    };
  }
}

export const api = new MajdApiService();
