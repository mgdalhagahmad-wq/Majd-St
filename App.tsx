
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DIALECTS, VOICE_TYPES, STUDIO_CONTROLS, getBaseVoiceForType, VoiceProfile, StudioIcons } from './constants';
import { GenerationRecord, VoiceControls, GlobalStats } from './types';
import { majdService } from './services/geminiService';
import { api } from './services/apiService';

const WAITING_MESSAGES = [
  "ثانية واحدة.. Majd بيظبط الأوتوتيون.. 🎤",
  "مهندس الصوت شكلو نايم ولا إيه؟ هصحيهولك حالاً! 😴",
  "يالا معلش اتأخرنا عليك.. بننقي أحسن طبقة صوت.. ✨",
  "بنمسح التراب من على الميكروفونات.. 🧹",
  "الذكاء الاصطناعي بيشرب قهوته وجاي في الطريق.. ☕",
  "مجد بيراجع النص كلمة كلمة عشان ميبقاش فيه غلطة.. 📝",
  "خلاص هانت، الصوت بيتحمل على السحابة.. ☁️",
  "بنعمل ميكس وماسترينج عشان النتيجة تبهرك.. 🎧"
];

const RatingStars: React.FC<{ rating: number, onRate?: (r: number) => void, interactive?: boolean }> = ({ rating, onRate, interactive }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(star => (
      <button key={star} disabled={!interactive} onClick={() => onRate?.(star)} className={`text-xl transition-all ${star <= rating ? 'text-yellow-400 scale-125' : 'text-white/10 hover:text-white/40'}`}>★</button>
    ))}
  </div>
);

const StatCard: React.FC<{ label: string, value: string | number, icon?: string }> = ({ label, value, icon }) => (
  <div className="admin-card p-6 rounded-[32px] space-y-2 relative overflow-hidden group border border-white/5">
    <div className="flex justify-between items-start relative z-10">
      <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">{label}</span>
      <span className="text-cyan-400 opacity-50">{icon}</span>
    </div>
    <div className="text-4xl font-black text-white relative z-10">{value}</div>
    <div className="absolute -right-2 -bottom-2 text-white/5 text-7xl font-black">{icon}</div>
  </div>
);

