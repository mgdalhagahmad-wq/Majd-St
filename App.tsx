
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DIALECTS, VOICE_TYPES, STUDIO_CONTROLS, getBaseVoiceForType } from './constants';
import { GenerationRecord, VoiceControls, UserProfile, GlobalStats } from './types';
import { majdService } from './services/geminiService';
import { api } from './services/apiService';

// --- Components ---

const AdminDashboard: React.FC<{ 
  onClose: () => void, 
  stats: GlobalStats | null,
  records: GenerationRecord[]
}> = ({ onClose, stats, records }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'records'>('overview');
  const [filter, setFilter] = useState('');

  const filteredRecords = records.filter(r => 
    r.text.toLowerCase().includes(filter.toLowerCase()) || 
    r.selection.dialect.includes(filter) ||
    r.user_id.includes(filter)
  );

  return (
    <div className="fixed inset-0 z-[200] bg-[#020617] p-4 md:p-12 overflow-y-auto font-arabic" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-10 pb-20">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-white/5 pb-8 gap-6">
          <div>
            <h2 className="text-3xl font-bold tech-logo">Majd ADMIN</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.4em] mt-2">Central Control Intelligence</p>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
            {['overview', 'records'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-8 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'brand-bg text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
              >
                {tab === 'overview' ? 'نظرة عامة' : 'جميع السجلات'}
              </button>
            ))}
          </div>

          <button onClick={onClose} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all">
            إغلاق
          </button>
        </div>

        {activeTab === 'overview' && stats && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'المستخدمون', val: stats.total_users, sub: 'Unique Profiles' },
                { label: 'إجمالي السجلات', val: stats.total_records, sub: 'Mastered Files' },
                { label: 'ساعات العمل', val: (stats.total_duration / 3600).toFixed(2), sub: 'Audio Hours' },
                { label: 'نسبة النجاح', val: stats.success_rate + '%', sub: 'Engine Health' },
              ].map((card, i) => (
                <div key={i} className="glass-3d p-8 rounded-[35px] relative group overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 font-bold uppercase text-[10px]">Stat {i+1}</div>
                    <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest">{card.sub}</span>
                  </div>
                  <h4 className="text-4xl font-bold text-white mb-1">{card.val}</h4>
                  <p className="text-xs text-white/30 font-bold uppercase tracking-wider">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-3d p-10 rounded-[45px] space-y-6">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">توزيع اللهجات</h3>
                <div className="space-y-4">
                  {Object.entries(stats.top_dialects).map(([name, count]) => (
                    <div key={name} className="space-y-2">
                      <div className="flex justify-between text-xs text-white/60 font-bold"><span>{name}</span><span>{count} طلب</span></div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full brand-bg transition-all duration-1000" style={{ width: `${(count / (stats.total_records || 1)) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-3d p-10 rounded-[45px] space-y-6">
                <h3 className="text-sm font-bold text-violet-400 uppercase tracking-widest">السجلات الأخيرة</h3>
                <div className="space-y-3">
                  {records.slice(0, 5).map(r => (
                    <div key={r.id} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div className="text-right">
                        <p className="text-sm font-bold">{r.selection.dialect}</p>
                        <p className="text-[10px] text-white/30">ID: ...{r.user_id.slice(-6)}</p>
                      </div>
                      <span className="text-[10px] text-cyan-400 font-mono">{new Date(r.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5">
              <input 
                type="text" 
                placeholder="بحث في السجلات المركزية..." 
                className="flex-1 bg-transparent border-none outline-none text-white font-arabic pr-4"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              {filteredRecords.map(r => (
                <div key={r.id} className="glass-3d p-6 rounded-[30px] flex flex-col md:flex-row items-center justify-between gap-6 border-white/5 hover:border-indigo-500/20">
                  <div className="flex-1 text-right space-y-2">
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">{r.selection.dialect}</span>
                      <span className="text-white/40 text-[10px] uppercase font-mono">ID: {r.id.slice(0,8)}</span>
                    </div>
                    <p className="text-sm text-white/70 italic line-clamp-1">"{r.text}"</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => { const a = new Audio(r.audio_url); a.play(); }}
                      className="h-12 w-12 rounded-full brand-bg flex items-center justify-center text-white hover:scale-110 transition-transform"
                    >
                      <svg className="w-6 h-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                  </div>
                </div>
              ))}
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
  const correctPassword = '41414141';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      api.trackEvent('admin_login');
      onVerify();
    } else {
      setError(true);
      setTimeout(() => setError(false), 1000);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm pointer-events-none" />
      <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[300] w-full max-w-md p-6 font-arabic ${error ? 'animate-shake' : ''}`}>
        <div className="glass-3d p-12 rounded-[50px] w-full border border-white/20 text-center space-y-8 shadow-[0_0_100px_rgba(0,0,0,0.9)] backdrop-blur-3xl">
          <div className="w-20 h-20 brand-bg rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">إذن دخول المشرف</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-widest">Master Studio Access Key Required</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input 
              type="password" 
              autoFocus
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-2xl py-5 px-6 text-center text-2xl tracking-[0.5em] text-cyan-400 focus:outline-none focus:border-cyan-500/50 transition-all font-mono shadow-inner"
              placeholder="••••••••"
            />
            <div className="flex gap-4">
              <button type="submit" disabled={isLoading} className="flex-1 brand-bg text-white font-bold py-5 rounded-2xl hover:scale-[1.02] transition-all shadow-xl disabled:opacity-50">
                {isLoading ? 'جاري التحميل...' : 'تحقق'}
              </button>
              <button type="button" onClick={onClose} className="px-8 bg-white/5 text-white/40 font-bold py-5 rounded-2xl hover:bg-white/10 transition-all">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

// --- Cinematic Intro ---
const CinematicIntro: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[500] bg-[#020617] flex items-center justify-center overflow-hidden font-montserrat">
      <div className="text-center space-y-4 relative z-10 animate-in fade-in zoom-in duration-1000">
        <h1 className="tech-logo text-7xl md:text-9xl tracking-[0.5em]">Majd</h1>
        <p className="text-white/20 text-xs tracking-[1.5em] uppercase font-bold animate-pulse">Synchronizing Master Suite</p>
      </div>
    </div>
  );
};

// --- Helper Components ---
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

// --- Main App ---

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState<boolean>(() => sessionStorage.getItem('majd_intro_played') !== 'true');
  const [showAdmin, setShowAdmin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [allRecords, setAllRecords] = useState<GenerationRecord[]>([]);

  // State for generators
  const [selectedDialectId, setSelectedDialectId] = useState<string>(DIALECTS[0].id);
  const [selectedType, setSelectedType] = useState<string>(VOICE_TYPES[0]);
  const [selectedGender, setSelectedGender] = useState<string>('ذكر');
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [voiceControls, setVoiceControls] = useState<VoiceControls>({ temp: 'دافئ', emotion: 'متوسط', speed: 'متوسطة', depth: 'متوسطة', pitch: 'متوسطة', drama: 'متوسط' });
  const [inputText, setInputText] = useState<string>('');
  const [processedText, setProcessedText] = useState<string>('');
  
  // UI states
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<GenerationRecord | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const init = async () => {
      await api.getProfile();
      const h = await api.getUserRecords();
      setHistory(h);
      api.trackEvent('session_start');
    };
    init();
  }, []);

  const loadAdminData = async () => {
    setIsAdminLoading(true);
    try {
      const [stats, all] = await Promise.all([
        api.getGlobalStats(),
        api.getAllRecordsAdmin()
      ]);
      setGlobalStats(stats);
      setAllRecords(all);
      setShowAdmin(true);
      setIsVerifying(false);
    } catch (e) {
      console.error("Admin Load Error:", e);
    } finally {
      setIsAdminLoading(false);
    }
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
      const refined = await majdService.preprocessText(inputText, { 
        dialect: selectedDialect.title, 
        field: 'عام', 
        personality: selectedVoiceName 
      });
      setProcessedText(refined);
    } finally { setIsPreprocessing(false); }
  };

  const handleGenerate = async () => {
    const textToUse = processedText || inputText;
    if (!textToUse.trim()) return;
    setIsGenerating(true);
    try {
      const activeVoice = filteredProfiles.find(p => p.name === selectedVoiceName) || filteredProfiles[0];
      const performanceNote = `Dialect: ${selectedDialect.title}, Name: ${selectedVoiceName}, Type: ${selectedType}, Controls: ${JSON.stringify(voiceControls)}`;
      const baseVoice = getBaseVoiceForType(selectedType, activeVoice?.gender || (selectedGender === 'ذكر' ? 'male' : 'female'));
      
      const { url, duration } = await majdService.generateVoiceOver(textToUse, baseVoice, performanceNote);
      
      const record = await api.saveRecord({
        text: textToUse,
        selection: { dialect: selectedDialect.title, type: selectedType, field: 'Creative', controls: voiceControls },
        audio_url: url,
        duration: duration
      });

      setCurrentResult(record);
      setHistory(prev => [record, ...prev]);
      if (audioRef.current) { audioRef.current.src = url; audioRef.current.play(); setIsPlaying(true); }
    } catch (e) {
      console.error(e);
      api.trackEvent('error_occurred', { error: 'generation_failed' });
    } finally { setIsGenerating(false); }
  };

  if (showIntro) return <CinematicIntro onComplete={() => { sessionStorage.setItem('majd_intro_played', 'true'); setShowIntro(false); }} />;

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center py-20 px-6 font-arabic relative" dir="rtl">
      <div className="fixed top-[10%] left-[5%] w-[800px] h-[800px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[10%] right-[5%] w-[800px] h-[800px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Admin Verification Modal */}
      {isVerifying && <PasswordModal onVerify={loadAdminData} onClose={() => setIsVerifying(false)} isLoading={isAdminLoading} />}
      
      {/* Admin Dashboard Component */}
      {showAdmin && <AdminDashboard stats={globalStats} records={allRecords} onClose={() => setShowAdmin(false)} />}

      <div className="fixed top-8 left-8 z-50">
        <button 
          onClick={() => setIsVerifying(true)}
          className="px-6 py-3 rounded-2xl glass-3d border border-cyan-500/20 text-cyan-400 font-bold text-xs uppercase tracking-widest hover:bg-cyan-500/10 transition-all flex items-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          لوحة التحكم المركزية
        </button>
      </div>

      <header className="mb-24 text-center z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="h-20 w-20 brand-bg rounded-[26px] flex items-center justify-center shadow-3xl mb-4 rotate-3">
             <svg viewBox="0 0 24 24" className="h-10 w-10 text-white" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
          </div>
          <h1 className="tech-logo text-6xl md:text-7xl">Majd</h1>
          <p className="text-white/30 text-[10px] uppercase tracking-[1em] font-bold">Elite Audio Synthesis Lab</p>
        </div>
      </header>

      <main className="w-full max-w-5xl space-y-24 z-10">
        {/* Step 1: Dialect */}
        <section className="glass-3d p-16 rounded-[50px] animate-in slide-in-from-bottom-8 duration-700">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.4em] text-center mb-16">١. اختيار الهوية اللغوية</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DIALECTS.map(d => (
              <button 
                key={d.id} 
                onClick={() => setSelectedDialectId(d.id)}
                className={`p-8 rounded-[35px] text-right border-2 transition-all duration-500 ${selectedDialectId === d.id ? 'border-cyan-500/40 bg-cyan-500/5 shadow-2xl' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
              >
                <h4 className="text-xl font-bold mb-2">{d.title}</h4>
                <p className="text-[10px] text-white/30 leading-relaxed">{d.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Voice Personality */}
        <section className="glass-3d p-16 rounded-[50px] space-y-16 animate-in slide-in-from-bottom-8 duration-700 delay-100">
           <SelectionBlock title="٢. الهوية العمرية" options={VOICE_TYPES} current={selectedType} set={setSelectedType} />
           <div className="flex justify-center gap-6">
              {['ذكر', 'أنثى'].map(g => (
                <button 
                  key={g} 
                  onClick={() => setSelectedGender(g)}
                  className={`px-12 py-4 rounded-full border-2 font-bold text-sm transition-all ${selectedGender === g ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-white/5 bg-white/5 text-white/30'}`}
                >
                  {g}
                </button>
              ))}
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {filteredProfiles.map(p => (
                <button 
                  key={p.name} 
                  onClick={() => setSelectedVoiceName(p.name)}
                  className={`p-6 rounded-[35px] border-2 transition-all text-center space-y-3 ${selectedVoiceName === p.name ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/5 bg-white/5'}`}
                >
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

        {/* Step 4: Execution */}
        <section className="glass-3d p-16 rounded-[50px] space-y-10 animate-in slide-in-from-bottom-8 duration-700 delay-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <textarea 
              className="w-full h-64 bg-black/40 border border-white/5 rounded-[40px] p-8 text-xl text-white outline-none focus:border-cyan-500/20 resize-none text-right"
              placeholder="اكتب النص الأساسي هنا..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
            />
            <textarea 
              className="w-full h-64 bg-indigo-500/5 border border-indigo-500/10 rounded-[40px] p-8 text-xl text-indigo-100 outline-none resize-none text-right"
              placeholder="المخطوطة النهائية المعدلة..."
              value={processedText}
              readOnly
            />
          </div>
          <button 
            onClick={handlePreprocess}
            disabled={isPreprocessing || !inputText.trim()}
            className="w-full py-5 rounded-[25px] border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs font-bold tracking-[0.4em] uppercase hover:bg-cyan-400 hover:text-black transition-all disabled:opacity-30"
          >
            {isPreprocessing ? 'جاري التحسين الذكي...' : 'تحسين المخطوطة إبداعياً'}
          </button>
        </section>

        <section className="flex justify-center pb-20">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !inputText.trim()}
            className={`w-full max-w-2xl py-12 rounded-full font-bold text-2xl flex items-center justify-center gap-6 shadow-3xl transition-all ${isGenerating ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'brand-bg text-white hover:scale-105'}`}
          >
            {isGenerating ? (
              <div className="w-10 h-10 border-4 border-t-white border-white/20 rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                بدء توليد الأداء الماستر
              </>
            )}
          </button>
        </section>

        {currentResult && (
          <section className="glass-3d p-16 rounded-[60px] border-cyan-500/20 animate-in zoom-in duration-1000">
             <div className="flex flex-col items-center gap-12">
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-bold brand-text">MASTER OUTPUT READY</h3>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.5em]">Central Record: {currentResult.id.slice(0,12)}</p>
                </div>
                <div className="w-full max-w-3xl p-10 rounded-[45px] bg-black/40 border border-white/5 flex flex-col items-center gap-10">
                   <div className="w-full h-1 bg-white/5 rounded-full relative overflow-hidden">
                      <div 
                        className="absolute h-full brand-bg transition-all duration-100" 
                        style={{ width: `${(audioRef.current?.currentTime || 0) / (currentResult.duration || 1) * 100}%` }} 
                      />
                   </div>
                   <div className="flex items-center gap-10">
                      <button 
                        onClick={() => {
                          if (isPlaying) audioRef.current?.pause(); else audioRef.current?.play();
                          setIsPlaying(!isPlaying);
                          api.trackEvent('record_played', { record_id: currentResult.id });
                        }}
                        className="h-24 w-24 rounded-full brand-bg text-white flex items-center justify-center hover:scale-110 transition-transform shadow-3xl"
                      >
                        {isPlaying ? <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-10 h-10 translate-x-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                      </button>
                      <button onClick={() => { const a = document.createElement('a'); a.href = currentResult.audio_url; a.download = `Majd_VO_${currentResult.id}.wav`; a.click(); }} className="p-6 rounded-3xl bg-white/5 text-white/40 hover:text-white transition-all">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                   </div>
                </div>
             </div>
          </section>
        )}
      </main>

      <footer className="mt-40 text-center opacity-40 hover:opacity-100 transition-opacity">
        <p className="text-[10px] tracking-[1em] uppercase">&copy; 2024 Majd STUDIO VO</p>
        <p className="text-[8px] tracking-[0.4em] uppercase mt-2">Professional Grade Centralized Engine</p>
      </footer>

      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
    </div>
  );
};

export default App;
