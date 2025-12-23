
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
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'traffic'>('overview');
  const [filter, setFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => { onRefresh(); }, 15000); // Auto-sync live feed every 15s
    return () => clearInterval(interval);
  }, [onRefresh]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const filteredRecords = records.filter(r => 
    r.text.toLowerCase().includes(filter.toLowerCase()) || 
    r.user_id?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[200] bg-[#020617] p-4 md:p-12 overflow-y-auto font-arabic animate-in fade-in duration-500" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-10 pb-20">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-white/5 pb-8 gap-6">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-3xl font-bold tech-logo">Majd CONTROL HUB</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <p className="text-green-500 text-[10px] uppercase font-black tracking-widest">Global Server Monitor: LIVE DATA</p>
              </div>
            </div>
            <button onClick={handleRefresh} className={`p-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
          
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
            {['overview', 'records'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-10 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'brand-bg text-white shadow-xl scale-105' : 'text-white/30 hover:text-white/60'}`}>
                {tab === 'overview' ? 'إحصائيات السيرفر' : 'سجل المستخدمين المباشر'}
              </button>
            ))}
          </div>

          <button onClick={onClose} className="p-4 px-10 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-xs uppercase tracking-widest">خروج من HUB</button>
        </div>

        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { label: 'المستخدمون النشطون', val: stats.total_users, sub: 'Active Connections', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
              { label: 'إجمالي التسجيلات العالمية', val: stats.total_records, sub: 'Cloud DB Size', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
              { label: 'ساعات العمل التراكمية', val: (stats.total_duration / 3600).toFixed(2), sub: 'Global Audio Hours', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              { label: 'حالة الاستقرار', val: stats.success_rate + '%', sub: 'Cloud Stability', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            ].map((card, i) => (
              <div key={i} className="glass-3d p-10 rounded-[45px] border-white/5 relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-opacity">
                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={card.icon} /></svg>
                </div>
                <h4 className="text-5xl font-black text-white mb-2">{card.val}</h4>
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{card.label}</p>
                <div className="mt-6 pt-6 border-t border-white/5">
                   <p className="text-[9px] text-cyan-400 font-mono tracking-widest">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'records' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
             <div className="glass-3d p-8 rounded-[35px] border-cyan-500/20 flex items-center gap-6">
                <div className="h-12 w-12 rounded-2xl brand-bg flex items-center justify-center text-white"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
                <input 
                  type="text" 
                  placeholder="تعقب مستخدم محدد، أو ابحث في النصوص المسجلة..." 
                  className="flex-1 bg-transparent border-none outline-none text-white text-right font-arabic text-2xl"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                />
             </div>
             <div className="grid grid-cols-1 gap-6">
              {filteredRecords.map(r => (
                <div key={r.id} className="glass-3d p-10 rounded-[50px] flex flex-col lg:flex-row items-center justify-between gap-10 border-white/5 hover:border-indigo-500/30 transition-all group">
                  <div className="text-right flex-1 space-y-6">
                    <div className="flex items-center gap-4 flex-row-reverse flex-wrap">
                      <span className="px-5 py-2 rounded-2xl bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">DIALECT: {r.selection.dialect}</span>
                      <span className="px-5 py-2 rounded-2xl bg-green-500/10 text-green-400 text-[10px] font-black border border-green-500/20 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        {r.user_id}
                      </span>
                      <span className="text-white/20 text-[10px] font-mono">TRACKING_ID: {r.id}</span>
                    </div>
                    <p className="text-2xl text-white font-arabic leading-relaxed">"{r.text}"</p>
                    <div className="flex items-center gap-6 text-[10px] text-white/20 font-mono">
                      <span>DATETIME: {new Date(r.timestamp).toLocaleString('ar-EG')}</span>
                      <span>DURATION: {r.duration.toFixed(2)}s</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 bg-black/40 p-8 rounded-[40px] border border-white/5">
                    <button 
                      onClick={() => { if(r.audio_url !== '#') { const a = new Audio(r.audio_url); a.play(); } else { alert('هذا سجل حي من مستخدم آخر (Mock). في النسخة المتصلة بالسيرفر الحقيقي، سيتم تشغيل الصوت فوراً.'); } }} 
                      className="h-20 w-20 rounded-full brand-bg text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95"
                    >
                      <svg className="w-10 h-10 translate-x-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                    <a 
                      href={r.audio_url !== '#' ? r.audio_url : '#'} 
                      onClick={(e) => r.audio_url === '#' && e.preventDefault()}
                      download={`majd_spy_record_${r.id}.wav`} 
                      className="p-6 rounded-full bg-white/5 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all border border-white/10"
                      title="تحميل هذا التسجيل"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </a>
                  </div>
                </div>
              ))}
              {filteredRecords.length === 0 && (
                <div className="py-40 text-center opacity-10">
                   <p className="text-3xl font-black uppercase tracking-[1em]">Scanning Global Traffic...</p>
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
             <h2 className="text-3xl font-black text-white uppercase tracking-tighter">بوابة المراقبة المركزية</h2>
             <p className="text-white/20 text-[10px] uppercase tracking-[0.4em] font-bold">Authorized Admin Access Only</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-8">
            <input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-3xl py-7 text-center text-4xl tracking-[0.8em] text-cyan-400 font-mono focus:outline-none focus:border-cyan-500/50 shadow-inner" placeholder="••••" />
            <button type="submit" disabled={isLoading} className="w-full brand-bg text-white font-black py-6 rounded-3xl text-xl shadow-2xl hover:scale-[1.02] transition-all">{isLoading ? 'Connecting to Global Hub...' : 'فتح البوابة المركزية'}</button>
            <button type="button" onClick={onClose} className="text-white/20 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">تجاهل الدخول</button>
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

  const userId = useMemo(() => localStorage.getItem('majd_session_v3') || 'User', []);

  useEffect(() => {
    if (showIntro) {
      const t = setTimeout(() => { sessionStorage.setItem('majd_intro_played', 'true'); setShowIntro(false); }, 3500);
      return () => clearTimeout(t);
    }
  }, [showIntro]);

  useEffect(() => {
    const sync = async () => { setHistory(await api.getUserRecords(userId)); };
    sync();
  }, [userId]);

  const loadAdminData = async () => {
    setIsAdminLoading(true);
    try {
      const [stats, all] = await Promise.all([api.getGlobalStats(), api.getAllRecordsAdmin()]);
      setGlobalStats(stats); setAllRecords(all); setShowAdmin(true); setIsVerifying(false);
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
        selection: { dialect: selectedDialect.title, type: selectedType, field: 'Studio', controls: voiceControls },
        audio_url: url,
        duration: duration
      });
      setCurrentResult(record); setHistory(prev => [record, ...prev]);
      if (audioRef.current) { audioRef.current.src = url; audioRef.current.play(); setIsPlaying(true); }
    } finally { setIsGenerating(false); }
  };

  if (showIntro) return (
    <div className="fixed inset-0 z-[500] bg-[#020617] flex items-center justify-center font-montserrat">
      <div className="text-center animate-in fade-in zoom-in duration-1000">
        <h1 className="tech-logo text-7xl md:text-9xl tracking-[0.5em]">Majd</h1>
        <p className="text-white/20 text-xs tracking-[1.5em] uppercase font-bold animate-pulse mt-8">Establishing Secure Cloud Session</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center py-20 px-6 font-arabic relative overflow-x-hidden" dir="rtl">
      <div className="fixed top-[10%] left-[5%] w-[800px] h-[800px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[10%] right-[5%] w-[800px] h-[800px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

      {isVerifying && <PasswordModal onVerify={loadAdminData} onClose={() => setIsVerifying(false)} isLoading={isAdminLoading} />}
      {showAdmin && <AdminDashboard stats={globalStats} records={allRecords} onRefresh={loadAdminData} onClose={() => setShowAdmin(false)} />}

      <div className="fixed top-8 left-8 z-50">
        <button onClick={() => setIsVerifying(true)} className="px-6 py-3 rounded-2xl glass-3d border border-cyan-500/20 text-cyan-400 font-bold text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          البوابة المركزية
        </button>
      </div>

      <header className="mb-24 text-center z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="h-24 w-24 brand-bg rounded-[30px] flex items-center justify-center shadow-3xl mb-4 rotate-3">
             <svg viewBox="0 0 24 24" className="h-12 w-12 text-white" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
          </div>
          <h1 className="tech-logo text-6xl md:text-8xl">Majd</h1>
          <p className="text-white/30 text-[10px] uppercase tracking-[1em] font-bold">Cloud-Linked Audio Studio</p>
        </div>
      </header>

      <main className="w-full max-w-5xl space-y-24 z-10">
        {/* Step 1: Dialect */}
        <section className="glass-3d p-16 rounded-[50px] animate-in slide-in-from-bottom-8 duration-700">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.4em] text-center mb-16">١. اختيار الهوية اللغوية</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DIALECTS.map(d => (
              <button key={d.id} onClick={() => setSelectedDialectId(d.id)} className={`p-8 rounded-[35px] text-right border-2 transition-all duration-500 ${selectedDialectId === d.id ? 'border-cyan-500/40 bg-cyan-500/5 shadow-2xl' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                <h4 className="text-xl font-bold mb-2">{d.title}</h4>
                <p className="text-[10px] text-white/30 leading-relaxed">{d.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Personality */}
        <section className="glass-3d p-16 rounded-[50px] space-y-16 animate-in slide-in-from-bottom-8 duration-700 delay-100">
           <SelectionBlock title="٢. الهوية العمرية" options={VOICE_TYPES} current={selectedType} set={setSelectedType} />
           <div className="flex justify-center gap-6">
              {['ذكر', 'أنثى'].map(g => (
                <button key={g} onClick={() => setSelectedGender(g)} className={`px-12 py-4 rounded-full border-2 font-bold text-sm transition-all ${selectedGender === g ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-white/5 bg-white/5 text-white/30'}`}>{g}</button>
              ))}
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {filteredProfiles.map(p => (
                <button key={p.name} onClick={() => setSelectedVoiceName(p.name)} className={`p-6 rounded-[35px] border-2 transition-all text-center space-y-3 ${selectedVoiceName === p.name ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/5 bg-white/5'}`}>
                  <div className="w-12 h-12 rounded-2xl brand-bg mx-auto flex items-center justify-center text-white/50 text-xs">VO</div>
                  <p className="font-bold text-sm">{p.name}</p>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest">{p.category}</p>
                </button>
              ))}
           </div>
        </section>

        {/* Step 3: Engineering Controls */}
        <section className="glass-3d p-16 rounded-[50px] animate-in slide-in-from-bottom-8 duration-700 delay-200">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.4em] text-center mb-16">٣. غرفة المعالجة الهندسية</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {Object.entries(STUDIO_CONTROLS).map(([k, c]) => (
              <ControlGroup key={k} id={k} title={c.title} options={c.options} current={(voiceControls as any)[k]} onChange={v => setVoiceControls(prev => ({...prev, [k]: v}))} />
            ))}
          </div>
        </section>

        {/* Step 4: Text Input & Generation */}
        <section className="glass-3d p-16 rounded-[50px] space-y-10 animate-in slide-in-from-bottom-8 duration-700 delay-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <textarea className="w-full h-64 bg-black/40 border border-white/5 rounded-[40px] p-8 text-xl text-white outline-none focus:border-cyan-500/20 resize-none text-right" placeholder="اكتب النص الأساسي هنا..." value={inputText} onChange={e => setInputText(e.target.value)} />
            <textarea className="w-full h-64 bg-indigo-500/5 border border-indigo-500/10 rounded-[40px] p-8 text-xl text-indigo-100 outline-none resize-none text-right" placeholder="المخطوطة النهائية المعدلة..." value={processedText} readOnly />
          </div>
          <button onClick={handlePreprocess} disabled={isPreprocessing || !inputText.trim()} className="w-full py-5 rounded-[25px] border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-bold tracking-[0.4em] uppercase hover:bg-cyan-400 hover:text-black transition-all disabled:opacity-30">
            {isPreprocessing ? 'جاري التحسين الذكي...' : 'تحسين المخطوطة إبداعياً'}
          </button>
        </section>

        <section className="flex justify-center pb-20">
          <button onClick={handleGenerate} disabled={isGenerating || !inputText.trim()} className={`w-full max-w-2xl py-12 rounded-full font-bold text-2xl flex items-center justify-center gap-6 shadow-3xl transition-all ${isGenerating ? 'bg-white/5 text-white/20' : 'brand-bg text-white hover:scale-105'}`}>
            {isGenerating ? (
              <div className="flex items-center gap-4">
                <div className="animate-spin h-10 w-10 border-4 border-t-white border-white/20 rounded-full" />
                <span className="text-sm font-mono tracking-tighter uppercase opacity-40">Broadcasting to Majd Cloud...</span>
              </div>
            ) : 'بدء توليد الأداء (Master Cloud)'}
          </button>
        </section>

        {currentResult && (
          <section className="glass-3d p-16 rounded-[60px] border-cyan-500/20 animate-in zoom-in duration-1000 text-center space-y-12">
             <div className="space-y-2">
                <div className="text-xs text-green-500 font-bold uppercase tracking-[0.2em] mb-4">Cloud Sync Successful</div>
                <h3 className="text-4xl font-bold brand-text">MASTER OUTPUT READY</h3>
                <p className="text-[10px] text-white/20 uppercase font-mono">Server ID: {currentResult.id}</p>
             </div>
             <div className="w-full max-w-2xl p-12 rounded-[50px] bg-black/50 mx-auto space-y-10 border border-white/5">
                <button onClick={() => { if(isPlaying) audioRef.current?.pause(); else audioRef.current?.play(); setIsPlaying(!isPlaying); }} className="h-24 w-24 rounded-full brand-bg text-white flex items-center justify-center mx-auto shadow-2xl hover:scale-110 transition-transform">
                   {isPlaying ? <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-10 h-10 translate-x-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                </button>
                <div className="flex justify-center gap-4">
                  <a 
                    href={currentResult.audio_url} 
                    download={`majd_voice_record.wav`}
                    className="flex items-center gap-3 px-10 py-5 rounded-3xl bg-white/5 border border-white/10 text-cyan-400 font-black text-sm hover:bg-cyan-400 hover:text-black transition-all shadow-xl"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    تحميل المنتج النهائي (WAV)
                  </a>
                </div>
             </div>
          </section>
        )}
      </main>

      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
    </div>
  );
};

export default App;