const DetailedStatList: React.FC<{ title: string; items: { name: string; count: number; code?: string }[]; total: number; color: string }> = ({ title, items, total, color }) => (
  <div className="admin-card p-6 rounded-[32px] border border-white/5">
    <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">{title}</h4>
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-white/80">{item.name}</span>
            <span className="text-white/40">{item.count}</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${color} transition-all duration-1000`} 
              style={{ width: `${(item.count / total) * 100}%` }}
            />
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-[10px] opacity-20 italic text-center py-4">لا توجد بيانات</p>}
    </div>
  </div>
);

const SelectionBlock: React.FC<{ title: string; options: { label: string; icon?: any }[]; current: string; set: (s: string) => void; }> = ({ title, options, current, set }) => (
  <div className="w-full space-y-4">
    <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-[0.4em] text-center mb-4">{title}</h3>
    <div className="flex flex-wrap justify-center gap-3">
      {options.map(opt => (
        <button key={opt.label} onClick={() => set(opt.label)} className={`px-6 py-4 rounded-2xl border transition-all text-sm font-bold flex flex-col items-center gap-2 min-w-[120px] ${current === opt.label ? 'brand-bg text-white shadow-lg scale-105' : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'}`}>
          {opt.icon && <div className="mb-2 opacity-80">{opt.icon}</div>}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  </div>
);

const ControlGroup: React.FC<{ title: string; options: any[]; current: string; onChange: (val: string) => void; }> = ({ title, options, current, onChange }) => (
  <div className="space-y-4 text-right">
    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{title}</label>
    <div className="grid grid-cols-1 gap-2">
      {options.map(opt => (
        <button key={opt.label} onClick={() => onChange(opt.label)} className={`p-4 rounded-xl border text-right transition-all ${current === opt.label ? 'border-indigo-500/50 bg-indigo-500/10 text-white' : 'border-white/5 bg-white/5 text-white/30 hover:bg-white/10'}`}>
          <div className="text-xs font-bold mb-1">{opt.label}</div>
          <p className="text-[9px] opacity-30">{opt.desc}</p>
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
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [publicFeedbacks, setPublicFeedbacks] = useState<any[]>([]);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  
  const [userId] = useState(() => 'MAJD_USER_' + Math.random().toString(36).substr(2, 6));

  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [selectedDialectId, setSelectedDialectId] = useState<string>(DIALECTS[0].id);
  const [selectedAge, setSelectedAge] = useState<string>(VOICE_TYPES[0]);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male');
  const [selectedProfile, setSelectedProfile] = useState<VoiceProfile | null>(null);
  const [voiceControls, setVoiceControls] = useState<VoiceControls>({ temp: 'دافئ', emotion: 'متوسط', speed: 'متوسطة', depth: 'متوسطة', pitch: 'متوسطة', drama: 'متوسط' });
  
  const [inputText, setInputText] = useState('');
  const [refinedText, setRefinedText] = useState('');
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentWaitMsgIndex, setCurrentWaitMsgIndex] = useState(0);
  const [currentResult, setCurrentResult] = useState<GenerationRecord | null>(null);

  const availableProfiles = useMemo(() => {
    const dialect = DIALECTS.find(d => d.id === selectedDialectId);
    if (!dialect) return [];
    return dialect.profiles.filter(p => p.voiceType === selectedAge && p.gender === selectedGender);
  }, [selectedDialectId, selectedAge, selectedGender]);

  useEffect(() => {
    if (availableProfiles.length > 0) {
      if (!selectedProfile || !availableProfiles.some(p => p.name === selectedProfile.name)) {
        setSelectedProfile(availableProfiles[0]);
      }
    } else {
      setSelectedProfile(null);
    }
  }, [availableProfiles, selectedProfile]);

  useEffect(() => {
    if (showIntro) { setTimeout(() => { sessionStorage.setItem('majd_intro', 'true'); setShowIntro(false); }, 2500); }
    const init = async () => {
      try {
        await api.logSession(userId);
        const [records, fbs] = await Promise.all([api.getUserRecords(userId), api.getFeedbacks()]);
        setHistory(records || []);
        setPublicFeedbacks(fbs || []);
      } catch (e) {}
    };
    init();
  }, [userId]);

  useEffect(() => {
    let interval: any;
    if (isGenerating || isPreprocessing) {
      setCurrentWaitMsgIndex(0);
      interval = setInterval(() => {
        setCurrentWaitMsgIndex(prev => (prev + 1) % WAITING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating, isPreprocessing]);

  const toggleAudio = (id: string, url: string) => {
    if (playingId === id) { audioRef.current?.pause(); setPlayingId(null); }
    else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(url);
      audioRef.current.play();
      setPlayingId(id);
      audioRef.current.onended = () => setPlayingId(null);
    }
  };

  const handleRefineText = async () => {
    if (!inputText.trim()) return;
    setIsPreprocessing(true);
    try {
      const dialect = DIALECTS.find(d => d.id === selectedDialectId)?.title || 'عربية فصحى';
      const result = await majdService.preprocessText(inputText, {
        dialect: dialect,
        field: selectedProfile?.category || 'عام',
        personality: selectedProfile?.name || 'معلق صوتي'
      });
      setRefinedText(result);
    } catch (e) { alert("فشل تحسين النص."); }
    finally { setIsPreprocessing(false); }
  };

  const handleGenerate = async () => {
    const textToUse = refinedText || inputText;
    if (!textToUse.trim() || !selectedProfile) return alert("اختر شخصية وادخل نص أولاً!");
    setIsGenerating(true);
    try {
      const baseVoice = getBaseVoiceForType(selectedProfile.voiceType, selectedProfile.gender);
      const { dataUrl, duration } = await majdService.generateVoiceOver(textToUse, baseVoice, `بصوت ${selectedProfile.name}`);
      const record = await api.saveRecord({
        text: textToUse, user_id: userId,
        selection: { dialect: DIALECTS.find(d => d.id === selectedDialectId)?.title || '', type: selectedAge, field: selectedProfile.category, controls: voiceControls },
        audio_data: dataUrl, duration
      });
      setCurrentResult(record);
      setHistory(prev => [record, ...prev]);
    } catch (e) { alert("خطأ في السيرفر أو التخزين."); }
    finally { setIsGenerating(false); }
  };

  const handleSubmitFeedback = async () => {
    if (feedbackRating === 0) return alert("فين النجوم؟");
    setIsSubmittingFeedback(true);
    const success = await api.submitFeedback(userId, feedbackRating, feedbackComment);
    if (success) {
      setFeedbackSent(true);
      const updated = await api.getFeedbacks();
      setPublicFeedbacks(updated || []);
    } else alert("فشل الإرسال.");
    setIsSubmittingFeedback(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if(password === '41414141') {
      const [s, r, f] = await Promise.all([api.getGlobalStats(), api.getAllRecords(), api.getFeedbacks()]);
      setStats(s);
      setGlobalRecords(r);
      setFeedbacks(f);
      setIsAdminView(true);
      setShowLogin(false);
    } else alert("كلمة السر غلط");
  };

  const getCatIcon = (key: string) => {
     if (key === 'doc') return <StudioIcons.Doc />;
     if (key === 'ads') return <StudioIcons.Ads />;
     if (key === 'podcast') return <StudioIcons.Podcast />;
     if (key === 'novels') return <StudioIcons.Novels />;
     if (key === 'cartoon') return <StudioIcons.Cartoon />;
     return <StudioIcons.Drama />;
  };

  if (showIntro) return (
    <div className="fixed inset-0 z-[500] bg-[#020617] flex items-center justify-center font-montserrat">
      <div className="text-center animate-pulse"><h1 className="tech-logo text-7xl md:text-9xl">Majd</h1><p className="text-white/20 text-[10px] tracking-[1.5em] mt-8 uppercase font-bold">NEXT-GEN STUDIO VO</p></div>
    </div>
  );

  if (isAdminView && stats) return (
    <div className="min-h-screen bg-[#020617] text-white p-12 font-arabic overflow-y-auto custom-scrollbar">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black brand-text">Majd Intelligence</h1>
          <p className="text-white/20 text-xs mt-2 uppercase tracking-widest">Advanced Analytics Dashboard Pro</p>
        </div>
        <button onClick={() => setIsAdminView(false)} className="px-8 py-4 rounded-2xl brand-bg font-black shadow-lg hover:scale-105 transition-all">العودة للاستوديو</button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="الزيارات" value={stats.total_visits} icon="👁️" />
        <StatCard label="المستخدمين" value={stats.total_users} icon="👥" />
        <StatCard label="المقاطع" value={stats.total_records} icon="⚡" />
        <StatCard label="التقييم" value={stats.avg_rating} icon="⭐" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <DetailedStatList title="أعلى الدول زيارة" items={stats.top_countries} total={stats.total_visits} color="bg-cyan-500" />
        <DetailedStatList title="أعلى المدن" items={stats.top_cities} total={stats.total_visits} color="bg-indigo-500" />
        <DetailedStatList title="أنظمة التشغيل" items={stats.top_os} total={stats.total_visits} color="bg-emerald-500" />
        <DetailedStatList title="المتصفحات" items={stats.top_browsers} total={stats.total_visits} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="admin-card p-8 rounded-[40px] flex flex-col">
          <h3 className="text-lg font-bold mb-6">🎙️ سجل العمليات (Records)</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2 flex-1">
            {globalRecords.length > 0 ? globalRecords.map((r, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center group hover:bg-white/10 transition-all">
                <div className="flex-1 truncate ml-4">
                  <p className="text-sm text-white font-medium mb-1 truncate leading-relaxed">"{r.text}"</p>
                  <div className="flex gap-2 text-[10px] opacity-40 mt-1">
                    <span>{new Date(r.timestamp).toLocaleString('ar-EG')}</span>
                    <span className="text-cyan-400">| {r.selection.dialect}</span>
                    <span className="text-indigo-400">| {r.selection.field}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => toggleAudio(r.id, r.audio_data)} className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all">
                     {playingId === r.id ? '⏸' : '▶'}
                   </button>
                   <a href={r.audio_data} download={`vo_${r.id}.wav`} className="p-3 rounded-xl bg-white/5 text-white/40 hover:bg-indigo-500 hover:text-white transition-all">
                     <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                       <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
                     </svg>
                   </a>
                </div>
              </div>
            )) : <div className="text-center py-20 opacity-20 italic">لا توجد بيانات مسجلة حالياً</div>}
          </div>
        </div>
        <div className="admin-card p-8 rounded-[40px]">
          <h3 className="text-lg font-bold mb-6">💬 التقييمات العامة</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {feedbacks.length > 0 ? feedbacks.map((f, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3 transition-all hover:bg-white/10">
                <div className="flex justify-between items-center">
                  <RatingStars rating={f.rating} />
                  <span className="text-[10px] opacity-20">{new Date(f.timestamp).toLocaleDateString('ar-EG')}</span>
                </div>
                <p className="text-xs italic text-white/70 leading-relaxed">"{f.comment || 'بدون تعليق إضافي'}"</p>
              </div>
            )) : <div className="text-center py-20 opacity-20">لا توجد تقييمات حالياً</div>}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center py-20 px-6 font-arabic relative">
      {(isGenerating || isPreprocessing) && (
        <div className="fixed inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-center text-center p-8">
          <h2 className="tech-logo text-7xl animate-pulse mb-12">Majd</h2>
          <div className="glass-3d p-10 rounded-[40px] border-cyan-500/30 max-w-lg w-full transform transition-all animate-bounce">
             <p className="text-2xl font-bold text-white leading-relaxed">{WAITING_MESSAGES[currentWaitMsgIndex]}</p>
          </div>
        </div>
      )}
      
      <div className="fixed top-8 left-8 z-50">
        <button onClick={() => setShowLogin(true)} className="px-6 py-3 rounded-2xl glass-3d border border-cyan-500/20 text-cyan-400 font-bold text-[10px] tracking-widest hover:bg-cyan-500 hover:text-white transition-all uppercase">Analytics</button>
      </div>

      {showLogin && (
        <div className="fixed inset-0 z-[600] bg-black/95 flex items-center justify-center p-6">
          <form onSubmit={handleAdminLogin} className="glass-3d w-full max-w-md p-12 rounded-[50px] space-y-8 text-center">
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="رمز المرور" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 text-center text-2xl" />
            <button className="w-full brand-bg py-5 rounded-2xl font-bold">دخول المدير</button>
            <button type="button" onClick={()=>setShowLogin(false)} className="text-white/20 text-xs">إلغاء</button>
          </form>
        </div>
      )}

      <header className="mb-24 text-center">
        <h1 className="tech-logo text-7xl md:text-9xl mb-4">Majd</h1>
        <p className="text-white/30 text-[10px] uppercase tracking-[1em] font-bold">Professional Cloud VO Studio</p>
      </header>

      <main className="w-full max-w-6xl space-y-16">
        <section className="glass-3d p-12 rounded-[50px] space-y-12">
          <SelectionBlock title="اختيار اللهجة" options={DIALECTS.map(d => ({ label: d.title, icon: d.flag }))} current={DIALECTS.find(d => d.id === selectedDialectId)?.title || ''} set={(t) => setSelectedDialectId(DIALECTS.find(d => d.title === t)?.id || '')} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-white/5 pt-12">
            <SelectionBlock title="نوع الصوت" options={[{ label: 'بالغ', icon: <StudioIcons.Adult /> }, { label: 'كبار السن', icon: <StudioIcons.Elderly /> }, { label: 'شخصية كارتونية', icon: <StudioIcons.Cartoon /> }]} current={selectedAge} set={setSelectedAge} />
            <SelectionBlock title="الجنس" options={[{ label: 'ذكر', icon: <StudioIcons.Male /> }, { label: 'أنثى', icon: <StudioIcons.Female /> }]} current={selectedGender === 'male' ? 'ذكر' : 'أنثى'} set={(g) => setSelectedGender(g === 'ذكر' ? 'male' : 'female')} />
          </div>

          <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-[0.4em] text-center mb-4">اختيار المعلق الصوتي</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-white/5">
            {availableProfiles.length > 0 ? availableProfiles.map(profile => (
              <button key={profile.name} onClick={() => setSelectedProfile(profile)} className={`p-6 rounded-2xl border transition-all text-center space-y-3 ${selectedProfile?.name === profile.name ? 'border-cyan-500 bg-cyan-500/10 scale-105 shadow-xl shadow-cyan-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                <div className="flex justify-center text-cyan-400">{getCatIcon(profile.categoryKey)}</div>
                <div className="text-xs font-bold">{profile.name}</div>
                <div className="text-[9px] opacity-30">{profile.category}</div>
              </button>
            )) : <div className="col-span-full py-16 text-center text-white/20 border border-dashed border-white/10 rounded-3xl">عذراً، هذا النوع غير متوفر حالياً لهذه اللهجة</div>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-white/5">
            {Object.entries(STUDIO_CONTROLS).map(([k, c]) => (
              <ControlGroup key={k} title={c.title} options={c.options} current={(voiceControls as any)[k]} onChange={v => setVoiceControls(prev => ({...prev, [k]: v}))} />
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
            <div className="relative glass-3d rounded-[40px] p-8 border border-white/5">
              <label className="text-[10px] text-white/30 absolute top-4 right-8 font-bold uppercase tracking-widest">النص الأصلي</label>
              <textarea className="w-full h-48 bg-transparent text-lg text-white/60 text-right outline-none resize-none pt-4" placeholder="اكتب النص هنا..." value={inputText} onChange={e => setInputText(e.target.value)} />
              <div className="lg:hidden flex justify-end mt-2">
                 <button onClick={handleRefineText} disabled={!inputText.trim() || isPreprocessing} className="px-6 py-2 rounded-xl brand-bg text-white font-bold text-xs shadow-lg hover:scale-105 transition-all">محسن النص AI</button>
              </div>
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden lg:block">
              <button onClick={handleRefineText} disabled={!inputText.trim() || isPreprocessing} className="px-8 py-4 rounded-2xl brand-bg text-white font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:scale-105 transition-all border border-white/10">محسن النص AI</button>
            </div>
            <div className={`relative glass-3d rounded-[40px] p-8 border-cyan-500/20 transition-all ${refinedText ? 'opacity-100 ring-1 ring-cyan-500/50' : 'opacity-30'}`}>
              <label className="text-[10px] text-cyan-400 absolute top-4 right-8 font-bold uppercase tracking-widest">النص المحسن ذكياً</label>
              <textarea className="w-full h-48 bg-transparent text-lg text-white text-right outline-none resize-none pt-4" placeholder="هنا سيظهر النص المحسن..." value={refinedText} onChange={e => setRefinedText(e.target.value)} />
            </div>
          </div>
          <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-8 rounded-[35px] brand-bg text-white text-xl font-black shadow-2xl hover:scale-[1.01] transition-all mt-8">توليد ورفع الصوت</button>
        </section>

        {currentResult && (
          <div className="glass-3d p-10 rounded-[40px] border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-8">
              <button onClick={() => toggleAudio(currentResult.id, currentResult.audio_data)} className={`h-24 w-24 rounded-full brand-bg flex items-center justify-center text-white shadow-xl ${playingId === currentResult.id ? 'bg-rose-600' : ''}`}>
                <span className="text-3xl">{playingId === currentResult.id ? "⏸" : "▶"}</span>
              </button>
              <div className="text-right">
                <h4 className="text-2xl font-black">جاهز يا بطل! 🎙️</h4>
                <div className="mt-4 text-xs opacity-40">الصوت: {selectedProfile?.name} | اللهجة: {DIALECTS.find(d => d.id === selectedDialectId)?.title}</div>
                <div className="mt-4"><RatingStars rating={currentResult.rating} interactive onRate={(r) => { api.updateRating(currentResult.id, r); setCurrentResult({...currentResult, rating: r}); }} /></div>
              </div>
            </div>
            <a href={currentResult.audio_data} download className="px-12 py-6 rounded-[28px] brand-bg text-white font-black hover:brightness-110 shadow-2xl">تحميل المقطع</a>
          </div>
        )}

        <section className="glass-3d p-12 rounded-[50px] border border-cyan-500/10">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4"><h3 className="text-3xl font-black brand-text">رأيك يهمنا ! ⭐</h3></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                {!feedbackSent ? (
                  <div className="space-y-6 glass-3d p-8 rounded-3xl">
                    <div className="flex justify-center"><RatingStars rating={feedbackRating} interactive onRate={setFeedbackRating} /></div>
                    <textarea className="w-full p-6 rounded-3xl bg-white/5 border border-white/10 outline-none text-right text-sm h-32" placeholder="رأيك بالمنصة؟" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} />
                    <button onClick={handleSubmitFeedback} disabled={isSubmittingFeedback} className="w-full py-4 rounded-2xl brand-bg text-white font-bold">{isSubmittingFeedback ? "جاري الإرسال ..." : "إرسال التقييم"}</button>
                  </div>
                ) : <div className="py-10 text-center"><h4 className="text-2xl font-bold text-cyan-400">وصل يا بطل! ❤️</h4></div>}
              </div>
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">{publicFeedbacks.map((f, i) => (<div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2"><RatingStars rating={f.rating} /><p className="text-xs text-white/60 italic">"{f.comment || 'تقييم ممتاز'}"</p></div>))}</div>
            </div>
          </div>
        </section>

        <section className="glass-3d p-12 rounded-[50px] space-y-8">
          <h3 className="text-xl font-bold">أحدث أعمالك 📂</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {history.length > 0 ? history.map((rec) => (
              <div key={rec.id} className="p-6 rounded-3xl bg-white/5 flex items-center justify-between hover:bg-white/10 transition-all border border-transparent hover:border-white/5">
                <button onClick={() => toggleAudio(rec.id, rec.audio_data)} className="h-14 w-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">{playingId === rec.id ? "■" : "▶"}</button>
                <div className="text-right flex-1 truncate ml-4">
                  <p className="text-sm truncate text-white/80">"{rec.text}"</p>
                  <span className="text-[10px] opacity-20">{new Date(rec.timestamp).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
            )) : <div className="text-center py-10 opacity-20">ابدأ بتوليد أول صوت لتظهر هنا</div>}
          </div>
        </section>
      </main>
      <footer className="mt-40 text-center opacity-10 text-[10px] uppercase font-black tracking-[1em] pb-10">Majd STUDIO VO • CLOUD DRIVEN</footer>
    </div>
  );
};

export default App;
