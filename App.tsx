
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DIALECTS, VOICE_TYPES, STUDIO_CONTROLS, getBaseVoiceForType, VoiceProfile } from './constants';
import { GenerationRecord, VoiceControls, GlobalStats } from './types';
import { majdService } from './services/geminiService';
import { api } from './services/apiService';

const WAITING_MESSAGES = [
  "نجهز طبقات الصوت في استوديو Majd..",
  "جاري إنتاج المخطوطة الصوتية بأعلى جودة..",
  "مهندس الصوت الذكي يقوم بالمكساج حالياً..",
  "ثواني ويكون صوتك الاحترافي جاهزاً..",
  "Majd يقوم بضبط الأداء الدرامي للنص..",
  "بنسخن الأحبال الصوتية الرقمية..",
  "عملية المعالجة السحابية قاربت على الانتهاء..",
  "استعد لسماع النتيجة المبهرة.."
];

const StatCard: React.FC<{ label: string, value: string | number, icon?: string }> = ({ label, value, icon }) => (
  <div className="admin-card p-6 rounded-3xl space-y-2">
    <div className="flex justify-between items-start">
      <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">{label}</span>
      <span className="text-cyan-400">{icon}</span>
    </div>
    <div className="text-3xl font-black text-white">{value}</div>
  </div>
);

