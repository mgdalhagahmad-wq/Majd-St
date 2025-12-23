
import { GenerationRecord, GlobalStats, SessionLog } from '../types';

const SUPABASE_URL = "https://afyohuikevwanybonepk.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_PDVsB-Q57wteNO50MtyBAg_2it3Jfem"; 

class MajdStudioEngine {
  private headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

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
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "MacOS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Linux")) os = "Linux";

    return { 
      browser, 
      os, 
      device: /Mobile|Android|iPhone/i.test(ua) ? "Mobile" : "Desktop" 
    };
  }

  async logSession(userId: string): Promise<SessionLog | null> {
    try {
      // جلب بيانات الموقع عبر خدمة IP
      const geoRes = await fetch('https://ipapi.co/json/');
      const geo = await geoRes.json();
      
      const device = this.getDeviceInfo();
      const session: SessionLog = {
        id: 'sess_' + Date.now() + Math.random().toString(36).substr(2, 5),
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

      return session;
    } catch (e) {
      console.error("Session Log Error:", e);
      return null;
    }
  }

  async saveRecord(record: any): Promise<GenerationRecord> {
    const fileName = `${record.user_id}_${Date.now()}.wav`;
    const audioBlob = this.base64ToBlob(record.audio_data, 'audio/wav');

    try {
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/voices/${fileName}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'audio/wav'
        },
        body: audioBlob
      });

      if (!uploadRes.ok) throw new Error("Cloud Storage Connection Failed");

      const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/voices/${fileName}`;

      const newRecord = {
        id: 'rec_' + Date.now(),
        user_id: record.user_id,
        text: record.text,
        selection: record.selection,
        timestamp: Date.now(),
        audio_url: audioUrl,
        duration: record.duration,
        status: 'success',
        engine: 'Majd Studio Intelligence',
        rating: 0
      };

      await fetch(`${SUPABASE_URL}/rest/v1/records`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(newRecord)
      });

      return { ...newRecord, audio_data: audioUrl } as any;
    } catch (e: any) {
      throw e;
    }
  }

  async updateRating(recordId: string, rating: number) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/records?id=eq.${recordId}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({ rating })
      });
    } catch (e) {
      console.error("Rating Sync Failed");
    }
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

  async getGlobalStats(): Promise<GlobalStats> {
    try {
      const [recRes, sessRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/records?select=id,duration,rating`, { headers: this.headers }),
        fetch(`${SUPABASE_URL}/rest/v1/sessions?select=country,country_code,browser,os,city`, { headers: this.headers })
      ]);
      
      const records = await recRes.json();
      const sessions = await sessRes.json();

      // التحليل الجغرافي
      const countryMap: any = {};
      const cityMap: any = {};
      const browserMap: any = {};
      const osMap: any = {};

      sessions.forEach((s: any) => {
        if (s.country) {
          countryMap[s.country] = countryMap[s.country] || { count: 0, code: s.country_code };
          countryMap[s.country].count++;
        }
        if (s.city) {
          cityMap[s.city] = (cityMap[s.city] || 0) + 1;
        }
        if (s.browser) browserMap[s.browser] = (browserMap[s.browser] || 0) + 1;
        if (s.os) osMap[s.os] = (osMap[s.os] || 0) + 1;
      });

      const rated = records.filter((r: any) => r.rating > 0);
      const avgRating = rated.length > 0 ? rated.reduce((a: any, b: any) => a + b.rating, 0) / rated.length : 0;

      return {
        total_users: new Set(sessions.map((s: any) => s.user_id)).size || 1,
        total_records: records.length,
        total_visits: sessions.length,
        total_duration: records.reduce((a: any, b: any) => a + (b.duration || 0), 0),
        avg_rating: parseFloat(avgRating.toFixed(1)),
        top_countries: Object.entries(countryMap).map(([name, data]: any) => ({ name, count: data.count, code: data.code })).sort((a, b) => b.count - a.count).slice(0, 10),
        top_browsers: Object.entries(browserMap).map(([name, count]: any) => ({ name, count })).sort((a, b) => b.count - a.count),
        top_os: Object.entries(osMap).map(([name, count]: any) => ({ name, count })).sort((a, b) => b.count - a.count),
        top_cities: Object.entries(cityMap).map(([name, count]: any) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5)
      };
    } catch (e) {
      return { total_users: 0, total_records: 0, total_visits: 0, total_duration: 0, avg_rating: 0, top_countries: [], top_browsers: [], top_os: [], top_cities: [] };
    }
  }
}

export const api = new MajdStudioEngine();
