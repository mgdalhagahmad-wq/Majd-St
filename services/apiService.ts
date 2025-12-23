
import { GenerationRecord, GlobalStats, SessionLog } from '../types';

const BIN_ID = "694ac32fae596e708facad29"; 
const MASTER_KEY = "$2a$10$O0K2vjXYuVRdqb551DVBO.Qhd8f11FvdPzXFiGnZp5K74I8m.UP8O"; 
const CLOUD_API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

class MajdCloudEngine {
  /**
   * جلب البيانات الكاملة من السحاب مباشرة
   */
  private async fetchAllFromCloud() {
    try {
      const res = await fetch(`${CLOUD_API_URL}/latest`, {
        headers: { 
          "X-Master-Key": MASTER_KEY, 
          "X-Bin-Meta": "false" 
        }
      });
      if (!res.ok) return { records: [], sessions: [] };
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

  /**
   * تحديث البيانات في السحاب مباشرة
   */
  private async updateCloud(data: { records: any[], sessions: any[] }) {
    try {
      await fetch(CLOUD_API_URL, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Master-Key': MASTER_KEY, 
          'X-Bin-Versioning': 'false' 
        },
        body: JSON.stringify(data)
      });
      return true;
    } catch (e) {
      console.error("Cloud Update Error:", e);
      return false;
    }
  }

  async logSession(userId: string) {
    const cloudData = await this.fetchAllFromCloud();
    
    let country = "Unknown", countryCode = "UN";
    try {
      const geo = await fetch('https://ipapi.co/json/').then(r => r.json());
      country = geo.country_name || "Unknown";
      countryCode = geo.country_code || "UN";
    } catch (e) {}

    const newSession: SessionLog = {
      id: 'sess_' + Date.now(),
      user_id: userId,
      start_time: Date.now(),
      last_active: Date.now(),
      country,
      country_code: countryCode,
      referrer: document.referrer || "Direct",
      browser: navigator.userAgent.includes("Chrome") ? "Chrome" : "Safari",
      device: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop"
    };

    cloudData.sessions.push(newSession);
    // الاحتفاظ بآخر 50 جلسة فقط للحفاظ على المساحة
    cloudData.sessions = cloudData.sessions.slice(-50);
    
    await this.updateCloud(cloudData);
    return newSession;
  }

  async getGlobalStats(): Promise<GlobalStats> {
    const data = await this.fetchAllFromCloud();
    const records = data.records;
    const sessions = data.sessions;
    const uniqueUsers = new Set(sessions.map(s => s.user_id)).size || 1;

    const countryMap: Record<string, number> = {};
    sessions.forEach(s => countryMap[s.country] = (countryMap[s.country] || 0) + 1);
    const top_countries = Object.entries(countryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const durations = sessions.map(s => (s.last_active - s.start_time) / 60000);
    const avg_session_duration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      total_users: uniqueUsers,
      total_records: records.length,
      total_duration: records.reduce((a, b) => a + (b.duration || 0), 0),
      success_rate: 100,
      avg_voices_per_user: records.length / uniqueUsers,
      avg_session_duration,
      top_countries,
      top_sources: [],
      device_stats: {}
    };
  }

  async getAllRecords() {
    const data = await this.fetchAllFromCloud();
    return data.records;
  }

  async getUserRecords(userId: string) {
    const data = await this.fetchAllFromCloud();
    return data.records.filter(r => r.user_id === userId);
  }

  async saveRecord(record: any) {
    // 1. جلب أحدث نسخة من السحاب
    const cloudData = await this.fetchAllFromCloud();

    const newRecord: GenerationRecord = {
      ...record,
      id: 'rec_' + Date.now() + Math.random().toString(36).substr(2, 5),
      timestamp: Date.now(),
      status: 'success',
      engine: 'Majd Cloud Direct v8.0'
    };

    // 2. إضافة السجل الجديد في البداية
    cloudData.records = [newRecord, ...cloudData.records];
    
    // 3. تقليص القائمة لآخر 20 سجلاً فقط (بسبب حجم ملفات الصوت الكبير Base64)
    // هذا يضمن بقاء قاعدة البيانات تعمل ولا تتوقف بسبب امتلاء المساحة
    cloudData.records = cloudData.records.slice(0, 20);

    // 4. حفظ البيانات في السحاب
    await this.updateCloud(cloudData);
    
    return newRecord;
  }
}

const engine = new MajdCloudEngine();
export const api = {
  logSession: (uid: string) => engine.logSession(uid),
  saveRecord: (data: any) => engine.saveRecord(data),
  getUserRecords: (uid: string) => engine.getUserRecords(uid),
  getAllRecords: () => engine.getAllRecords(),
  getGlobalStats: () => engine.getGlobalStats(),
  forceSync: () => engine.getAllRecords() // مجرد جلب للبيانات
};
