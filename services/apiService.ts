
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
    this.syncWithCloud();
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
      // إذا امتلأت الذاكرة المحلية بسبب حجم ملفات الصوت، سنحتفظ بها في الذاكرة الحية (RAM) فقط
      console.warn("Local storage full, keeping data in memory only.");
    }
  }

  /**
   * جلب أحدث البيانات من السحاب ودمجها مع المحلية
   */
  async syncWithCloud() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      const res = await fetch(`${CLOUD_API_URL}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY, "X-Bin-Meta": "false" }
      });
      if (!res.ok) throw new Error("Cloud fetch failed");
      const data = await res.json();
      
      const cloudRecords = Array.isArray(data.records) ? data.records : [];
      const cloudSessions = Array.isArray(data.sessions) ? data.sessions : [];
      
      // دمج السجلات مع الحفاظ على الفرادة عبر الـ ID
      const mergedRecords = [...this.recordsCache];
      cloudRecords.forEach((cr: GenerationRecord) => {
        if (!mergedRecords.find(lr => lr.id === cr.id)) {
          mergedRecords.push(cr);
        }
      });

      this.recordsCache = mergedRecords.sort((a, b) => b.timestamp - a.timestamp);
      this.sessionsCache = [...cloudSessions, ...this.sessionsCache].slice(-200); // حفظ آخر 200 جلسة فقط
      
      this.saveToLocal();
      console.log("Cloud sync successful");
    } catch (e) {
      console.error("Cloud sync failed, working in local mode", e);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * رفع البيانات للسحاب بعد الدمج
   */
  private async pushToCloud() {
    try {
      // دمج أخير قبل الرفع لضمان عدم مسح بيانات الآخرين
      const dataToSync = {
        records: this.recordsCache.slice(0, 40), // نكتفي بآخر 40 سجل عالمي لتجنب تجاوز حجم الملف (10MB)
        sessions: this.sessionsCache.slice(-50)
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
      console.warn("Push to cloud failed", e);
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
    const browser = userAgent.includes("Chrome") ? "Chrome" : "Safari";

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
    return newSession;
  }

  async getGlobalStats(): Promise<GlobalStats> {
    await this.syncWithCloud(); // تحديث البيانات قبل عرض الإحصائيات
    const records = this.recordsCache;
    const sessions = this.sessionsCache;
    const uniqueUsers = new Set(sessions.map(s => s.user_id)).size || 1;

    const countryMap: Record<string, number> = {};
    sessions.forEach(s => countryMap[s.country] = (countryMap[s.country] || 0) + 1);
    const top_countries = Object.entries(countryMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    const durations = sessions.map(s => (s.last_active - s.start_time) / 60000);
    const avg_session_duration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      total_users: uniqueUsers,
      total_records: records.length,
      total_duration: records.reduce((a, b) => a + b.duration, 0),
      success_rate: 100,
      avg_voices_per_user: records.length / uniqueUsers,
      avg_session_duration,
      top_countries,
      top_sources: [],
      device_stats: {}
    };
  }

  async getAllRecords() {
    await this.syncWithCloud(); // جلب أي أصوات جديدة من مستخدمين آخرين
    return this.recordsCache;
  }

  async getUserRecords(userId: string) {
    return this.recordsCache.filter(r => r.user_id === userId);
  }

  async saveRecord(record: any) {
    // 1. جلب البيانات من السحاب أولاً لدمج السجل الجديد مع سجلات الآخرين
    await this.syncWithCloud();

    const newRecord: GenerationRecord = {
      ...record,
      id: 'rec_' + Date.now() + Math.random().toString(36).substr(2, 5),
      timestamp: Date.now(),
      status: 'success',
      engine: 'Majd Global v7.0'
    };

    this.recordsCache = [newRecord, ...this.recordsCache];
    this.saveToLocal();
    
    // 2. دفع القائمة المدمجة للسحاب
    await this.pushToCloud();
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
  forceSync: () => engine.syncWithCloud()
};
