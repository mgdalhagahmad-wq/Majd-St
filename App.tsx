
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DIALECTS, VOICE_TYPES, STUDIO_CONTROLS, getBaseVoiceForType } from './constants';
import { GenerationRecord, VoiceControls, UserProfile, GlobalStats } from './types';
import { majdService } from './services/geminiService';
import { api } from './services/apiService';

// --- Sub-Components ---

const SelectionBlock: React.FC<{ title: string; options: string[]; current: string; set: (s: string) => void; }> = ({ title, options, current, set }) => (
  <div className="w-full space-y-6">
    <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-[0.4em] text-center mb-8">{title}</h3>
    <div className="flex flex-wrap justify-center gap-4">
      {options.map(opt => (
        <button key={opt} onClick={() => set(opt)} className={`px-10 py-4 rounded-[22px] border transition-all duration-500 text-sm font-bold shadow-sm ${current === opt ? 'brand-bg text-white scale-105 shadow-indigo-500/30' : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80'}`}>{opt}</button>
      ))}
    </div>
  </div>
);

const ControlGroup: React.FC<{ id: string; title: string; options: { label: string; desc: string }[]; current: string; onChange: (val: string) => void; }> = ({ id, title, options, current, onChange }) => (
  <div className="space-y-4 text-right group">
    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] group-hover:text-cyan-500/50 transition-colors">{title}</label>
    <div className="grid grid-cols-1 gap-3">
      {options.map(opt => (
        <button key={opt.label} onClick={() => onChange(opt.label)} className={`relative p-5 rounded-2xl border text-right transition-all duration-500 overflow-hidden ${current === opt.label ? 'border-indigo-500/50 bg-indigo-500/10 text-white shadow-lg' : 'border-white/5 bg-white/5 text-white/30 hover:bg-white/10 hover:border-white/10'}`}>
          {current === opt.label && <div className="absolute top-0 right-0 w-1.5 h-full bg-cyan-400"></div>}
          <div className="flex justify-between items-center mb-1 flex-row-reverse"><span className={`text-sm font-bold ${current === opt.label ? 'text-cyan-400' : 'text-white/60'}`}>{opt.label}</span></div>
          <p className="text-[10px] text-white/30 leading-relaxed line-clamp-2">{opt.desc}</p>
        </button>
      ))}
    </div>
  </div>
);