const SelectionBlock: React.FC<{ 
  title: string; 
  options: { label: string; icon?: string | React.ReactNode }[]; 
  current: string; 
  set: (s: string) => void; 
}> = ({ title, options, current, set }) => (
  <div className="w-full space-y-4">
    <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-[0.4em] text-center mb-4">{title}</h3>
    <div className="flex flex-wrap justify-center gap-3">
      {options.map(opt => (
        <button 
          key={opt.label} 
          onClick={() => set(opt.label)} 
          className={`px-6 py-4 rounded-2xl border transition-all duration-300 text-sm font-bold flex flex-col items-center gap-2 min-w-[100px] ${current === opt.label ? 'brand-bg text-white shadow-lg scale-105' : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'}`}
        >
          {opt.icon && <div className="text-2xl mb-1 flex items-center justify-center">{opt.icon}</div>}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  </div>
);

const ControlGroup: React.FC<{ title: string; options: { label: string; desc: string }[]; current: string; onChange: (val: string) => void; }> = ({ title, options, current, onChange }) => (
  <div className="space-y-4 text-right group">
    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{title}</label>
    <div className="grid grid-cols-1 gap-2">
      {options.map(opt => (
        <button key={opt.label} onClick={() => onChange(opt.label)} className={`relative p-4 rounded-xl border text-right transition-all ${current === opt.label ? 'border-indigo-500/50 bg-indigo-500/10 text-white' : 'border-white/5 bg-white/5 text-white/30 hover:bg-white/10'}`}>
          <div className="text-xs font-bold mb-1">{opt.label}</div>
          <p className="text-[9px] opacity-30 leading-relaxed">{opt.desc}</p>
        </button>
      ))}
    </div>
  </div>
);

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState<boolean>(() => sessionStorage.getItem('majd_intro') !== 'true');
  const [isAdminView, setIsAdminView] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [globalRecords, setGlobalRecords] = useState<GenerationRecord[]>([]);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [userId] = useState(() => {
    let id = localStorage.getItem('majd_uid');
    if (!id) { id = 'MAJD_USER_' + Math.random().toString(36).substr(2, 6); localStorage.setItem('majd_uid', id); }
    return id;
  });

  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [selectedDialectId, setSelectedDialectId] = useState<string>(DIALECTS[0].id);
  const [selectedAge, setSelectedAge] = useState<string>(VOICE_TYPES[0]);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male');
  const [selectedProfile, setSelectedProfile] = useState<VoiceProfile | null>(null);
  
  const [voiceControls, setVoiceControls] = useState<VoiceControls>({ temp: 'دافئ', emotion: 'متوسط', speed: 'متوسطة', depth: 'متوسطة', pitch: 'متوسطة', drama: 'متوسط' });
  
  const [inputText, setInputText] = useState<string>('');
  const [refinedText, setRefinedText] = useState<string>('');
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(WAITING_MESSAGES[0]);
  const [currentResult, setCurrentResult] = useState<GenerationRecord | null>(null);

  const availableProfiles = useMemo(() => {
    const dialect = DIALECTS.find(d => d.id === selectedDialectId);
    if (!dialect) return [];
    const filtered = dialect.profiles.filter(p => p.voiceType === selectedAge && p.gender === selectedGender);
    return filtered.length > 0 ? filtered : dialect.profiles;
  }, [selectedDialectId, selectedAge, selectedGender]);

  useEffect(() => {
    if (availableProfiles.length > 0) {
      if (!selectedProfile || !availableProfiles.find(p => p.name === selectedProfile.name)) {
        setSelectedProfile(availableProfiles[0]);
      }
    }
  }, [availableProfiles]);

  useEffect(() => {
    if (showIntro) { setTimeout(() => { sessionStorage.setItem('majd_intro', 'true'); setShowIntro(false); }, 2500); }
    const init = async () => {
      try {
        await api.logSession(userId);
        const records = await api.getUserRecords(userId);
        setHistory(records);
      } catch (e) { console.warn("Cloud connection error"); }
    };
    init();
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, [userId]);

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      let idx = 0;
      interval = setInterval(() => {
        idx = (idx + 1) % WAITING_MESSAGES.length;
        setLoadingMessage(WAITING_MESSAGES[idx]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const toggleAudio = (id: string, url: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(url);
      audioRef.current.play().catch(() => alert("تأكد أن الـ Bucket 'voices' في Supabase عام (Public)."));
      setPlayingId(id);
      audioRef.current.onended = () => setPlayingId(null);
    }
  };

  const handleImproveText = async () => {
    if (!inputText.trim()) return;
    setIsPreprocessing(true);
    try {
      const refined = await majdService.preprocessText(inputText, { 
        dialect: DIALECTS.find(d => d.id === selectedDialectId)?.title || 'فصحى', 
        field: selectedProfile?.category || 'General', 
        personality: 'Professional' 
      });
      setRefinedText(refined);
    } catch (e) { alert("تعذر التحسين حالياً."); }
    finally { setIsPreprocessing(false); }
  };

  const handleGenerate = async () => {
    const textToUse = refinedText || inputText;
    if (!textToUse.trim() || !selectedProfile) {
      alert("يرجى إدخال النص واختيار المعلق.");
      return;
    }

    setIsGenerating(true);
    setCurrentResult(null); 
    try {
      const baseVoice = getBaseVoiceForType(selectedProfile.voiceType, selectedProfile.gender);
      const { dataUrl, duration } = await majdService.generateVoiceOver(
        textToUse, 
        baseVoice, 
        `بصوت ${selectedProfile.name} - تحكم: ${JSON.stringify(voiceControls)}`
      );
      
      const record = await api.saveRecord({
        text: textToUse, 
        user_id: userId,
        selection: { 
          dialect: DIALECTS.find(d => d.id === selectedDialectId)?.title || '', 
          type: selectedAge, 
          field: selectedProfile.category, 
          controls: voiceControls 
        },
        audio_data: dataUrl, 
        duration: duration
      });

      setCurrentResult(record); 
      setHistory(prev => [record, ...prev]);

    } catch (e: any) { 
      console.error("Cloud Error:", e);
      alert("خطأ في الربط السحابي. تأكد من إعدادات Supabase Storage."); 
    }
    finally { setIsGenerating(false); }
  };

  const handleAdminAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (password === '41414141') {
      setIsRefreshing(true);
      try {
        const gStats = await api.getGlobalStats();
        const allRecords = await api.getAllRecords();
        setStats(gStats);
        setGlobalRecords(allRecords);
        setIsAdminView(true);
        setShowLogin(false);
      } catch(e) { alert("فشل جلب البيانات السحابية"); }
      setIsRefreshing(false);
    } else alert("الرمز غير صحيح");
  };

  if (showIntro) return (
    <div className="fixed inset-0 z-[500] bg-[#020617] flex items-center justify-center font-montserrat">
      <div className="text-center animate-pulse">
        <h1 className="tech-logo text-7xl md:text-9xl">Majd</h1>
        <p className="text-white/20 text-[10px] tracking-[1.5em] mt-8 uppercase font-bold">THE ULTIMATE VOICE STUDIO</p>
      </div>
    </div>
  );

  if (isAdminView && stats) return (
    <div className="min-h-screen bg-[#020617] text-white p-10 md:p-20 font-arabic">
      <header className="flex justify-between items-center mb-16">
        <div>
          <h1 className="text-4xl font-black brand-text">Majd Dashboard</h1>
          <p className="text-white/40 text-[10px] uppercase tracking-widest mt-2">SUPABASE CLOUD INFRASTRUCTURE</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleAdminAuth} disabled={isRefreshing} className="px-8 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold">تحديث 🔄</button>
          <button onClick={() => setIsAdminView(false)} className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold">العودة للاستوديو</button>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard label="إجمالي المستخدمين" value={stats.total_users} icon="👥" />
        <StatCard label="إجمالي المقاطع" value={stats.total_records} icon="🎙️" />
        <StatCard label="ساعات الإنتاج" value={(stats.total_duration / 3600).toFixed(2)} icon="📊" />
        <StatCard label="حالة السحاب" value="CONNECTED" icon="⚡" />
      </div>

      <div className="admin-card p-10 rounded-[40px] space-y-8 overflow-hidden">
        <h3 className="text-xl font-bold border-b border-white/5 pb-4">أحدث العمليات السحابية</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[700px]">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase tracking-wider border-b border-white/5">
                <th className="pb-4 font-bold">التاريخ</th>
                <th className="pb-4 font-bold">المستخدم</th>
                <th className="pb-4 font-bold">النص</th>
                <th className="pb-4 font-bold">التحكم</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {globalRecords.map((rec) => (
                <tr key={rec.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-4 text-[10px] opacity-40">{new Date(rec.timestamp).toLocaleString('ar-EG')}</td>
                  <td className="py-4 font-mono text-[10px] text-cyan-400">{rec.user_id}</td>
                  <td className="py-4 truncate max-w-[200px] opacity-60">"{rec.text}"</td>
                  <td className="py-4 flex gap-2">
                      <button onClick={() => toggleAudio(rec.id, rec.audio_data)} className="h-8 w-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">▶</button>
                      <a href={rec.audio_data} target="_blank" className="h-8 w-8 rounded-lg bg-white/5 text-white/40 flex items-center justify-center">↓</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center py-20 px-6 font-arabic relative">
      {isGenerating && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
          <h2 className="tech-logo text-6xl md:text-8xl animate-pulse">Majd</h2>
          <div className="glass-3d p-8 rounded-3xl border-cyan-500/30 max-w-lg mt-12">
            <p className="text-2xl font-black text-white">{loadingMessage}</p>
          </div>
        </div>
      )}

      <div className="fixed top-8 left-8 z-50">
        <button onClick={() => setShowLogin(true)} className="px-6 py-3 rounded-2xl glass-3d border border-cyan-500/20 text-cyan-400 font-bold text-[10px] uppercase tracking-widest">Admin Access</button>
      </div>

      {showLogin && (
        <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <form onSubmit={handleAdminAuth} className="glass-3d w-full max-w-md p-12 rounded-[50px] text-center space-y-8">
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="رمز المرور السحابي" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 text-center text-2xl focus:outline-none" />
            <button className="w-full brand-bg py-5 rounded-2xl font-bold">دخول المدير</button>
            <button type="button" onClick={()=>setShowLogin(false)} className="text-white/20 text-xs">إلغاء</button>
          </form>
        </div>
      )}

      <header className="mb-24 text-center">
        <h1 className="tech-logo text-7xl md:text-9xl mb-4">Majd</h1>
        <p className="text-white/30 text-[10px] uppercase tracking-[1em] font-bold">Arabic Voice Over Studio Pro</p>
      </header>

      <main className="w-full max-w-6xl space-y-16">
        <section className="glass-3d p-12 rounded-[50px] space-y-12">
          <SelectionBlock title="اختيار اللهجة" options={DIALECTS.map(d => ({ label: d.title, icon: d.flag }))} current={DIALECTS.find(d => d.id === selectedDialectId)?.title || ''} set={(t) => setSelectedDialectId(DIALECTS.find(d => d.title === t)?.id || DIALECTS[0].id)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-white/5 pt-12">
            <SelectionBlock title="نوع الصوت" options={VOICE_TYPES.map(t => ({ label: t }))} current={selectedAge} set={setSelectedAge} />
            <SelectionBlock title="الجنس" options={[{ label: 'ذكر' }, { label: 'أنثى' }]} current={selectedGender === 'male' ? 'ذكر' : 'أنثى'} set={(g) => setSelectedGender(g === 'ذكر' ? 'male' : 'female')} />
          </div>
          <div className="space-y-6 pt-12 border-t border-white/5">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {availableProfiles.map(profile => (
                <button key={profile.name} onClick={() => setSelectedProfile(profile)} className={`p-4 rounded-2xl border transition-all text-center space-y-2 ${selectedProfile?.name === profile.name ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 bg-white/5'}`}>
                  <div className="text-xs font-bold truncate">{profile.name}</div>
                  <div className="text-[9px] opacity-30">{profile.category}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-white/5">
            {Object.entries(STUDIO_CONTROLS).map(([k, c]) => (
              <ControlGroup key={k} title={c.title} options={c.options} current={(voiceControls as any)[k]} onChange={v => setVoiceControls(prev => ({...prev, [k]: v}))} />
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative glass-3d rounded-[40px] p-12">
               <textarea className="w-full h-64 bg-transparent text-xl text-white/40 text-right outline-none resize-none" placeholder="اكتب النص الخام هنا..." value={inputText} onChange={e => setInputText(e.target.value)} />
               <button onClick={handleImproveText} className="absolute bottom-8 left-8 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-cyan-500 transition-all font-bold text-xs">تحسين بذكاء Majd ✨</button>
            </div>
            <div className={`relative glass-3d rounded-[40px] p-12 border-cyan-500/20 ${refinedText ? 'opacity-100' : 'opacity-30'}`}>
               <textarea className="w-full h-64 bg-transparent text-xl text-white text-right outline-none resize-none" placeholder="النص المحسن سيظهر هنا..." value={refinedText} onChange={e => setRefinedText(e.target.value)} />
            </div>
          </div>
          <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-8 rounded-[35px] brand-bg text-white text-xl font-black shadow-2xl hover:scale-[1.01] transition-all">
            {isGenerating ? 'جاري الإنتاج والرفع للسحاب...' : 'توليد ورفع الصوت للاستوديو'}
          </button>
        </section>

        {currentResult && (
          <div className="glass-3d p-10 rounded-[40px] border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-6">
              <button onClick={() => toggleAudio(currentResult.id, currentResult.audio_data)} className={`h-20 w-20 rounded-full brand-bg flex items-center justify-center text-white shadow-xl ${playingId === currentResult.id ? 'bg-rose-600' : ''}`}>
                {playingId === currentResult.id ? "Pause" : "Play"}
              </button>
              <div className="text-right"><h4 className="text-xl font-black">جاهز للتحميل</h4><p className="text-white/40 text-sm">{currentResult.duration.toFixed(1)}s | Majd Cloud Hosting</p></div>
            </div>
            <a href={currentResult.audio_data} download target="_blank" className="px-12 py-6 rounded-[28px] brand-bg text-white font-black hover:brightness-110 shadow-2xl transition-all">تحميل المقطع</a>
          </div>
        )}

        <section className="glass-3d p-12 rounded-[50px] space-y-8">
          <h3 className="text-xl font-bold flex justify-between items-center"><span>سجل الإنتاج السحابي</span> <span className="text-[10px] opacity-20">تخزين دائم في Supabase</span></h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {history.map((rec) => (
              <div key={rec.id} className="p-6 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between group">
                <div className="flex gap-3">
                  <button onClick={() => toggleAudio(rec.id, rec.audio_data)} className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center hover:bg-cyan-500 hover:text-white transition-all">{playingId === rec.id ? "■" : "▶"}</button>
                </div>
                <div className="text-right flex-1 truncate ml-4">
                  <p className="text-sm truncate">"{rec.text}"</p>
                  <span className="text-[10px] opacity-20">{new Date(rec.timestamp).toLocaleDateString('ar-EG')} | {rec.selection.dialect}</span>
                </div>
              </div>
            ))}
            {history.length === 0 && <div className="py-10 text-center opacity-20 text-xs">لا توجد تسجيلات سحابية متاحة حالياً.</div>}
          </div>
        </section>
      </main>
      <footer className="mt-40 text-center opacity-10 text-[10px] uppercase font-black tracking-[1em] pb-10">Majd STUDIO VO • POWERED BY SUPABASE</footer>
    </div>
  );
};

export default App;
