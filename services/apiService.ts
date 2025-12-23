
import { GenerationRecord, UserProfile, GlobalStats } from '../types';

/**
 * MAJD GLOBAL CLOUD ENGINE (v5.1 - ROBUST SYNC)
 * Fixed the 'undefined records' crash and improved global synchronization.
 */

// Using a publicly accessible bin (or a robust mock structure)
const CLOUD_API_URL = "https://api.jsonbin.io/v3/b/67bd7787ad19ca34f8107c13";
// Note: This key is often needed for private bins. For public bins, it might be optional.
const API_KEY = "$2a$10$W2iXG/5f.Gz475iV0j6B9.6v.hY.lX.oX.l.X.l.X.l.X.l.X.l.X"; 

class MajdCloudEngine {
  private cache: { records: GenerationRecord[] } = { records: [] };
  private isInitialized: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    await this.syncWithCloud();
    this.isInitialized = true;
  }

  // Fetch all data from the global cloud storage
  private async syncWithCloud(): Promise<any> {
    try {
      const res = await fetch(`${CLOUD_API_URL}/latest`, {
        headers: { 
          "X-Master-Key": API_KEY,
          "X-Bin-Meta": "false" // Returns just the record data directly
        }
      });
      
      if (!res.ok) throw new Error(`Cloud fetch failed: ${res.status}`);
      
      const data = await res.json();
      
      // Handle both cases: JSONBin returning metadata wrapper or raw data
      const records = data?.records || data?.record?.records || [];
      
      this.cache.records = Array.isArray(records) ? records : [];
      localStorage.setItem('majd_cloud_cache', JSON.stringify(this.cache));
      
      return this.cache;
    } catch (e) {
      console.warn("Cloud Sync Warning (Using Local Cache):", e);
      const local = localStorage.getItem('majd_cloud_cache');
      if (local) {
        this.cache = JSON.parse(local);
      }
      return this.cache;
    }
  }

  // Save data to the global cloud storage
  private async pushToCloud(allRecords: GenerationRecord[]) {
    try {
      // Always push as an object with a 'records' key to maintain structure
      const payload = { records: allRecords };
      
      const res = await fetch(CLOUD_API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Cloud push failed: ${res.status}`);
      
      this.cache.records = allRecords;
      localStorage.setItem('majd_cloud_cache', JSON.stringify(this.cache));
    } catch (e) {
      console.error("Cloud Push Error:", e);
    }
  }

  async handle(endpoint: string, method: string, body?: any): Promise<any> {
    // Ensure we have the latest data from the cloud before processing
    const cloudData = await this.syncWithCloud();
    const records: GenerationRecord[] = cloudData?.records || [];

    if (endpoint === '/api/stats') {
      const totalDur = records.reduce((acc, r) => acc + (r.duration || 0), 0);
      const uniqueUsers = new Set(records.map(r => r.user_id)).size;
      return {
        total_users: Math.max(uniqueUsers, 1),
        total_records: records.length,
        total_duration: totalDur,
        success_rate: 100,
        top_dialects: {},
        records_by_day: {}
      };
    }

    if (endpoint === '/api/records') {
      // Admin sees everything; Users see their own
      if (body?.isAdmin) return records;
      return records.filter(r => r.user_id === body.userId);
    }

    if (endpoint === '/api/records/save') {
      const newRecord: GenerationRecord = { 
        ...body, 
        id: 'cloud_' + Math.random().toString(36).substr(2, 6),
        timestamp: Date.now(), 
        status: 'success',
        engine: 'Majd Global Sync'
      };
      
      const updatedRecords = [newRecord, ...records];
      await this.pushToCloud(updatedRecords);
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