const AdminDashboard: React.FC<{ 
  onClose: () => void, 
  stats: GlobalStats | null,
  records: GenerationRecord[],
  onRefresh: () => void
}> = ({ onClose, stats, records, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'records'>('overview');
  const [filter, setFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => { onRefresh(); }, 15000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const filteredRecords = records.filter(r => 
    r.text.toLowerCase().includes(filter.toLowerCase()) || 
    r.user_id?.toLowerCase().includes(filter.toLowerCase()) ||
    r.selection?.dialect?.includes(filter)
  );

  return (
    <div className="fixed inset-0 z-[200] bg-[#020617] p-4 md:p-12 overflow-y-auto font-arabic animate-in fade-in duration-500" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-10 pb-20">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-white/5 pb-8 gap-6">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-3xl font-bold tech-logo">Majd GLOBAL MONITOR</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
                <p className="text-cyan-400 text-[10px] uppercase font-black tracking-widest">Global Cloud Sync: ACTIVE</p>
              </div>
            </div>
            <button onClick={handleRefresh} className={`p-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
          
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
            {['overview', 'records'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-10 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'brand-bg text-white shadow-xl scale-105' : 'text-white/30 hover:text-white/60'}`}>
                {tab === 'overview' ? 'إحصائيات العالم' : 'سجل كافة المستخدمين'}
              </button>
            ))}
          </div>

          <button onClick={onClose} className="p-4 px-10 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs uppercase tracking-widest">خروج آمن</button>
        </div>

        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { label: 'إجمالي المستخدمين عالمياً', val: stats.total_users, sub: 'Global Connections', icon: '' },
              { label: 'إجمالي التسجيلات السحابية', val: stats.total_records, sub: 'Cloud Store Entries', icon: '' },
              { label: 'ساعات المعالجة الكلية', val: (stats.total_duration / 3600).toFixed(2), sub: 'Mastered Hours', icon: '' },
              { label: 'استقرار السيرفر العالمي', val: stats.success_rate + '%', sub: 'Uptime 24/7', icon: '' },
            ].map((card, i) => (
              <div key={i} className="glass-3d p-10 rounded-[45px] border-white/5 group">
                <h4 className="text-5xl font-black text-white mb-2">{card.val}</h4>
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{card.label}</p>
                <div className="mt-6 pt-6 border-t border-white/5">
                   <p className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'records' && (
          <div className="space-y-8">
             <div className="glass-3d p-8 rounded-[35px] border-cyan-500/20 flex items-center gap-6">
                <input 
                  type="text" 
                  placeholder="ابحث عن تسجيل معين أو مستخدم محدد في القاعدة العالمية..." 
                  className="flex-1 bg-transparent border-none outline-none text-white text-right font-arabic text-2xl"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                />
             </div>
             <div className="grid grid-cols-1 gap-6">
              {records.length > 0 ? filteredRecords.map(r => (
                <div key={r.id} className="glass-3d p-10 rounded-[50px] flex flex-col lg:flex-row items-center justify-between gap-10 border-white/5 hover:border-cyan-500/40 transition-all">
                  <div className="text-right flex-1 space-y-6">
                    <div className="flex items-center gap-4 flex-row-reverse flex-wrap">
                      <span className="px-5 py-2 rounded-2xl bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">{r.selection?.dialect || 'غير محدد'}</span>
                      <span className="px-5 py-2 rounded-2xl bg-green-500/10 text-green-400 text-[10px] font-black border border-green-500/20">USER: {r.user_id}</span>
                    </div>
                    <p className="text-2xl text-white font-arabic leading-relaxed">"{r.text}"</p>
                  </div>
                  <div className="flex items-center gap-6 bg-black/40 p-8 rounded-[40px] border border-white/5">
                    <button 
                      onClick={() => { if(r.audio_url) { const a = new Audio(r.audio_url); a.play(); } }} 
                      className="h-20 w-20 rounded-full brand-bg text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                    >
                      <svg className="w-10 h-10 translate-x-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                  </div>
                </div>
              )) : (
                <div className="py-40 text-center opacity-10">
                   <p className="text-3xl font-black uppercase tracking-[0.6em]">No Records in Cloud</p>
                </div>
              )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PasswordModal: React.FC<{ onVerify: () => void, onClose: () => void, isLoading: boolean }> = ({ onVerify, onClose, isLoading }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '41414141') onVerify(); else { setError(true); setTimeout(() => setError(false), 1000); }
  };
  return (
    <>
      <div className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-3xl" />
      <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[300] w-full max-w-lg p-6 font-arabic ${error ? 'animate-shake' : ''}`}>
        <div className="glass-3d p-16 rounded-[60px] text-center space-y-12 border-white/20">
          <div className="w-24 h-24 brand-bg rounded-[35px] mx-auto flex items-center justify-center text-white shadow-[0_0_80px_rgba(139,92,246,0.6)]"><svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
          <div className="space-y-4">
             <h2 className="text-3xl font-black text-white">بوابة التحكم العالمية</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-8">
            <input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-3xl py-7 text-center text-4xl tracking-[0.8em] text-cyan-400 font-mono focus:outline-none" placeholder="••••" />
            <button type="submit" disabled={isLoading} className="w-full brand-bg text-white font-black py-6 rounded-3xl text-xl">{isLoading ? 'Connecting...' : 'فتح البوابة'}</button>
            <button type="button" onClick={onClose} className="text-white/20 text-xs hover:text-white">إغلاق</button>
          </form>
        </div>
      </div>
    </>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState<boolean>(() => sessionStorage.getItem('majd_intro_played') !== 'true');
  const [showAdmin, setShowAdmin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [allRecords, setAllRecords] = useState<GenerationRecord[]>([]);

  const [selectedDialectId, setSelectedDialectId] = useState<string>(DIALECTS[0].id);
  const [selectedType, setSelectedType] = useState<string>(VOICE_TYPES[0]);
  const [selectedGender, setSelectedGender] = useState<string>('ذكر');
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [voiceControls, setVoiceControls] = useState<VoiceControls>({ temp: 'دافئ', emotion: 'متوسط', speed: 'متوسطة', depth: 'متوسطة', pitch: 'متوسطة', drama: 'متوسط' });
  
  const [inputText, setInputText] = useState<string>('');
  const [processedText, setProcessedText] = useState<string>('');
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<GenerationRecord | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const userId = useMemo(() => {
    let id = localStorage.getItem('majd_global_user_id');
    if (!id) {
      id = 'User_' + Math.random().toString(36).substr(2, 6);
      localStorage.setItem('majd_global_user_id', id);
    }
    return id;
  }, []);

  useEffect(() => {
    if (showIntro) {
      const t = setTimeout(() => { sessionStorage.setItem('majd_intro_played', 'true'); setShowIntro(false); }, 3500);
      return () => clearTimeout(t);
    }
  }, [showIntro]);

  const fetchUserData = async () => {
    const records = await api.getUserRecords(userId);
    setHistory(records);
  };

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const loadAdminData = async () => {
    setIsAdminLoading(true);
    try {
      const [stats, all] = await Promise.all([api.getGlobalStats(), api.getAllRecordsAdmin()]);
      setGlobalStats(stats); 
      setAllRecords(all); 
      setShowAdmin(true); 
      setIsVerifying(false);
    } catch (e) {
      alert("فشل في جلب البيانات من السحاب. تأكد من إعدادات JSONBin.");
    } finally { setIsAdminLoading(false); }
  };

  const selectedDialect = DIALECTS.find(d => d.id === selectedDialectId) || DIALECTS[0];
  const filteredProfiles = useMemo(() => {
    const profiles = selectedType === 'كبار السن' ? DIALECTS.flatMap(d => d.profiles) : selectedDialect.profiles;
    return profiles.filter((p, index, self) => {
      if (self.findIndex(t => t.name === p.name) !== index) return false;
      return p.voiceType === selectedType && p.gender === (selectedGender === 'ذكر' ? 'male' : 'female');
    });
  }, [selectedType, selectedDialect, selectedGender]);

  const handlePreprocess = async () => {
    if (!inputText.trim()) return;
    setIsPreprocessing(true);
    try {
      const refined = await majdService.preprocessText(inputText, { dialect: selectedDialect.title, field: 'عام', personality: selectedVoiceName || 'محترف' });
      setProcessedText(refined);
    } finally { setIsPreprocessing(false); }
  };

  const handleGenerate = async () => {
    const textToUse = processedText || inputText;
    if (!textToUse.trim()) return;
    setIsGenerating(true);
    try {
      const baseVoice = getBaseVoiceForType(selectedType, selectedGender === 'ذكر' ? 'male' : 'female');
      const { url, duration } = await majdService.generateVoiceOver(textToUse, baseVoice, JSON.stringify(voiceControls));
      
      const record = await api.saveRecord({
        text: textToUse,
        user_id: userId,
        selection: { dialect: selectedDialect.title, type: selectedType, field: 'Global Studio', controls: voiceControls },
        audio_url: url,
        duration: duration
      });
      
      setCurrentResult(record); 
      setHistory(prev => [record, ...prev]);
      if (audioRef.current) { audioRef.current.src = url; audioRef.current.play(); setIsPlaying(true); }
    } catch (e) {
      console.error("Generation Error:", e);
      alert("حدث خطأ في توليد الصوت. تأكد من مفتاح الـ API.");
    } finally { setIsGenerating(false); }
  };

  if (showIntro) return (
    <div className="fixed inset-0 z-[500] bg-[#020617] flex items-center justify-center font-montserrat">
      <div className="text-center animate-in fade-in zoom-in duration-1000">
        <h1 className="tech-logo text-7xl md:text-9xl">Majd</h1>
        <p className="text-white/20 text-xs tracking-[1.5em] uppercase font-bold animate-pulse mt-8">CLOUD SYNC ACTIVE</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center py-20 px-6 font-arabic relative overflow-x-hidden" dir="rtl">
      {isVerifying && <PasswordModal onVerify={loadAdminData} onClose={() => setIsVerifying(false)} isLoading={isAdminLoading} />}
      {showAdmin && <AdminDashboard stats={globalStats} records={allRecords} onRefresh={loadAdminData} onClose={() => setShowAdmin(false)} />}

      <div className="fixed top-8 left-8 z-50">
        <button onClick={() => setIsVerifying(true)} className="px-6 py-3 rounded-2xl glass-3d border border-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          البوابة العالمية
        </button>
      </div>

      <header className="mb-24 text-center z-10">
        <h1 className="tech-logo text-6xl md:text-8xl mb-4">Majd</h1>
        <p className="text-white/30 text-[10px] uppercase tracking-[1em] font-bold">Cloud Audio Studio</p>
      </header>

      <main className="w-full max-w-5xl space-y-24 z-10">
        <section className="glass-3d p-16 rounded-[50px]">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.4em] text-center mb-16">١. اختيار الهوية اللغوية</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DIALECTS.map(d => (
              <button key={d.id} onClick={() => setSelectedDialectId(d.id)} className={`p-8 rounded-[35px] text-right border-2 transition-all ${selectedDialectId === d.id ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-white/5 bg-white/5'}`}>
                <h4 className="text-xl font-bold mb-2">{d.title}</h4>
                <p className="text-[10px] text-white/30">{d.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-3d p-16 rounded-[50px] space-y-16">
           <SelectionBlock title="٢. الهوية العمرية" options={VOICE_TYPES} current={selectedType} set={setSelectedType} />
           <div className="flex justify-center gap-6">
              {['ذكر', 'أنثى'].map(g => (
                <button key={g} onClick={() => setSelectedGender(g)} className={`px-12 py-4 rounded-full border-2 font-bold text-sm ${selectedGender === g ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-white/5 bg-white/5 text-white/30'}`}>{g}</button>
              ))}
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {filteredProfiles.map(p => (
                <button key={p.name} onClick={() => setSelectedVoiceName(p.name)} className={`p-6 rounded-[35px] border-2 transition-all text-center ${selectedVoiceName === p.name ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/5 bg-white/5'}`}>
                  <p className="font-bold text-sm">{p.name}</p>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest">{p.category}</p>
                </button>
              ))}
           </div>
        </section>

        <section className="glass-3d p-16 rounded-[50px]">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.4em] text-center mb-16">٣. غرفة المعالجة الهندسية</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {Object.entries(STUDIO_CONTROLS).map(([k, c]) => (
              <ControlGroup key={k} id={k} title={c.title} options={c.options} current={(voiceControls as any)[k]} onChange={v => setVoiceControls(prev => ({...prev, [k]: v}))} />
            ))}
          </div>
        </section>

        <section className="glass-3d p-16 rounded-[50px] space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <textarea className="w-full h-64 bg-black/40 border border-white/5 rounded-[40px] p-8 text-xl text-white outline-none text-right" placeholder="اكتب النص الأساسي هنا..." value={inputText} onChange={e => setInputText(e.target.value)} />
            <textarea className="w-full h-64 bg-indigo-500/5 border border-indigo-500/10 rounded-[40px] p-8 text-xl text-indigo-100 outline-none text-right" placeholder="المخطوطة النهائية المعدلة..." value={processedText} readOnly />
          </div>
          <button onClick={handlePreprocess} disabled={isPreprocessing || !inputText.trim()} className="w-full py-5 rounded-[25px] border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-bold tracking-[0.4em] uppercase">
            {isPreprocessing ? 'جاري التحسين...' : 'تحسين المخطوطة'}
          </button>
        </section>

        <section className="flex justify-center pb-20">
          <button onClick={handleGenerate} disabled={isGenerating || !inputText.trim()} className={`w-full max-w-2xl py-12 rounded-full font-bold text-2xl flex items-center justify-center gap-6 shadow-3xl ${isGenerating ? 'bg-white/5 text-white/20' : 'brand-bg text-white'}`}>
            {isGenerating ? 'جاري التوليد السحابي...' : 'بدء توليد الأداء (Cloud Master)'}
          </button>
        </section>

        {currentResult && (
          <section className="glass-3d p-16 rounded-[60px] border-cyan-500/20 text-center space-y-12">
             <h3 className="text-4xl font-bold brand-text">MASTER OUTPUT READY</h3>
             <div className="w-full max-w-2xl p-12 rounded-[50px] bg-black/50 mx-auto space-y-10">
                <button onClick={() => { if(isPlaying) audioRef.current?.pause(); else audioRef.current?.play(); setIsPlaying(!isPlaying); }} className="h-24 w-24 rounded-full brand-bg text-white flex items-center justify-center mx-auto">
                   {isPlaying ? 'Pause' : 'Play'}
                </button>
             </div>
          </section>
        )}
      </main>

      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
    </div>
  );
};

export default App;
