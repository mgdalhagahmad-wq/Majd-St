
import { GenerationRecord, GlobalStats, SessionLog } from '../types';

const SUPABASE_URL = "https://afyohuikevwanybonepk.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_PDVsB-Q57wteNO50MtyBAg_2it3Jfem"; 

class MajdEngine {
  private headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  private currentSessionId: string | null = null;

  private base64ToBlob(base64: string, mime: string): Blob {
    const parts = base64.split(',');
    const actualData = parts.length > 1 ? parts[1] : parts[0];
    const byteString = atob(actualData);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  }

  private getDeviceInfo() {
    const ua = navigator.userAgent;
    let browser = "Other";
    let os = "Other";
    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "MacOS";
    else if (ua.includes("Android")) os = "Android";
    return { browser, os, device: /Mobile|Android|iPhone/i.test(ua) ? "Mobile" : "Desktop" };
  }

  // جلب معلومات الجغرافيا الحقيقية
  private async fetchGeoInfo() {
    try {
      const res = await fetch('https://ipapi.co/json/');
      return await res.json();
    } catch (e) {
      return { country_name: "Unknown", country_code: "WW", city: "Unknown", region: "Unknown", ip: "0.0.0.0" };
    }
  }

  async logSession(userId: string): Promise<SessionLog | null> {
    try {
      const geo = await this.fetchGeoInfo();
      const device = this.getDeviceInfo();
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      this.currentSessionId = sessionId;

      const session: SessionLog = {
        id: sessionId,
        user_id: userId,
        start_time: Date.now(),
        last_active: Date.now(),
        country: geo.country_name || "Unknown", 
        country_code: geo.country_code || "WW",
        city: geo.city || "Unknown",
        region: geo.region || "Unknown",
        ip: geo.ip || "0.0.0.0",
        browser: device.browser,
        os: device.os,
        device: device.device,
        referrer: document.referrer || "Direct"
      };

      await fetch(`${SUPABASE_URL}/rest/v1/sessions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(session)
      });
      
      this.startHeartbeat();
      return session;
    } catch (e) { return null; }
  }

  private startHeartbeat() {
    setInterval(async () => {
      if (!this.currentSessionId) return;
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${this.currentSessionId}`, {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({ last_active: Date.now() })
        });
      } catch (e) {}
    }, 30000); // تحديث النشاط كل 30 ثانية
  }

  async saveRecord(record: any): Promise<GenerationRecord> {
    try {
      const fileName = `${record.user_id}_${Date.now()}.wav`;
      const audioBlob = this.base64ToBlob(record.audio_data, 'audio/wav');
      
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/voices/${fileName}`, {
        method: 'POST',
        headers: { 
          'apikey': SUPABASE_KEY, 
          'Authorization': `Bearer ${SUPABASE_KEY}`, 
          'Content-Type': 'audio/wav' 
        },
        body: audioBlob
      });

      let audioUrl = record.audio_data; 
      if (uploadRes.ok) {
        audioUrl = `${SUPABASE_URL}/storage/v1/object/public/voices/${fileName}`;
      }

      const newRecord = {
        id: 'rec_' + Date.now(),
        user_id: record.user_id,
        text: record.text,
        selection: record.selection,
        timestamp: Date.now(),
        audio_url: audioUrl,
        duration: record.duration,
        status: 'success',
        engine: 'Majd Intelligence Core',
        rating: 0
      };

      const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/records`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(newRecord)
      });

      if (!dbRes.ok) throw new Error("Database save failed");
      return { ...newRecord, audio_data: record.audio_data } as any;
    } catch (e) {
      throw e;
    }
  }

  async submitFeedback(userId: string, rating: number, comment: string) {
    try {
      const feedback = {
        id: `fb_${Date.now()}`,
        user_id: userId,
        rating,
        comment,
        timestamp: Date.now()
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(feedback)
      });
      return res.ok;
    } catch (e) { return false; }
  }

  async getFeedbacks(): Promise<any[]> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback?order=timestamp.desc&limit=50`, { headers: this.headers });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  }

  async getUserRecords(userId: string): Promise<GenerationRecord[]> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/records?user_id=eq.${userId}&order=timestamp.desc`, { headers: this.headers });
      const data = await res.json();
      return Array.isArray(data) ? data.map((r: any) => ({ ...r, audio_data: r.audio_url })) : [];
    } catch (e) { return []; }
  }

  async getAllRecords(): Promise<GenerationRecord[]> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/records?order=timestamp.desc&limit=100`, { headers: this.headers });
      const data = await res.json();
      return Array.isArray(data) ? data.map((r: any) => ({ ...r, audio_data: r.audio_url })) : [];
    } catch (e) { return []; }
  }

  private aggregate(arr: any[], key: string) {
    const counts = arr.reduce((acc: any, curr: any) => {
      const val = curr[key] || "Unknown";
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count: count as number, code: 'WW' })) // الكود سيحدث لاحقا من البيانات الحقيقية
      .sort((a, b) => b.count - a.count);
  }

  async getGlobalStats(): Promise<GlobalStats> {
    try {
      // استخدام count=exact لجلب الإجمالي الحقيقي من قاعدة البيانات مباشرة لتجاوز حد الـ 1000
      const commonHeaders = { ...this.headers, 'Prefer': 'count=exact,head=false' };
      
      const [recRes, sessRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/records?select=id,duration,rating`, { headers: commonHeaders }),
        fetch(`${SUPABASE_URL}/rest/v1/sessions?select=user_id,country,browser,os,city,last_active`, { headers: commonHeaders })
      ]);

      // استخراج الإجمالي من الهيدرز (Supabase يرسل العدد الإجمالي في Content-Range)
      const totalRecs = parseInt(recRes.headers.get('content-range')?.split('/')[1] || '0');
      const totalSess = parseInt(sessRes.headers.get('content-range')?.split('/')[1] || '0');

      const records = await recRes.json();
      const sessions = await sessRes.json();

      if (!Array.isArray(sessions) || !Array.isArray(records)) throw new Error();
      
      const now = Date.now();
      const fiveMinsAgo = now - (5 * 60 * 1000);
      const liveNow = sessions.filter((s: any) => s.last_active > fiveMinsAgo).length;

      const rated = records.filter((r: any) => r.rating > 0);
      
      return {
        total_users: new Set(sessions.map((s: any) => s.user_id)).size,
        total_records: totalRecs,
        total_visits: totalSess,
        total_duration: records.reduce((a: any, b: any) => a + (b.duration || 0), 0),
        avg_rating: rated.length > 0 ? Number((rated.reduce((a: any, b: any) => a + b.rating, 0) / rated.length).toFixed(1)) : 5.0,
        live_now: liveNow,
        top_countries: this.aggregate(sessions, 'country'),
        top_browsers: this.aggregate(sessions, 'browser'),
        top_os: this.aggregate(sessions, 'os'),
        top_cities: this.aggregate(sessions, 'city')
      };
    } catch (e) {
      return { total_users: 0, total_records: 0, total_visits: 0, total_duration: 0, avg_rating: 5, live_now: 0, top_countries: [], top_browsers: [], top_os: [], top_cities: [] };
    }
  }

  async updateRating(recordId: string, rating: number) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/records?id=eq.${recordId}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({ rating })
      });
    } catch (e) {}
  }
}

export const api = new MajdEngine();
