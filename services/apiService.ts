
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
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  }

  async logSession(userId: string): Promise<SessionLog> {
    const newSession: SessionLog = {
      id: 'sess_' + Date.now(),
      user_id: userId,
      start_time: Date.now(),
      last_active: Date.now(),
      country: "Global",
      country_code: "WW",
      referrer: document.referrer || "Direct",
      browser: navigator.userAgent,
      device: "Standard"
    };

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/sessions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(newSession)
      });
    } catch (e) {
      console.warn("Session Log Sync Failed");
    }
    return newSession;
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

      if (!uploadRes.ok) throw new Error("Storage Upload Failed - Check if 'voices' bucket is Public");

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
        engine: 'Majd Supabase Cloud'
      };

      await fetch(`${SUPABASE_URL}/rest/v1/records`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(newRecord)
      });

      return { ...newRecord, audio_data: audioUrl } as any;
    } catch (e) {
      console.error("Majd Cloud Error:", e);
      throw e;
    }
  }

  async getUserRecords(userId: string): Promise<GenerationRecord[]> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/records?user_id=eq.${userId}&order=timestamp.desc`, {
        headers: this.headers
      });
      const data = await res.json();
      return Array.isArray(data) ? data.map((r: any) => ({ ...r, audio_data: r.audio_url })) : [];
    } catch (e) {
      return [];
    }
  }

  async getAllRecords(): Promise<GenerationRecord[]> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/records?order=timestamp.desc&limit=20`, {
        headers: this.headers
      });
      const data = await res.json();
      return Array.isArray(data) ? data.map((r: any) => ({ ...r, audio_data: r.audio_url })) : [];
    } catch (e) {
      return [];
    }
  }

  async getGlobalStats(): Promise<GlobalStats> {
    try {
      const [recRes, sessRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/records?select=id,duration`, { headers: this.headers }),
        fetch(`${SUPABASE_URL}/rest/v1/sessions?select=user_id`, { headers: this.headers })
      ]);
      
      const records = await recRes.json();
      const sessions = await sessRes.json();
      const uniqueUsers = new Set(sessions.map((s: any) => s.user_id)).size || 1;

      return {
        total_users: uniqueUsers,
        total_records: records.length,
        total_duration: records.reduce((acc: number, curr: any) => acc + (curr.duration || 0), 0),
        success_rate: 100,
        avg_voices_per_user: records.length / uniqueUsers,
        avg_session_duration: 10,
        top_countries: [],
        top_sources: [],
        device_stats: {}
      };
    } catch (e) {
      return { total_users: 0, total_records: 0, total_duration: 0, success_rate: 0, avg_voices_per_user: 0, avg_session_duration: 0, top_countries: [], top_sources: [], device_stats: {} };
    }
  }
}

export const api = new MajdStudioEngine();
