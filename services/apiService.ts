
import { GenerationRecord, GlobalStats, SessionLog } from '../types';

const BIN_ID = "694ac32fae596e708facad29"; 
const MASTER_KEY = "$2a$10$O0K2vjXYuVRdqb551DVBO.Qhd8f11FvdPzXFiGnZp5K74I8m.UP8O"; 
const CLOUD_API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

class MajdCloudEngine {
  private async fetchRaw(): Promise<{ records: GenerationRecord[], sessions: SessionLog[] }> {
    try {
      const res = await fetch(`${CLOUD_API_URL}/latest`, {
        headers: { 
          "X-Master-Key": MASTER_KEY, 
          "X-Bin-Meta": "false" 
        },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      return {
        records: Array.isArray(data.records) ? data.records : [],
        sessions: Array.isArray(data.sessions) ? data.sessions : []
      };
    } catch (e) {
      console.error("Cloud Fetch Error:", e);
      return { records: [], sessions: [] };
    }
  }

  private async pushToCloud(data: { records: GenerationRecord[], sessions: SessionLog[] }): Promise<boolean> {
    try {
      const res = await fetch(CLOUD_API_URL, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Master-Key': MASTER_KEY
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("JsonBin Rejection:", errText);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Cloud Push Error:", e);
      return false;
    }
  }

  async logSession(userId: string): Promise<SessionLog> {
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
    data.sessions = [newSession, ...data.sessions].slice(0, 20);
    await this.pushToCloud(data);
    return newSession;
  }

  async saveRecord(record: any): Promise<GenerationRecord> {
    const data = await this.fetchRaw();
    const newRecord: GenerationRecord = {
      ...record,
      id: 'rec_' + Date.now(),
      timestamp: Date.now(),
      status: 'success',
      engine: 'Majd Cloud v11'
    };

    // تقليص حاد لعدد السجلات لـ 3 فقط لأن حجم الـ Base64 لملفات الـ WAV ضخم جداً
    data.records = [newRecord, ...data.records].slice(0, 3);
    
    const success = await this.pushToCloud(data);
    if (!success) {
      throw new Error("قاعدة البيانات السحابية رفضت الملف (غالباً بسبب الحجم الزائد لملف الصوت)");
    }
    return newRecord;
  }

  async getUserRecords(userId: string): Promise<GenerationRecord[]> {
    const data = await this.fetchRaw();
    return data.records.filter((r: GenerationRecord) => r.user_id === userId);
  }

  async getAllRecords(): Promise<GenerationRecord[]> {
    const data = await this.fetchRaw();
    return data.records;
  }

  async getGlobalStats(): Promise<GlobalStats> {
    const data = await this.fetchRaw();
    const uniqueUsers = new Set(data.sessions.map((s: SessionLog) => s.user_id)).size || 1;
    return {
      total_users: uniqueUsers,
      total_records: data.records.length,
      total_duration: data.records.reduce((acc: number, curr: GenerationRecord) => acc + (curr.duration || 0), 0),
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
