
import { GenerationRecord, GlobalStats, SessionLog } from '../types';

const BIN_ID = "694ac32fae596e708facad29"; 
const MASTER_KEY = "$2a$10$O0K2vjXYuVRdqb551DVBO.Qhd8f11FvdPzXFiGnZp5K74I8m.UP8O"; 
const CLOUD_API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

class MajdCloudEngine {
  private recordsCache: GenerationRecord[] = [];
  private sessionsCache: SessionLog[] = [];
  private isSyncing = false;

  constructor() {
    this.loadFromLocal();
    this.initialCloudSync();
  }

  private loadFromLocal() {
    try {
      this.recordsCache = JSON.parse(localStorage.getItem('majd_records') || '[]');
      this.sessionsCache = JSON.parse(localStorage.getItem('majd_sessions') || '[]');
    } catch (e) {
      console.error("Local load failed", e);
    }
  }

  private saveToLocal() {
    try {
      localStorage.setItem('majd_records', JSON.stringify(this.recordsCache));
      localStorage.setItem('majd_sessions', JSON.stringify(this.sessionsCache));
    } catch (e) {
      console.warn("Local storage full, possibly due to large audio files.");
    }
  }

  private async initialCloudSync() {
    try {
      const res = await fetch(`${CLOUD_API_URL}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY, "X-Bin-Meta": "false" }
      });
      if (!res.ok) throw new Error("Cloud fetch failed");
      const data = await res.json();
      
      // دمج البيانات السحابية مع المحلية (تجنب التكرار)
      const cloudRecords = Array.isArray(data.records) ? data.records : [];
      const cloudSessions = Array.isArray(data.sessions) ? data.sessions : [];
      
      const localIds = new Set(this.recordsCache.map(r => r.id));
      const missingFromLocal = cloudRecords.filter((r: any) => !localIds.has(r.id));
      
      this.recordsCache = [...this.recordsCache, ...missingFromLocal].sort((a, b) => b.timestamp - a.timestamp);
      this.sessionsCache = [...this.sessionsCache, ...cloudSessions];
      
      this.saveToLocal();
    } catch (e) {
      console.log("Working in offline mode (Local-only)");
    }
  }

  private async commitToCloud() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    
    try {
      // JSONBin قد يرفض الطلبات الضخمة جداً، لذا نقوم بتنظيف السجلات القديمة إذا لزم الأمر في السحاب فقط
      const dataToSync = {
        records: this.recordsCache.slice(0, 50), // مزامنة آخر 50 سجل فقط للسحاب للحفاظ على الأداء
        sessions: this.sessionsCache.slice(-100)
      };

      await fetch(CLOUD_API_URL, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Master-Key': MASTER_KEY, 
          'X-Bin-Versioning': 'false' 
        },
        body: JSON.stringify(dataToSync)
      });
    } catch (e) {
      console.warn("Cloud sync deferred: Network issues or payload size limit.");
    } finally {
      this.isSyncing = false;
    }
  }

  async logSession(userId: string) {
    let country = "Unknown", countryCode = "UN";
    try {
      const geo = await fetch('https://ipapi.co/json/').then(r => r.json());
      country = geo.country_name || "Unknown";
      countryCode = geo.country_code || "UN";
    } catch (e) {}

    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const browser = userAgent.includes("Chrome") ? "Chrome" : userAgent.includes("Safari") ? "Safari" : "Other";

    const newSession: SessionLog = {
      id: 'sess_' + Date.now(),
      user_id: userId,
      start_time: Date.now(),
      last_active: Date.now(),
      country,
      country_code: countryCode,
      referrer: document.referrer || "Direct",
      browser,
      device: isMobile ? "Mobile" : "Desktop"
    };

    this.sessionsCache.push(newSession);
    this.saveToLocal();
    this.commitToCloud();
    return newSession;
  }

  async updateActivity(sessionId: string) {
    const sess = this.sessionsCache.find(s => s.id === sessionId);
    if (sess) {
      sess.last_active = Date.now();
      this.saveToLocal();
    }
  }

  async getGlobalStats(): Promise<GlobalStats> {
    const records = this.recordsCache;
    const sessions = this.sessionsCache;
    const uniqueUsers = new Set(sessions.map(s => s.user_id)).size || 1;

    const countryMap: Record<string, number> = {};
    sessions.forEach(s => countryMap[s.country] = (countryMap[s.country] || 0) + 1);
    const top_countries = Object.entries(countryMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    const sourceMap: Record<string, number> = {};
    sessions.forEach(s => sourceMap[s.referrer] = (sourceMap[s.referrer] || 0) + 1);
    const top_sources = Object.entries(sourceMap).map(([url, count]) => ({ url, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    const durations = sessions.map(s => (s.last_active - s.start_time) / 60000);
    const avg_session_duration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const device_stats: Record<string, number> = { Mobile: 0, Desktop: 0 };
    sessions.forEach(s => device_stats[s.device] = (device_stats[s.device] || 0) + 1);

    return {
      total_users: uniqueUsers,
      total_records: records.length,
      total_duration: records.reduce((a, b) => a + b.duration, 0),
      success_rate: 100,
      avg_voices_per_user: records.length / uniqueUsers,
      avg_session_duration,
      top_countries,
      top_sources,
      device_stats
    };
  }

  async getAllRecords() {
    return this.recordsCache;
  }

  async getUserRecords(userId: string) {
    return this.recordsCache.filter(r => r.user_id === userId);
  }

  async saveRecord(record: any) {
    const newRecord: GenerationRecord = {
      ...record,
      id: 'rec_' + Date.now(),
      timestamp: Date.now(),
      status: 'success',
      engine: 'Majd Engine v6.1'
    };
    this.recordsCache = [newRecord, ...this.recordsCache];
    this.saveToLocal();
    this.commitToCloud(); // محاولة مزامنة السجل الجديد
    return newRecord;
  }
}

const engine = new MajdCloudEngine();
export const api = {
  logSession: (uid: string) => engine.logSession(uid),
  updateActivity: (sid: string) => engine.updateActivity(sid),
  saveRecord: (data: any) => engine.saveRecord(data),
  getUserRecords: (uid: string) => engine.getUserRecords(uid),
  getAllRecords: () => engine.getAllRecords(),
  getGlobalStats: () => engine.getGlobalStats()
};
