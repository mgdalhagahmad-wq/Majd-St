
import { GenerationRecord, UserProfile, GlobalStats } from '../types';

/**
 * MAJD GLOBAL CLOUD ENGINE (v5.6 - USER PRIVATE CLOUD)
 * تم تحديث الإعدادات لتعمل مباشرة مع حسابك الخاص.
 */

// معرف الصندوق (Bin ID) الخاص بك
const BIN_ID = "694ac32fae596e708facad29"; 

// مفتاح الماستر (Master Key) الخاص بك
const MASTER_KEY = "$2a$10$O0K2vjXYuVRdqb551DVBO.Qhd8f11FvdPzXFiGnZp5K74I8m.UP8O"; 

const CLOUD_API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

class MajdCloudEngine {
  private recordsCache: GenerationRecord[] = [];

  constructor() {
    this.sync();
  }

  private async sync(): Promise<GenerationRecord[]> {
    try {
      const res = await fetch(`${CLOUD_API_URL}/latest`, {
        method: 'GET',
        headers: { 
          "X-Master-Key": MASTER_KEY,
          "X-Bin-Meta": "false" // نطلب البيانات مباشرة بدون الميتا-داتا
        }
      });
      
      if (!res.ok) throw new Error(`Sync Error: ${res.status}`);
      
      const data = await res.json();
      
      // JSONBin v3 قد يعيد البيانات بشكل مباشر أو مغلفة في حقل record
      let remoteRecords = [];
      if (data.records) {
        remoteRecords = data.records;
      } else if (data.record && data.record.records) {
        remoteRecords = data.record.records;
      } else if (Array.isArray(data)) {
        remoteRecords = data;
      }
      
      this.recordsCache = Array.isArray(remoteRecords) ? remoteRecords : [];
      localStorage.setItem('majd_v5_cache', JSON.stringify(this.recordsCache));
      return this.recordsCache;
    } catch (e) {
      console.warn("Cloud offline, using backup.", e);
      const local = localStorage.getItem('majd_v5_cache');
      return local ? JSON.parse(local) : [];
    }
  }

  private async commit(allRecords: GenerationRecord[]) {
    try {
      const res = await fetch(CLOUD_API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': MASTER_KEY,
          'X-Bin-Versioning': 'false' // لا نريد إنشاء نسخ قديمة لتوفير المساحة
        },
        body: JSON.stringify({ records: allRecords })
      });
      
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Commit failed: ${res.status} - ${err}`);
      }
      
      this.recordsCache = allRecords;
      localStorage.setItem('majd_v5_cache', JSON.stringify(allRecords));
      console.log("Cloud synced successfully.");
    } catch (e) {
      console.error("Cloud update failed.", e);
    }
  }

  async handle(endpoint: string, method: string, body?: any): Promise<any> {
    const records = await this.sync();

    if (endpoint === '/api/stats') {
      const totalDur = records.reduce((acc, r) => acc + (r.duration || 0), 0);
      const uniqueUsers = new Set(records.map(r => r.user_id)).size;
      return {
        total_users: Math.max(uniqueUsers, 1),
        total_records: records.length,
        total_duration: totalDur,
        success_rate: 100
      };
    }

    if (endpoint === '/api/records') {
      if (body?.isAdmin) return records;
      return records.filter(r => r.user_id === body.userId);
    }

    if (endpoint === '/api/records/save') {
      const newRecord: GenerationRecord = { 
        ...body, 
        id: 'rec_' + Date.now() + Math.random().toString(36).substr(2, 4),
        timestamp: Date.now(), 
        status: 'success',
        engine: 'Majd Private Cloud v5.6'
      };
      
      const updated = [newRecord, ...records];
      await this.commit(updated);
      return newRecord;
    }

    return { status: 'ok' };
  }
}

const cloud = new MajdCloudEngine();

export const api = {
  getProfile: () => cloud.handle('/api/auth', 'GET'),
  saveRecord: (data: any) => cloud.handle('/api/records/save', 'POST', data),
  getUserRecords: (userId: string) => cloud.handle('/api/records', 'POST', { userId }),
  getAllRecordsAdmin: () => cloud.handle('/api/records', 'POST', { isAdmin: true }),
  getGlobalStats: () => cloud.handle('/api/stats', 'GET')
};
