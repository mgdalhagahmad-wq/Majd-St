
import { GenerationRecord, UserProfile, GlobalStats, AnalyticsEvent } from '../types';

/**
 * MAJD SERVER SIMULATOR (Enterprise Grade)
 * This logic mimics a remote backend server. 
 * In a real production environment, you would replace the 'mockFetch' 
 * calls with actual fetch('https://api.majd-vo.com/...') calls.
 */

class MajdServerMock {
  private db: {
    records: GenerationRecord[],
    events: any[],
    users: UserProfile[]
  } = {
    records: [],
    events: [],
    users: []
  };

  constructor() {
    // Load initial data from 'Cloud Persistence' (Persistent Local Storage for demo)
    const saved = localStorage.getItem('majd_cloud_db_v2');
    if (saved) {
      this.db = JSON.parse(saved);
    }
  }

  private saveToCloud() {
    localStorage.setItem('majd_cloud_db_v2', JSON.stringify(this.db));
  }

  async handleRequest(endpoint: string, method: string, body?: any): Promise<any> {
    // Simulate Network Latency
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));

    if (endpoint === '/api/auth/profile') {
      const userId = body?.userId || 'anonymous';
      let user = this.db.users.find(u => u.id === userId);
      if (!user) {
        user = { id: userId, role: 'user', created_at: Date.now(), last_active: Date.now() };
        this.db.users.push(user);
        this.saveToCloud();
      }
      return user;
    }

    if (endpoint === '/api/records' && method === 'GET') {
      const userId = body?.userId;
      return userId ? this.db.records.filter(r => r.user_id === userId) : this.db.records;
    }

    if (endpoint === '/api/records' && method === 'POST') {
      const record = { ...body, id: Math.random().toString(36).substr(2, 9), timestamp: Date.now() };
      this.db.records.push(record);
      this.saveToCloud();
      return record;
    }

    if (endpoint === '/api/stats' && method === 'GET') {
      const records = this.db.records;
      const dialects: Record<string, number> = {};
      let totalDuration = 0;
      records.forEach(r => {
        dialects[r.selection.dialect] = (dialects[r.selection.dialect] || 0) + 1;
        totalDuration += r.duration;
      });
      return {
        total_users: this.db.users.length || 1,
        total_records: records.length,
        total_duration: totalDuration,
        success_rate: 99.9,
        top_dialects: dialects,
        records_by_day: {} // Aggregated on demand
      };
    }

    throw new Error("404 Not Found");
  }
}

const server = new MajdServerMock();

class MajdApiService {
  private SESSION_ID = 'majd_session_v2';

  constructor() {
    if (!localStorage.getItem(this.SESSION_ID)) {
      localStorage.setItem(this.SESSION_ID, 'user_' + Math.random().toString(36).substr(2, 9));
    }
  }

  private get userId() {
    return localStorage.getItem(this.SESSION_ID);
  }

  // Real-world pattern: we use a helper to make "server" calls
  private async request(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
    try {
      // In production, this would be: return await fetch(BASE_URL + endpoint, ...)
      return await server.handleRequest(endpoint, method, { ...data, userId: this.userId });
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  async getProfile(): Promise<UserProfile> {
    return this.request('/api/auth/profile', 'POST');
  }

  async saveRecord(record: any): Promise<GenerationRecord> {
    return this.request('/api/records', 'POST', {
      ...record,
      user_id: this.userId,
      status: 'success',
      engine: 'Majd Cloud Engine v2'
    });
  }

  async getUserRecords(): Promise<GenerationRecord[]> {
    return this.request('/api/records', 'GET');
  }

  async getAllRecordsAdmin(): Promise<GenerationRecord[]> {
    return this.request('/api/records', 'GET'); // Admin fetches all
  }

  async getGlobalStats(): Promise<GlobalStats> {
    return this.request('/api/stats', 'GET');
  }

  async trackEvent(event: AnalyticsEvent, metadata: any = {}) {
    // Fire and forget
    this.request('/api/events', 'POST', { event, metadata });
  }
}

export const api = new MajdApiService();
