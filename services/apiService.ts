
import { GenerationRecord, GlobalStats, SessionLog } from '../types';

const BIN_ID = "694ac32fae596e708facad29"; 
const MASTER_KEY = "$2a$10$O0K2vjXYuVRdqb551DVBO.Qhd8f11FvdPzXFiGnZp5K74I8m.UP8O"; 
const CLOUD_API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

class MajdCloudEngine {
  /**
   * جلب البيانات الصافية من السحاب
   */
  private async fetchRaw() {
    try {
      const res = await fetch(`${CLOUD_API_URL}/latest`, {
        headers: { 
          "X-Master-Key": MASTER_KEY, 
          "X-Bin-Meta": "false" 
        },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error("Cloud unreachable");
      const data = await res.json();
      return {
        records: Array.isArray(data.records) ? data.records : [],
        sessions: Array.isArray(data.sessions) ? data.sessions : []
      };
    } catch (e) {
      console.error("Cloud Read Error:", e);
      return { records: [], sessions: [] };
    }
  }

  /**
   * تحديث السحاب بالبيانات الجديدة
   */
  private async pushToCloud(data: { records: any[], sessions: any[] }) {
    try {
      const res = await fetch(CLOUD_API_URL, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Master-Key': MASTER_KEY,
          'X-Bin-Versioning': 'false'
        },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (e) {
      console.error("Cloud Write Error:", e);
      return false;
    }
  }

  async logSession(userId: string) {
    const data = await this.fetchRaw();
    
    const newSession: SessionLog = {
      id: 'sess_' + Date.now(),
      user_id: userId,
      start_time: Date.now(),
      last_active: Date.now(),
      country: "Global",
      country_code: "WW",
      referrer: document.referrer || "Direct",
      browser: "WebBrowser",
      device: "Standard"
    };

    data.sessions = [newSession, ...data.sessions].slice(0, 30); // حفظ آخر 30 جلسة فقط
    await this.pushToCloud(data);
    return newSession;
  }

  async saveRecord(record: any) {
    const data = await this.fetchRaw();

    const newRecord: GenerationRecord = {
      ...record,
      id: 'rec_' + Date.now(),
      timestamp: Date.now(),
      status: 'success',
      engine: 'Majd Cloud Direct v9'
    };

    // إضافة السجل في البداية وتقليص العدد لـ 10 فقط بسبب حجم الـ Base64 الكبير
    data.records = [newRecord, ...data.records].slice(0, 10);
    
    const success = await this.pushToCloud(data);
    if (!success) throw new Error("Failed to persist to cloud storage");
    
    return newRecord;
  }

  async getUserRecords(userId: string) {
    const data = await this.fetchRaw();
    return data.records.filter(r => r.user_id === userId);
  }

  async getAllRecords() {
    const data = await this.fetchRaw();
    return data.records;
  }

  async getGlobalStats(): Promise<GlobalStats> {
    const data = await this.fetchRaw();
    const uniqueUsers = new Set(data.sessions.map(s => s.user_id)).size || 1;

    return {
      total_users: uniqueUsers,
      total_records: data.records.length,
      total_duration: data.records.reduce((a, b) => a + (b.duration || 0), 0),
      success_rate: 100,
      avg_voices_per_user: data.records.length / uniqueUsers,
      avg_session_duration: 5,
      top_countries: [],
      top_sources: [],
      device_stats: {}
    };
  }
}

const engine = new MajdCloudEngine();
export const api = {
  logSession: (uid: string) => engine.logSession(uid),
  saveRecord: (data: any) => engine.saveRecord(data),
  getUserRecords: (uid: string) => engine.getUserRecords(uid),
  getAllRecords: () => engine.getAllRecords(),
  getGlobalStats: () => engine.getGlobalStats(),
  forceSync: () => engine.getAllRecords()
};
