
import { GenerationRecord, UserProfile, GlobalStats } from '../types';

/**
 * MAJD DYNAMIC CLOUD ENGINE (v4)
 * This simulates a real-time database where multiple users interact.
 */

class MajdCloudEngine {
  private db: {
    records: GenerationRecord[],
    users: UserProfile[],
    sessions: number
  } = {
    records: [],
    users: [],
    sessions: 0
  };

  constructor() {
    const saved = localStorage.getItem('majd_studio_cloud_v4');
    if (saved) {
      this.db = JSON.parse(saved);
    } else {
      this.generateInitialTraffic();
    }
    
    // Start simulating dynamic traffic (New users appearing every 30-60 seconds)
    this.startLiveSimulation();
  }

  private generateInitialTraffic() {
    const locations = ['القاهرة', 'الرياض', 'دبي', 'بغداد', 'عمان', 'الدار البيضاء'];
    const names = ['أحمد_VO', 'Sora_Studio', 'معلق_الخليج', 'نور_صوت', 'Karim_Creative'];
    
    this.db.sessions = Math.floor(Math.random() * 50) + 10;
    
    // Seed initial global records
    for (let i = 0; i < 15; i++) {
      const user = names[i % names.length] + '_' + Math.floor(Math.random() * 100);
      this.db.records.push(this.createMockRecord(user, locations[i % locations.length]));
    }
    this.save();
  }

  private createMockRecord(userId: string, location: string): GenerationRecord {
    const scripts = [
      "أهلاً بكم في عالم الإبداع الصوتي.",
      "تخفيضات هائلة بمناسبة الافتتاح، لا تفوتوا الفرصة!",
      "في قديم الزمان، كان هناك ملك عادل يحكم البلاد.",
      "البودكاست التقني الأول في الوطن العربي.",
      "هذا التسجيل تم معالجته بتقنيات مجد السحابية."
    ];
    return {
      id: 'cloud_' + Math.random().toString(36).substr(2, 6),
      user_id: `${userId} (${location})`,
      text: scripts[Math.floor(Math.random() * scripts.length)],
      selection: {
        dialect: 'منوع',
        type: 'بالغ',
        field: 'Cloud Live',
        controls: { temp: 'دافئ', emotion: 'متوسط', speed: 'متوسطة', depth: 'متوسطة', pitch: 'متوسطة', drama: 'متوسط' }
      },
      timestamp: Date.now() - (Math.random() * 86400000),
      audio_url: '#', // In production, this points to real S3 storage
      duration: Math.random() * 10 + 2,
      status: 'success',
      engine: 'Majd Cloud v4'
    };
  }

  private startLiveSimulation() {
    // Add a new "Remote User" record every minute to simulate live traffic
    setInterval(() => {
      const locations = ['بيروت', 'الكويت', 'تونس', 'مسقط'];
      const user = 'Global_User_' + Math.floor(Math.random() * 1000);
      const newRecord = this.createMockRecord(user, locations[Math.floor(Math.random() * locations.length)]);
      this.db.records.unshift(newRecord);
      this.db.sessions += 1;
      this.save();
    }, 45000); 
  }

  private save() {
    localStorage.setItem('majd_studio_cloud_v4', JSON.stringify(this.db));
  }

  async handle(endpoint: string, method: string, body?: any): Promise<any> {
    await new Promise(r => setTimeout(r, 600)); // Network delay

    if (endpoint === '/api/stats') {
      const records = this.db.records;
      const totalDur = records.reduce((acc, r) => acc + r.duration, 0);
      return {
        total_users: this.db.sessions + 5,
        total_records: records.length,
        total_duration: totalDur,
        success_rate: 99.9,
        top_dialects: { 'مصرية': 45, 'خليجية': 30, 'فصحى': 25 },
        records_by_day: {}
      };
    }

    if (endpoint === '/api/records') {
      if (body?.isAdmin) return this.db.records;
      return this.db.records.filter(r => r.user_id === body.userId);
    }

    if (endpoint === '/api/records/save') {
      const record = { ...body, timestamp: Date.now(), status: 'success' };
      this.db.records.unshift(record);
      this.save();
      return record;
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
