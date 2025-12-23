
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DIALECTS, VOICE_TYPES, STUDIO_CONTROLS, getBaseVoiceForType, VoiceProfile } from './constants';
import { GenerationRecord, VoiceControls, GlobalStats } from './types';
import { majdService } from './services/geminiService';
import { api } from './services/apiService';

// --- المكونات المساعدة ---

const StatCard: React.FC<{ label: string, value: string | number, icon?: string }> = ({ label, value, icon }) => (
  <div className="admin-card p-6 rounded-3xl space-y-2">
    <div className="flex justify-between items-start">
      <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">{label}</span>
      <span className="text-cyan-400">{icon}</span>
    </div>
    <div className="text-3xl font-black text-white">{value}</div>
  </div>
);

const SelectionBlock: React.FC<{ title: string; options: string[]; current: string; set: (s: string) => void; }> = ({ title, options, current, set }) => (
  <div className="w-full space-y-4">
    <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-[0.4em] text-center mb-4">{title}</h3>
    <div className="flex flex-wrap justify-center gap-3">
      {options.map(opt => (
        <button key={opt} onClick={() => set(opt)} className={`px-8 py-3 rounded-2xl border transition-all duration-300 text-sm font-bold ${current === opt ? 'brand-bg text-white shadow-lg scale-105' : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'}`}>{opt}</button>
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
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [globalRecords, setGlobalRecords] = useState<GenerationRecord[]>([]);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [userId] = useState(() => {
    let id = localStorage.getItem('majd_uid');
    if (!id) { id = 'User_' + Math.random().toString(36).substr(2, 6); localStorage.setItem('majd_uid', id); }
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
  const [currentResult, setCurrentResult] = useState<GenerationRecord | null>(null);

  const availableProfiles = useMemo(() => {
    const dialect = DIALECTS.find(d => d.id === selectedDialectId);
    if (!dialect) return [];
    return dialect.profiles.filter(p => 
      p.voiceType === selectedAge && 
      (p.gender === selectedGender || (selectedGender === 'male' ? p.gender === 'male' : p.gender === 'female'))
    );
  }, [selectedDialectId, selectedAge, selectedGender]);

  useEffect(() => {
    if (availableProfiles.length > 0) {
      setSelectedProfile(availableProfiles[0]);
    } else {
      setSelectedProfile(null);
    }
  }, [availableProfiles]);

  useEffect(() => {
    if (showIntro) { setTimeout(() => { sessionStorage.setItem('majd_intro', 'true'); setShowIntro(false); }, 2500); }
    const init = async () => {
      await api.logSession(userId);
      const records = await api.getUserRecords(userId);
      setHistory(records);
    };
    init();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [userId]);

  const toggleAudio = (id: string, data: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(data);
      audioRef.current.play().catch(e => {
        console.error(e);
        alert("تعذر تشغيل هذا الملف الصوتي.");
      });
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
        personality: 'Pro' 
      });
      setRefinedText(refined);
    } catch (e) {
      alert("تعذر تحسين النص حالياً.");
    } finally {
      setIsPreprocessing(false);
    }
  };

  const handleGenerate = async () => {
    const textToUse = refinedText || inputText;
    if (!textToUse.trim() || !selectedProfile) return;
    setIsGenerating(true);
    try {
      const baseVoice = getBaseVoiceForType(selectedAge, selectedGender);
      const { dataUrl, duration } = await majdService.generateVoiceOver(
        textToUse, 
        baseVoice, 
        `صوت ${selectedProfile.name} - ${JSON.stringify(voiceControls)}`
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
    } catch (e) { 
      console.error(e);
      alert("فشل التوليد، يرجى المحاولة مرة أخرى."); 
    }
    finally { setIsGenerating(false); }
  };

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '41414141') {
      const gStats = await api.getGlobalStats();
      const allRecords = await api.getAllRecords();
      setStats(gStats);
      setGlobalRecords(allRecords);
      setIsAdminView(true);
      setShowLogin(false);
    } else alert("كلمة المرور خاطئة");
  };

  if (showIntro) return (
    <div className="fixed inset-0 z-[500] bg-[#020617] flex items-center justify-center font-montserrat">
      <div className="text-center animate-pulse">
        <h1 className="tech-logo text-7xl md:text-9xl">Majd</h1>
        <p className="text-white/20 text-[10px] tracking-[1.5em] mt-8 uppercase font-bold">NEXT GEN VOICE STUDIO</p>
      </div>
    </div>
  );

  if (isAdminView && stats) return (
    <div className="min-h-screen bg-[#020617] text-white p-10 md:p-20 font-arabic">
      <header className="flex justify-between items-center mb-16">
        <div>
          <h1 className="text-4xl font-black brand-text">لوحة التحكم السحابية</h1>
          <p className="text-white/40 text-[10px] uppercase tracking-widest mt-2">MAJD ANALYTICS CORE</p>
        </div>
        <button onClick={() => setIsAdminView(false)} className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold">العودة للاستوديو</button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard label="المستخدمين" value={stats.total_users} icon="👥" />
        <StatCard label="التسجيلات" value={stats.total_records} icon="🎙️" />
        <StatCard label="المتوسط" value={stats.avg_voices_per_user.toFixed(1)} icon="📊" />
        <StatCard label="وقت الجلسة" value={`${stats.avg_session_duration.toFixed(1)}د`} icon="⏱️" />
      </div>

      <div className="admin-card p-10 rounded-[40px] space-y-8 overflow-hidden">
        <h3 className="text-xl font-bold border-b border-white/5 pb-4">سجل الأصوات العالمي (Global Voice Log)</h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right min-w-[700px]">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase tracking-wider border-b border-white/5">
                <th className="pb-4 font-bold">التاريخ</th>
                <th className="pb-4 font-bold">المستخدم</th>
                <th className="pb-4 font-bold">اللهجة / النمط</th>
                <th className="pb-4 font-bold">النص</th>
                <th className="pb-4 font-bold">العمليات</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {globalRecords.map((rec) => (
                <tr key={rec.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                  <td className="py-4 text-[10px] opacity-40">{new Date(rec.timestamp).toLocaleString('ar-EG')}</td>
                  <td className="py-4 font-mono text-[10px] text-cyan-400">{rec.user_id}</td>
                  <td className="py-4 text-xs">{rec.selection.dialect} - {rec.selection.type}</td>
                  <td className="py-4 truncate max-w-[200px] opacity-60">"{rec.text}"</td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleAudio(rec.id, rec.audio_data)} className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${playingId === rec.id ? 'bg-rose-500 text-white' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white'}`}>
                        {playingId === rec.id ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                      </button>
                      <a href={rec.audio_data} download={`MAJD_GLOBAL_${rec.id}.wav`} className="h-8 w-8 rounded-lg bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {globalRecords.length === 0 && <div className="py-10 text-center opacity-20 text-xs italic font-bold">جاري تحميل السجلات السحابية...</div>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center py-20 px-6 font-arabic relative">
      
      <div className="fixed top-8 left-8 z-50">
        <button onClick={() => setShowLogin(true)} className="px-6 py-3 rounded-2xl glass-3d border border-cyan-500/20 text-cyan-400 font-bold text-[10px] uppercase tracking-widest">Control Panel</button>
      </div>

      {showLogin && (
        <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <form onSubmit={handleAdminAuth} className="glass-3d w-full max-w-md p-12 rounded-[50px] text-center space-y-8">
            <h2 className="text-2xl font-black">الدخول للمدير</h2>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 text-center text-2xl tracking-widest focus:outline-none focus:border-cyan-500/50" />
            <button className="w-full brand-bg py-5 rounded-2xl font-bold">دخول آمن</button>
            <button type="button" onClick={()=>setShowLogin(false)} className="text-white/20 text-xs hover:text-white/40 transition-all">إغلاق</button>
          </form>
        </div>
      )}

      <header className="mb-24 text-center">
        <h1 className="tech-logo text-7xl md:text-9xl mb-4">Majd</h1>
        <p className="text-white/30 text-[10px] uppercase tracking-[1em] font-bold">Professional Voice Studio</p>
      </header>

      <main className="w-full max-w-6xl space-y-16">
        <section className="glass-3d p-12 rounded-[50px] space-y-12">
          <SelectionBlock title="اللهجة العربية" options={DIALECTS.map(d=>d.title)} current={DIALECTS.find(d=>d.id===selectedDialectId)?.title || ''} set={(t) => setSelectedDialectId(DIALECTS.find(d=>d.title===t)?.id || DIALECTS[0].id)} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-white/5 pt-12">
            <SelectionBlock title="الهوية العمرية" options={VOICE_TYPES} current={selectedAge} set={setSelectedAge} />
            <SelectionBlock title="الجنس" options={['ذكر', 'أنثى']} current={selectedGender === 'male' ? 'ذكر' : 'أنثى'} set={(g) => setSelectedGender(g === 'ذكر' ? 'male' : 'female')} />
          </div>

          <div className="space-y-6 pt-12 border-t border-white/5">
            <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-[0.4em] text-center">اختيار الصوت</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {availableProfiles.map(profile => (
                <button key={profile.name} onClick={() => setSelectedProfile(profile)} className={`p-4 rounded-2xl border transition-all text-center space-y-2 group ${selectedProfile?.name === profile.name ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                  <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center text-lg transition-transform group-hover:scale-110 ${selectedProfile?.name === profile.name ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white/20'}`}>
                    {profile.gender === 'male' ? '👨' : '👩'}
                  </div>
                  <div className="text-xs font-bold truncate">{profile.name}</div>
                  <div className="text-[9px] opacity-30 truncate">{profile.category}</div>
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

        {/* --- قسم المخطوطة الجديد --- */}
        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* المخطوطة الأصلية */}
            <div className="relative glass-3d rounded-[40px] border-white/5 group transition-all">
               <div className="absolute top-6 right-8 text-[10px] font-bold text-white/20 uppercase tracking-widest">المخطوطة الأصلية</div>
               <textarea className="w-full h-80 bg-transparent p-12 pt-16 text-xl text-white/40 text-right outline-none resize-none placeholder:text-white/5 font-arabic" placeholder="اكتب نصك الخام هنا..." value={inputText} onChange={e => { setInputText(e.target.value); if(refinedText) setRefinedText(''); }} />
               <button onClick={handleImproveText} disabled={isPreprocessing || !inputText.trim()} className={`absolute bottom-8 left-8 px-8 py-4 rounded-2xl border transition-all flex items-center gap-3 font-bold text-xs ${isPreprocessing ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse' : 'bg-white/5 border-white/10 text-white hover:bg-cyan-500 hover:border-cyan-500 shadow-xl'}`}>
                {isPreprocessing ? 'جاري التحسين الذكي...' : 'تحسين المخطوطة ✨'}
               </button>
            </div>

            {/* النص المطور */}
            <div className={`relative glass-3d rounded-[40px] border-cyan-500/20 transition-all overflow-hidden ${refinedText ? 'opacity-100 translate-x-0' : 'opacity-30 pointer-events-none scale-95'}`}>
               <div className="absolute top-6 right-8 text-[10px] font-bold text-cyan-400 uppercase tracking-widest">النص المطور (للتوليد)</div>
               <textarea className="w-full h-80 bg-cyan-500/5 p-12 pt-16 text-xl text-white text-right outline-none resize-none font-arabic leading-relaxed" placeholder="سيظهر النص المحسن هنا..." value={refinedText} onChange={e => setRefinedText(e.target.value)} />
               {refinedText && (
                 <div className="absolute bottom-6 left-8 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                   <span className="text-[10px] font-bold text-cyan-400/60 uppercase">جاهز للتسجيل</span>
                 </div>
               )}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={isGenerating || !inputText.trim() || !selectedProfile} className="w-full py-8 rounded-[35px] brand-bg text-white text-xl font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-4">
            {isGenerating ? (
              <>
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري استدعاء المحرك الصوتي...</span>
              </>
            ) : (
              <span>توليد التعليق الصوتي</span>
            )}
          </button>
        </section>

        {currentResult && (
          <div className="glass-3d p-10 rounded-[40px] border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-8 animate-in fade-in slide-in-from-bottom-4 shadow-[0_0_80px_-15px_rgba(56,189,248,0.3)]">
            <div className="flex items-center gap-6">
              <button onClick={() => toggleAudio(currentResult.id, currentResult.audio_data)} className={`h-20 w-20 rounded-full brand-bg flex items-center justify-center text-white shadow-xl hover:scale-110 transition-all ${playingId === currentResult.id ? 'bg-rose-600' : ''}`}>
                {playingId === currentResult.id ? (
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <div className="text-right"><h4 className="text-xl font-black text-white">تم استوديو Majd بنجاح</h4><p className="text-white/40 text-sm font-bold">{currentResult.duration.toFixed(1)} ثانية | WAV High Quality</p></div>
            </div>
            <a href={currentResult.audio_data} download={`MAJD_VOICE_${Date.now()}.wav`} className="flex items-center gap-4 px-12 py-6 rounded-[28px] brand-bg text-white font-black uppercase tracking-widest hover:brightness-110 shadow-2xl transition-all group">
              <span>تحميل المادة الصوتية</span>
              <svg className="w-6 h-6 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            </a>
          </div>
        )}

        <section className="glass-3d p-12 rounded-[50px] space-y-8">
          <h3 className="text-xl font-bold flex justify-between items-center">
            <span>السجل الشخصي</span>
            <span className="text-[10px] opacity-20 uppercase tracking-widest">Recent Sessions</span>
          </h3>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
            {history.map((rec) => (
              <div key={rec.id} className="p-6 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all group">
                <div className="flex gap-3">
                  <button onClick={() => toggleAudio(rec.id, rec.audio_data)} className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all ${playingId === rec.id ? 'bg-rose-500 text-white shadow-lg' : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white'}`}>
                    {playingId === rec.id ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>
                  <a href={rec.audio_data} download={`MAJD_HISTORY_${rec.id}.wav`} className="h-12 w-12 rounded-xl bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  </a>
                </div>
                <div className="text-right flex-1 truncate ml-4">
                  <p className="text-sm font-arabic truncate max-w-md">"{rec.text}"</p>
                  <span className="text-[10px] opacity-20">{rec.selection.dialect} | {rec.selection.field}</span>
                </div>
              </div>
            ))}
            {history.length === 0 && <div className="py-20 text-center text-white/5 text-sm italic">لا توجد سجلات في الذاكرة المحلية</div>}
          </div>
        </section>
      </main>
      <footer className="mt-40 text-center opacity-10 text-[10px] uppercase font-black tracking-[1em] pb-10">Majd STUDIO VO • ADVANCED IDENTITY SYSTEM</footer>
    </div>
  );
};

export default App;
